/**
 * Research Mode Adapter
 *
 * Provides unified interface for:
 * - lookupDefinition(word)
 * - getSummary(topicOrUrl)
 * - searchPapers(query)
 */
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
export declare class ResearchModeAdapter {
    private client;
    /**
     * Look up word definition
     */
    lookupDefinition(word: string): Promise<WordDefinition>;
    /**
     * Get summary for a topic or URL
     */
    getSummary(topicOrUrl: string): Promise<Summary>;
    /**
     * Search academic papers
     */
    searchPapers(query: string): Promise<Paper[]>;
}
export declare function getResearchAdapter(): ResearchModeAdapter;
