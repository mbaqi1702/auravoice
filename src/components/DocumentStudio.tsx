import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Radio,
  BookOpen,
  Sparkles,
  Play,
  Pause,
  Download,
  CheckCircle,
  FileSpreadsheet,
  FileCode,
  Layers,
  Flame,
  Volume2,
  Trash2,
} from 'lucide-react';
import { IngestedDocument, AudioCreation, VoicePersona } from '../types';
import { MarkItDownOptimizer, SAMPLE_DOCUMENTS } from '../lib/markitdown';
import { AudioEngine } from '../lib/audio-player';

interface DocumentStudioProps {
  sessionId: string;
  audioEngine: AudioEngine;
  documents: IngestedDocument[];
  onDocumentAdded: (doc: IngestedDocument) => void;
  onDocumentDeleted?: (id: string) => void;
}

export const DocumentStudio: React.FC<DocumentStudioProps> = ({
  sessionId,
  audioEngine,
  documents,
  onDocumentAdded,
  onDocumentDeleted,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    documents[0]?.id || ''
  );
  const [activeMode, setActiveMode] = useState<'podcast' | 'audiobook'>('podcast');
  const [podcastStyle, setPodcastStyle] = useState<'engaging' | 'analytical' | 'humorous'>('engaging');
  const [narratorVoice, setNarratorVoice] = useState<VoicePersona>('Zephyr');
  const [maxAudiobookWords, setMaxAudiobookWords] = useState<number>(200);
  const [sectionHeading, setSectionHeading] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [currentCreation, setCurrentCreation] = useState<AudioCreation | null>(null);
  const [creationsHistory, setCreationsHistory] = useState<AudioCreation[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/documents/${sessionId}/${docId}`, { method: 'DELETE' });
      if (onDocumentDeleted) {
        onDocumentDeleted(docId);
      }
      setStatusMessage('Document deleted from active session context.');
    } catch (err: any) {
      setStatusMessage('Failed to delete document: ' + err.message);
    }
  };

  const currentDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage('Normalizing document with MarkItDown engine...');
    const reader = new FileReader();

    reader.onload = async (event) => {
      const rawText = event.target?.result as string;
      const opt = MarkItDownOptimizer.optimize(rawText, file.name, file.type);

      try {
        const res = await fetch('/api/documents/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            fileName: opt.fileName,
            fileType: opt.fileType,
            rawContent: opt.cleanMarkdown,
          }),
        });
        const data = await res.json();
        if (data.document) {
          onDocumentAdded({
            ...data.document,
            markdownContent: opt.cleanMarkdown,
          });
          setSelectedDocId(data.document.id);
          setStatusMessage(`Uploaded & formalized "${file.name}" with ${opt.savingsPercentage}% token reduction.`);
        }
      } catch (err: any) {
        setStatusMessage('Error ingesting document: ' + err.message);
      }
    };

    reader.readAsText(file);
  };

  const handleLoadSample = async (sample: typeof SAMPLE_DOCUMENTS[0]) => {
    setStatusMessage(`Loading sample "${sample.name}" into MarkItDown...`);
    const opt = MarkItDownOptimizer.optimize(sample.content, sample.name, sample.type);

    try {
      const res = await fetch('/api/documents/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fileName: sample.name,
          fileType: sample.type,
          rawContent: opt.cleanMarkdown,
        }),
      });
      const data = await res.json();
      if (data.document) {
        onDocumentAdded({
          ...data.document,
          markdownContent: opt.cleanMarkdown,
        });
        setSelectedDocId(data.document.id);
        setStatusMessage(`Sample loaded: saved ${opt.savingsPercentage}% tokens through markdown normalization.`);
      }
    } catch (err: any) {
      setStatusMessage('Error: ' + err.message);
    }
  };

  // Generate Podcast Summary (Gemini 3.8 Flash TTS dual speaker)
  const handleGeneratePodcast = async () => {
    if (!currentDoc) {
      setStatusMessage('Please select or upload a document first.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('Drafting multi-speaker screenplay (Alex & Sam)...');
    audioEngine.stopPlayback();
    setIsPlaying(false);

    try {
      const res = await fetch('/api/audio/podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          documentId: currentDoc.id,
          podcastStyle,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      setGenerationProgress('Synthesizing dual-speaker WAV audio with gemini-3.8-flash-tts...');
      const data = await res.json();

      if (data.creation) {
        setCurrentCreation(data.creation);
        setCreationsHistory((prev) => [data.creation, ...prev]);
        setStatusMessage(`Podcast generated successfully in ${Math.round(data.generationTimeMs / 1000)}s!`);

        // Auto-play creation
        if (data.creation.audioBase64) {
          setIsPlaying(true);
          await audioEngine.playWavBase64(data.creation.audioBase64, () => {
            setIsPlaying(false);
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Failed to generate podcast: ' + err.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  // Generate Audiobook Verbatim Reading (Gemini 3.8 Flash Lite TTS)
  const handleGenerateAudiobook = async () => {
    if (!currentDoc) {
      setStatusMessage('Please select or upload a document first.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('Preparing verbatim excerpt without content alteration...');
    audioEngine.stopPlayback();
    setIsPlaying(false);

    try {
      const res = await fetch('/api/audio/audiobook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          documentId: currentDoc.id,
          narratorVoice,
          maxWords: maxAudiobookWords,
          sectionHeading: sectionHeading.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      setGenerationProgress('Synthesizing audiobook narration with gemini-3.8-flash-lite-tts...');
      const data = await res.json();

      if (data.creation) {
        setCurrentCreation(data.creation);
        setCreationsHistory((prev) => [data.creation, ...prev]);
        setStatusMessage(`Audiobook narration synthesized successfully!`);

        if (data.creation.audioBase64) {
          setIsPlaying(true);
          await audioEngine.playWavBase64(data.creation.audioBase64, () => {
            setIsPlaying(false);
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Failed to generate audiobook: ' + err.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const togglePlayback = async (creation: AudioCreation) => {
    if (isPlaying) {
      audioEngine.stopPlayback();
      setIsPlaying(false);
    } else if (creation.audioBase64) {
      setIsPlaying(true);
      await audioEngine.playWavBase64(creation.audioBase64, () => {
        setIsPlaying(false);
      });
    }
  };

  const downloadWav = (creation: AudioCreation) => {
    if (!creation.audioBase64) return;
    const link = document.createElement('a');
    link.href = `data:audio/wav;base64,${creation.audioBase64}`;
    link.download = `${creation.title.replace(/\s+/g, '_')}.wav`;
    link.click();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner: MarkItDown Formalizer Philosophy */}
      <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-indigo-950/30 to-zinc-900 border border-zinc-800 p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <span>MarkItDown Token Optimization & Document Audio Studio</span>
              <span className="text-[11px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Token-Saver
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Normalizes raw PDFs, HTML, CSV, and text into dense Markdown. Reduces prompt token overhead by up to 70% before audio transformation.
            </p>
          </div>
        </div>

        {/* Quick Load Sample Documents */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 font-medium">Try Samples:</span>
          {SAMPLE_DOCUMENTS.map((sample) => (
            <button
              key={sample.name}
              onClick={() => handleLoadSample(sample)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 text-zinc-200 transition cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>{sample.name.split('.')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Upload & Document Selector + Studio Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Dropzone & Document Specs */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* File Upload Box */}
          <div className="relative rounded-2xl bg-zinc-900/80 border border-dashed border-zinc-700/80 p-6 flex flex-col items-center justify-center text-center group hover:border-cyan-500/50 transition">
            <input
              type="file"
              accept=".txt,.md,.markdown,.csv,.json,.html,.pdf"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="p-3 rounded-full bg-zinc-800/80 group-hover:bg-cyan-500/10 text-zinc-400 group-hover:text-cyan-400 transition mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-zinc-200">
              Drop documents here or <span className="text-cyan-400 underline">browse</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Supports .md, .txt, .csv, .json, .html, .pdf extracts
            </p>
          </div>

          {/* Active Documents List */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Loaded Documents ({documents.length})
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {documents.length === 0 ? (
                <div className="text-xs text-zinc-500 py-3 text-center">
                  No documents loaded yet. Click a sample above or upload a file.
                </div>
              ) : (
                documents.map((doc) => {
                  const isSelected = doc.id === currentDoc?.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                          : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-300 hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {doc.fileType.includes('csv') ? (
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : doc.fileType.includes('code') || doc.name.endsWith('.md') ? (
                          <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className="text-xs font-medium truncate">{doc.name}</div>
                          <div className="text-[10px] text-zinc-400">
                            {doc.optimizedTokens} tokens (saved {doc.tokenSavingsPercentage}%)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelected && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                        <button
                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                          title="Delete document from session"
                          className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Token Compression Metrics Card */}
          {currentDoc && (
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-300">MarkItDown Token Efficiency</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  -{currentDoc.tokenSavingsPercentage}% tokens
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(10, 100 - currentDoc.tokenSavingsPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400 mt-2">
                <span>Original: ~{currentDoc.originalTokens} tokens</span>
                <span>Optimized: ~{currentDoc.optimizedTokens} tokens</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Audio Generation Modes & Player */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Mode Switcher: Podcast vs Audiobook */}
          <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 shadow-xl">
            <div className="flex items-center gap-2 p-1 bg-zinc-950/70 rounded-xl border border-zinc-800/80 mb-5">
              <button
                onClick={() => setActiveMode('podcast')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeMode === 'podcast'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Mode A: Multi-Speaker Podcast</span>
              </button>

              <button
                onClick={() => setActiveMode('audiobook')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeMode === 'audiobook'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Mode B: Verbatim Audiobook</span>
              </button>
            </div>

            {/* Mode A Config: Podcast */}
            {activeMode === 'podcast' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-300">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gemini 3.8 Flash TTS Multi-Speaker Engine</span>
                  </div>
                  Generates natural backchanneling (<code className="text-cyan-200">|yeah|</code>, <code className="text-cyan-200">|mhm|</code>) and vocal bursts (<code className="text-cyan-200">&lt;laugh&gt;</code>) between host Alex (Puck) & domain analyst Sam (Kore).
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">
                      Podcast Tone & Style
                    </label>
                    <select
                      value={podcastStyle}
                      onChange={(e) => setPodcastStyle(e.target.value as any)}
                      className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="engaging">Engaging & Dynamic</option>
                      <option value="analytical">Deep-Dive Technical</option>
                      <option value="humorous">Humorous & Witty</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">
                      Co-Host Personas
                    </label>
                    <div className="text-xs text-zinc-300 bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-3 py-2 flex items-center justify-between">
                      <span>Alex (Puck) & Sam (Kore)</span>
                      <span className="text-[10px] text-cyan-400 font-mono">2 Speakers</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGeneratePodcast}
                  disabled={isGenerating || !currentDoc}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating Podcast Episode...' : 'Generate Podcast Episode'}</span>
                </button>
              </div>
            )}

            {/* Mode B Config: Audiobook */}
            {activeMode === 'audiobook' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-800/30 text-xs text-indigo-300">
                  <div className="font-semibold mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Verbatim Audiobook Narration (gemini-3.8-flash-lite-tts)</span>
                  </div>
                  Reads the document verbatim with steady cadence, zero alteration, and high fidelity.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">
                      Narrator Voice Persona
                    </label>
                    <select
                      value={narratorVoice}
                      onChange={(e) => setNarratorVoice(e.target.value as VoicePersona)}
                      className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Zephyr">Zephyr (Warm & Narrative)</option>
                      <option value="Kore">Kore (Clear & Elegant)</option>
                      <option value="Fenrir">Fenrir (Authoritative & Deep)</option>
                      <option value="Puck">Puck (Expressive & Crisp)</option>
                      <option value="Charon">Charon (Calm & Deliberate)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 font-medium block mb-1">
                      Excerpt Length
                    </label>
                    <select
                      value={maxAudiobookWords}
                      onChange={(e) => setMaxAudiobookWords(Number(e.target.value))}
                      className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value={150}>150 words (~1 min)</option>
                      <option value={250}>250 words (~1.5 mins)</option>
                      <option value={400}>400 words (~2.5 mins)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 font-medium block mb-1">
                    Section Filter / Chapter (Optional)
                  </label>
                  <input
                    type="text"
                    value={sectionHeading}
                    onChange={(e) => setSectionHeading(e.target.value)}
                    placeholder="e.g. Executive Summary, Chapter 1, Latency Budget"
                    className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Slices text starting from this heading up to the next heading.
                  </span>
                </div>

                <button
                  onClick={handleGenerateAudiobook}
                  disabled={isGenerating || !currentDoc}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-40 text-white font-medium text-xs shadow-lg shadow-indigo-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{isGenerating ? 'Synthesizing Narration...' : 'Narrate Verbatim Audiobook'}</span>
                </button>
              </div>
            )}

            {/* In-progress status loader */}
            {isGenerating && (
              <div className="mt-4 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs text-cyan-300 flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{generationProgress}</span>
              </div>
            )}

            {statusMessage && !isGenerating && (
              <div className="mt-3 text-[11px] text-zinc-400 px-1">
                {statusMessage}
              </div>
            )}
          </div>

          {/* Active Audio Player & Screenplay View */}
          {currentCreation && (
            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => togglePlayback(currentCreation)}
                    className="p-3.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-md transition cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{currentCreation.title}</h3>
                    <p className="text-xs text-zinc-400">
                      Format: {currentCreation.type.toUpperCase()} • Approx Duration: {currentCreation.durationEstimate}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => downloadWav(currentCreation)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download WAV</span>
                </button>
              </div>

              {/* Transcript / Screenplay box */}
              <div className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3 max-h-[160px] overflow-y-auto">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Audio Screenplay & Transcript
                </div>
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {currentCreation.transcript}
                </pre>
              </div>
            </div>
          )}

          {/* Recent Creations History */}
          {creationsHistory.length > 0 && (
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/70 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Session Audio Library
              </div>
              <div className="space-y-1.5">
                {creationsHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate text-zinc-300">{item.title}</span>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentCreation(item);
                        togglePlayback(item);
                      }}
                      className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-cyan-300 cursor-pointer text-[11px]"
                    >
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
