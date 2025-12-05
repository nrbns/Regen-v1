/**
 * Site Allowlist Configuration
 * Trusted domains that should bypass CSP restrictions
 */
/**
 * Trusted sites that should always be allowed
 * These sites are commonly used and trusted, so we bypass strict CSP for them
 */
export const TRUSTED_SITES = [
    {
        domain: 'zerodha.com',
        reason: 'Indian trading platform - requires full functionality',
        cspBypass: true,
        permissions: ['*'],
    },
    {
        domain: 'kite.zerodha.com',
        reason: 'Zerodha Kite trading platform',
        cspBypass: true,
        permissions: ['*'],
    },
    {
        domain: 'youtube.com',
        reason: 'Video platform - requires media and iframe permissions',
        cspBypass: true,
        permissions: ['media', 'iframe', 'script'],
    },
    {
        domain: 'youtu.be',
        reason: 'YouTube short links',
        cspBypass: true,
        permissions: ['media', 'iframe', 'script'],
    },
    {
        domain: 'google.com',
        reason: 'Search and services',
        cspBypass: true,
    },
    {
        domain: 'google.co.in',
        reason: 'Google India',
        cspBypass: true,
    },
    {
        domain: 'github.com',
        reason: 'Development platform',
        cspBypass: true,
    },
    {
        domain: 'stackoverflow.com',
        reason: 'Developer Q&A platform',
        cspBypass: true,
    },
    {
        domain: 'tradingview.com',
        reason: 'Trading charts platform',
        cspBypass: true,
        permissions: ['*'],
    },
    {
        domain: 'nseindia.com',
        reason: 'National Stock Exchange of India',
        cspBypass: true,
        permissions: ['*'],
    },
    {
        domain: 'bseindia.com',
        reason: 'Bombay Stock Exchange',
        cspBypass: true,
        permissions: ['*'],
    },
    {
        domain: 'bing.com',
        reason: 'Bing search engine - requires full functionality',
        cspBypass: true,
        permissions: ['*'],
    },
];
/**
 * Check if a URL is in the allowlist
 */
export function isAllowedSite(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        return TRUSTED_SITES.some(site => {
            const siteDomain = site.domain.replace(/^www\./, '');
            return hostname === siteDomain || hostname.endsWith(`.${siteDomain}`);
        });
    }
    catch {
        return false;
    }
}
/**
 * Get allowlist entry for a URL
 */
export function getAllowedSite(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        return TRUSTED_SITES.find(site => {
            const siteDomain = site.domain.replace(/^www\./, '');
            return hostname === siteDomain || hostname.endsWith(`.${siteDomain}`);
        });
    }
    catch {
        return undefined;
    }
}
/**
 * Get relaxed CSP for allowed sites
 * Returns null to disable CSP, or a permissive CSP string
 */
export function getCSPForSite(url) {
    const allowedSite = getAllowedSite(url);
    if (allowedSite?.cspBypass) {
        // Return null to disable CSP, or a very permissive CSP
        return null;
    }
    return null; // Default: no CSP restrictions
}
