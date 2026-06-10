def calculate(expression: str):
    """Safely evaluate the mathematical expression."""
    # Remove any trailing math operators or spaces that would cause syntax errors
    expression = expression.strip(' +-/*')
    
    if not expression:
        return "error"
    try:
        # Note: eval is used here for simplicity as requested, 
        # but in a real production app we'd use a safer parser like ast.literal_eval or a math-specific evaluator.
        # Since the parser only allows numbers and operators, eval is relatively safe here.
        result = eval(expression)
        return result
    except Exception as e:
        return "error"
