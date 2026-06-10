# Microphone utility module
# The actual microphone handling is done within sounddevice in recognizer.py,
# but we can place helpers here if needed in the future.

def check_microphone():
    """Check if microphone is accessible."""
    import sounddevice as sd
    try:
        devices = sd.query_devices()
        return len(devices) > 0
    except Exception as e:
        return False
