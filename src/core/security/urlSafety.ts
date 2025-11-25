/**
 * URL Safety Checks - Tier 2
 * Basic security guardrails for agent operations
 */

import { log } from '../../utils/logger';

// Blocked hosts (internal/metadata endpoints)
const BLOCKED_HOSTS = [
  '169.254.169.254', // AWS metadata
  'metadata.google.internal', // GCP metadata
  '169.254.169.254', // Azure metadata
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Check if URL is safe for agent operations
 */
export function isUrlSafe(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      log.warn(`[UrlSafety] Blocked protocol: ${url.protocol}`);
      return false;
    }

    // Check blocked hosts
    if (BLOCKED_HOSTS.includes(url.hostname)) {
      log.warn(`[UrlSafety] Blocked host: ${url.hostname}`);
      return false;
    }

    // Check for localhost variants
    if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
      log.warn(`[UrlSafety] Blocked localhost variant: ${url.hostname}`);
      return false;
    }

    // Check for private IP ranges
    if (isPrivateIP(url.hostname)) {
      log.warn(`[UrlSafety] Blocked private IP: ${url.hostname}`);
      return false;
    }

    return true;
  } catch (error) {
    log.error(`[UrlSafety] Invalid URL: ${urlString}`, error);
    return false;
  }
}

/**
 * Check if hostname is a private IP
 */
function isPrivateIP(hostname: string): boolean {
  // Simple check for common private IP patterns
  const privatePatterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
  ];

  return privatePatterns.some(pattern => pattern.test(hostname));
}

/**
 * Validate URL before agent operation
 */
export function validateUrlForAgent(url: string): { safe: boolean; reason?: string } {
  if (!isUrlSafe(url)) {
    return {
      safe: false,
      reason:
        'OmniAgent blocked an unsafe URL. Internal and private network addresses are not allowed.',
    };
  }

  return { safe: true };
}
