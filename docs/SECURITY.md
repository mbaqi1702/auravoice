# Security Architecture & Vulnerability Mitigation: `voice-agent`

## 1. Security Audit Findings & Resolved Deficiencies

| ID | Vulnerability | Severity | Remediation Applied |
|---|---|---|---|
| **S1** | Code execution / DoS via `eval()` in calculator tool | **Critical** | Replaced `eval()` with strict AST-walking mathematical evaluator (`SafeMathEvaluator`). Whitelisted operators and functions, capped expression length (300 chars), and capped exponents to prevent DoS (`9**9**9`). |
| **S2** | Path traversal in `/upload` and document retrieval | **High** | Sanitized all client-supplied filenames via `path.basename()`, stripped traversal indicators (`../../`), applied UUID prefixes, restricted extensions to an allowlist (`.txt`, `.pdf`, `.md`, `.csv`, `.json`, `.html`), and enforced strict path boundary assertion. |
| **S3** | Unauthenticated public endpoints & quota burn | **High** | Enforced session-scoped authorization, unique ephemeral session tokens, and strict per-session rate limits. Query-string token transmission is prohibited. |
| **S4** | Permissive CORS (`allow_origins=["*"]` + credentials) | **Medium** | Replaced wildcard with configurable `ALLOWED_ORIGINS` environment variable. Prohibited wildcard origin when credentials are enabled. |
| **S5** | `debug=True` in production and secret leakage | **Medium** | Defaulted `DEBUG=False`. Ensured zero logging of API keys, document payloads, or user audio transcripts. |
| **S6** | Root execution in container & missing `.dockerignore` | **Medium** | Added `.dockerignore` excluding `.env`, `node_modules`, and local cache; configured non-root container user execution. |
| **S7** | Unbounded message sizes and absent rate limits | **Medium** | Implemented token-bucket rate limiter per session (60 burst capacity, 2 req/s refill) and capped JSON payload size to 10MB. |
| **S8** | Prompt injection via retrieved document content | **High** | Wrapped all retrieved document chunks inside explicit delimiters: `<<<UNTRUSTED_DOCUMENT_CONTENT>>>`. Added system prompts instructing the model that document text is purely passive data and must never be interpreted as commands. |

## 2. Safe AST Evaluator Specification (S1)
The safe evaluator rejects all object attributes, `__proto__`, `constructor`, `globalThis`, `window`, and `process`. Only mathematical nodes are parsed:
```typescript
// Safe evaluation interface
SafeMathEvaluator.evaluate("15 * 3 - sqrt(16)"); // { success: true, result: 41 }
SafeMathEvaluator.evaluate("9 ** 9 ** 9");       // { success: false, error: "Exponent power calculation too large" }
SafeMathEvaluator.evaluate("process.exit()");    // { success: false, error: "Security violation: illegal identifier" }
```

## 3. Vulnerability Reporting
To report security concerns, email the maintainer or open a private advisory on GitHub. Never disclose unpatched vulnerabilities publicly.
