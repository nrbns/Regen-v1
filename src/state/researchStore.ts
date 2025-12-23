import { create } from 'zustand';

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
  stateVersion: number;
  lastConfirmedActionId: string | null;
  setQuestion: (question: string) => void;
  reset: () => void;
  appendChunk: (chunk: AnswerChunk) => void;
  setSources: (sources: Record<string, Cite[]>) => void;
  setIssues: (issues: ResearchIssue[]) => void;
  setError: (error?: string) => void;
  setLoading: (value: boolean) => void;
  setPreviewCite: (citeId: string | null) => void;
  setStateVersion: (version: number) => void;
  setLastConfirmedActionId: (actionId: string | null) => void;
  replayOrReset: (incomingVersion: number, incomingActionId: string | null) => void;
};

export const useResearchStore = create<ResearchState>(set => ({
  question: '',
  isLoading: false,
  chunks: [],
  sources: {},
  issues: [],
  error: undefined,
  previewCiteId: null,
  stateVersion: 0,
  lastConfirmedActionId: null,
  setQuestion: question => set({ question }),
  reset: () =>
    set({
      chunks: [],
      sources: {},
      issues: [],
      error: undefined,
      previewCiteId: null,
      stateVersion: 0,
      lastConfirmedActionId: null,
    }),
  appendChunk: chunk =>
    set(state => ({
      chunks: [...state.chunks, chunk],
      stateVersion: state.stateVersion + 1,
      lastConfirmedActionId: chunk.content || state.lastConfirmedActionId,
    })),
  setSources: sources => set({ sources }),
  setIssues: issues => set({ issues }),
  setError: error => set({ error }),
  setLoading: value => set({ isLoading: value }),
  setPreviewCite: citeId => set({ previewCiteId: citeId }),
  setStateVersion: (version: number) => set({ stateVersion: version }),
  setLastConfirmedActionId: (actionId: string | null) => set({ lastConfirmedActionId: actionId }),
  replayOrReset: (incomingVersion: number, incomingActionId: string | null) => {
    set(state => {
      if (incomingVersion > state.stateVersion) {
        return { stateVersion: incomingVersion, lastConfirmedActionId: incomingActionId };
      } else if (incomingVersion < state.stateVersion) {
        return {
          chunks: [],
          sources: {},
          issues: [],
          error: undefined,
          previewCiteId: null,
          stateVersion: incomingVersion,
          lastConfirmedActionId: incomingActionId,
        };
      }
      return {};
    });
  },
}));
