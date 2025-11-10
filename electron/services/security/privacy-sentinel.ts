import { session, BrowserWindow } from 'electron';
import { registerHandler } from '../../shared/ipc/router';
import { z } from 'zod';
import { getTabs } from '../tabs';

const TRACKER_PATTERNS = [
  /doubleclick\.net/i,
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /facebook\.net/i,
  /twitter\.com/i,
  /adservice\.google\.com/i,
  /adsystem\.com/i,
  /scorecardresearch\.com/i,
  /taboola\.com/i,
  /outbrain\.com/i,
];

const requestLog = new Map<string, TrackerEntry>();

interface TrackerEntry {
  tabId: string;
  mainDomain: string | null;
  updatedAt: number;
  trackers: Map<string, number>;
  thirdPartyHosts: Map<string, number>;
  totalRequests: number;
}

export interface PrivacyAudit {
  score: number;
  grade: 'low' | 'moderate' | 'high';
  trackers: Array<{ host: string; count: number }>;
  thirdPartyHosts: Array<{ host: string; count: number }>;
  message: string;
  suggestions: string[];
  timestamp: number;
  ai?: PrivacyAiInsight | null;
}

export interface PrivacyAiInsight {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  actions: string[];
  issues: Array<{
    category: string;
    detail: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  generatedAt?: string;
}

function ensureEntry(tabId: string): TrackerEntry {
  const entry = requestLog.get(tabId);
  if (entry) return entry;
  const next: TrackerEntry = {
    tabId,
    mainDomain: null,
    updatedAt: Date.now(),
    trackers: new Map(),
    thirdPartyHosts: new Map(),
    totalRequests: 0,
  };
  requestLog.set(tabId, next);
  return next;
}

function getHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function normalizeDomain(host?: string | null): string | null {
  if (!host) return null;
  return host.replace(/^www\./, '').toLowerCase();
}

function isTracker(host: string): boolean {
  return TRACKER_PATTERNS.some((pattern) => pattern.test(host));
}

function findTabIdByWebContentsId(webContentsId?: number): string | null {
  if (typeof webContentsId !== 'number') return null;
  for (const win of BrowserWindow.getAllWindows()) {
    const tabs = getTabs(win);
    for (const tab of tabs) {
      const wc = tab.view?.webContents;
      if (wc && wc.id === webContentsId) {
        return tab.id;
      }
    }
  }
  return null;
}

function findTabUrl(tabId: string): string | null {
  for (const win of BrowserWindow.getAllWindows()) {
    const tabs = getTabs(win);
    const found = tabs.find((tab) => tab.id === tabId);
    if (found?.view?.webContents && !found.view.webContents.isDestroyed()) {
      try {
        return found.view.webContents.getURL?.() ?? null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
  try {
    const tabId = findTabIdByWebContentsId(details.webContentsId);
    if (!tabId) {
      callback({});
      return;
    }
    const host = getHost(details.url);
    const entry = ensureEntry(tabId);
    if (details.resourceType === 'mainFrame' && host) {
      entry.mainDomain = normalizeDomain(host);
    }
    if (host) {
      const normalized = normalizeDomain(host) ?? host;
      entry.totalRequests += 1;
      const isThirdParty = entry.mainDomain && normalized !== entry.mainDomain;
      if (isThirdParty) {
        entry.thirdPartyHosts.set(normalized, (entry.thirdPartyHosts.get(normalized) ?? 0) + 1);
      }
      if (isTracker(normalized)) {
        entry.trackers.set(normalized, (entry.trackers.get(normalized) ?? 0) + 1);
      }
      entry.updatedAt = Date.now();
    }
  } catch {
    // ignore
  } finally {
    callback({});
  }
});

const PrivacyAuditSchema = z.object({
  tabId: z.string().optional(),
});

function computeAudit(entry: TrackerEntry | undefined): PrivacyAudit {
  if (!entry) {
    return {
      score: 10,
      grade: 'low',
      trackers: [],
      thirdPartyHosts: [],
      message: 'No data collected yet for this tab.',
      suggestions: ['Browse around a bit and re-run the audit.'],
      timestamp: Date.now(),
    };
  }

  const trackerCount = entry.trackers.size;
  const thirdPartyCount = entry.thirdPartyHosts.size;
  const score = Math.min(100, trackerCount * 15 + thirdPartyCount * 5);
  let grade: PrivacyAudit['grade'] = 'low';
  if (score >= 60) grade = 'high';
  else if (score >= 25) grade = 'moderate';

  const message = grade === 'high'
    ? 'High-risk tracking detected on this page.'
    : grade === 'moderate'
    ? 'Moderate tracking detected.'
    : 'Low tracking footprint detected.';

  const suggestions: string[] = [];
  if (trackerCount > 0) suggestions.push('Block trackers in the security menu or enable ghost mode.');
  if (thirdPartyCount > 0) suggestions.push('Consider opening in Shadow Mode to prevent data leakage.');
  if (suggestions.length === 0) suggestions.push('No action needed—privacy looks good.');

  return {
    score,
    grade,
    trackers: Array.from(entry.trackers.entries()).map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count),
    thirdPartyHosts: Array.from(entry.thirdPartyHosts.entries()).map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count),
    message,
    suggestions,
    timestamp: entry.updatedAt,
    ai: null,
  };
}

async function maybeFetchAiInsight(tabId: string | null, entry: TrackerEntry | undefined, audit: PrivacyAudit): Promise<PrivacyAiInsight | null> {
  const baseUrl =
    process.env.PRIVACY_SENTINEL_API ||
    process.env.SENTINEL_API_BASE ||
    process.env.REDIX_API_BASE ||
    process.env.API_BASE_URL;

  if (!baseUrl || !audit) {
    return null;
  }

  const payload = {
    tabId: tabId ?? undefined,
    url: tabId ? findTabUrl(tabId) ?? undefined : undefined,
    trackers: audit.trackers,
    thirdPartyHosts: audit.thirdPartyHosts,
    totalRequests: entry?.totalRequests ?? 0,
  };

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/sentinel/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PrivacySentinel] AI audit request failed', response.status, await response.text());
      }
      return null;
    }

    const data = (await response.json()) as {
      riskScore: number;
      riskLevel: 'low' | 'medium' | 'high';
      summary: string;
      actions: string[];
      issues: Array<{ category: string; detail: string; severity: 'low' | 'medium' | 'high' }>;
      generatedAt?: string;
    };

    return {
      riskScore: data.riskScore,
      riskLevel: data.riskLevel,
      summary: data.summary,
      actions: data.actions,
      issues: data.issues,
      generatedAt: data.generatedAt,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PrivacySentinel] AI audit fetch error', error);
    }
    return null;
  }
}

export function registerPrivacySentinelIpc(): void {
  registerHandler('privacy:sentinel:audit', PrivacyAuditSchema, async (_event, request) => {
    const tabId = request.tabId ? request.tabId : null;
    const entry = tabId ? requestLog.get(tabId) : undefined;
    const audit = computeAudit(entry);
    audit.ai = await maybeFetchAiInsight(tabId, entry, audit);
    return audit;
  });
}
