import { create } from 'zustand';
export const useResearchStore = create((set) => ({
    question: '',
    isLoading: false,
    chunks: [],
    sources: {},
    issues: [],
    error: undefined,
    previewCiteId: null,
    setQuestion: (question) => set({ question }),
    reset: () => set({
        chunks: [],
        sources: {},
        issues: [],
        error: undefined,
        previewCiteId: null,
    }),
    appendChunk: (chunk) => set((state) => ({
        chunks: [...state.chunks, chunk],
    })),
    setSources: (sources) => set({ sources }),
    setIssues: (issues) => set({ issues }),
    setError: (error) => set({ error }),
    setLoading: (value) => set({ isLoading: value }),
    setPreviewCite: (citeId) => set({ previewCiteId: citeId }),
}));
