import os
import json
import google.generativeai as genai
from models.diagram import DiagramSubmission, ValidationResult, ValidationError, Severity
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

generation_config = {
    "temperature": 0.1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json",
}

AI_SYSTEM_PROMPT = """You are an expert academic evaluator for Computer Science diagrams (ERD, DFD, Flowcharts, UML).
You will receive:
1. "exercise_prompt" - The original assignment instructions given to the student (in Hebrew).
2. "diagram_data" - The JSON representation of the student's diagram (nodes and edges).

Your job is to act as a strict but encouraging teacher:
1. Read the exercise and understand the expected entities, processes, or steps required.
2. Analyze the student's diagram_data to see if it fulfilling the requirements.
3. Check for specific academic rules (like no direct entity-to-entity flow in DFD, or weak entities needing identifying relationships in ERD - though the system validator checks basics, you must check conceptual correctness based on the text!).
4. Identify exactly what the student missed or got wrong concepts-wise compared to the raw text prompt.

If there are errors or missing parts, specify the 'rule_id' as 'ai_feedback', give a clear `message_he` in Hebrew explaining the error, and include the affected `affected_node_ids` based on the IDs provided in the diagram_data.

Return ONLY a JSON array of error objects. E.g.:
[
  {
    "rule_id": "ai_feedback",
    "message_he": "שכחת את מאגר הנתונים של 'לקוחות' כפי שנדרש בתרגיל.",
    "severity": "error",
    "affected_node_ids": ["node_123"]
  }
]
If the diagram is completely correct based on the exercise, return an empty array: []
"""

async def evaluate_diagram_with_ai(submission: DiagramSubmission) -> list[ValidationError]:
    if not api_key:
        return [ValidationError(
            rule_id="system_error",
            message_he="מפתח GEMINI_API_KEY חסר בשרת. הפיצ'ר החכם כבוי.",
            severity=Severity.WARNING
        )]

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config=generation_config,
        system_instruction=AI_SYSTEM_PROMPT,
    )

    prompt = f"""
    EXERCISE PROMPT:
    {submission.exercise_prompt}

    DIAGRAM SUBMISSION (JSON):
    {submission.json()}
    """

    try:
        response = model.generate_content(prompt)
        ai_errors = json.loads(response.text)
        
        errors = []
        for err in ai_errors:
            errors.append(ValidationError(
                rule_id=err.get("rule_id", "ai_feedback"),
                message_he=err.get("message_he", "הערה כללית"),
                severity=Severity(err.get("severity", "error")),
                affected_node_ids=err.get("affected_node_ids", []),
                affected_edge_ids=err.get("affected_edge_ids", [])
            ))
        return errors
    except Exception as e:
        print("Gemini API Error:", e)
        return [ValidationError(
            rule_id="ai_system_error",
            message_he="הייתה שגיאה בניתוח התרשים בעזרת בינה מלאכותית. נסה שוב מאוחר יותר.",
            severity=Severity.WARNING
        )]
