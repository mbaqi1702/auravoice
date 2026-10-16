/**
 * MarkItDown Token Optimizer & Document Ingestion Adapter
 * Formats multi-format documents (PDF extracts, CSV, HTML, JSON, TXT)
 * into token-efficient Markdown, stripping boilerplate and minimizing token cost.
 */

export interface TokenOptimizationResult {
  fileName: string;
  fileType: string;
  originalCharCount: number;
  optimizedCharCount: number;
  originalTokens: number;
  optimizedTokens: number;
  savingsPercentage: number;
  cleanMarkdown: string;
}

export class MarkItDownOptimizer {
  /**
   * Approximate tokens calculation (~4 chars per token for English text & code)
   */
  public static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Process raw text/extracted payload into standardized, token-dense Markdown
   */
  public static optimize(
    rawText: string,
    fileName: string,
    fileType: string
  ): TokenOptimizationResult {
    const originalCharCount = rawText.length;
    const originalTokens = this.estimateTokens(rawText);

    let clean = rawText;

    // 1. Strip HTML tags, scripts, and stylesheets
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    clean = clean.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
    clean = clean.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
    clean = clean.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
    clean = clean.replace(/<[^>]+>/g, ' ');

    // 2. Eliminate HTML entity codes (&nbsp;, &amp;, etc.)
    clean = clean
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // 3. Compress repetitive ASCII art dividers, page numbers, or excessive dashes
    clean = clean.replace(/^[\s\-_=*#]{4,}$/gm, '---');
    clean = clean.replace(/Page\s+\d+\s+of\s+\d+/gi, '');
    clean = clean.replace(/Confidential\s*-\s*Internal\s*Use\s*Only/gi, '');

    // 4. Transform CSV / TSV into clean Markdown tables
    if (fileType.includes('csv') || fileName.endsWith('.csv') || (rawText.includes(',') && rawText.split('\n').length > 2 && rawText.split('\n')[0].includes(','))) {
      try {
        const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1 && lines[0].includes(',')) {
          const headers = lines[0].split(',').map((h) => h.trim());
          const headerRow = `| ${headers.join(' | ')} |`;
          const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
          const dataRows = lines.slice(1, 15).map((l) => {
            const cols = l.split(',').map((c) => c.trim());
            return `| ${cols.join(' | ')} |`;
          });
          clean = `${headerRow}\n${separatorRow}\n${dataRows.join('\n')}`;
        }
      } catch (e) {
        // Fallback to normal text
      }
    }

    // 5. Transform JSON into succinct Markdown key-values
    if (fileType.includes('json') || fileName.endsWith('.json')) {
      try {
        const parsed = JSON.parse(rawText);
        clean = MarkItDownOptimizer.jsonToMarkdown(parsed);
      } catch (e) {
        // Leave as is if invalid JSON
      }
    }

    // 6. Normalization: collapse multiple spaces and empty lines
    clean = clean.replace(/[ \t]+/g, ' ');
    clean = clean.replace(/\n\s*\n\s*\n+/g, '\n\n').trim();

    const optimizedCharCount = clean.length;
    const optimizedTokens = this.estimateTokens(clean);
    const savingsPercentage = originalTokens > 0
      ? Math.max(0, Math.round(((originalTokens - optimizedTokens) / originalTokens) * 100))
      : 0;

    return {
      fileName,
      fileType,
      originalCharCount,
      optimizedCharCount,
      originalTokens,
      optimizedTokens,
      savingsPercentage,
      cleanMarkdown: clean,
    };
  }

  private static jsonToMarkdown(obj: any, indent = 0): string {
    const pad = '  '.repeat(indent);
    if (Array.isArray(obj)) {
      return obj.map((item) => `${pad}- ${typeof item === 'object' ? '\n' + MarkItDownOptimizer.jsonToMarkdown(item, indent + 1) : String(item)}`).join('\n');
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.entries(obj)
        .map(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            return `${pad}**${k}**:\n${MarkItDownOptimizer.jsonToMarkdown(v, indent + 1)}`;
          }
          return `${pad}**${k}**: ${v}`;
        })
        .join('\n');
    }
    return String(obj);
  }
}

// Sample Curated Documents for Instant Exploration
export const SAMPLE_DOCUMENTS = [
  {
    name: 'AI_Voice_Architecture_Whitepaper.md',
    type: 'text/markdown',
    content: `# Technical Whitepaper: Low-Latency Speech Synthesis & Conversational LLM Architectures

## Executive Summary
Real-time conversational agents require sub-second turn-around time. Traditional cascades (STT -> LLM reasoning -> TTS synthesis) incur latency compounding across network hops.

### Latency Budget Breakdown:
- User Silence Detection (VAD): ~250ms
- Speech-to-Text Transcription: ~300ms
- LLM Time-to-First-Token (TTFT): ~280ms
- Streaming TTS Audio Chunk Delivery: ~180ms
- **Total Latency Goal**: < 1,000ms

### MarkItDown Context Reduction
By formalizing documents into token-optimized Markdown representations before context insertion, context windows remain compact, memory allocation stays linear, and cache hit ratios increase by 42%.

### Multi-Speaker Podcast Generation
Gemini 3.8 Flash TTS unlocks dual-speaker audio generation with natural conversational cues such as backchanneling and laughter bursts.`,
  },
  {
    name: 'Quantum_Computing_Overview.txt',
    type: 'text/plain',
    content: `Document Title: Introduction to Quantum Information Science
Published: October 2026
Author: Quantum Research Group

Quantum computing harnesses the laws of quantum mechanics to solve problems beyond classical supercomputers. Unlike classical bits which exist as 0 or 1, qubits exist in superpositions of states. Through quantum entanglement, qubits share correlations that enable parallel state evaluations.

Key applications include:
1. Molecular simulation for drug discovery.
2. Optimization in logistics and supply chain routing.
3. Post-quantum cryptography and lattice-based security.

Current physical implementations include superconducting circuits, trapped ion systems, and photonic topological processors. Error mitigation techniques like surface codes remain active frontiers in achieving fault-tolerant quantum supremacy.`,
  },
  {
    name: 'Quarterly_Performance_Metrics.csv',
    type: 'text/csv',
    content: `Metric,Q1,Q2,Q3,Q4,YoY_Growth
Total Active Users,124000,168000,215000,289000,+133%
Average Audio Turnaround (ms),1450,1120,890,720,-50%
Voice Interaction Retention,64%,72%,81%,88%,+24%
Token Compression Efficiency,32%,48%,62%,71%,+39%
System Reliability Uptime,99.92%,99.96%,99.98%,99.99%,+0.07%`,
  },
];
