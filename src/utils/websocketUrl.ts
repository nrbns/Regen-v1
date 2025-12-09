/**
 * WebSocket URL utility
 * Automatically selects ws:// or wss:// based on page protocol
 */

/**
 * Get WebSocket URL with correct protocol (ws:// for http, wss:// for https)
 */
export function getWebSocketUrl(baseUrl: string): string {
  if (typeof window === 'undefined') {
    // Server-side: default to ws://
    return baseUrl;
  }

  // If URL already has protocol, use it as-is
  if (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')) {
    return baseUrl;
  }

  // Determine protocol based on current page protocol
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  
  // Remove http:// or https:// if present
  const cleanUrl = baseUrl.replace(/^https?:\/\//, '');
  
  return `${protocol}${cleanUrl}`;
}

/**
 * Get WebSocket URL from environment variable with fallback
 */
export function getWebSocketUrlFromEnv(envVar: string, fallback: string): string {
  const envUrl = import.meta.env[envVar];
  const baseUrl = envUrl || fallback;
  return getWebSocketUrl(baseUrl);
}

