/**
 * NetworkPolicy
 * Centralized network allowlist and gatekeeper for all outbound requests.
 * v1: offline by default. Consumers must explicitly ask for network access
 * and pass through this policy check.
 */

export type NetworkSource = 'user' | 'agent' | 'system' | 'extension';

const DEFAULT_ALLOWLIST: string[] = []; // populate with trusted hosts as needed

export function isNetworkAllowed(source: NetworkSource, url: string): boolean {
  // Deny agent-initiated network calls by default
  if (source === 'agent') return false;

  // Check host allowlist
  try {
    const u = new URL(url);
    return DEFAULT_ALLOWLIST.includes(u.host);
  } catch {
    return false;
  }
}

export function addToAllowlist(host: string) {
  if (!DEFAULT_ALLOWLIST.includes(host)) DEFAULT_ALLOWLIST.push(host);
}

export default { isNetworkAllowed, addToAllowlist };
