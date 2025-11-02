/**
 * Deep Research Chain
 * Automated chain: read → summarize → cite → export
 */

import { getOllamaAdapter } from '../ollama-adapter';
import { registry } from '../skills/registry';
import { z } from 'zod';

export interface DeepResearchInput {
  query: string;
  maxSources?: number;
  outputFormat?: 'json' | 'csv' | 'markdown';
  includeCitations?: boolean;
}

export interface DeepResearchResult {
  query: string;
  sources: Array<{
    url: string;
    title: string;
    summary: string;
    citations: Array<{ claim: string; citation?: string }>;
  }>;
  synthesized: string;
  exported?: string;
}

/**
 * Deep Research Chain: Read → Summarize → Cite → Export
 */
export async function runDeepResearch(input: DeepResearchInput): Promise<DeepResearchResult> {
  const ollama = getOllamaAdapter();
  const isAvailable = await ollama.checkAvailable();

  if (!isAvailable) {
    throw new Error('Ollama is not available. Please start Ollama service.');
  }

  // Step 1: Search/Navigate to sources
  const navSkill = registry.get('navigate');
  if (!navSkill) {
    throw new Error('Navigation skill not available');
  }

  // For now, use a simple search approach
  // In production, integrate with research provider
  const sources: Array<{ url: string; title: string; html?: string }> = [];

  // Step 2: Extract and summarize each source
  const processedSources: DeepResearchResult['sources'] = [];

  for (const source of sources) {
    // Extract text from HTML
    const extractSkill = registry.get('extract_table');
    let text = '';
    if (source.html) {
      // Use readable extractor if available
      text = extractTextFromHtml(source.html);
    }

    // Summarize
    const summary = await ollama.summarize(text, 150);
    
    // Extract citations
    const citations = await ollama.extractCitations(text, source.url);

    processedSources.push({
      url: source.url,
      title: source.title,
      summary,
      citations,
    });
  }

  // Step 3: Synthesize findings
  const synthesisPrompt = `Synthesize the following research findings about "${input.query}" into a coherent summary:\n\n${processedSources.map(s => `- ${s.title}: ${s.summary}`).join('\n')}`;
  
  const synthesized = await ollama.chat([
    {
      role: 'system',
      content: 'You are a research synthesis assistant. Create a comprehensive summary from multiple sources.',
    },
    {
      role: 'user',
      content: synthesisPrompt,
    },
  ]);

  // Step 4: Export
  let exported: string | undefined;
  
  if (input.outputFormat === 'json') {
    exported = JSON.stringify({
      query: input.query,
      sources: processedSources,
      synthesized,
    }, null, 2);
  } else if (input.outputFormat === 'csv') {
    const csvSkill = registry.get('export_csv');
    if (csvSkill) {
      const rows = processedSources.map(s => ({
        url: s.url,
        title: s.title,
        summary: s.summary,
        citation_count: s.citations.length,
      }));
      exported = await csvSkill.exec({ runId: '', memory: {} }, { name: 'deep_research', rows });
    }
  } else if (input.outputFormat === 'markdown') {
    exported = `# Research: ${input.query}\n\n## Synthesized Summary\n\n${synthesized}\n\n## Sources\n\n${processedSources.map((s, i) => `### ${i + 1}. ${s.title}\n\n${s.summary}\n\n**URL:** ${s.url}\n\n**Citations:**\n${s.citations.map(c => `- ${c.claim}${c.citation ? ` (${c.citation})` : ''}`).join('\n')}\n`).join('\n---\n\n')}`;
  }

  return {
    query: input.query,
    sources: processedSources,
    synthesized,
    exported,
  };
}

function extractTextFromHtml(html: string): string {
  // Simple text extraction (in production, use proper HTML parser)
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

