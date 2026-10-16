/**
 * Hexagonal Domain Interfaces and Contracts for AuraVoice
 */

export type VoicePersona = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface TelemetryMetrics {
  llmLatencyMs: number;
  ttsLatencyMs: number;
  totalTurnLatencyMs: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  audioBase64?: string;
  telemetry?: TelemetryMetrics;
}

export interface IngestedDocument {
  id: string;
  name: string;
  fileType: string;
  originalTokens: number;
  optimizedTokens: number;
  tokenSavingsPercentage: number;
  uploadedAt: number;
  markdownContent?: string;
  markdownPreview?: string;
}

export interface AudioCreation {
  id: string;
  title: string;
  type: 'podcast' | 'audiobook';
  documentName: string;
  durationEstimate: string;
  audioBase64?: string;
  transcript: string;
  createdAt: number;
  hasAudio?: boolean;
}

export interface UserVoiceProfile {
  userName: string;
  voicePersona: VoicePersona;
  roleOrField: string;
  speed: number;
  conciseness: 'ultra-brief' | 'balanced' | 'detailed';
  handsFreeVad: boolean;
}

export interface ArchitecturePrinciple {
  title: string;
  principle: string;
  description: string;
  implementation: string;
}
