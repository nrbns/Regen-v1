/**
 * Browser Mode Fixes - Real-world fixes for tab rendering
 * Handles edge cases, X-Frame-Options, network errors, and cross-origin issues
 */

import { isElectronRuntime } from '../lib/env';

export interface BrowserModeError {
  type: 'x-frame-options' | 'network' | 'timeout' | 'cors' | 'unknown';
  message: string;
  recoverable: boolean;
  fallbackUrl?: string;
}

/**
 * Detect if a URL is likely to block iframes
 */
export function isLikelyBlocked(url: string): boolean {
  if (!url) return false;

  const blockedPatterns = [
    'google.com/search',
    'duckduckgo.com',
    'bing.com/search',
    'youtube.com/watch', // Some videos block
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'linkedin.com',
  ];

  return blockedPatterns.some(pattern => url.toLowerCase().includes(pattern));
}

/**
 * Convert blocked search URL to iframe-friendly alternative
 */
export function getIframeFriendlySearchUrl(query: string, language?: string): string {
  // Use Startpage (privacy-friendly and iframe-friendly)
  const langParam = language && language !== 'auto' ? `&language=${language}` : '';
  return `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}${langParam}`;
}

/**
 * Check if iframe is actually blocked (not just cross-origin)
 */
export function checkIframeBlocked(iframe: HTMLIFrameElement): boolean {
  try {
    // Try to access contentWindow - will be null if blocked
    if (iframe.contentWindow === null && iframe.src && !iframe.src.startsWith('about:')) {
      // Additional check: wait a bit and check again
      return true;
    }

    // Try to access contentDocument (same-origin only, but if blocked, this will fail)
    try {
      const doc = iframe.contentDocument;
      return (doc === null && iframe.src && !iframe.src.startsWith('about:')) as boolean;
    } catch {
      // Cross-origin is normal - not blocked
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get user-friendly error message for browser mode errors
 */
export function getBrowserModeErrorMessage(error: BrowserModeError): string {
  switch (error.type) {
    case 'x-frame-options':
      return 'This site cannot be embedded for security reasons. Click "Open in Browser" to view it.';
    case 'network':
      return 'Network error. Please check your internet connection.';
    case 'timeout':
      return 'This page is taking too long to load. Try refreshing or check your connection.';
    case 'cors':
      return 'Cross-origin restrictions prevent embedding this page.';
    default:
      return error.message || 'Failed to load this page.';
  }
}

/**
 * Handle iframe blocked error with fallback
 */
export async function handleIframeBlocked(
  url: string,
  query?: string
): Promise<{ fallbackUrl?: string; shouldOpenExternal: boolean }> {
  // If it's a search query, convert to iframe-friendly search
  if (query) {
    return {
      fallbackUrl: getIframeFriendlySearchUrl(query),
      shouldOpenExternal: false,
    };
  }

  // For other URLs, suggest opening externally
  return {
    shouldOpenExternal: true,
  };
}

/**
 * Validate URL before loading in iframe
 */
export function validateUrlForIframe(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const urlObj = new URL(url);

    // Block dangerous protocols
    const blockedProtocols = ['javascript:', 'data:', 'file:', 'vbscript:'];
    if (blockedProtocols.includes(urlObj.protocol.toLowerCase())) {
      return { valid: false, error: 'Unsupported protocol' };
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Get optimal iframe sandbox attributes based on privacy mode
 */
export function getIframeSandbox(privacyMode: boolean): string {
  if (privacyMode) {
    // Strict privacy mode - minimal permissions
    return 'allow-same-origin allow-scripts allow-forms';
  }

  // Normal mode - full functionality
  return 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-top-navigation-by-user-activation';
}

/**
 * Check if running in Tauri and handle accordingly
 */
export function shouldUseIframe(): boolean {
  // Use iframe for Tauri and web, BrowserView for Electron
  return !isElectronRuntime();
}

/**
 * Get retry strategy for failed loads
 */
export function getRetryStrategy(
  errorType: BrowserModeError['type'],
  attempt: number
): { shouldRetry: boolean; delay: number } {
  if (attempt >= 2) {
    return { shouldRetry: false, delay: 0 };
  }

  switch (errorType) {
    case 'network':
    case 'timeout':
      return { shouldRetry: true, delay: 2000 * attempt };
    case 'x-frame-options':
    case 'cors':
      return { shouldRetry: false, delay: 0 };
    default:
      return { shouldRetry: attempt < 1, delay: 1000 };
  }
}
