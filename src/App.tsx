import React, { useState, useEffect } from 'react';
import {
  Mic,
  FileText,
  User,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Layers,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { AudioEngine } from './lib/audio-player';
import { VoiceAssistant } from './components/VoiceAssistant';
import { DocumentStudio } from './components/DocumentStudio';
import { ContextManager } from './components/ContextManager';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { IngestedDocument, UserVoiceProfile } from './types';
import { SAMPLE_DOCUMENTS, MarkItDownOptimizer } from './lib/markitdown';

export default function App() {
  const [activeTab, setActiveTab] = useState<'assistant' | 'studio' | 'context' | 'architecture'>('assistant');
  const [sessionId] = useState<string>(() => 'aura_' + Math.random().toString(36).substring(2, 9));
  const [audioEngine] = useState<AudioEngine>(() => AudioEngine.getInstance());
  const [isMuted, setIsMuted] = useState(false);

  const [profile, setProfile] = useState<UserVoiceProfile>({
    userName: 'Explorer',
    voicePersona: 'Kore',
    roleOrField: 'Software Engineer & AI Researcher',
    speed: 1.0,
    conciseness: 'balanced',
    handsFreeVad: false,
  });

  const [documents, setDocuments] = useState<IngestedDocument[]>([]);

  // Seed default initial document from SAMPLE_DOCUMENTS
  useEffect(() => {
    const defaultSample = SAMPLE_DOCUMENTS[0];
    const opt = MarkItDownOptimizer.optimize(defaultSample.content, defaultSample.name, defaultSample.type);
    const initialDoc: IngestedDocument = {
      id: 'doc_init_1',
      name: defaultSample.name,
      fileType: defaultSample.type,
      originalTokens: opt.originalTokens,
      optimizedTokens: opt.optimizedTokens,
      tokenSavingsPercentage: opt.savingsPercentage,
      uploadedAt: Date.now(),
      markdownContent: opt.cleanMarkdown,
    };
    setDocuments([initialDoc]);

    // Pre-populate server session
    fetch('/api/documents/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        fileName: defaultSample.name,
        fileType: defaultSample.type,
        rawContent: opt.cleanMarkdown,
      }),
    }).catch((e) => console.warn('Init doc ingest notice:', e));
  }, [sessionId]);

  const handleDocumentAdded = (newDoc: IngestedDocument) => {
    setDocuments((prev) => {
      const exists = prev.find((d) => d.id === newDoc.id);
      if (exists) return prev;
      return [newDoc, ...prev];
    });
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      audioEngine.stopPlayback();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <Radio className="w-5 h-5 text-white" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-zinc-100">
                  Aura<span className="text-cyan-400">Voice</span>
                </span>
                <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  Hexagonal v2.5
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Low-Latency STT/TTS • MarkItDown Engine • Podcast & Audiobook Studio
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80 text-xs">
            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'assistant'
                  ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('studio')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'studio'
                  ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Document Audio Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('context')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'context'
                  ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Context & Memory</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'bg-zinc-800 text-cyan-400 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Architecture & SOLID</span>
              <span className="md:hidden">Arch</span>
            </button>
          </nav>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-zinc-100'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{profile.voicePersona}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'assistant' && (
          <VoiceAssistant
            sessionId={sessionId}
            audioEngine={audioEngine}
            profile={profile}
            documents={documents}
            onProfileChange={(partial) => setProfile((prev) => ({ ...prev, ...partial }))}
          />
        )}

        {activeTab === 'studio' && (
          <DocumentStudio
            sessionId={sessionId}
            audioEngine={audioEngine}
            documents={documents}
            onDocumentAdded={handleDocumentAdded}
          />
        )}

        {activeTab === 'context' && (
          <ContextManager
            sessionId={sessionId}
            profile={profile}
            documents={documents}
            onProfileUpdate={setProfile}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureDocs />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/60 py-4 px-6 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>AuraVoice Studio</span>
          <span>•</span>
          <span>Hexagonal Domain Architecture</span>
          <span>•</span>
          <span className="text-zinc-400">Gemini 3.8 Flash, Flash TTS, Transcribe</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-500 font-mono">WCAG 2.2 AA Compliant</span>
          <span>•</span>
          <span>Sub-Second Turnaround</span>
        </div>
      </footer>
    </div>
  );
}
