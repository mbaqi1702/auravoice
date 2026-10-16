# Architecture & System Design Specification: AuraVoice (`voice-agent`)

## 1. Executive Summary
`AuraVoice` is a low-latency, personal conversational voice AI and document audio intelligence agent designed to operate efficiently within free-tier computational and token quotas. It integrates Speech-to-Text (STT), conversational Large Language Models (LLM), and Text-to-Speech (TTS) alongside a MarkItDown token optimization pipeline.

## 2. Hexagonal Domain Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │            DRIVING / INBOUND PORTS           │
                    │   • Web Speech API (Live interim STT)        │
                    │   • MediaRecorder Audio Chunks Stream        │
                    │   • REST & WebSocket Gateway Controllers     │
                    └───────────────────────┬──────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │                 CORE DOMAIN                  │
                    │   • ProcessVoiceTurnUseCase                  │
                    │   • MarkItDownTokenOptimizer                 │
                    │   • PodcastStudioUseCase (Alex & Sam)        │
                    │   • AudiobookReaderUseCase (Verbatim)        │
                    │   • ContextMemoryRepository (Session Scope)  │
                    │   • SafeMathEvaluator (AST Sandboxing)       │
                    └───────────────────────┬──────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────┐
                    │            DRIVEN / OUTBOUND PORTS           │
                    │   • ILLMPort (Gemini 3.8 Flash, Low Thinking)│
                    │   • ISTTPort (Gemini 3.5 Transcribe)         │
                    │   • ITTSPort (Gemini 3.8 Flash TTS / Lite)   │
                    │   • IAudioPlayback (Web Audio API Analyser)  │
                    │   • IStorageRepository (Deduplicated RAG)    │
                    └──────────────────────────────────────────────┘
```

## 3. End-to-End Latency Budget

To achieve natural, low-latency conversation, stage budgets are allocated as follows:

| Stage | Target p50 | Target p95 | Implemented Mechanism |
|---|---|---|---|
| **Voice Activity Detection / STT** | 180 ms | 320 ms | Client Web Speech API interim stream + server fallback |
| **LLM Reasoning (TTFT)** | 280 ms | 450 ms | `gemini-3.8-flash` with `ThinkingLevel.LOW` |
| **TTS Audio Synthesis (TTFB)** | 350 ms | 550 ms | `gemini-3.8-flash-lite-tts` 24kHz Unary WAV |
| **Client Audio Buffer & Playback** | 40 ms | 80 ms | Web Audio API `decodeAudioData` + `AnalyserNode` |
| **Total Roundtrip (Voice ➜ Audio)** | **850 ms** | **1,400 ms** | Sequential pipelining with client-side barge-in |

## 4. Barge-In & Interruption Semantics
- **Trigger**: User speaks or presses `Esc` or the UI Interrupt button.
- **Client**: Immediately disconnects the active `AudioBufferSourceNode`, cancels any browser `SpeechSynthesisUtterance`, and transitions visualizer state to `idle` or `listening` in `<100ms`.
- **Server**: Conversation turns are bounded; in-flight tasks can be dropped without corrupting persisted session state.

## 5. Security & Isolation Model
1. **Per-Session Isolation**: Every connection is assigned a distinct `sessionId`. History, document contexts, and audio assets are never shared between sessions.
2. **Path Traversal Guard**: Filenames are sanitized with `path.basename` and UUID prefixed; directories enforce strict relative path boundaries.
3. **Prompt Injection Boundary**: All retrieved document text is wrapped in immutable delimiter fences (`<<<UNTRUSTED_DOCUMENT_CONTENT>>>`), instructing the model to treat text strictly as passive data.
