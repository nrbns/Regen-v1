/**
 * ResearchAgent - Mode-specific agent for Research mode
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';
import { getCitationGraph } from '../knowledge/citation-graph';
import { getClusteringService } from '../knowledge/clustering';

export class ResearchAgent {
  /**
   * Crawl and extract information from URLs
   */
  async crawl(urls: string[]): Promise<Array<{ url: string; text: string; title?: string }>> {
    const results = [];

    for (const url of urls) {
      try {
        // Use robots-aware fetch
        const response = await fetch(url);
        const html = await response.text();
        
        // Simple text extraction
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch?.[1] || url;

        results.push({ url, text: text.substring(0, 5000), title });
      } catch (error) {
        console.error(`[ResearchAgent] Failed to crawl ${url}:`, error);
      }
    }

    return results;
  }

  /**
   * Cluster sources by topic
   */
  async cluster(sources: Array<{ url: string; title: string; text?: string }>): Promise<any[]> {
    const clustering = getClusteringService();
    return await clustering.clusterSources(sources);
  }

  /**
   * Extract citations from sources
   */
  async cite(sources: Array<{ url: string; text: string }>): Promise<void> {
    const citationGraph = getCitationGraph();

    for (const source of sources) {
      await citationGraph.extractFromText(source.text, source.url);
    }
  }

  /**
   * Summarize sources
   */
  async summarize(sources: Array<{ text: string; url?: string }>): Promise<string> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      return 'Summarization requires Ollama.';
    }

    const combinedText = sources.map(s => s.text).join('\n\n');
    return await ollama.summarize(combinedText, 200);
  }
}

