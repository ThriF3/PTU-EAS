WORD_MAP = {
    "nol": "0", "satu": "1", "dua": "2",
    "tiga": "3", "empat": "4", "lima": "5",
    "enam": "6", "tujuh": "7",
    "delapan": "8", "sembilan": "9",
    "tambah": "+", "ditambah": "+",
    "kurang": "-", "dikurang": "-",
    "kali": "*", "dikali": "*",
    "bagi": "/", "dibagi": "/",
}

def parse_text(text: str) -> str:
    """Convert Indonesian text into a math expression."""
    words = text.lower().split()
    result = []

    for word in words:
        if word in WORD_MAP:
            result.append(WORD_MAP[word])
        elif word.isdigit():
            result.append(word)
        elif word in ["+", "-", "*", "/"]:
            result.append(word)

    return " ".join(result)
