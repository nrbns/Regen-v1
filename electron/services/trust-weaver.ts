import { app } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createLogger } from './utils/logger';

const logger = createLogger('trust-weaver');

export type TrustVerdict = 'trusted' | 'caution' | 'risk';

export interface TrustSignal {
  id: string;
  domain: string;
  url?: string;
  title?: string;
  score: number;
  confidence: number;
  tags: string[];
  comment?: string;
  sourcePeer?: string;
  createdAt: number;
}

export interface TrustSummary {
  domain: string;
  score: number;
  confidence: number;
  verdict: TrustVerdict;
  signals: number;
  tags: string[];
  lastUpdated: number;
  topSignals: TrustSignal[];
}

interface TrustSnapshot {
  records: Record<string, TrustSummary & { signalsList: TrustSignal[] }>; // domain keyed
  updatedAt: number;
}

let cache: TrustSnapshot | null = null;
let loadingPromise: Promise<void> | null = null;

const VERDICT_THRESHOLD_SAFE = 70;
const VERDICT_THRESHOLD_CAUTION = 40;

function getStoragePath(): string {
  const dir = path.join(app.getPath('userData'), 'trust-weaver');
  return path.join(dir, 'network.json');
}

function normalizeDomain(domainOrUrl: string): string | null {
  if (!domainOrUrl) return null;

  try {
    const url = domainOrUrl.includes('://') ? new URL(domainOrUrl) : new URL(`https://${domainOrUrl}`);
    return url.hostname.toLowerCase();
  } catch {
    return domainOrUrl.replace(/^www\./, '').toLowerCase().trim() || null;
  }
}

async function ensureLoaded(): Promise<void> {
  if (cache) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const content = await fs.readFile(getStoragePath(), 'utf-8');
      const parsed = JSON.parse(content) as TrustSnapshot;
      if (parsed && typeof parsed === 'object' && parsed.records) {
        cache = parsed;
        return;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[trust-weaver] failed to load cache', error);
      }
    }
    cache = { records: {}, updatedAt: Date.now() };
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

async function persist(): Promise<void> {
  if (!cache) return;
  try {
    const storagePath = getStoragePath();
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    const serializable: TrustSnapshot = {
      records: Object.fromEntries(
        Object.entries(cache.records).map(([domain, summary]) => [
          domain,
          {
            ...summary,
            signalsList: summary.signalsList.slice(),
            topSignals: summary.topSignals.slice(),
          },
        ]),
      ),
      updatedAt: Date.now(),
    };

    await fs.writeFile(storagePath, JSON.stringify(serializable, null, 2), 'utf-8');
  } catch (error) {
    logger.warn('Failed to persist trust network snapshot', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function computeVerdict(score: number): TrustVerdict {
  if (score >= VERDICT_THRESHOLD_SAFE) return 'trusted';
  if (score >= VERDICT_THRESHOLD_CAUTION) return 'caution';
  return 'risk';
}

function recalcSummary(summary: TrustSummary & { signalsList: TrustSignal[] }): TrustSummary & { signalsList: TrustSignal[] } {
  const signals = summary.signalsList;
  if (signals.length === 0) {
    return {
      ...summary,
      score: 50,
      confidence: 0,
      verdict: 'caution',
      signals: 0,
      tags: [],
      topSignals: [],
    };
  }

  const totalScore = signals.reduce((acc, item) => acc + Math.max(0, Math.min(100, item.score)), 0);
  const totalConfidence = signals.reduce((acc, item) => acc + Math.max(0, Math.min(1, item.confidence)), 0);
  const avgScore = totalScore / signals.length;
  const avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0;
  const tagCounts = new Map<string, number>();
  for (const signal of signals) {
    for (const tag of signal.tags) {
      const current = tagCounts.get(tag) ?? 0;
      tagCounts.set(tag, current + 1);
    }
  }

  const topSignals = signals
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return {
    ...summary,
    score: Number(avgScore.toFixed(1)),
    confidence: Number(avgConfidence.toFixed(2)),
    verdict: computeVerdict(avgScore),
    signals: signals.length,
    tags: Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag),
    topSignals,
    lastUpdated: Date.now(),
  };
}

export async function listTrustRecords(): Promise<TrustSummary[]> {
  await ensureLoaded();
  if (!cache) return [];
  const summaries = Object.entries(cache.records).map(([domain, record]) => {
    const recalculated = recalcSummary(record);
    cache!.records[domain] = recalculated;
    return recalculated;
  });

  return summaries
    .sort((a, b) => b.signals - a.signals || b.score - a.score)
    .map(({ signalsList, ...rest }) => rest);
}

export async function getTrustSummary(domain: string): Promise<TrustSummary | null> {
  const normalized = normalizeDomain(domain);
  if (!normalized) return null;
  await ensureLoaded();
  if (!cache) return null;
  const summary = cache.records[normalized];
  if (!summary) return null;
  const recalculated = recalcSummary(summary);
  cache.records[normalized] = recalculated;
  return { ...recalculated, topSignals: recalculated.topSignals.slice() };
}

export async function submitTrustSignal(input: {
  domain: string;
  url?: string;
  title?: string;
  score: number;
  confidence?: number;
  tags?: string[];
  comment?: string;
  sourcePeer?: string;
}): Promise<TrustSummary | null> {
  const normalized = normalizeDomain(input.domain);
  if (!normalized) {
    return null;
  }

  await ensureLoaded();
  if (!cache) {
    cache = { records: {}, updatedAt: Date.now() };
  }

  const score = Math.max(0, Math.min(100, Number(input.score) || 0));
  const confidence = Math.max(0, Math.min(1, Number(input.confidence ?? 0.6)));
  const signal: TrustSignal = {
    id: randomUUID(),
    domain: normalized,
    url: input.url,
    title: input.title,
    score,
    confidence,
    tags: Array.from(new Set((input.tags ?? []).map((tag) => tag.toLowerCase().trim()).filter(Boolean))),
    comment: input.comment?.trim(),
    sourcePeer: input.sourcePeer?.trim(),
    createdAt: Date.now(),
  };

  const existing = cache.records[normalized];
  const summary: TrustSummary & { signalsList: TrustSignal[] } = existing
    ? { ...existing, signalsList: existing.signalsList.slice() }
    : {
        domain: normalized,
        score,
        confidence,
        verdict: computeVerdict(score),
        signals: 0,
        tags: [],
        lastUpdated: Date.now(),
        topSignals: [],
        signalsList: [],
      };

  summary.signalsList.push(signal);
  const recalculated = recalcSummary(summary);
  recalculated.signalsList = summary.signalsList;
  cache.records[normalized] = recalculated;
  cache.updatedAt = Date.now();

  await persist();
  return { ...cache.records[normalized], topSignals: cache.records[normalized].topSignals.slice() };
}

export async function clearTrustSignalsForTesting(): Promise<void> {
  cache = { records: {}, updatedAt: Date.now() };
  await persist();
}
