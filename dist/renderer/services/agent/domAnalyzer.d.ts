/**
 * DOM Analyzer - Extracts structured snapshot of page for safe agent actions
 * PR: Agent system core component
 */
export interface ElementSnapshot {
    id: string;
    tag: string;
    text?: string;
    selector: string;
    attributes: Record<string, string>;
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    visible: boolean;
    interactive: boolean;
}
export interface PageSnapshot {
    url: string;
    title: string;
    timestamp: number;
    elements: ElementSnapshot[];
    content: string;
    metadata: {
        elementCount: number;
        interactiveCount: number;
        formCount: number;
        linkCount: number;
    };
}
/**
 * Analyze DOM and extract structured snapshot
 */
export declare function analyzeDOM(doc?: Document): PageSnapshot;
/**
 * Find element by selector (with fallback strategies)
 */
export declare function findElementBySelector(selector: string, snapshot?: PageSnapshot, doc?: Document): Element | null;
