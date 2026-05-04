import re

CRISIS_PATTERNS = [
    r"суицид", r"убить себя", r"покончить с собой",
    r"не хочу жить", r"нет смысла жить", r"хочу умереть",
    r"самоповреждени", r"порезать себя", r"причинить себе вред"
]

def check_crisis(text: str) -> bool:
    text_lower = text.lower()
    return any(re.search(pattern, text_lower) for pattern in CRISIS_PATTERNS)