/**
 * Search Health Check Service
 * Monitors MeiliSearch status and provides health indicators
 */

import { checkMeiliSearch } from '../lib/meili';

export type SearchHealthStatus = 'healthy' | 'degraded' | 'offline' | 'checking';

export interface SearchHealth {
  status: SearchHealthStatus;
  meiliSearch: boolean;
  localSearch: boolean;
  lastChecked: number;
  error?: string;
}

let healthCache: SearchHealth | null = null;
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Check search system health
 */
export async function checkSearchHealth(): Promise<SearchHealth> {
  const health: SearchHealth = {
    status: 'checking',
    meiliSearch: false,
    localSearch: true, // Local search (Lunr) is always available
    lastChecked: Date.now(),
  };

  try {
    // Check MeiliSearch
    const meiliAvailable = await Promise.race([
      checkMeiliSearch(),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2000)), // 2s timeout
    ]);

    health.meiliSearch = meiliAvailable;

    // Determine overall status
    if (meiliAvailable) {
      health.status = 'healthy';
    } else {
      // MeiliSearch down, but local search available
      health.status = 'degraded';
      health.error = 'MeiliSearch unavailable, using local search only';
    }
  } catch (error) {
    health.status = 'degraded';
    health.error = error instanceof Error ? error.message : 'Unknown error';
    health.meiliSearch = false;
  }

  healthCache = health;
  return health;
}

/**
 * Get cached health status
 */
export function getSearchHealth(): SearchHealth | null {
  return healthCache;
}

/**
 * Start periodic health checks
 */
export function startSearchHealthMonitoring(intervalMs: number = 30000): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  // Initial check
  checkSearchHealth().catch(console.error);

  // Periodic checks
  healthCheckInterval = setInterval(() => {
    checkSearchHealth().catch(console.error);
  }, intervalMs);
}

/**
 * Stop health monitoring
 */
export function stopSearchHealthMonitoring(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

/**
 * Verify search system on startup
 */
export async function verifySearchSystem(): Promise<{
  success: boolean;
  meiliSearch: boolean;
  localSearch: boolean;
  message: string;
}> {
  try {
    const health = await checkSearchHealth();

    return {
      success: health.status !== 'offline',
      meiliSearch: health.meiliSearch,
      localSearch: health.localSearch,
      message:
        health.status === 'healthy'
          ? 'Search system ready (MeiliSearch + Local)'
          : health.status === 'degraded'
            ? 'Search system ready (Local only - MeiliSearch unavailable)'
            : 'Search system offline',
    };
  } catch (error) {
    return {
      success: false,
      meiliSearch: false,
      localSearch: true,
      message: `Search verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

