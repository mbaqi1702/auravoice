# ADR 0001: Streaming Pipeline & Unary WAV vs Raw PCM Selection

## Context
Voice assistants require immediate turnaround times. We evaluated two architectures for speech generation:
1. **Raw PCM streaming over WebSockets**: Lowest initial packet latency (~150ms start of first syllable), but requires complex client-side audio jitter buffers, chunk concatenation, sample rate conversion (24kHz to native device sample rate), and complex reconnect logic.
2. **Unary WAV with Low-Thinking LLM**: `gemini-3.8-flash-lite-tts` emits a standardized 24kHz 16-bit mono WAV payload within 350-500ms when paired with `ThinkingLevel.LOW`. Complete WAV buffers can be decoded natively with `AudioContext.decodeAudioData()`, replayed at will, visualized via standard `AnalyserNode`, and downloaded as MP3/WAV files for podcasts.

## Decision
We implemented **Unary 24kHz WAV generation with Web Audio API playback** for standard turns, backed by client-side Web Speech API for zero-latency interim transcription and immediate barge-in interruption. For podcast multi-speaker summaries, we utilize `gemini-3.8-flash-tts`.

## Consequences
- Total turnaround latency is maintained under 1,200ms without WebSocket packet jitter risks.
- Browser audio elements and Web Audio API nodes can inspect frequency spectra accurately at 60fps.
