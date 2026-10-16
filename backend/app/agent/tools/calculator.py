"""
Security Fix S1: AST-walking safe expression evaluator.
Prevents code execution, object-graph escapes, and DoS attacks (e.g. 9**9**9).
"""

import ast
import operator
import math
from typing import Any, Dict

MAX_EXPR_LENGTH = 300
MAX_EXPONENT = 1000

SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SAFE_FUNCTIONS = {
    "sqrt": math.sqrt,
    "abs": abs,
    "round": round,
    "floor": math.floor,
    "ceil": math.ceil,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "min": min,
    "max": max,
}

SAFE_CONSTANTS = {
    "pi": math.pi,
    "e": math.e,
}


class SecurityError(Exception):
    pass


def evaluate_expression(expr: str) -> float:
    if not expr or not isinstance(expr, str):
        raise ValueError("Expression must be a non-empty string")

    expr = expr.strip()
    if len(expr) > MAX_EXPR_LENGTH:
        raise SecurityError(f"Expression exceeds max length of {MAX_EXPR_LENGTH}")

    try:
        node = ast.parse(expr, mode="eval")
    except SyntaxError as e:
        raise ValueError(f"Invalid mathematical syntax: {e}")

    def _eval(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return _eval(node.body)

        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return float(node.value)
            raise SecurityError(f"Unsupported constant type: {type(node.value)}")

        if isinstance(node, ast.UnaryOp):
            op_type = type(node.op)
            if op_type not in SAFE_OPERATORS:
                raise SecurityError(f"Disallowed unary operator: {op_type}")
            val = _eval(node.operand)
            return SAFE_OPERATORS[op_type](val)

        if isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in SAFE_OPERATORS:
                raise SecurityError(f"Disallowed binary operator: {op_type}")
            left = _eval(node.left)
            right = _eval(node.right)

            # Prevent DoS via large exponents
            if op_type is ast.Pow:
                if abs(right) > MAX_EXPONENT:
                    raise SecurityError(f"Exponent exceeds safety limit of {MAX_EXPONENT}")
                if abs(left) > 10 and right > 50:
                    raise SecurityError("Exponent power calculation too large (DoS prevention)")

            if op_type in (ast.Div, ast.Mod) and right == 0:
                raise ZeroDivisionError("Division or modulo by zero")

            return SAFE_OPERATORS[op_type](left, right)

        if isinstance(node, ast.Name):
            name = node.id.lower()
            if name in SAFE_CONSTANTS:
                return SAFE_CONSTANTS[name]
            raise SecurityError(f"Access to variable '{node.id}' is prohibited")

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise SecurityError("Dynamic or attribute function invocation is prohibited")
            func_name = node.func.id.lower()
            if func_name not in SAFE_FUNCTIONS:
                raise SecurityError(f"Function '{func_name}' is not in the safe whitelist")
            args = [_eval(arg) for arg in node.args]
            return float(SAFE_FUNCTIONS[func_name](*args))

        raise SecurityError(f"Disallowed syntax element: {type(node).__name__}")

    return _eval(node)
