export interface ResearchProvider {
    search(query: string): {
        title: string;
        url: string;
    }[] | Promise<{
        title: string;
        url: string;
    }[]>;
    getAnswer?(query: string): Promise<{
        answer: string;
        citations?: Array<{
            title: string;
            url: string;
        }>;
    }>;
}
export declare class MockResearchProvider implements ResearchProvider {
    search(query: string): {
        title: string;
        url: string;
    }[];
}
export declare class HybridSearchProvider implements ResearchProvider {
    search(query: string): Promise<{
        title: string;
        url: string;
    }[]>;
    getAnswer(query: string): Promise<{
        answer: string;
        citations?: Array<{
            title: string;
            url: string;
        }>;
    }>;
}
