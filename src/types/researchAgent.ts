export type ResearchAgentActionType = 'save_summary' | 'open_url' | 'follow_up';

export interface ResearchAgentAction {
  id: string;
  type: ResearchAgentActionType;
  label: string;
  description?: string;
  highlight?: string;
  payload?: Record<string, string>;
  badge?: string;
}

export interface ResearchAgentCitation {
  label: string;
  url: string;
}

export interface ResearchAgentContext {
  url?: string;
  title?: string;
  selection?: string;
  notes?: string;
  mode?: 'research';
}

export interface ResearchAgentRequest {
  prompt: string;
  context: ResearchAgentContext;
  allowActions?: boolean;
}

export interface ResearchAgentResponse {
  summary: string;
  confidence: number;
  actions: ResearchAgentAction[];
  citations: ResearchAgentCitation[];
  model?: string;
  tokensUsed?: number;
}

export interface ResearchAgentError extends Error {
  code?: string;
}






