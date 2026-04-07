"""API routes for diagram validation."""
from fastapi import APIRouter
from pydantic import BaseModel
from models.diagram import DiagramSubmission, DiagramType, ValidationResult, ValidationError, Severity
from services.ai_validator import evaluate_diagram_with_ai

router = APIRouter(tags=["diagrams"])


@router.post("/diagrams/validate")
async def validate_diagram(submission: DiagramSubmission) -> ValidationResult:
    """Validate a student diagram submission against rules."""
    # For Phase 1 - basic structure validation
    # Full validators will be added in Phases 4-7
    errors = []

    if not submission.nodes:
        errors.append(ValidationError(
            rule_id="empty_diagram",
            message_he="התרשים ריק. יש להוסיף לפחות אלמנט אחד.",
            severity=Severity.ERROR
        ))

    # Dispatch to type-specific validator
    if submission.diagram_type == DiagramType.FLOWCHART:
        errors.extend(_validate_flowchart_basic(submission))
    elif submission.diagram_type == DiagramType.ERD:
        errors.extend(_validate_erd_basic(submission))
    elif submission.diagram_type == DiagramType.DFD:
        errors.extend(_validate_dfd_basic(submission))
    elif submission.diagram_type == DiagramType.MENU_TREE:
        errors.extend(_validate_menu_tree_basic(submission))

    # Optional AI Validation
    if submission.exercise_prompt:
        ai_errors = await evaluate_diagram_with_ai(submission)
        errors.extend(ai_errors)

    return ValidationResult(
        valid=len([e for e in errors if e.severity == Severity.ERROR]) == 0,
        errors=errors,
        score=None
    )


def _validate_flowchart_basic(sub: DiagramSubmission) -> list[ValidationError]:
    """Basic flowchart validation."""
    errors = []
    node_types = [n.type for n in sub.nodes]

    if "start" not in node_types:
        errors.append(ValidationError(
            rule_id="flow_no_start",
            message_he="חסר סימן התחלה (מלבן מעוגל). כל תרשים חייב התחלה אחת.",
            severity=Severity.ERROR
        ))
    if "end" not in node_types:
        errors.append(ValidationError(
            rule_id="flow_no_end",
            message_he="חסר סימן סוף (מלבן מעוגל). כל תרשים חייב לפחות סוף אחד.",
            severity=Severity.ERROR
        ))

    # Check diamonds have 2 outputs
    for node in sub.nodes:
        if node.type == "decision":
            outgoing = [e for e in sub.edges if e.source == node.id]
            if len(outgoing) != 2:
                errors.append(ValidationError(
                    rule_id="flow_diamond_outputs",
                    message_he=f"מעוין (תנאי) '{node.label}' חייב בדיוק 2 חצים יוצאים: כן ולא. נמצאו {len(outgoing)}.",
                    severity=Severity.ERROR,
                    affected_node_ids=[node.id]
                ))

    return errors


def _validate_erd_basic(sub: DiagramSubmission) -> list[ValidationError]:
    """Basic ERD validation."""
    errors = []

    entities = [n for n in sub.nodes if n.type == "entity"]
    relationships = [n for n in sub.nodes if n.type == "relationship"]

    for entity in entities:
        attrs = entity.properties.get("attributes", [])
        has_key = any(a.get("is_key", False) for a in attrs)
        is_weak = entity.properties.get("is_weak", False)
        if not has_key and not is_weak:
            errors.append(ValidationError(
                rule_id="erd_entity_no_key",
                message_he=f"לישות '{entity.label}' אין מפתח (תכונה עם קו תחתי). כל ישות חזקה חייבת מפתח.",
                severity=Severity.ERROR,
                affected_node_ids=[entity.id]
            ))

    for rel in relationships:
        connected = [e for e in sub.edges if e.source == rel.id or e.target == rel.id]
        entity_connections = [e for e in connected
                              if any(n.id in (e.source, e.target) and n.type == "entity" for n in sub.nodes)]
        if len(entity_connections) < 2:
            errors.append(ValidationError(
                rule_id="erd_relationship_no_entities",
                message_he=f"קשר '{rel.label}' חייב להיות מחובר לפחות ל-2 ישויות.",
                severity=Severity.ERROR,
                affected_node_ids=[rel.id]
            ))

    return errors


def _validate_dfd_basic(sub: DiagramSubmission) -> list[ValidationError]:
    """Basic DFD validation."""
    errors = []

    processes = [n for n in sub.nodes if n.type in ("process", "compound_process")]

    for proc in processes:
        incoming = [e for e in sub.edges if e.target == proc.id]
        outgoing = [e for e in sub.edges if e.source == proc.id]

        if not incoming:
            errors.append(ValidationError(
                rule_id="dfd_process_no_input",
                message_he=f"לתהליך '{proc.label}' אין זרם מידע נכנס. כל תהליך חייב לקבל לפחות זרם אחד.",
                severity=Severity.ERROR,
                affected_node_ids=[proc.id]
            ))
        if not outgoing:
            errors.append(ValidationError(
                rule_id="dfd_process_no_output",
                message_he=f"לתהליך '{proc.label}' אין זרם מידע יוצא. כל תהליך חייב להפיק לפחות זרם אחד.",
                severity=Severity.ERROR,
                affected_node_ids=[proc.id]
            ))

    # Check no direct entity-to-entity flows
    entities = {n.id for n in sub.nodes if n.type == "external_entity"}
    stores = {n.id for n in sub.nodes if n.type == "data_store"}

    for edge in sub.edges:
        if edge.source in entities and edge.target in entities:
            errors.append(ValidationError(
                rule_id="dfd_entity_to_entity",
                message_he=f"אין אפשרות לזרם ישיר בין ישויות. זרם חייב לעבור דרך תהליך.",
                severity=Severity.ERROR,
                affected_edge_ids=[edge.id]
            ))
        if edge.source in stores and edge.target in stores:
            errors.append(ValidationError(
                rule_id="dfd_store_to_store",
                message_he=f"אין אפשרות לזרם ישיר בין מאגרים. זרם חייב לעבור דרך תהליך.",
                severity=Severity.ERROR,
                affected_edge_ids=[edge.id]
            ))

    return errors


def _validate_menu_tree_basic(sub: DiagramSubmission) -> list[ValidationError]:
    """Basic menu tree validation."""
    errors = []

    for node in sub.nodes:
        if node.type == "s_node":
            children = [e for e in sub.edges if e.source == node.id]
            if len(children) == 1:
                errors.append(ValidationError(
                    rule_id="menu_degenerate",
                    message_he=f"תפריט '{node.label}' מנוון (שורה אחת בלבד). יש לטפל בשלב 4.",
                    severity=Severity.WARNING,
                    affected_node_ids=[node.id]
                ))
            elif len(children) == 0:
                errors.append(ValidationError(
                    rule_id="menu_empty",
                    message_he=f"תפריט '{node.label}' ריק. יש להוסיף לו שורות.",
                    severity=Severity.ERROR,
                    affected_node_ids=[node.id]
                ))

    return errors
