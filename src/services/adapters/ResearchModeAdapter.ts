/**
 * Research Mode Adapter
 *
 * Provides unified interface for:
 * - lookupDefinition(word)
 * - getSummary(topicOrUrl)
 * - searchPapers(query)
 */

import { getApiClient } from '../externalApiClient';
import { useExternalApisStore } from '../../state/externalApisStore';

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
    }>;
  }>;
}

export interface Summary {
  title: string;
  summary: string;
  url?: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  year?: number;
  citations?: number;
  url?: string;
}

export class ResearchModeAdapter {
  private client = getApiClient();

  /**
   * Look up word definition
   */
  async lookupDefinition(word: string): Promise<WordDefinition> {
    const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('research');

    // Try DictionaryAPI.dev
    const dictApi = enabledApis.find(a => a.id === 'dictionary_api');
    if (dictApi) {
      try {
        const response = await this.client.request<
          Array<{
            word: string;
            phonetic?: string;
            meanings: Array<{
              partOfSpeech: string;
              definitions: Array<{
                definition: string;
                example?: string;
                synonyms?: string[];
              }>;
            }>;
          }>
        >('dictionary_api', `/${word}`);

        if (response.data.length > 0) {
          const data = response.data[0];
          return {
            word: data.word,
            phonetic: data.phonetic,
            meanings: data.meanings.map(m => ({
              partOfSpeech: m.partOfSpeech,
              definitions: m.definitions.map(d => ({
                definition: d.definition,
                example: d.example,
                synonyms: d.synonyms,
              })),
            })),
          };
        }
      } catch (error) {
        console.warn('[ResearchAdapter] DictionaryAPI failed:', error);
      }
    }

    throw new Error(`Unable to lookup definition for "${word}" from any enabled API`);
  }

  /**
   * Get summary for a topic or URL
   */
  async getSummary(topicOrUrl: string): Promise<Summary> {
    const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('research');

    // Check if it's a URL
    const isUrl = topicOrUrl.startsWith('http://') || topicOrUrl.startsWith('https://');

    // Try Wikipedia
    const wikipedia = enabledApis.find(a => a.id === 'wikipedia');
    if (wikipedia && !isUrl) {
      try {
        // Extract page title from topic
        const pageTitle = encodeURIComponent(topicOrUrl.replace(/\s+/g, '_'));
        const response = await this.client.request<{
          title: string;
          extract: string;
        }>('wikipedia', `/page/summary/${pageTitle}`);

        return {
          title: response.data.title,
          summary: response.data.extract,
          url: `https://en.wikipedia.org/wiki/${pageTitle}`,
        };
      } catch (error) {
        console.warn('[ResearchAdapter] Wikipedia failed:', error);
      }
    }

    // For URLs, we'd need a different service (maybe scrape + summarize)
    // For now, return a placeholder
    return {
      title: topicOrUrl,
      summary: 'Summary not available. Please enable Wikipedia API or use a different service.',
    };
  }

  /**
   * Search academic papers
   */
  async searchPapers(query: string): Promise<Paper[]> {
    const enabledApis = useExternalApisStore.getState().getEnabledApisForMode('research');

    // Try OpenAlex
    const openalex = enabledApis.find(a => a.id === 'openalex');
    if (openalex) {
      try {
        const response = await this.client.request<{
          results: Array<{
            id: string;
            title: string;
            authorships: Array<{
              author: {
                display_name: string;
              };
            }>;
            abstract?: string;
            publication_year?: number;
            cited_by_count?: number;
            primary_location?: {
              landing_page_url?: string;
            };
          }>;
        }>('openalex', `/works?search=${encodeURIComponent(query)}&per_page=10`);

        return response.data.results.map(work => ({
          id: work.id,
          title: work.title,
          authors: work.authorships.map(a => a.author.display_name),
          abstract: work.abstract,
          year: work.publication_year,
          citations: work.cited_by_count,
          url: work.primary_location?.landing_page_url,
        }));
      } catch (error) {
        console.warn('[ResearchAdapter] OpenAlex failed:', error);
      }
    }

    return [];
  }
}

/**
 * Get singleton ResearchModeAdapter instance
 */
let researchAdapterInstance: ResearchModeAdapter | null = null;

export function getResearchAdapter(): ResearchModeAdapter {
  if (!researchAdapterInstance) {
    researchAdapterInstance = new ResearchModeAdapter();
  }
  return researchAdapterInstance;
}
