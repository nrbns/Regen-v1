/**
 * Typed IPC Client for Renderer
 * Provides type-safe IPC calls with automatic error handling
 */
import { z } from 'zod';
export declare function deriveTitleFromUrl(url?: string): string;
/**
 * Make a typed IPC call
 * @param channel Channel name (without ob://ipc/v1/ prefix)
 * @param request Request payload
 * @param schema Optional response schema for validation
 */
export interface Plan {
    id: string;
    goal: string;
    steps: Array<{
        id: string;
        action: string;
        args: Record<string, unknown>;
        dependsOn?: string[];
        expectedOutput?: string;
    }>;
    estimatedDuration?: number;
}
export declare function ipcCall<TRequest, TResponse = unknown>(channel: string, request: TRequest, schema?: z.ZodSchema<TResponse>): Promise<TResponse>;
/**
 * Typed IPC client with pre-configured channels
 */
export declare const ipc: any;
