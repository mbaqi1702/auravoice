import React, { useState } from 'react';
import {
  Layers,
  Shield,
  CheckCircle2,
  GitBranch,
  Terminal,
  Activity,
  AlertTriangle,
  FileCode2,
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hexagonal' | 'solid' | 'testing' | 'nfr' | 'tradeoffs'>('hexagonal');

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-900/90 rounded-2xl border border-zinc-800/80 overflow-x-auto">
        <button
          onClick={() => setActiveTab('hexagonal')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'hexagonal'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Hexagonal / Clean Architecture</span>
        </button>

        <button
          onClick={() => setActiveTab('solid')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'solid'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>SOLID Principles</span>
        </button>

        <button
          onClick={() => setActiveTab('testing')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'testing'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Testing Strategy</span>
        </button>

        <button
          onClick={() => setActiveTab('nfr')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'nfr'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Key NFRs & Resilience</span>
        </button>

        <button
          onClick={() => setActiveTab('tradeoffs')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'tradeoffs'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Trade-offs & Risks</span>
        </button>
      </div>

      {/* Content Panes */}
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl text-zinc-300 space-y-6">
        {activeTab === 'hexagonal' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <span>Hexagonal Architecture (Ports & Adapters)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                The business domain (voice turn handling, MarkItDown token optimization, podcast orchestration) is strictly decoupled from framework concerns and external APIs.
              </p>
            </div>

            <div className="bg-zinc-950/90 rounded-xl p-4 border border-zinc-800/80 font-mono text-xs overflow-x-auto leading-relaxed text-cyan-300">
{`+-----------------------------------------------------------------------------------+
|                              PRIMARY / DRIVING PORTS                              |
|   Web Speech API (VAD)  |  MediaRecorder AudioStream  |  REST/HTTP API Controller  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                 CORE DOMAIN                                       |
|  - ProcessVoiceTurnUseCase   : Coordinates STT -> LLM Reasoning -> TTS Audio     |
|  - MarkItDownTokenOptimizer  : Document AST Stripping, Token Accounting & Padding |
|  - PodcastStudioUseCase      : Dual-speaker prompt engine (Alex/Sam + cues)       |
|  - AudiobookReaderUseCase    : Verbatim text chunker & cadence scheduler          |
|  - ContextMemoryRepository   : Rolling conversation window & session state        |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                             SECONDARY / DRIVEN PORTS                              |
|  ILLMPort             --->  Gemini 3.8 Flash Adapter (ThinkingLevel.LOW)          |
|  ISTTPort             --->  Gemini 3.5 Transcribe Adapter                        |
|  ITTSPort             --->  Gemini 3.8 Flash TTS / Lite TTS Adapter (WAV PCM)     |
|  IWebAudioPlayback    --->  Browser Web Audio API AnalyserNode & BufferSource     |
+-----------------------------------------------------------------------------------+`}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <span className="font-semibold text-cyan-400 block mb-1">Single Responsibility:</span>
                Each port handles only one facet: transcription does not know about LLM prompt formatting; token optimizer runs deterministically without external network calls.
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <span className="font-semibold text-indigo-400 block mb-1">Dependency Inversion:</span>
                Domain use cases depend strictly on abstract contracts. Adapters can be mocked or swapped (e.g. swapping Web Speech API for Local Whisper or swapping TTS providers) without touching domain logic.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'solid' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>SOLID Principles Applied in Codebase</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                <div className="font-bold text-zinc-200">S - Single Responsibility Principle (SRP)</div>
                <p className="text-zinc-400">
                  <code className="text-cyan-300">MarkItDownOptimizer</code> is solely responsible for normalizing document formats to Markdown and estimating token savings. It has no network or audio logic.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                <div className="font-bold text-zinc-200">O - Open/Closed Principle (OCP)</div>
                <p className="text-zinc-400">
                  Document parsers and TTS modes (Podcast vs. Audiobook) are designed with extensible polymorphism. New audio modes can be added without modifying existing chat pipeline logic.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                <div className="font-bold text-zinc-200">L - Liskov Substitution Principle (LSP)</div>
                <p className="text-zinc-400">
                  Audio playback mechanisms (Web Audio API buffer decode vs. fallback HTMLAudioElement vs. Browser SpeechSynthesis) conform to a unified play/stop/interruption interface.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                <div className="font-bold text-zinc-200">I - Interface Segregation Principle (ISP)</div>
                <p className="text-zinc-400">
                  Clients consume lean interfaces: a voice listener does not need document AST definitions; an audio analyzer only consumes audio frequency arrays.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5 md:col-span-2">
                <div className="font-bold text-zinc-200">D - Dependency Inversion Principle (DIP)</div>
                <p className="text-zinc-400">
                  Controllers communicate with repositories and speech services via dependency-injected interfaces, enabling frictionless mock tests and offline development.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'testing' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-400" />
              <span>Comprehensive Testing Strategy & Matrix</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="font-semibold text-cyan-400 mb-1">1. Unit Testing (Vitest / Jest)</div>
                <p className="text-zinc-400 mb-2">
                  Verifies pure algorithmic logic, token estimation accuracy, and MarkItDown stripping.
                </p>
                <div className="bg-zinc-900 p-2.5 rounded-lg font-mono text-[11px] text-zinc-300">
                  <code>it('should reduce tokens by &gt;40% on HTML documents', () =&gt; &#123; const res = MarkItDownOptimizer.optimize('&lt;html&gt;...&lt;/html&gt;'); expect(res.savingsPercentage).toBeGreaterThan(40); &#125;);</code>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="font-semibold text-indigo-400 mb-1">2. Integration Testing (Supertest / MSW)</div>
                <p className="text-zinc-400 mb-2">
                  Tests the Express API routes with mock Gemini SDK responses to verify audio binary extraction and telemetry timing headers.
                </p>
                <div className="bg-zinc-900 p-2.5 rounded-lg font-mono text-[11px] text-zinc-300">
                  <code>test('POST /api/voice/chat returns 200 with audioBase64 and telemetry', async () =&gt; &#123; ... &#125;);</code>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="font-semibold text-emerald-400 mb-1">3. End-to-End (E2E) Testing (Playwright)</div>
                <p className="text-zinc-400 mb-2">
                  Automates microphone simulation via WebRTC fake audio streams: user triggers Speech to Aura -&gt; visualizer state transitions from 'listening' to 'thinking' to 'speaking' -&gt; interrupt button terminates playback.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="font-semibold text-amber-400 mb-1">4. Contract Testing (Pact / OpenAPI Spec)</div>
                <p className="text-zinc-400">
                  Guarantees that Google GenAI SDK payload schemas (unary WAV audio format, `responseModalities: ["AUDIO"]`, `multiSpeakerVoiceConfig`) adhere to runtime contract definitions.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nfr' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Key Non-Functional Requirements (NFRs)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Low-Latency Budget (&lt;1,200ms)</span>
                </div>
                <p className="text-zinc-400">
                  Achieved by combining client-side zero-latency Web Speech recognition with low thinking level (<code className="text-zinc-200">ThinkingLevel.LOW</code>) on Gemini 3.8 Flash, followed by immediate unary WAV streaming synthesis from <code className="text-zinc-200">gemini-3.8-flash-lite-tts</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Resilience & Circuit Breaking</span>
                </div>
                <p className="text-zinc-400">
                  If the server-side TTS service encounters transient delays or errors, the frontend gracefully falls back to client-side <code className="text-zinc-200">SpeechSynthesis</code>. If the microphone is blocked, keyboard text input is available seamlessly.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                <div className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Security by Default & Secret Hygiene</span>
                </div>
                <p className="text-zinc-400">
                  The <code className="text-zinc-200">GEMINI_API_KEY</code> is strictly server-bound. Zero API keys or secrets are bundled in the frontend assets. Session tokens isolate context per user.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Accessibility (WCAG 2.2 AA)</span>
                </div>
                <p className="text-zinc-400">
                  Full keyboard navigation, high-contrast dark palette, live captions and synchronized transcripts for all audio outputs, and aria-live announcements for screen readers.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tradeoffs' && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Architectural Trade-offs & Legal / Ethical Considerations</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="font-semibold text-amber-300 mb-1">
                  1. Unary WAV TTS vs. Raw PCM WebSocket Streaming
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">Decision:</strong> Used unary HTTP WAV generation with <code className="text-zinc-300">gemini-3.8-flash-lite-tts</code> and <code className="text-zinc-300">gemini-3.8-flash-tts</code>.
                  <br />
                  <strong className="text-zinc-200">Trade-off:</strong> Raw PCM streaming over WebSockets can start playing initial syllables ~200ms earlier, but requires complex byte-jitter buffering and WebSocket reconnection logic. Unary WAV gives complete RIFF audio files that can be replayed, visualized with AnalyserNode, scrubbed, and downloaded as podcast episodes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="font-semibold text-amber-300 mb-1">
                  2. MarkItDown Ingestion vs. Vector Embedding DB
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-200">Decision:</strong> Lightweight deterministic markdown normalization and direct sliding-window context injection.
                  <br />
                  <strong className="text-zinc-200">Trade-off:</strong> Highly cost-effective and token-efficient for short-to-medium documents (&lt;100k tokens), without cold-start vector index latency. For massive multi-gigabyte document corpora, adding an external vector index (RAG) would be the next step.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="font-semibold text-amber-300 mb-1">
                  3. Legal, Ethical & ToS Considerations for Audio & Document Processing
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Voice assistants synthesize speech simulating human personalities. Users must be transparently informed that synthesized voices are artificial AI voices. Uploaded documents are parsed strictly within user sessions without persisting or training external models.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
