/**
 * Research Export Utilities
 * Phase 1, Day 6: Research Mode Polish
 */

import type { ResearchResult } from '../../types/research';
import { calculateCredibility } from './sourceCredibility';

/**
 * Phase 1, Day 6: Export research as Markdown
 */
export function exportResearchMarkdown(result: ResearchResult): string {
  let markdown = `# Research: ${result.query}\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
  markdown += `**Confidence:** ${(result.confidence * 100).toFixed(0)}%\n`;
  markdown += `**Sources:** ${result.sources.length}\n`;
  markdown += `**Citations:** ${result.citations.length}\n\n`;
  markdown += `---\n\n`;

  // Summary
  markdown += `## Summary\n\n`;
  markdown += `${result.summary}\n\n`;

  // Citations
  if (result.citations.length > 0) {
    markdown += `## Citations\n\n`;
    result.citations.forEach((citation, _idx) => {
      const source = result.sources[citation.sourceIndex];
      const credibility = calculateCredibility(source);
      markdown += `### [${citation.index}] ${source.title}\n\n`;
      markdown += `- **URL:** ${source.url}\n`;
      markdown += `- **Domain:** ${source.domain}\n`;
      markdown += `- **Type:** ${source.sourceType}\n`;
      markdown += `- **Credibility:** ${credibility.level} (${credibility.score}/100)\n`;
      markdown += `- **Confidence:** ${(citation.confidence * 100).toFixed(0)}%\n`;
      if (citation.quote) {
        markdown += `- **Quote:** "${citation.quote}"\n`;
      }
      markdown += `\n`;
    });
  }

  // Sources
  markdown += `## Sources\n\n`;
  result.sources.forEach((source, idx) => {
    const credibility = calculateCredibility(source);
    markdown += `${idx + 1}. **${source.title}**\n`;
    markdown += `   - URL: ${source.url}\n`;
    markdown += `   - Domain: ${source.domain}\n`;
    markdown += `   - Type: ${source.sourceType}\n`;
    markdown += `   - Credibility: ${credibility.level} (${credibility.score}/100)\n`;
    markdown += `   - Relevance: ${(source.relevanceScore * 100).toFixed(0)}%\n`;
    if (source.snippet) {
      markdown += `   - Snippet: ${source.snippet.substring(0, 200)}...\n`;
    }
    markdown += `\n`;
  });

  // Verification (if available)
  if (result.verification) {
    markdown += `## Verification\n\n`;
    markdown += `- **Verified:** ${result.verification.verified ? 'Yes' : 'No'}\n`;
    markdown += `- **Citation Coverage:** ${result.verification.citationCoverage.toFixed(0)}%\n`;
    markdown += `- **Hallucination Risk:** ${result.verification.hallucinationRisk.toFixed(0)}%\n`;
    if (result.verification.suggestions.length > 0) {
      markdown += `- **Suggestions:**\n`;
      result.verification.suggestions.forEach(s => {
        markdown += `  - ${s}\n`;
      });
    }
    markdown += `\n`;
  }

  return markdown;
}

/**
 * Phase 1, Day 6: Export research as JSON
 */
export function exportResearchJSON(result: ResearchResult): string {
  const exportData = {
    query: result.query,
    summary: result.summary,
    confidence: result.confidence,
    generatedAt: new Date().toISOString(),
    sources: result.sources.map(source => ({
      ...source,
      credibility: calculateCredibility(source),
    })),
    citations: result.citations.map(citation => ({
      ...citation,
      source: result.sources[citation.sourceIndex],
      sourceCredibility: calculateCredibility(result.sources[citation.sourceIndex]),
    })),
    verification: result.verification,
    contradictions: result.contradictions,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Phase 1, Day 6: Download research export
 */
export function downloadResearchExport(result: ResearchResult, format: 'markdown' | 'json'): void {
  const content =
    format === 'markdown' ? exportResearchMarkdown(result) : exportResearchJSON(result);

  const extension = format === 'markdown' ? 'md' : 'json';
  const mimeType = format === 'markdown' ? 'text/markdown' : 'application/json';

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `research-${result.query.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
