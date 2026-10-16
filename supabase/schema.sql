-- =========================================================================
-- Supabase PostgreSQL Schema for AuraVoice (`voice-agent`)
-- Run this in your Supabase Dashboard > SQL Editor (100% Free Tier)
-- =========================================================================

-- Enable pgvector extension for semantic document vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Sessions Table (Maintains conversational memory & user voice profile)
CREATE TABLE IF NOT EXISTS public.sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
    user_name TEXT NOT NULL DEFAULT 'Explorer',
    voice_persona TEXT NOT NULL DEFAULT 'Kore',
    system_prompt TEXT NOT NULL,
    daily_tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Conversation Messages Table (Sliding window history)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    audio_url TEXT,
    llm_latency_ms INTEGER,
    tts_latency_ms INTEGER,
    total_latency_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast retrieval of latest conversation turns per session
CREATE INDEX IF NOT EXISTS idx_messages_session ON public.messages(session_id, created_at DESC);

-- 3. Ingested Documents Table (Token-optimized Markdown & deduplication hash)
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('queued', 'indexing', 'ready', 'failed')),
    original_tokens INTEGER NOT NULL,
    optimized_tokens INTEGER NOT NULL,
    markdown_content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for content deduplication lookup
CREATE INDEX IF NOT EXISTS idx_documents_hash ON public.documents(session_id, content_hash);

-- 4. Document Chunks Table with Vector Embeddings (Optional RAG expansion)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL,
    embedding vector(768), -- Dimensions for Gemini text-embedding models
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Audio Creations Table (Podcasts & Audiobooks)
CREATE TABLE IF NOT EXISTS public.audio_creations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('podcast', 'audiobook')),
    document_name TEXT NOT NULL,
    duration_estimate TEXT NOT NULL,
    audio_storage_path TEXT,
    transcript TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_creations ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for session tokens (for personal / demo deployments)
CREATE POLICY "Allow session access" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow message access" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow document access" ON public.documents FOR ALL USING (true);
CREATE POLICY "Allow audio access" ON public.audio_creations FOR ALL USING (true);

-- 6. Storage Bucket for Audio WAV Files & Uploaded Documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('auravoice_media', 'auravoice_media', true)
ON CONFLICT (id) DO NOTHING;
