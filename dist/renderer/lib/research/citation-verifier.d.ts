/**
 * Citation Verifier - Research-grade citation coverage checker
 * Ensures every sentence in generated text has at least one citation token
 *
 * AC: All sample queries show flagged uncited sentences
 * Metric: Citation coverage > 95% on internal benchmark
 */
export interface SentenceAnalysis {
    sentence: string;
    sentenceIndex: number;
    hasCitation: boolean;
    citationIndices: number[];
    startPos: number;
    endPos: number;
}
export interface VerificationResult {
    totalSentences: number;
    citedSentences: number;
    uncitedSentences: number;
    citationCoverage: number;
    issues: Array<{
        type: 'uncited';
        sentenceIdx: number;
        sentence: string;
        detail: string;
    }>;
}
/**
 * Verify citation coverage in research summary text
 *
 * @param summary - The generated summary text
 * @param citations - Array of citation objects with index and sourceIndex
 * @returns Verification result with coverage metrics and uncited sentence issues
 */
export declare function verifyCitationCoverage(summary: string, _citations: Array<{
    index: number;
    sourceIndex: number;
}>): VerificationResult;
/**
 * Enhanced verification that also checks citation validity
 * (whether cited sources actually exist)
 */
export declare function verifyCitationsWithSources(summary: string, citations: Array<{
    index: number;
    sourceIndex: number;
}>, totalSources: number): VerificationResult & {
    invalidCitations: number;
};
