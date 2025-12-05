export type Cite = {
    id: string;
    title: string;
    url: string;
    publishedAt?: string;
    snippet?: string;
    fragmentUrl?: string;
    text?: string;
    domain?: string;
    relevanceScore?: number;
};
export type ResearchIssue = {
    type: 'uncited' | 'contradiction';
    sentenceIdx: number;
    detail?: string;
};
export type AnswerChunk = {
    content: string;
    citations: string[];
};
type ResearchState = {
    question: string;
    isLoading: boolean;
    chunks: AnswerChunk[];
    sources: Record<string, Cite[]>;
    issues: ResearchIssue[];
    error?: string;
    previewCiteId: string | null;
    setQuestion: (question: string) => void;
    reset: () => void;
    appendChunk: (chunk: AnswerChunk) => void;
    setSources: (sources: Record<string, Cite[]>) => void;
    setIssues: (issues: ResearchIssue[]) => void;
    setError: (error?: string) => void;
    setLoading: (value: boolean) => void;
    setPreviewCite: (citeId: string | null) => void;
};
export declare const useResearchStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ResearchState>>;
export {};
