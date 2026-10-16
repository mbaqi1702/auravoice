import pytest
import sys
import os

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.agent.tools.calculator import evaluate_expression, SecurityError


def test_basic_arithmetic():
    assert evaluate_expression("2 + 2") == 4.0
    assert evaluate_expression("15 * 3 - 5") == 40.0
    assert evaluate_expression("(10 + 20) / 2") == 15.0
    assert evaluate_expression("10 % 3") == 1.0


def test_safe_functions_and_constants():
    assert evaluate_expression("sqrt(16)") == 4.0
    assert evaluate_expression("abs(-42)") == 42.0
    assert evaluate_expression("round(3.7)") == 4.0
    assert evaluate_expression("pi") > 3.14


def test_exponent_dos_prevention():
    # Attempt 9**9**9 or large exponent must raise SecurityError
    with pytest.raises(SecurityError):
        evaluate_expression("9 ** 9 ** 9")

    with pytest.raises(SecurityError):
        evaluate_expression("2 ** 2000")


def test_code_execution_escape_attempts():
    # Attempting to access __class__, __builtins__, or arbitrary attributes
    with pytest.raises(SecurityError):
        evaluate_expression("().__class__.__base__.__subclasses__()")

    with pytest.raises(SecurityError):
        evaluate_expression("__import__('os').system('ls')")

    with pytest.raises(SecurityError):
        evaluate_expression("open('/etc/passwd').read()")


def test_zero_division():
    with pytest.raises(ZeroDivisionError):
        evaluate_expression("10 / 0")
