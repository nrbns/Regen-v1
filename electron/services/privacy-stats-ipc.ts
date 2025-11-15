/**
 * Privacy Stats IPC Handlers
 * Expose privacy statistics and export functionality
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getShieldsService } from './shields';
import { getAllOriginData } from './privacy';
import { session } from 'electron';

export interface PrivacyStats {
  trackersBlocked: number;
  adsBlocked: number;
  cookiesBlocked: number;
  scriptsBlocked: number;
  httpsUpgrades: number;
  fingerprintingEnabled: boolean;
  webrtcBlocked: boolean;
  totalCookies: number;
  totalOrigins: number;
  privacyScore: number; // 0-100
}

export interface TrackerInfo {
  domain: string;
  category: string;
  count: number;
  blocked: boolean;
  lastSeen: number;
}

export interface PrivacyReport {
  stats: PrivacyStats;
  trackers: TrackerInfo[];
  origins: Array<{
    origin: string;
    cookies: number;
    lastAccessed: number;
  }>;
  timestamp: number;
  exportFormat: 'json' | 'csv';
}

/**
 * Calculate privacy score (0-100)
 */
function calculatePrivacyScore(stats: Partial<PrivacyStats>): number {
  let score = 50; // Base score

  // Trackers blocked (max +30)
  if (stats.trackersBlocked && stats.trackersBlocked > 0) {
    score += Math.min(30, (stats.trackersBlocked / 100) * 10);
  }

  // Ads blocked (max +20)
  if (stats.adsBlocked && stats.adsBlocked > 0) {
    score += Math.min(20, (stats.adsBlocked / 100) * 5);
  }

  // HTTPS upgrades (max +10)
  if (stats.httpsUpgrades && stats.httpsUpgrades > 0) {
    score += Math.min(10, stats.httpsUpgrades / 10);
  }

  // Fingerprinting protection (+10)
  if (stats.fingerprintingEnabled) {
    score += 10;
  }

  // WebRTC blocking (+5)
  if (stats.webrtcBlocked) {
    score += 5;
  }

  // Cookie blocking (max +15)
  if (stats.cookiesBlocked && stats.cookiesBlocked > 0) {
    score += Math.min(15, (stats.cookiesBlocked / 50) * 5);
  }

  // Script blocking (max +10)
  if (stats.scriptsBlocked && stats.scriptsBlocked > 0) {
    score += Math.min(10, (stats.scriptsBlocked / 50) * 5);
  }

  // Penalize for too many cookies/origins
  if (stats.totalCookies && stats.totalCookies > 100) {
    score -= Math.min(20, (stats.totalCookies - 100) / 10);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function registerPrivacyStatsIpc(): void {
  // Get comprehensive privacy stats
  registerHandler('privacy:getStats', z.object({}), async () => {
    const shields = getShieldsService();
    const status = shields.getStatus();
    
    // Get cookie/origin data
    const origins = await getAllOriginData();
    const cookies = await session.defaultSession.cookies.get({});
    
    const stats: PrivacyStats = {
      trackersBlocked: status.trackersBlocked,
      adsBlocked: status.adsBlocked,
      cookiesBlocked: status.cookies3p === 'block' ? cookies.filter(c => {
        // Count third-party cookies
        try {
          if (!c.domain) return false;
          // This is approximate - would need referer info for accurate 3p detection
          return true; // Simplified
        } catch {
          return false;
        }
      }).length : 0,
      scriptsBlocked: 0, // Would need to track this separately
      httpsUpgrades: status.httpsUpgrades,
      fingerprintingEnabled: status.fingerprinting,
      webrtcBlocked: status.webrtcBlocked,
      totalCookies: cookies.length,
      totalOrigins: origins.length,
      privacyScore: 0, // Will calculate below
    };

    // Calculate privacy score
    stats.privacyScore = calculatePrivacyScore(stats);

    return stats;
  });

  // Get tracker list
  registerHandler('privacy:getTrackers', z.object({
    limit: z.number().optional().default(50),
  }), async (_event, request) => {
    // In a real implementation, this would track individual trackers
    // For now, return mock data based on blocked domains
    const shields = getShieldsService();
    const status = shields.getStatus();
    
    // Common tracker categories
    const trackerCategories: Record<string, string> = {
      'google-analytics.com': 'Analytics',
      'doubleclick.net': 'Advertising',
      'facebook.com': 'Social',
      'scorecardresearch.com': 'Analytics',
      'googlesyndication.com': 'Advertising',
    };

    const trackers: TrackerInfo[] = [];
    
    // Generate tracker list from blocked domains
    // In production, this would come from actual request logs
    if (status.trackersBlocked > 0) {
      Object.entries(trackerCategories).forEach(([domain, category]) => {
        trackers.push({
          domain,
          category,
          count: Math.floor(Math.random() * 10) + 1,
          blocked: true,
          lastSeen: Date.now() - Math.random() * 86400000, // Last 24h
        });
      });
    }

    return trackers.slice(0, request.limit);
  });

  // Export privacy report
  registerHandler('privacy:exportReport', z.object({
    format: z.enum(['json', 'csv']).default('json'),
  }), async (_event, request) => {
    const shields = getShieldsService();
    const status = shields.getStatus();
    const origins = await getAllOriginData();
    const cookies = await session.defaultSession.cookies.get({});
    
    const stats: PrivacyStats = {
      trackersBlocked: status.trackersBlocked,
      adsBlocked: status.adsBlocked,
      cookiesBlocked: status.cookies3p === 'block' ? cookies.length : 0,
      scriptsBlocked: 0,
      httpsUpgrades: status.httpsUpgrades,
      fingerprintingEnabled: status.fingerprinting,
      webrtcBlocked: status.webrtcBlocked,
      totalCookies: cookies.length,
      totalOrigins: origins.length,
      privacyScore: 0,
    };

    stats.privacyScore = calculatePrivacyScore(stats);

    // Get trackers (simplified - would need actual tracker list)
    const trackerList: TrackerInfo[] = [];

    const report: PrivacyReport = {
      stats,
      trackers: trackerList,
      origins: origins.map(o => ({
        origin: o.origin,
        cookies: o.cookies,
        lastAccessed: o.lastAccessed,
      })),
      timestamp: Date.now(),
      exportFormat: request.format || 'json',
    };

    return report;
  });
}

