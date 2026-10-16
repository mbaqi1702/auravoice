# AuraVoice (`voice-agent`)

> **"Talk to your documents. A free, open-source voice AI assistant that listens with sub-second turnaround, answers from your files with source citations, and reads them back as interactive podcasts or verbatim audiobooks."**

---

## Feature Status Matrix

| Capability | Status | Implementation Details |
|---|---|---|
| **Low-Latency Voice Conversation** | **Working** | Client Web Speech API + Gemini 3.8 Flash (`ThinkingLevel.LOW`) + Gemini 3.8 Flash Lite TTS (24kHz WAV, sub-1.2s turn) |
| **Instant Barge-In / Interruption** | **Working** | Disconnects `AudioBufferSourceNode` instantly on `Esc` or speech detection |
| **MarkItDown Token Optimization** | **Working** | Normalizes PDFs, HTML, CSV, and text to dense Markdown, saving 45%–75% tokens |
| **Document Mode A: Podcast Studio** | **Working** | Dual-speaker dialog (`Alex` via Puck & `Sam` via Kore) with backchanneling & laughter bursts |
| **Document Mode B: Verbatim Audiobook**| **Working** | Verbatim reading with selectable narrator voice personas and section/chapter filtering |
| **Safe Math Evaluator (S1 Fix)** | **Working** | AST-walking sandboxed math engine with exponent caps (no unsafe `eval()`) |
| **Prompt Injection Defense (S8 Fix)**| **Working** | Delimiter boundaries (`<<<UNTRUSTED_DOCUMENT_CONTENT>>>`) forbidding instruction execution |
| **Source Citation RAG (D1 Fix)** | **Working** | Direct source citations (`[Source: filename, Page X]`) for referenced claims |
| **Per-Connection Isolation (D2 Fix)**| **Working** | Independent per-session history, documents, and memory buffers |
| **Document Deduplication & Delete (D4)**| **Working** | SHA-256 content deduplication and `DELETE /api/documents/:id` |
| **WebSocket Streaming (Raw PCM)** | **Planned** | Unary WAV active; raw PCM WebSocket stream documented in ADR 0001 |
| **Supabase Cloud Volume Persistence**| **Planned** | In-memory session store active; cloud pgvector persistence ready |

---

## 3-Command Quick Start

```bash
# 1. Clone & install
git clone https://github.com/mbaqi1702/voice-agent.git && cd voice-agent
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY

# 3. Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Security Mitigations (S1–S8)
- **S1 (Safe Math Tool)**: Replaced `eval()` with `SafeMathEvaluator` AST parser. No code execution escapes or DoS `9**9**9`.
- **S2 (Path Traversal)**: Filename sanitization via `path.basename()`, UUID prefixes, extension allowlist (`.txt`, `.pdf`, `.md`, `.csv`, `.json`, `.html`).
- **S3 & S7 (Rate Limiting & Auth)**: Token bucket rate limiter (60 capacity, 2 req/s) and session-based authentication tokens.
- **S4 (CORS Policy)**: Strict origins via `ALLOWED_ORIGINS` env var; no wildcard credentials.
- **S5 (Secrets)**: `debug=false` by default; zero secret or transcript logging.
- **S8 (Prompt Injection)**: Document context wrapped in boundary fences.

---

## Documentation
- [System Architecture](docs/ARCHITECTURE.md)
- [Security Model & Mitigations](docs/SECURITY.md)
- [Privacy Policy](docs/PRIVACY.md)
- [Deployment Guide](docs/DEPLOY.md)
- [ADR 0001: Streaming & TTS Architecture](docs/adr/0001-streaming-pipeline-and-tts.md)
- [ADR 0002: Safe AST Evaluator](docs/adr/0002-safe-ast-evaluator.md)
- [ADR 0003: Document Prompt Injection](docs/adr/0003-document-isolation-and-prompt-injection.md)
- [ADR 0004: MarkItDown Token Optimization](docs/adr/0004-markitdown-token-optimization.md)

---

## License
MIT License. Free for personal, academic, and commercial use.
