/**
 * Site Allowlist Configuration
 * Trusted domains that should bypass CSP restrictions
 */
export interface AllowedSite {
    domain: string;
    reason: string;
    cspBypass?: boolean;
    permissions?: string[];
}
/**
 * Trusted sites that should always be allowed
 * These sites are commonly used and trusted, so we bypass strict CSP for them
 */
export declare const TRUSTED_SITES: AllowedSite[];
/**
 * Check if a URL is in the allowlist
 */
export declare function isAllowedSite(url: string): boolean;
/**
 * Get allowlist entry for a URL
 */
export declare function getAllowedSite(url: string): AllowedSite | undefined;
/**
 * Get relaxed CSP for allowed sites
 * Returns null to disable CSP, or a permissive CSP string
 */
export declare function getCSPForSite(url: string): string | null;
