/**
 * Tool Registry v2 - Tier 3 Pillar 1
 * Declarative tool definitions with schemas
 */
import { z } from 'zod';
import type { ToolContext } from '../graph';
export type ToolDef = {
    name: string;
    description: string;
    inputSchema: z.ZodSchema;
    outputSchema: z.ZodSchema;
    run: (input: unknown, ctx: ToolContext) => Promise<unknown>;
    category?: 'research' | 'trade' | 'docs' | 'threat' | 'general';
    requiresAuth?: boolean;
    rateLimit?: {
        requests: number;
        window: number;
    };
};
declare class ToolRegistryV2 {
    private tools;
    private rateLimiters;
    /**
     * Register a tool
     */
    register(tool: ToolDef): void;
    /**
     * Get a tool by name
     */
    get(name: string): ToolDef | undefined;
    /**
     * Get all tools
     */
    getAll(): ToolDef[];
    /**
     * Get tools by category
     */
    getByCategory(category: ToolDef['category']): ToolDef[];
    /**
     * Execute a tool with validation
     */
    execute(name: string, input: unknown, ctx: ToolContext): Promise<unknown>;
    /**
     * Check rate limit
     */
    private checkRateLimit;
}
export declare const toolRegistryV2: ToolRegistryV2;
export {};
