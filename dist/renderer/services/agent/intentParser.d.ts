/**
 * Intent Parser - Converts natural language commands into structured actions
 * PR: Agent system core component
 */
import type { PageSnapshot } from './domAnalyzer';
export interface ParsedAction {
    kind: 'click' | 'type' | 'scroll' | 'navigate' | 'extract' | 'wait' | 'screenshot';
    selector?: string;
    text?: string;
    url?: string;
    value?: string;
    description: string;
    confidence: number;
    metadata?: Record<string, any>;
}
export interface ParsedIntent {
    intent: string;
    actions: ParsedAction[];
    confidence: number;
    raw: string;
}
/**
 * Parse natural language command into structured actions
 */
export declare function parseIntent(command: string, snapshot: PageSnapshot): Promise<ParsedIntent>;
