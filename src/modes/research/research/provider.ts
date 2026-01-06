// @ts-nocheck

import { ipc } from '../../lib/ipc-typed';

export interface ResearchProvider {
  search(query: string): { title: string; url: string }[] | Promise<{ title: string; url: string }[]>;
  getAnswer?(query: string): Promise<{ answer: string; citations?: Array<{ title: string; url: string }> }>;
}

export class MockResearchProvider implements ResearchProvider {
  search(query: string) {
    const seed = encodeURIComponent(query || 'omni');
    return [
      { title: `Result for ${query} #1`, url: `https://example.com/?q=${seed}&i=1` },
      { title: `Result for ${query} #2`, url: `https://example.com/?q=${seed}&i=2` },
      { title: `Result for ${query} #3`, url: `https://example.com/?q=${seed}&i=3` },
    ];
  }
}

export class HybridSearchProvider implements ResearchProvider {
  async search(query: string): Promise<{ title: string; url: string }[]> {
    try {
      // Use hybrid search backend
      const result = await ipc.hybridSearch.search(query, 10);
      if (result?.results && Array.isArray(result.results)) {
        return result.results.map((r: any) => ({
          title: r.title || r.url || 'Untitled',
          url: r.url || '',
        }));
      }
      return [];
    } catch (error) {
      console.error('Hybrid search failed:', error);
      return [];
    }
  }

  async getAnswer(query: string): Promise<{ answer: string; citations?: Array<{ title: string; url: string }> }> {
    try {
      // Use agent ask with RAG context
      const result = await ipc.agent.ask(query);
      return {
        answer: result.answer || '',
        citations: result.sources?.map((url: string) => ({ title: url, url })) || [],
      };
    } catch (error) {
      console.error('Agent ask failed:', error);
      return { answer: '', citations: [] };
    }
  }
}


