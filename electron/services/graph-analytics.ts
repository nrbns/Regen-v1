import { BrowserWindow } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getTabs } from './tabs';
import { createLogger } from './utils/logger';

const logger = createLogger('graph-analytics');

interface TabGraphNode {
  id: string;
  title: string;
  url: string;
  domain: string;
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  mode?: 'normal' | 'ghost' | 'private';
  active: boolean;
  createdAt?: number;
  lastActiveAt?: number;
}

interface TabGraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  reasons: string[];
}

interface TabGraphSummary {
  totalTabs: number;
  activeTabs: number;
  domains: number;
  containers: number;
}

interface TabCluster {
  id: string;
  label: string;
  tabIds: string[];
  domain?: string;
  strength: number;
}

interface TabGraphPayload {
  nodes: TabGraphNode[];
  edges: TabGraphEdge[];
  summary: TabGraphSummary;
  updatedAt: number;
  clusters?: TabCluster[];
}

const SHADOW_SESSION_MARKER = Symbol.for('omnibrowser.shadow-session');

interface TabSnapshot {
  url?: string;
  title?: string;
  active?: boolean;
  containerId?: string | null;
  containerName?: string | null;
  containerColor?: string | null;
  mode?: string | null;
  createdAt?: number | null;
  lastActiveAt?: number | null;
}

function getTabSnapshot(tab: any): TabSnapshot {
  const snapshot: TabSnapshot = {
    url: tab?.url ?? undefined,
    title: tab?.title ?? undefined,
    active: tab?.active ?? undefined,
    containerId: tab?.containerId ?? null,
    containerName: tab?.containerName ?? null,
    containerColor: tab?.containerColor ?? null,
    mode: tab?.mode ?? null,
    createdAt: tab?.createdAt ?? null,
    lastActiveAt: tab?.lastActiveAt ?? null,
  };

  try {
    const view = tab?.view;
    const webContents = view?.webContents;
    if (webContents && !webContents.isDestroyed()) {
      snapshot.url = webContents.getURL?.() || snapshot.url;
      snapshot.title = webContents.getTitle?.() || snapshot.title;
      snapshot.active = webContents.isFocused?.() ?? snapshot.active;
    }
  } catch (error) {
    logger?.warn?.('Failed to extract tab snapshot', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return snapshot;
}

const getDomain = (url?: string | null): string => {
  if (!url) return 'unknown';
  try {
    const parsed = new URL(url);
    return parsed.hostname || 'unknown';
  } catch {
    return 'unknown';
  }
};

const edgeKey = (a: string, b: string): string => {
  if (a === b) return `${a}__${b}`;
  return a < b ? `${a}__${b}` : `${b}__${a}`;
};

function buildTabGraph(): TabGraphPayload {
  const nodes: TabGraphNode[] = [];
  const windows = BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed() && !(win as any)[SHADOW_SESSION_MARKER]);
  const containerSet = new Set<string>();
  const domainSet = new Set<string>();
  let activeCount = 0;

  for (const win of windows) {
    const tabs = getTabs(win);
    tabs.forEach((tab) => {
      const snapshot = getTabSnapshot(tab);
      const domain = snapshot.url ? getDomain(snapshot.url) : '';
      const node: TabGraphNode = {
        id: tab.id,
        title: snapshot.title || domain || 'Untitled tab',
        url: snapshot.url || 'about:blank',
        domain,
        containerId: snapshot.containerId ?? undefined,
        containerName: snapshot.containerName ?? undefined,
        containerColor: snapshot.containerColor ?? undefined,
        mode: (snapshot.mode as TabGraphNode['mode']) ?? undefined,
        active: Boolean(snapshot.active),
        createdAt: snapshot.createdAt ?? undefined,
        lastActiveAt: snapshot.lastActiveAt ?? undefined,
      };
      nodes.push(node);
      if (node.containerId) {
        containerSet.add(node.containerId);
      }
      if (domain) {
        domainSet.add(domain);
      }
      if (node.active) {
        activeCount += 1;
      }
    });
  }

  const edgesMap = new Map<string, { source: string; target: string; weight: number; reasons: Set<string> }>();

  const addEdge = (source: string, target: string, reason: string, weight = 1) => {
    if (source === target) return;
    const key = edgeKey(source, target);
    const entry = edgesMap.get(key);
    if (entry) {
      entry.weight += weight;
      entry.reasons.add(reason);
    } else {
      edgesMap.set(key, {
        source,
        target,
        weight,
        reasons: new Set([reason]),
      });
    }
  };

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.domain && a.domain === b.domain) {
        addEdge(a.id, b.id, 'domain', 2);
      }
      if (a.containerId && a.containerId === b.containerId) {
        addEdge(a.id, b.id, 'container', 1.5);
      }
      if (a.mode && a.mode === b.mode) {
        addEdge(a.id, b.id, 'mode', 1);
      }
      if (typeof a.lastActiveAt === 'number' && typeof b.lastActiveAt === 'number') {
        const delta = Math.abs(a.lastActiveAt - b.lastActiveAt);
        if (delta <= 120_000) {
          addEdge(a.id, b.id, 'timeline', 0.5);
        }
      }
    }
  }

  const edges: TabGraphEdge[] = Array.from(edgesMap.values()).map((entry) => ({
    id: `${entry.source}->${entry.target}`,
    source: entry.source,
    target: entry.target,
    weight: Number(entry.weight.toFixed(2)),
    reasons: Array.from(entry.reasons.values()),
  }));

  const payload: TabGraphPayload = {
    nodes,
    edges,
    updatedAt: Date.now(),
    summary: {
      totalTabs: nodes.length,
      activeTabs: activeCount,
      domains: domainSet.size,
      containers: containerSet.size,
    },
    clusters: [],
  };

  const domainBuckets = new Map<string, string[]>();
  nodes.forEach((node) => {
    const bucket = domainBuckets.get(node.domain) ?? [];
    bucket.push(node.id);
    domainBuckets.set(node.domain, bucket);
  });

  for (const [domain, tabIds] of domainBuckets.entries()) {
    if (tabIds.length >= 3) {
      payload.clusters?.push({
        id: `domain:${domain}`,
        label: domain,
        tabIds,
        domain,
        strength: tabIds.length,
      });
    }
  }

  return payload;
}

function formatDomainLabel(domain: string): string {
  if (!domain || domain === 'unknown') return 'This topic';
  return domain.replace(/^www\./, '');
}

function buildWorkflowPlan(maxSteps = 5) {
  const graph = buildTabGraph();
  if (!graph.nodes.length) {
    return {
      planId: 'workflow-empty',
      goal: 'Map your browsing journey',
      summary: 'Open a few tabs to generate a workflow.',
      generatedAt: Date.now(),
      confidence: 0.2,
      steps: [],
      sources: [],
    };
  }

  const domainGroups = new Map<string, TabGraphNode[]>();
  for (const node of graph.nodes) {
    const key = node.domain || 'unknown';
    const bucket = domainGroups.get(key) ?? [];
    bucket.push(node);
    domainGroups.set(key, bucket);
  }

  const scoredGroups = Array.from(domainGroups.entries()).map(([domain, items]) => {
    const latest = Math.max(...items.map((item) => item.lastActiveAt ?? 0));
    const sizeScore = Math.min(1, items.length / 5);
    const recencyScore = latest ? Math.min(1, (Date.now() - latest) / (30 * 60_000)) : 0.5;
    const confidence = Math.max(0.3, 0.9 - recencyScore + sizeScore / 2);
    const sortedItems = items.slice().sort((a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0));
    return {
      domain,
      nodes: sortedItems,
      confidence,
      size: items.length,
      latest,
    };
  });

  scoredGroups.sort((a, b) => {
    const sizeDiff = b.size - a.size;
    if (sizeDiff !== 0) return sizeDiff;
    return (b.latest ?? 0) - (a.latest ?? 0);
  });

  const selected = scoredGroups.slice(0, Math.max(1, Math.min(maxSteps, scoredGroups.length)));

  const steps = selected.map((group, index) => {
    const domainLabel = formatDomainLabel(group.domain);
    const representative = group.nodes[0];
    const descriptionParts = [
      `Dive deeper into ${domainLabel}.`,
      `You have ${group.size} tab${group.size === 1 ? '' : 's'} aligned to this topic.`,
    ];
    if (representative?.url && representative?.title) {
      descriptionParts.push(`Anchor on “${representative.title}”.`);
    }

    const recommendedActions: string[] = [];
    recommendedActions.push(`Summarize key findings from ${domainLabel}.`);
    if (group.size >= 3) {
      recommendedActions.push('Cluster notes and capture highlights.');
    }
    if (group.size >= 2) {
      recommendedActions.push('Queue these tabs for automated research.');
    }

    return {
      id: `step-${index + 1}`,
      title: `Thread ${domainLabel}`,
      description: descriptionParts.join(' '),
      tabIds: group.nodes.map((node) => node.id),
      recommendedActions,
      primaryDomain: domainLabel,
      confidence: Number(group.confidence.toFixed(2)),
    };
  });

  const overallConfidence = steps.length
    ? Number(
        (
          steps.reduce((total, step) => total + (step.confidence ?? 0.5), 0) /
          steps.length
        ).toFixed(2),
      )
    : 0.2;

  const summary = `Woven from ${graph.summary.totalTabs} tabs across ${graph.summary.domains} domains.`;

  return {
    planId: `workflow-${Date.now()}`,
    goal: 'Weave your current browsing into an actionable journey.',
    summary,
    generatedAt: Date.now(),
    confidence: overallConfidence,
    steps,
    sources: selected.map((group) => ({
      domain: formatDomainLabel(group.domain),
      tabIds: group.nodes.map((node) => node.id),
    })),
  };
}

export function registerGraphAnalyticsIpc(): void {
  registerHandler(
    'graph:tabs',
    z.object({}),
    async () => buildTabGraph(),
  );

  registerHandler(
    'graph:workflowWeaver',
    z.object({
      maxSteps: z.number().min(1).max(8).optional(),
    }),
    async (_event, request) => buildWorkflowPlan(request.maxSteps ?? 5),
  );
}
