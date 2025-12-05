/**
 * Safe Error Serializer
 * Handles circular references and React/DOM elements when serializing errors
 */
/**
 * Get a safe string representation of an error
 */
export declare function safeErrorString(error: unknown): string;
