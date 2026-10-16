# ADR 0002: Recursive-Descent Safe AST Math Evaluator (Security S1)

## Context
The legacy implementation used Python's `eval()` with `__builtins__ = {}`. This is a well-documented vulnerability in Python: attackers can traverse the object graph via `().__class__.__base__.__subclasses__()` to recover references to `os.system` or execute arbitrary shell commands. Additionally, `9**9**9` causes process-locking denial of service.

## Decision
We implemented a strict, sandboxed **Recursive-Descent AST Evaluator** (`SafeMathEvaluator` in TypeScript and Python).
- Restricts expressions to basic arithmetic operators (`+`, `-`, `*`, `/`, `%`, `^`).
- Whitelists safe math functions (`sqrt`, `abs`, `round`, `floor`, `ceil`, `sin`, `cos`, `tan`, `log`, `min`, `max`).
- Caps exponents at 1,000 and restricts base/exponent combinations to prevent memory exhaustion DoS.
- Rejects any token matching prototype properties (`__proto__`, `constructor`, `window`, `process`).

## Consequences
- Eliminates Remote Code Execution (RCE) vectors.
- Guarantees calculation determinism with zero chance of DoS hangs.
