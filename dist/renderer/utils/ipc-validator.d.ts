/**
 * IPC Message Validator
 * DAY 8 FIX: Validates and sanitizes all IPC messages for security
 */
/**
 * Validate IPC command name
 */
export declare function validateCommandName(command: string): boolean;
/**
 * Sanitize string input
 */
export declare function sanitizeString(input: unknown): string;
/**
 * Sanitize URL
 */
export declare function sanitizeUrl(input: unknown): string | null;
/**
 * Validate IPC request payload
 */
export declare function validateIpcRequest(command: string, payload: unknown): {
    valid: boolean;
    sanitized?: unknown;
    error?: string;
};
/**
 * Safe IPC invoke wrapper
 */
export declare function safeIpcInvoke<T = unknown>(command: string, payload?: unknown): Promise<T>;
