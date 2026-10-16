import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Cpu,
  Trash2,
  Save,
  CheckCircle2,
  Sliders,
  HardDrive,
} from 'lucide-react';
import { UserVoiceProfile, VoicePersona, IngestedDocument } from '../types';

interface ContextManagerProps {
  sessionId: string;
  profile: UserVoiceProfile;
  documents: IngestedDocument[];
  onProfileUpdate: (p: UserVoiceProfile) => void;
}

export const ContextManager: React.FC<ContextManagerProps> = ({
  sessionId,
  profile,
  documents,
  onProfileUpdate,
}) => {
  const [userName, setUserName] = useState(profile.userName);
  const [voicePersona, setVoicePersona] = useState<VoicePersona>(profile.voicePersona);
  const [roleOrField, setRoleOrField] = useState(profile.roleOrField);
  const [conciseness, setConciseness] = useState(profile.conciseness);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handleSave = async () => {
    const updated: UserVoiceProfile = {
      ...profile,
      userName,
      voicePersona,
      roleOrField,
      conciseness,
    };
    onProfileUpdate(updated);

    try {
      await fetch(`/api/context/${sessionId}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName,
          voicePersona,
          systemPrompt: `You are Aura, an ultra-low-latency personalized voice assistant for ${userName}, who specializes in ${roleOrField}. Deliver conversational responses with ${conciseness} style. Avoid markdown markup or symbols in spoken voice mode.`,
        }),
      });
      setStatusNotice('Profile and personalized system prompt saved!');
      setTimeout(() => setStatusNotice(null), 3500);
    } catch (e: any) {
      setStatusNotice('Error updating profile: ' + e.message);
    }
  };

  const totalDocTokens = documents.reduce((sum, d) => sum + d.optimizedTokens, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* User Voice Profile & Authentication Security */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  User Voice Identity & Personalization
                </h3>
                <p className="text-xs text-zinc-400">
                  Secured session-based memory & conversational adaptation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Session Authenticated</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Preferred Display Name / Voice Call-sign
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full bg-zinc-950/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Domain Specialization / Role Context
              </label>
              <input
                type="text"
                value={roleOrField}
                onChange={(e) => setRoleOrField(e.target.value)}
                placeholder="e.g. Full-Stack Systems Architect & Machine Learning Engineer"
                className="w-full bg-zinc-950/80 border border-zinc-700/60 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Aura adapts technical terminology, analogies, and conciseness to your domain.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Default Synthesizer Voice
                </label>
                <select
                  value={voicePersona}
                  onChange={(e) => setVoicePersona(e.target.value as VoicePersona)}
                  className="w-full bg-zinc-950/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="Kore">Kore (Warm, Balanced)</option>
                  <option value="Puck">Puck (Energetic, Crisp)</option>
                  <option value="Zephyr">Zephyr (Deliberate, Narrative)</option>
                  <option value="Fenrir">Fenrir (Authoritative, Low)</option>
                  <option value="Charon">Charon (Calm, Minimalist)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Spoken Conciseness
                </label>
                <select
                  value={conciseness}
                  onChange={(e) => setConciseness(e.target.value as any)}
                  className="w-full bg-zinc-950/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ultra-brief">Ultra-Brief (1-2 sentences)</option>
                  <option value="balanced">Balanced (2-3 sentences)</option>
                  <option value="detailed">In-Depth Analytical</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="mt-2 w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-lg shadow-cyan-600/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Update Voice Profile & System Prompt</span>
            </button>

            {statusNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{statusNotice}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Context Token Budget & Health */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Memory Health Card */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 shadow-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Active Context Window Health
            </h3>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Session ID</span>
              <span className="font-mono text-cyan-400 text-[11px] truncate max-w-[160px]">
                {sessionId}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Attached Knowledge Tokens</span>
              <span className="font-mono text-zinc-200 font-semibold">
                ~{totalDocTokens.toLocaleString()} tokens
              </span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Rolling Conversational Buffer</span>
              <span className="font-mono text-zinc-200">Last 10 turns (Sliding Window)</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Memory Strategy</span>
              <span className="text-emerald-400 font-mono text-[11px]">MarkItDown Compression</span>
            </div>
          </div>
        </div>

        {/* Resilience & Isolation Info */}
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/70 p-5 text-xs text-zinc-400 space-y-2">
          <div className="flex items-center gap-2 text-zinc-200 font-medium">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <span>Persistence & Security by Default</span>
          </div>
          <p className="leading-relaxed">
            All user sessions are partitioned via secure session identifiers. Voice audio payloads are decoded in-memory and never exposed outside the secure proxy runtime.
          </p>
        </div>
      </div>
    </div>
  );
};
