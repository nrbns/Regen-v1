/**
 * Agent Tool Registry - Tier 2
 * Registry of available tools for OmniAgent
 */
export type AgentTool = (input: unknown) => Promise<unknown>;
export interface ToolDefinition {
    name: string;
    description: string;
    execute: AgentTool;
}
declare class ToolRegistry {
    private tools;
    /**
     * Register a tool
     */
    register(tool: ToolDefinition): void;
    /**
     * Get a tool by name
     */
    get(name: string): ToolDefinition | undefined;
    /**
     * Get all tools
     */
    getAll(): ToolDefinition[];
    /**
     * Check if tool exists
     */
    has(name: string): boolean;
}
export declare const toolRegistry: ToolRegistry;
export {};
