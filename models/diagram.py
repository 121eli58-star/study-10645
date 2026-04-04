"""Pydantic models for diagram data and validation."""
from pydantic import BaseModel
from typing import Optional, Any
from enum import Enum


class DiagramType(str, Enum):
    FLOWCHART = "flowchart"
    ERD = "erd"
    DFD = "dfd"
    CLASS_DIAGRAM = "class_diagram"
    MENU_TREE = "menu_tree"


class DiagramNode(BaseModel):
    id: str
    type: str
    label: str
    x: float
    y: float
    properties: dict[str, Any] = {}


class DiagramEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""
    properties: dict[str, Any] = {}


class DiagramSubmission(BaseModel):
    diagram_type: DiagramType
    exercise_id: Optional[str] = None
    metadata: dict[str, Any] = {}
    nodes: list[DiagramNode]
    edges: list[DiagramEdge]


class Severity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ValidationError(BaseModel):
    rule_id: str
    message_he: str
    severity: Severity
    affected_node_ids: list[str] = []
    affected_edge_ids: list[str] = []


class ValidationResult(BaseModel):
    valid: bool
    errors: list[ValidationError] = []
    score: Optional[float] = None
