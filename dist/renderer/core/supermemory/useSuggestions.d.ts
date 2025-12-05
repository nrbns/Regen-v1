/**
 * useSuggestions Hook - Get personalized suggestions from SuperMemory
 */
import { MemoryEvent } from './tracker';
interface Suggestion {
    value: string;
    type: string;
    count: number;
    lastUsed: number;
    metadata?: any;
}
interface UseSuggestionsOptions {
    types?: Array<MemoryEvent['type']>;
    limit?: number;
    minQueryLength?: number;
}
export declare function useSuggestions(query: string, options?: UseSuggestionsOptions): Suggestion[];
export {};
