"""Hebrew feedback message builder for validation errors."""


# Common validation messages in Hebrew
MESSAGES = {
    # DFD Rules
    "dfd_process_no_input": "לתהליך {node} אין זרם מידע נכנס. כל תהליך חייב לקבל לפחות זרם אחד.",
    "dfd_process_no_output": "לתהליך {node} אין זרם מידע יוצא. כל תהליך חייב להפיק לפחות זרם אחד.",
    "dfd_entity_to_entity": "אין אפשרות לזרם ישיר בין ישות {source} לישות {target}. זרם חייב לעבור דרך תהליך.",
    "dfd_store_to_store": "אין אפשרות לזרם ישיר בין מאגר {source} למאגר {target}. זרם חייב לעבור דרך תהליך.",
    "dfd_entity_to_store": "אין אפשרות לזרם ישיר בין ישות {source} למאגר {target}. זרם חייב לעבור דרך תהליך.",
    "dfd_store_no_read": "מאגר {node} לא נקרא ע\"י אף תהליך. מאגר פנימי חייב קריאה וכתיבה.",
    "dfd_store_no_write": "מאגר {node} לא נכתב ע\"י אף תהליך. מאגר פנימי חייב קריאה וכתיבה.",
    "dfd_compound_min_children": "תהליך מורכב {node} חייב להכיל לפחות 3 פונקציות משנה.",
    "dfd_conservation_missing": "זרם '{flow}' מופיע בתרשים האב אך חסר בתרשים הבן. הפרה של כלל שימור מידע.",
    "dfd_time_entity_wrong_side": "ישות זמן (T) חייבת להופיע רק בצד שמאל.",

    # ERD Rules
    "erd_entity_no_key": "לישות {node} אין מפתח (תכונה עם קו תחתי). כל ישות חזקה חייבת מפתח.",
    "erd_weak_no_strong": "ישות חלשה {node} חייבת להיות מקושרת לישות חזקה.",
    "erd_relationship_attribute_1n": "לקשר 1:N אי אפשר להוסיף תכונת קשר. יש להעביר את התכונה לישות בצד ה-N.",
    "erd_relationship_no_entities": "קשר {node} חייב להיות מחובר לפחות ל-2 ישויות (או 1 בקשר יונרי).",
    "erd_missing_cardinality": "חסר סימון ריבוי (Min,Max) על הקשר בין {source} ל-{target}.",

    # Flowchart Rules
    "flow_no_start": "חסר סימן התחלה (מלבן מעוגל). כל תרשים חייב התחלה אחת.",
    "flow_no_end": "חסר סימן סוף (מלבן מעוגל). כל תרשים חייב לפחות סוף אחד.",
    "flow_diamond_outputs": "מעוין (תנאי) {node} חייב בדיוק 2 חצים יוצאים: כן ולא.",
    "flow_dead_end": "לצומת {node} אין חץ יוצא ולא סימן סוף. כל צומת חייב להמשיך הלאה.",
    "flow_do_case_else": "בבצע מקרה, תנאי 'אחרת' חייב להיות הימני ביותר.",

    # Menu Tree Rules
    "menu_wrong_s_t": "פונקציה {node}: שגוי. פונקציה כללית+ישות = S, פונקציה יסודית+ישות = T.",
    "menu_unmerged_transaction": "פונקציות {funcs} שייכות לאותה טרנזקציה ולא אוחדו.",
    "menu_time_not_removed": "טרנזקציית זמן טהורה {node} הייתה צריכה להיות מוסרת בשלב 3.",
    "menu_degenerate": "תפריט {node} מנוון (שורה אחת). יש לטפל בשלב 4.",
    "menu_formula_mismatch": "נוסחת בדיקה נכשלה: T({t}) + QT({qt}) + זמן שבוטלו({removed}) != סה\"כ({total})."
}


def get_message(key: str, **kwargs) -> str:
    """Get a formatted Hebrew feedback message."""
    template = MESSAGES.get(key, f"שגיאה לא מזוהה: {key}")
    try:
        return template.format(**kwargs)
    except KeyError:
        return template
