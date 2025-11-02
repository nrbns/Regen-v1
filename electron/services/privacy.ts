/**
 * Privacy Dashboard Service
 * Per-origin data tracking and one-click purge
 */

import { session } from 'electron';
import { app } from 'electron';

export interface OriginData {
  origin: string;
  cookies: number;
  localStorage: boolean;
  indexedDB: boolean;
  cache: boolean;
  serviceWorkers: number;
  lastAccessed: number;
}

const originDataCache = new Map<string, OriginData>();

/**
 * Get data for all origins
 */
export async function getAllOriginData(): Promise<OriginData[]> {
  const origins = new Set<string>();

  // Get cookies
  const cookies = await session.defaultSession.cookies.get({});
  for (const cookie of cookies) {
    origins.add(new URL(`https://${cookie.domain}`).origin);
  }

  // Get storage data (approximate)
  const data: OriginData[] = [];

  for (const origin of origins) {
    const cookieCount = cookies.filter(c => {
      try {
        return new URL(`https://${c.domain}`).origin === origin;
      } catch {
        return false;
      }
    }).length;

    data.push({
      origin,
      cookies: cookieCount,
      localStorage: true, // Approximate
      indexedDB: true, // Approximate
      cache: true, // Approximate
      serviceWorkers: 0, // Would need to query service workers
      lastAccessed: Date.now(), // Approximate
    });
  }

  return data;
}

/**
 * Purge data for a specific origin
 */
export async function purgeOriginData(origin: string): Promise<void> {
  const url = new URL(origin);
  const domain = url.hostname.startsWith('.') ? url.hostname : `.${url.hostname}`;

  // Clear cookies
  const cookies = await session.defaultSession.cookies.get({ domain });
  for (const cookie of cookies) {
    await session.defaultSession.cookies.remove(url.href, cookie.name);
  }

  // Clear storage
  await session.defaultSession.clearStorageData({
    origin: origin,
    storages: [
      'cookies',
      'filesystem',
      'indexdb',
      'localstorage',
      'shadercache',
      'websql',
      'serviceworkers',
      'cachestorage',
    ],
  });

  console.log(`[Privacy] Purged data for origin: ${origin}`);
}

/**
 * Export all user data (for transparency)
 */
export async function exportUserData(): Promise<{
  origins: OriginData[];
  timestamp: number;
}> {
  const origins = await getAllOriginData();

  return {
    origins,
    timestamp: Date.now(),
  };
}

