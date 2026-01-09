/**
 * Backend Service - Real backend API integration
 * Connects UI to actual backend services
 */

import { apiRequest } from '../api-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  relevance: number;
}

export interface ScrapeResult {
  title: string;
  content: string;
  text: string;
  url: string;
}

export interface AITaskResult {
  text: string;
  provider: string;
  tokensUsed?: number;
  latency?: number;
}

class BackendService {
  /**
   * Search the web
   */
  async search(query: string): Promise<SearchResult[]> {
    try {
      const response = await apiRequest<{
        ok: boolean;
        results: Array<{
          url: string;
          title: string;
          snippet: string;
          domain: string;
          relevance?: number;
        }>;
      }>('/api/search/hybrid', {
        method: 'POST',
        body: { query, maxResults: 10 },
      });

      if (response.ok && response.results) {
        return response.results.map(r => ({
          url: r.url,
          title: r.title,
          snippet: r.snippet,
          domain: r.domain,
          relevance: r.relevance || 1,
        }));
      }

      return [];
    } catch (error) {
      console.error('[BackendService] Search failed:', error);
      // Return empty results on error, don't throw
      return [];
    }
  }

  /**
   * Scrape and extract content from URL
   */
  async scrapeUrl(url: string): Promise<ScrapeResult | null> {
    try {
      const response = await apiRequest<{
        ok: boolean;
        title: string;
        content: string;
        text: string;
        url: string;
      }>('/api/scrape', {
        method: 'POST',
        body: { url },
      });

      if (response.ok) {
        return {
          title: response.title || 'Untitled',
          content: response.content || '',
          text: response.text || '',
          url: response.url || url,
        };
      }

      return null;
    } catch (error) {
      console.error('[BackendService] Scrape failed:', error);
      return null;
    }
  }

  /**
   * Summarize content using AI
   */
  async summarize(text: string, url?: string): Promise<string> {
    try {
      const prompt = `Summarize the following content in 2-3 sentences:\n\n${text.substring(0, 2000)}`;

      const response = await apiRequest<{
        ok: boolean;
        text: string;
        provider?: string;
      }>('/api/ai/task', {
        method: 'POST',
        body: {
          provider: 'openai',
          payload: {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that creates concise summaries.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 150,
            temperature: 0.7,
          },
        },
      });

      if (response.ok && response.text) {
        return response.text;
      }

      // Fallback to simple extraction if AI fails
      return text.substring(0, 200) + '...';
    } catch (error) {
      console.error('[BackendService] Summarize failed:', error);
      // Fallback to simple extraction
      return text.substring(0, 200) + '...';
    }
  }

  /**
   * Analyze text using AI
   */
  async analyzeText(text: string): Promise<string> {
    try {
      const prompt = `Analyze the following text and provide key insights:\n\n${text.substring(0, 2000)}`;

      const response = await apiRequest<{
        ok: boolean;
        text: string;
        provider?: string;
      }>('/api/ai/task', {
        method: 'POST',
        body: {
          provider: 'openai',
          payload: {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that analyzes text and provides insights.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 300,
            temperature: 0.7,
          },
        },
      });

      if (response.ok && response.text) {
        return response.text;
      }

      return 'Analysis would appear here...';
    } catch (error) {
      console.error('[BackendService] Analyze failed:', error);
      return 'Analysis failed. Please try again.';
    }
  }

  /**
   * Check if backend is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      await apiRequest('/health', { method: 'GET' });
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const backendService = new BackendService();