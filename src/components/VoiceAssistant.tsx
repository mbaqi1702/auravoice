import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Send,
  Zap,
  Volume2,
  Sparkles,
  Paperclip,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { AudioEngine } from '../lib/audio-player';
import { AudioVisualizer } from './AudioVisualizer';
import {
  ChatMessage,
  VoicePersona,
  IngestedDocument,
  UserVoiceProfile,
} from '../types';

interface VoiceAssistantProps {
  sessionId: string;
  audioEngine: AudioEngine;
  profile: UserVoiceProfile;
  documents: IngestedDocument[];
  onProfileChange: (p: Partial<UserVoiceProfile>) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  sessionId,
  audioEngine,
  profile,
  documents,
  onProfileChange,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_1',
      role: 'model',
      text: `Hello ${profile.userName}! I am Aura, your ultra-low-latency voice assistant. You can speak to me directly, type questions, or connect uploaded documents for real-time contextual knowledge. How can I assist you right now?`,
      timestamp: Date.now(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [lastTelemetry, setLastTelemetry] = useState<{
    llmLatencyMs: number;
    ttsLatencyMs: number;
    totalTurnLatencyMs: number;
  } | null>(null);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [speechPreview, setSpeechPreview] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard accessibility: Esc to interrupt, / to focus composer, Space to talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea';

      if (e.key === 'Escape') {
        handleInterrupt();
      } else if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, speechPreview]);

  // Sync AudioEngine end state with assistant status
  useEffect(() => {
    const checkState = () => {
      if (!audioEngine.getIsPlaying() && status === 'speaking') {
        setStatus('idle');
      }
    };
    const interval = setInterval(checkState, 200);
    return () => clearInterval(interval);
  }, [status, audioEngine]);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setSpeechPreview(transcript);
        if (event.results[0].isFinal) {
          handleUserSend(transcript);
          setSpeechPreview('');
          setIsRecording(false);
          setStatus('thinking');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition notice:', event.error);
        setIsRecording(false);
        if (status === 'listening') setStatus('idle');
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (status === 'listening') setStatus('idle');
      };

      recognitionRef.current = recognition;
    }
  }, [selectedDocIds, profile]);

  // Start voice input
  const startListening = async () => {
    setErrorMessage(null);
    audioEngine.stopPlayback();

    // Try Web Speech Recognition for instant zero-latency speech preview
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setStatus('listening');
        setSpeechPreview('');
        return;
      } catch (err) {
        console.warn('Speech recognition start failed, using MediaRecorder fallback:', err);
      }
    }

    // MediaRecorder fallback (records audio and sends to Gemini 3.5 Transcribe)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        await processRecordedAudio(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
      setStatus('listening');
    } catch (err: any) {
      setErrorMessage('Microphone access denied or unsupported. Please use text input.');
      setIsRecording(false);
      setStatus('idle');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (status === 'listening') setStatus('thinking');
  };

  const processRecordedAudio = async (blob: Blob) => {
    setStatus('thinking');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const res = await fetch('/api/voice/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64data, mimeType: 'audio/webm' }),
        });
        const data = await res.json();
        if (data.transcript && data.transcript.trim()) {
          handleUserSend(data.transcript);
        } else {
          setStatus('idle');
          setErrorMessage('Could not recognize speech, please try again.');
        }
      };
    } catch (e) {
      setStatus('idle');
      setErrorMessage('Audio transcription error.');
    }
  };

  const handleInterrupt = () => {
    audioEngine.stopPlayback();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setStatus('idle');
  };

  // Main turn processor
  const handleUserSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    setInputQuery('');
    setSpeechPreview('');
    setErrorMessage(null);

    const userMsgId = 'msg_' + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setStatus('thinking');

    try {
      const res = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessage: trimmed,
          voicePersona: profile.voicePersona,
          contextDocumentIds: selectedDocIds,
          synthesizeAudio: true,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: 'reply_' + Date.now(),
        role: 'model',
        text: data.replyText,
        timestamp: Date.now(),
        audioBase64: data.audioBase64,
        telemetry: data.telemetry,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (data.telemetry) {
        setLastTelemetry(data.telemetry);
      }

      // Audio playback with Web Audio API
      if (data.audioBase64) {
        setStatus('speaking');
        await audioEngine.playWavBase64(data.audioBase64, () => {
          setStatus('idle');
        });
      } else {
        // Fallback to browser TTS if server audio is empty
        setStatus('speaking');
        audioEngine.speakWithBrowserFallback(data.replyText, () => {
          setStatus('idle');
        });
      }
    } catch (err: any) {
      console.error('Conversation error:', err);
      setErrorMessage(`Conversation request failed: ${err.message}`);
      setStatus('idle');
    }
  };

  const replayMessageAudio = async (msg: ChatMessage) => {
    if (msg.audioBase64) {
      setStatus('speaking');
      await audioEngine.playWavBase64(msg.audioBase64, () => {
        setStatus('idle');
      });
    } else {
      setStatus('speaking');
      audioEngine.speakWithBrowserFallback(msg.text, () => {
        setStatus('idle');
      });
    }
  };

  const clearChat = async () => {
    try {
      await fetch(`/api/context/${sessionId}/history`, { method: 'DELETE' });
      setMessages([
        {
          id: 'reset_1',
          role: 'model',
          text: `Context memory cleared! What would you like to explore next?`,
          timestamp: Date.now(),
        },
      ]);
      setLastTelemetry(null);
    } catch (e) {
      console.error(e);
    }
  };

  const voices: VoicePersona[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      {/* Left Column: Visualizer Orb, Telemetry & Voice Controls */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Interactive Aura Card */}
        <div className="relative rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-6 flex flex-col items-center justify-between shadow-xl backdrop-blur-xl overflow-hidden min-h-[380px]">
          {/* Subtle Ambient Background Gradient */}
          <div className="absolute inset-0 bg-radial from-cyan-500/5 via-indigo-500/5 to-transparent pointer-events-none" />

          {/* Top Bar: Persona & State */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    status === 'listening'
                      ? 'bg-emerald-400'
                      : status === 'speaking'
                      ? 'bg-sky-400'
                      : status === 'thinking'
                      ? 'bg-purple-400'
                      : 'bg-zinc-500'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    status === 'listening'
                      ? 'bg-emerald-500'
                      : status === 'speaking'
                      ? 'bg-sky-500'
                      : status === 'thinking'
                      ? 'bg-purple-500'
                      : 'bg-zinc-600'
                  }`}
                />
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                {status === 'listening'
                  ? 'Listening to Speech...'
                  : status === 'thinking'
                  ? 'Reasoning & Generating...'
                  : status === 'speaking'
                  ? 'Synthesizing Spoken Voice'
                  : 'Ready'}
              </span>
            </div>

            {/* Voice Persona Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-800/60 rounded-lg px-2.5 py-1 border border-zinc-700/50">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <select
                aria-label="Voice Persona"
                value={profile.voicePersona}
                onChange={(e) => onProfileChange({ voicePersona: e.target.value as VoicePersona })}
                className="bg-transparent text-xs text-zinc-200 font-medium focus:outline-none cursor-pointer"
              >
                {voices.map((v) => (
                  <option key={v} value={v} className="bg-zinc-900 text-zinc-200">
                    Voice: {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center: Audio Visualizer */}
          <div className="my-auto z-10 flex flex-col items-center">
            <AudioVisualizer status={status} audioEngine={audioEngine} />
            {speechPreview && (
              <p className="mt-2 text-sm text-cyan-300 animate-pulse text-center max-w-xs font-mono">
                "{speechPreview}"
              </p>
            )}
          </div>

          {/* Bottom Controls: Mic Action & Interrupt */}
          <div className="w-full flex items-center justify-center gap-3 z-10 pt-2">
            {!isRecording ? (
              <button
                onClick={startListening}
                className="group relative flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 cursor-pointer"
              >
                <Mic className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span>Speak to Aura</span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="group flex items-center gap-2.5 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-lg shadow-rose-600/30 transition-all transform active:scale-95 cursor-pointer animate-pulse"
              >
                <MicOff className="w-5 h-5" />
                <span>Finish Speaking</span>
              </button>
            )}

            {status === 'speaking' && (
              <button
                onClick={handleInterrupt}
                title="Interrupt / Stop Voice"
                className="flex items-center gap-2 px-4 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium border border-zinc-700 transition cursor-pointer"
              >
                <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span className="text-xs">Interrupt</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Telemetry & Context Ingestion Strip */}
        <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Latency Optimization Telemetry</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">Target &lt;1.2s</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-2.5 text-center">
              <div className="text-[11px] text-zinc-400">LLM Reasoning</div>
              <div className="text-base font-semibold font-mono text-cyan-400">
                {lastTelemetry ? `${lastTelemetry.llmLatencyMs}ms` : '—'}
              </div>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-2.5 text-center">
              <div className="text-[11px] text-zinc-400">TTS Audio</div>
              <div className="text-base font-semibold font-mono text-indigo-400">
                {lastTelemetry ? `${lastTelemetry.ttsLatencyMs}ms` : '—'}
              </div>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-2.5 text-center">
              <div className="text-[11px] text-zinc-400">Total Roundtrip</div>
              <div className="text-base font-semibold font-mono text-emerald-400">
                {lastTelemetry ? `${lastTelemetry.totalTurnLatencyMs}ms` : '—'}
              </div>
            </div>
          </div>

          {/* Attached Document Reference Context */}
          {documents.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/60">
              <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5 mb-2">
                <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                <span>Inject Document Knowledge into Context:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {documents.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocIds((prev) =>
                          isSelected ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
                        );
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-medium'
                          : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                      )}
                      <span className="truncate max-w-[140px]">{doc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Conversational Transcript Terminal */}
      <div className="lg:col-span-7 flex flex-col rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-xl backdrop-blur-xl h-[620px] overflow-hidden">
        {/* Terminal Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-semibold text-zinc-200">Conversation Stream</span>
            <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">
              {messages.length} turns
            </span>
          </div>

          <button
            onClick={clearChat}
            title="Clear context history"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-400 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-zinc-800/40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Context</span>
          </button>
        </div>

        {/* Message Log */}
        <div
          ref={chatScrollRef}
          className="flex-1 p-5 overflow-y-auto space-y-4 scroll-smooth focus:outline-none"
          tabIndex={0}
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-medium text-zinc-400">
                    {isUser ? profile.userName : 'Aura Voice'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed transition ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs shadow-md shadow-blue-600/10'
                      : 'bg-zinc-800/90 text-zinc-200 rounded-tl-xs border border-zinc-700/60 shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Audio Playback replay button for assistant responses */}
                  {!isUser && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-700/50 flex items-center justify-between text-[11px] text-zinc-400">
                      <button
                        onClick={() => replayMessageAudio(msg)}
                        className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Replay Audio</span>
                      </button>

                      {msg.telemetry && (
                        <span className="font-mono text-zinc-400">
                          {msg.telemetry.totalTurnLatencyMs}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {status === 'thinking' && (
            <div className="flex items-center gap-2 text-xs text-purple-400 font-medium p-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>Aura is reasoning and preparing speech...</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-zinc-950/40 border-t border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider shrink-0 mr-1">
            Prompt:
          </span>
          <button
            type="button"
            onClick={() => handleUserSend('Calculate 15% of 240')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700/80 text-zinc-300 hover:text-cyan-300 border border-zinc-700/40 transition shrink-0 cursor-pointer"
          >
            Calculate 15% of 240
          </button>
          <button
            type="button"
            onClick={() => handleUserSend('Summarize the key insights of the attached document.')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700/80 text-zinc-300 hover:text-cyan-300 border border-zinc-700/40 transition shrink-0 cursor-pointer"
          >
            Summarize attached document
          </button>
          <button
            type="button"
            onClick={() => handleUserSend('Explain the difference between superposition and entanglement in quantum mechanics.')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700/80 text-zinc-300 hover:text-cyan-300 border border-zinc-700/40 transition shrink-0 cursor-pointer"
          >
            Quantum mechanics summary
          </button>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUserSend(inputQuery);
          }}
          className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Type your message or click 'Speak to Aura' (Press '/' to focus)..."
            className="flex-1 bg-zinc-900/90 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || status === 'thinking'}
            aria-label="Send message"
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
