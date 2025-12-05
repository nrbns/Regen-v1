/**
 * URL Safety Checks - Tier 2
 * Basic security guardrails for agent operations
 */
/**
 * Check if URL is safe for agent operations
 */
export declare function isUrlSafe(urlString: string): boolean;
/**
 * Validate URL before agent operation
 */
export declare function validateUrlForAgent(url: string): {
    safe: boolean;
    reason?: string;
};
