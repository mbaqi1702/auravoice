# ADR 0004: MarkItDown Token Optimization vs Vector Embeddings

## Context
Standard RAG frameworks ingest raw PDFs, HTML, or CSV documents with substantial formatting overhead (tags, repetitive page numbers, blank lines, ASCII art separators), driving up token counts by 2x to 4x and increasing TTFT latency. Additionally, vector database cold-starts add 300-800ms of query retrieval latency.

## Decision
We implemented **MarkItDown Token Optimization**:
1. Strips HTML boilerplate, script blocks, nav/footer elements, and styling.
2. Converts raw CSV/TSV into compact Markdown pipe tables.
3. Collapses whitespace, removes page headers/footers, and replaces repeated dividers with succinct `---`.
4. Calculates token metrics and savings percentages (typically 45% to 75% reduction).

## Consequences
- Reduces token consumption by up to 75%, maintaining low token costs on free tiers.
- Minimizes LLM Time-to-First-Token (TTFT) by reducing input context length.
- Medium documents (<100k tokens) fit cleanly within low-latency sliding context windows without requiring external vector DB network hops.
