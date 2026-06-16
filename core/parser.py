OPERATORS = {
    "tambah": "+", "ditambah": "+", "sitambah": "+",
    "kurang": "-", "dikurang": "-", "dikurangi": "-",
    "kali": "*", "dikali": "*",
    "bagi": "/", "dibagi": "/",
    ":": "/",
}

ONES = {
    "nol": 0, "satu": 1, "dua": 2, "tiga": 3, "empat": 4,
    "lima": 5, "enam": 6, "tujuh": 7, "delapan": 8, "sembilan": 9,
}

NUMBER_WORDS = set(ONES.keys()) | {"puluh", "belas", "ratus", "ribu",
                                    "sepuluh", "sebelas", "seratus", "seribu"}

SKIP_WORDS = {"sama", "dengan", "adalah", "hasilnya"}


def _words_to_number(tokens: list) -> int:
    expanded = []
    for t in tokens:
        if t == "sepuluh":   expanded += ["satu", "puluh"]
        elif t == "sebelas": expanded += ["satu", "belas"]
        elif t == "seratus": expanded += ["satu", "ratus"]
        elif t == "seribu":  expanded += ["satu", "ribu"]
        else:                expanded.append(t)

    total = 0
    hundreds = 0
    current = 0
    after_puluh = False

    for t in expanded:
        if t in ONES:
            if after_puluh:
                current += ONES[t]
                after_puluh = False
            else:
                current = ONES[t]
        elif t == "belas":
            current = current + 10
            after_puluh = False
        elif t == "puluh":
            current = current * 10
            after_puluh = True
        elif t == "ratus":
            hundreds += current * 100
            current = 0
            after_puluh = False
        elif t == "ribu":
            total += (hundreds + current) * 1000
            hundreds = 0
            current = 0
            after_puluh = False

    return total + hundreds + current

def _split_concatenated(text: str) -> str:
    """Pisah kata yang ter-concat oleh STT, misal 'ditambahlima' → 'ditambah lima'"""
    all_known = sorted(
        list(OPERATORS.keys()) + list(NUMBER_WORDS),
        key=len, reverse=True
    )
    words = text.split()
    result = []
    for word in words:
        matched = False
        for prefix in all_known:
            if word.startswith(prefix) and len(word) > len(prefix):
                suffix = word[len(prefix):]
                if suffix in all_known:
                    result.extend([prefix, suffix])
                    matched = True
                    break
        if not matched:
            result.append(word)
    return ' '.join(result)


def parse_text(text: str) -> str:
    text = _split_concatenated(text)
    words = text.lower().split()
    tokens = []
    number_buf = []

    for word in words:
        if word in SKIP_WORDS:
            continue
        elif word in OPERATORS:
            if number_buf:
                tokens.append(str(_words_to_number(number_buf)))
                number_buf = []
            tokens.append(OPERATORS[word])
        elif word in NUMBER_WORDS:
            number_buf.append(word)
        elif word.isdigit():
            if number_buf:
                tokens.append(str(_words_to_number(number_buf)))
                number_buf = []
            tokens.append(word)
        else:
            # ← Fix 1 taruh di sini
            if number_buf:
                tokens.append(str(_words_to_number(number_buf)))
                number_buf = []

    if number_buf:
        tokens.append(str(_words_to_number(number_buf)))

    return " ".join(tokens)