/**
 * useResearchWS Hook
 * React hook to connect to WebSocket and subscribe to research job events
 */
export interface ResearchEvent {
    id: string;
    jobId: string;
    type: 'research.event' | 'subscribed';
    eventType?: string;
    data?: any;
    timestamp: number;
}
export interface ResearchWSState {
    connected: boolean;
    events: ResearchEvent[];
    streamedAnswer: string;
    sources: Array<{
        url: string;
        title: string;
        snippet: string;
        source: string;
        score: number;
    }>;
    reasoningSteps: Array<{
        step: number;
        text: string;
        citations: number[];
    }>;
    citations: Array<{
        id: number;
        url: string;
        title: string;
        position: number;
    }>;
    done: boolean;
    error: string | null;
}
/**
 * Hook to subscribe to research job events via WebSocket
 */
export declare function useResearchWS(jobId: string | null): ResearchWSState;
