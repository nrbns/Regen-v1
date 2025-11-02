/**
 * DNS-over-HTTPS (DoH) Service
 * Toggle DoH resolution with provider selection
 */

import * as dns from 'node:dns';
import { promises as dnsPromises } from 'node:dns';

const DOH_PROVIDERS = {
  cloudflare: 'https://cloudflare-dns.com/dns-query',
  quad9: 'https://dns.quad9.net/dns-query',
} as const;

type DoHProvider = keyof typeof DOH_PROVIDERS;

let dohEnabled = false;
let dohProvider: DoHProvider = 'cloudflare';

/**
 * Enable DoH
 */
export async function enableDoH(provider: DoHProvider = 'cloudflare'): Promise<void> {
  dohEnabled = true;
  dohProvider = provider;

  // DoH is enabled - lookups will go through dohLookup function
  // We don't modify the system dns.lookup as it's read-only
  // Instead, we route through dohLookup which uses DoH API when enabled

  console.log(`[DNS] DoH enabled with provider: ${provider}`);
}

/**
 * Disable DoH (restore system DNS)
 */
export function disableDoH(): void {
  dohEnabled = false;
  
  // DoH disabled - lookups will use system DNS
  console.log('[DNS] DoH disabled, using system DNS');
}

/**
 * Check if DoH is enabled
 */
export function isDoHEnabled(): boolean {
  return dohEnabled;
}

/**
 * Get current DoH provider
 */
export function getDoHProvider(): DoHProvider {
  return dohProvider;
}

/**
 * Perform DoH lookup (simplified - would need full DNS-over-HTTPS implementation)
 */
export async function dohLookup(hostname: string): Promise<string[]> {
  if (!dohEnabled) {
    // Fall back to system DNS
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, { all: true }, (err: NodeJS.ErrnoException | null, addresses?: dns.LookupAddress[]) => {
        if (err) reject(err);
        else resolve((addresses || []).map((a: dns.LookupAddress) => a.address));
      });
    });
  }

  // DoH query implementation
  try {
    const { fetch } = await import('undici');
    const dohUrl = `${DOH_PROVIDERS[dohProvider]}?name=${encodeURIComponent(hostname)}&type=A`;
    const response = await fetch(dohUrl, {
      headers: {
        'Accept': 'application/dns-json',
      },
    });
    
    if (response.ok) {
      const data = await response.json() as { Answer?: Array<{ data: string }> };
      if (data.Answer && data.Answer.length > 0) {
        return data.Answer.map((answer: { data: string }) => answer.data);
      }
    }
  } catch (error) {
    console.warn('[DNS] DoH lookup failed, falling back to system DNS:', error);
  }

  // Fallback to system DNS
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err: NodeJS.ErrnoException | null, addresses?: dns.LookupAddress[]) => {
      if (err) reject(err);
      else resolve((addresses || []).map((a: dns.LookupAddress) => a.address));
    });
  });
}

