import re

def normalize(text: str) -> str:
    """Clean and normalize the input text."""
    # Remove punctuation except math operators
    text = re.sub(r'[^\w\s\+\-\*\/]', '', text)
    # Convert to lowercase
    return text.lower().strip()
