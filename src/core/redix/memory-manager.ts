// @ts-nocheck

import { ipc } from '../../lib/ipc-typed';
import { useMemoryStore, type MemorySnapshot, type TabMemorySample } from '../../state/memoryStore';
import { dispatch } from './runtime';

let initialized = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function initMemoryManager(): void {
  if (initialized) return;
  initialized = true;
  captureSnapshot().catch(() => {});
  pollTimer = setInterval(() => captureSnapshot().catch(() => {}), 20_000);
  window.addEventListener(
    'beforeunload',
    () => {
      if (pollTimer) clearInterval(pollTimer);
    },
    { once: true }
  );
}

async function captureSnapshot(): Promise<void> {
  if (!ipc?.tabs?.getAllMetrics || !ipc?.tabs?.list) return;
  try {
    const [metrics, tabs] = await Promise.all([ipc.tabs.getAllMetrics(), ipc.tabs.list()]);
    const now = Date.now();

    const tabSamples: TabMemorySample[] = tabs.map(tab => {
      const metric = metrics?.[tab.id];
      return {
        tabId: tab.id,
        title: tab.title,
        url: tab.url,
        memoryMB: metric?.memoryMB ?? 0,
        timestamp: now,
        pinned: tab.pinned,
        appMode: tab.appMode,
        sleeping: tab.sleeping,
      };
    });

    const totalPerTabs = tabSamples.reduce((sum, sample) => sum + sample.memoryMB, 0);
    const capacity =
      typeof navigator !== 'undefined' && 'deviceMemory' in navigator
        ? (navigator.deviceMemory as number) * 1024
        : undefined;

    const snapshot: MemorySnapshot = {
      totalMB: totalPerTabs,
      timestamp: now,
      tabs: tabSamples,
      savingsMB: estimateSavings(tabSamples),
      freeMB: capacity ? Math.max(0, capacity - totalPerTabs) : undefined,
    };

    useMemoryStore.getState().pushSnapshot(snapshot);
    if (capacity) {
      useMemoryStore.getState().setCapacity(capacity);
    }
    dispatch({
      type: 'redix:memory:snapshot',
      payload: {
        totalMB: snapshot.totalMB,
        timestamp: now,
      },
    });
  } catch (error) {
    console.warn('[MemoryManager] Failed to capture snapshot', error);
  }
}

function estimateSavings(samples: TabMemorySample[]): number | undefined {
  if (!samples.length) return undefined;
  const sleeping = samples.filter(sample => sample.sleeping);
  if (!sleeping.length) return 0;
  const active = samples.filter(sample => !sample.sleeping);
  const baseline =
    active.length > 0
      ? active.reduce((sum, sample) => sum + sample.memoryMB, 0) / active.length
      : samples.reduce((sum, sample) => sum + sample.memoryMB, 0) / samples.length;
  const saved = sleeping.reduce((sum, sample) => sum + Math.max(0, baseline - sample.memoryMB), 0);
  return Math.max(0, saved);
}
