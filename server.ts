import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini client with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// In-Memory Hexagonal Context & Session Repository
interface StoredSession {
  id: string;
  userId: string;
  userName: string;
  voicePersona: string;
  systemPrompt: string;
  history: Array<{
    role: 'user' | 'model';
    text: string;
    timestamp: number;
    tokens?: number;
  }>;
  documents: Array<{
    id: string;
    name: string;
    fileType: string;
    originalTokens: number;
    optimizedTokens: number;
    markdownContent: string;
    uploadedAt: number;
  }>;
  audioCreations: Array<{
    id: string;
    title: string;
    type: 'podcast' | 'audiobook';
    documentName: string;
    durationEstimate: string;
    audioBase64: string;
    transcript: string;
    createdAt: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

const sessionsDatabase = new Map<string, StoredSession>();

// Helper to get or create a session
function getOrCreateSession(sessionId: string, userId = 'default_user', userName = 'Explorer'): StoredSession {
  if (!sessionsDatabase.has(sessionId)) {
    sessionsDatabase.set(sessionId, {
      id: sessionId,
      userId,
      userName,
      voicePersona: 'Kore',
      systemPrompt: 'You are Aura, an ultra-responsive, natural conversational AI voice assistant. Speak with warm, concise phrasing suitable for spoken delivery. Avoid markdown symbols, asterisks, tables, or URLs in your conversational speech unless explicitly instructed.',
      history: [],
      documents: [],
      audioCreations: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  return sessionsDatabase.get(sessionId)!;
}

// -------------------------------------------------------------
// Health & Latency Telemetry Endpoint
// -------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY),
    activeSessions: sessionsDatabase.size,
  });
});

// -------------------------------------------------------------
// Context & Memory Routes
// -------------------------------------------------------------
app.get('/api/context/:sessionId', (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.sessionId);
  res.json({
    sessionId: session.id,
    userId: session.userId,
    userName: session.userName,
    voicePersona: session.voicePersona,
    history: session.history,
    documents: session.documents.map((d) => ({
      id: d.id,
      name: d.name,
      fileType: d.fileType,
      originalTokens: d.originalTokens,
      optimizedTokens: d.optimizedTokens,
      uploadedAt: d.uploadedAt,
    })),
    audioCreationsCount: session.audioCreations.length,
    updatedAt: session.updatedAt,
  });
});

app.post('/api/context/:sessionId/profile', (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.sessionId);
  const { userName, voicePersona, systemPrompt } = req.body;
  if (userName) session.userName = userName;
  if (voicePersona) session.voicePersona = voicePersona;
  if (systemPrompt) session.systemPrompt = systemPrompt;
  session.updatedAt = Date.now();
  res.json({ success: true, session });
});

app.delete('/api/context/:sessionId/history', (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.sessionId);
  session.history = [];
  session.updatedAt = Date.now();
  res.json({ success: true, message: 'Conversation memory cleared' });
});

// -------------------------------------------------------------
// STT: Audio Transcription Route
// -------------------------------------------------------------
app.post('/api/voice/transcribe', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 parameter is required' });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe the speech in this audio exactly. Do not add commentary or filler, return only the spoken text.',
          },
        ],
      },
    });

    const transcript = response.text?.trim() || '';
    const latencyMs = Date.now() - startTime;

    return res.json({
      transcript,
      latencyMs,
    });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: 'Failed to transcribe audio',
      details: error.message || String(error),
    });
  }
});

// -------------------------------------------------------------
// Voice Assistant Conversational Pipeline (LLM + TTS with latency optimization)
// -------------------------------------------------------------
app.post('/api/voice/chat', async (req: Request, res: Response) => {
  const turnStartTime = Date.now();
  try {
    const {
      sessionId = 'default-session',
      userMessage,
      synthesizeAudio = true,
      voicePersona,
      contextDocumentIds = [],
    } = req.body;

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'userMessage is required' });
    }

    const session = getOrCreateSession(sessionId);
    const selectedVoice = voicePersona || session.voicePersona || 'Kore';

    // Build context window with optional attached documents
    let documentContext = '';
    if (contextDocumentIds.length > 0) {
      const activeDocs = session.documents.filter((d) => contextDocumentIds.includes(d.id));
      if (activeDocs.length > 0) {
        documentContext = `\n\nATTACHED REFERENCE DOCUMENTS (Optimized Markdown):\n` +
          activeDocs.map((doc) => `--- DOCUMENT: ${doc.name} ---\n${doc.markdownContent}\n--- END DOCUMENT ---`).join('\n\n');
      }
    }

    const systemInstruction = `${session.systemPrompt}
User profile name: ${session.userName}.
Always deliver your conversational response naturally, concisely (1 to 3 spoken sentences unless the user asked for a deep breakdown), suitable for spoken audio. Do not emit markdown formatting like asterisks, bullet points, or code blocks in voice mode.${documentContext}`;

    // Manage rolling memory to avoid token degradation & keep latency low (last 10 turns)
    const rollingHistory = session.history.slice(-10);
    const conversationContents = rollingHistory.map((item) => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    // Add current user turn
    conversationContents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    // 1. LLM Generation with minimal thinking for ultra-fast conversational latency
    const llmStartTime = Date.now();
    const chatResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: conversationContents,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    });

    const assistantText = chatResponse.text?.trim() || 'I heard you, how else may I assist you today?';
    const llmLatencyMs = Date.now() - llmStartTime;

    // Persist to session memory
    session.history.push({
      role: 'user',
      text: userMessage,
      timestamp: Date.now(),
    });
    session.history.push({
      role: 'model',
      text: assistantText,
      timestamp: Date.now(),
    });
    session.updatedAt = Date.now();

    // 2. TTS Generation via gemini-3.8-flash-lite-tts (returns standard complete WAV)
    let audioBase64: string | null = null;
    let ttsLatencyMs = 0;

    if (synthesizeAudio) {
      const ttsStartTime = Date.now();
      try {
        const speechResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash-lite-tts',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: assistantText,
                  speechMetadata: {
                    style: 'Warm, natural, clear conversational tone',
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        });

        const rawAudio = speechResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (rawAudio) {
          audioBase64 = rawAudio;
        }
      } catch (ttsErr: any) {
        console.warn('TTS Synthesis warning (falling back to client voice synthesis):', ttsErr.message);
      }
      ttsLatencyMs = Date.now() - ttsStartTime;
    }

    const totalTurnLatencyMs = Date.now() - turnStartTime;

    return res.json({
      replyText: assistantText,
      audioBase64,
      voiceUsed: selectedVoice,
      telemetry: {
        llmLatencyMs,
        ttsLatencyMs,
        totalTurnLatencyMs,
      },
      historyLength: session.history.length,
    });
  } catch (error: any) {
    console.error('Voice chat error:', error);
    return res.status(500).json({
      error: 'Voice conversation failed',
      details: error.message || String(error),
    });
  }
});

// -------------------------------------------------------------
// Document Ingestion & MarkItDown Token Optimization
// -------------------------------------------------------------
app.post('/api/documents/ingest', (req: Request, res: Response) => {
  try {
    const {
      sessionId = 'default-session',
      fileName,
      fileType,
      rawContent,
    } = req.body;

    if (!rawContent || !fileName) {
      return res.status(400).json({ error: 'fileName and rawContent are required' });
    }

    const session = getOrCreateSession(sessionId);

    // MarkItDown Engine: Strip noise, convert tabular/structured text to clean markdown
    // Estimate tokens: ~4 characters per token
    const rawTokensEstimate = Math.ceil(rawContent.length / 4);

    let cleanMarkdown = rawContent;

    // 1. Remove HTML tags, script, style tags if present
    cleanMarkdown = cleanMarkdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleanMarkdown = cleanMarkdown.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    cleanMarkdown = cleanMarkdown.replace(/<[^>]+>/g, ' ');

    // 2. Collapse repetitive whitespace and redundant linebreaks
    cleanMarkdown = cleanMarkdown.replace(/[ \t]+/g, ' ');
    cleanMarkdown = cleanMarkdown.replace(/\n\s*\n\s*\n+/g, '\n\n');

    // 3. Remove repetitive divider lines (e.g., ---------- or =========)
    cleanMarkdown = cleanMarkdown.replace(/^[-=_*]{3,}$/gm, '---');

    // 4. Format CSV / TSV to Markdown table if CSV
    if (fileType.includes('csv') || fileName.endsWith('.csv')) {
      const lines = cleanMarkdown.trim().split('\n');
      if (lines.length > 0) {
        const header = lines[0].split(',').map((c: string) => c.trim()).join(' | ');
        const separator = lines[0].split(',').map(() => '---').join(' | ');
        const rows = lines.slice(1).map((line: string) => line.split(',').map((c: string) => c.trim()).join(' | '));
        cleanMarkdown = `| ${header} |\n| ${separator} |\n` + rows.map((r: string) => `| ${r} |`).join('\n');
      }
    }

    cleanMarkdown = cleanMarkdown.trim();
    const optimizedTokensEstimate = Math.ceil(cleanMarkdown.length / 4);
    const tokenSavingsPercentage = rawTokensEstimate > 0
      ? Math.max(0, Math.round(((rawTokensEstimate - optimizedTokensEstimate) / rawTokensEstimate) * 100))
      : 0;

    const documentId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const docRecord = {
      id: documentId,
      name: fileName,
      fileType: fileType || 'text/plain',
      originalTokens: rawTokensEstimate,
      optimizedTokens: optimizedTokensEstimate,
      markdownContent: cleanMarkdown,
      uploadedAt: Date.now(),
    };

    session.documents.push(docRecord);
    session.updatedAt = Date.now();

    return res.json({
      success: true,
      document: {
        id: docRecord.id,
        name: docRecord.name,
        fileType: docRecord.fileType,
        originalTokens: docRecord.originalTokens,
        optimizedTokens: docRecord.optimizedTokens,
        tokenSavingsPercentage,
        uploadedAt: docRecord.uploadedAt,
        markdownPreview: cleanMarkdown.slice(0, 500),
      },
    });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return res.status(500).json({ error: 'Failed to ingest document', details: err.message });
  }
});

// -------------------------------------------------------------
// Document Audio Studio: Mode A - Podcast Generation (gemini-3.8-flash-tts)
// -------------------------------------------------------------
app.post('/api/audio/podcast', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { sessionId = 'default-session', documentId, podcastStyle = 'engaging' } = req.body;
    const session = getOrCreateSession(sessionId);

    const doc = session.documents.find((d) => d.id === documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Step 1: LLM crafts natural podcast dialogue with backchanneling and vocal bursts
    const prompt = `You are a world-class podcast producer. 
Create an engaging, fast-paced two-person podcast conversation summarizing and analyzing the following document:
Document Title: ${doc.name}
Style: ${podcastStyle}

Characters:
- "Alex": Energetic, inquisitive host who hooks the listener, asks sharp questions, and reacts naturally.
- "Sam": Knowledgeable, articulate domain analyst who breaks down key takeaways, nuances, and insights.

Rules for Voice Synthesis:
- Format lines STRICTLY as:
Alex: [Alex's dialogue]
Sam: [Sam's dialogue]
- Include natural backchanneling like |yeah| or |mhm| and subtle vocal bursts like <laugh>, <breath>, or <gasp> where natural.
- Keep the script lively and conversational, around 4 to 6 dialogue exchanges total (about 120-180 words) so it can be synthesized seamlessly into an episodic audio clip.

DOCUMENT CONTENT:
${doc.markdownContent.slice(0, 6000)}`;

    const scriptResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const scriptText = scriptResponse.text?.trim() || '';

    // Step 2: Parse script into multiSpeaker speech parts for gemini-3.8-flash-tts
    const lines = scriptText.split('\n').filter((l) => l.trim().length > 0);
    const speechParts: Array<{
      text: string;
      speechMetadata: { speaker: string; style: string };
    }> = [];

    for (const line of lines) {
      const alexMatch = line.match(/^Alex:\s*(.+)$/i);
      const samMatch = line.match(/^Sam:\s*(.+)$/i);
      if (alexMatch) {
        speechParts.push({
          text: alexMatch[1].trim(),
          speechMetadata: {
            speaker: 'Alex',
            style: 'Enthusiastic, curious podcast host',
          },
        });
      } else if (samMatch) {
        speechParts.push({
          text: samMatch[1].trim(),
          speechMetadata: {
            speaker: 'Sam',
            style: 'Insightful, articulate analyst',
          },
        });
      }
    }

    // Fallback if formatting was non-standard
    if (speechParts.length === 0) {
      speechParts.push({
        text: `Alex: Welcome to today's breakdown of ${doc.name}. Let's dive right in.`,
        speechMetadata: { speaker: 'Alex', style: 'Enthusiastic podcast host' },
      });
      speechParts.push({
        text: `Sam: Absolutely! This document presents some fascinating insights that we should unpack.`,
        speechMetadata: { speaker: 'Sam', style: 'Articulate analyst' },
      });
    }

    // Step 3: Call gemini-3.8-flash-tts with multiSpeakerVoiceConfig (Alex: Puck, Sam: Kore)
    const audioResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: speechParts,
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Alex',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Puck' },
                },
              },
              {
                speaker: 'Sam',
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
              },
            ],
          },
        },
      },
    });

    const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    const creation = {
      id: 'podcast_' + Date.now(),
      title: `Podcast: ${doc.name}`,
      type: 'podcast' as const,
      documentName: doc.name,
      durationEstimate: `${Math.max(1, Math.round(speechParts.length * 5))}s`,
      audioBase64: base64Audio || '',
      transcript: scriptText,
      createdAt: Date.now(),
    };

    session.audioCreations.push(creation);
    session.updatedAt = Date.now();

    return res.json({
      success: true,
      creation,
      generationTimeMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('Podcast generation error:', err);
    return res.status(500).json({
      error: 'Failed to generate podcast audio',
      details: err.message || String(err),
    });
  }
});

// -------------------------------------------------------------
// Document Audio Studio: Mode B - Audiobook Reader (gemini-3.8-flash-lite-tts)
// -------------------------------------------------------------
app.post('/api/audio/audiobook', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {
      sessionId = 'default-session',
      documentId,
      narratorVoice = 'Zephyr',
      maxWords = 250,
    } = req.body;

    const session = getOrCreateSession(sessionId);
    const doc = session.documents.find((d) => d.id === documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // For verbatim audiobook reading, we extract clean text up to requested chunk size
    const words = doc.markdownContent.replace(/[#*`_\[\]()]/g, ' ').split(/\s+/).filter(Boolean);
    const verbatimExcerpt = words.slice(0, maxWords).join(' ');

    const speechResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: verbatimExcerpt,
              speechMetadata: {
                style: 'Calm, deliberate, immersive audiobook narrator with steady cadence',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: narratorVoice },
          },
        },
      },
    });

    const base64Audio = speechResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    const creation = {
      id: 'audiobook_' + Date.now(),
      title: `Audiobook Excerpt: ${doc.name}`,
      type: 'audiobook' as const,
      documentName: doc.name,
      durationEstimate: `${Math.round(words.slice(0, maxWords).length / 2.5)}s`,
      audioBase64: base64Audio || '',
      transcript: verbatimExcerpt,
      createdAt: Date.now(),
    };

    session.audioCreations.push(creation);
    session.updatedAt = Date.now();

    return res.json({
      success: true,
      creation,
      generationTimeMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('Audiobook generation error:', err);
    return res.status(500).json({
      error: 'Failed to generate audiobook audio',
      details: err.message || String(err),
    });
  }
});

// -------------------------------------------------------------
// Get Stored Audio Creations
// -------------------------------------------------------------
app.get('/api/audio/creations/:sessionId', (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.sessionId);
  res.json({
    creations: session.audioCreations.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      documentName: c.documentName,
      durationEstimate: c.durationEstimate,
      transcript: c.transcript,
      createdAt: c.createdAt,
      hasAudio: Boolean(c.audioBase64),
    })),
  });
});

app.get('/api/audio/playback/:sessionId/:creationId', (req: Request, res: Response) => {
  const session = getOrCreateSession(req.params.sessionId);
  const creation = session.audioCreations.find((c) => c.id === req.params.creationId);
  if (!creation || !creation.audioBase64) {
    return res.status(404).json({ error: 'Audio creation not found' });
  }

  const audioBuffer = Buffer.from(creation.audioBase64, 'base64');
  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Content-Length', audioBuffer.length);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.send(audioBuffer);
});

// Mount Vite or serve static in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AuraVoice] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
