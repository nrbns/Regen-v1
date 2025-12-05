export type DuckDuckGoResult = {
    Heading?: string;
    AbstractText?: string;
    AbstractURL?: string;
    AbstractSource?: string;
    RelatedTopics?: Array<{
        FirstURL?: string;
        Text?: string;
        Name?: string;
    }>;
    Results?: Array<{
        FirstURL: string;
        Text: string;
    }>;
    Answer?: string;
    AnswerType?: string;
    Definition?: string;
    DefinitionURL?: string;
    DefinitionSource?: string;
    Image?: string;
    ImageIsLogo?: number;
    Infobox?: any;
    Redirect?: string;
};
export declare function fetchDuckDuckGoInstant(query: string, language?: string): Promise<DuckDuckGoResult | null>;
export declare function formatDuckDuckGoResults(result: DuckDuckGoResult | null): Array<{
    title: string;
    url?: string;
    snippet: string;
    type: 'instant' | 'result' | 'related';
}>;
/**
 * Fetch full web search results from DuckDuckGo HTML
 * This scrapes the HTML search page since DuckDuckGo doesn't have a public web search API
 * Note: May require CORS proxy in browser environments
 */
export declare function fetchDuckDuckGoWeb(query: string, options?: {
    count?: number;
    language?: string;
}): Promise<Array<{
    title: string;
    url: string;
    snippet: string;
    domain: string;
}>>;
