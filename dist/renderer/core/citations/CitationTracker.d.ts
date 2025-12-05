/**
 * Citation Tracker - Track sources and generate citations
 */
export interface Citation {
    id: string;
    url: string;
    title: string;
    author?: string;
    date?: string;
    accessedDate: number;
    type: 'web' | 'paper' | 'book' | 'video' | 'other';
    credibility?: {
        score: number;
        factors: string[];
    };
    metadata?: {
        domain?: string;
        publisher?: string;
        doi?: string;
        isbn?: string;
    };
}
export declare class CitationTracker {
    /**
     * Add citation to session
     */
    static addCitation(sessionId: string, citation: Omit<Citation, 'id' | 'accessedDate'>): Citation;
    /**
     * Get all citations for a session
     */
    static getCitations(sessionId: string): Citation[];
    /**
     * Generate citation in various formats
     */
    static generateCitation(citation: Citation, format?: 'apa' | 'mla' | 'chicago' | 'ieee'): string;
    /**
     * Generate APA citation
     */
    private static generateAPA;
    /**
     * Generate MLA citation
     */
    private static generateMLA;
    /**
     * Generate Chicago citation
     */
    private static generateChicago;
    /**
     * Generate IEEE citation
     */
    private static generateIEEE;
    /**
     * Calculate credibility score
     */
    static calculateCredibility(citation: Citation): Promise<number>;
    /**
     * Export citations to BibTeX
     */
    static exportToBibTeX(citations: Citation[]): string;
    /**
     * Export citations to JSON
     */
    static exportToJSON(citations: Citation[]): string;
}
