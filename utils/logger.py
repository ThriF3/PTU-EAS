import datetime

def log(message: str, level: str = "INFO"):
    """Simple logger function."""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")
