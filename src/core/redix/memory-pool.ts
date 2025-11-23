// @ts-nocheck

import { ipc } from '../../lib/ipc-typed';
import { dispatch } from './runtime';

type MemorySample = {
  tabId: string;
  memoryMB: number;
  timestamp: number;
};

type PoolAllocation = {
  tabId: string;
  capMB: number;
  lastUpdated: number;
};

interface MemoryPoolOptions {
  tabCapMB: number;
  maxTotalMB: number;
  rebalanceIntervalMs: number;
  reserveForActiveTabsMB: number;
}

const DEFAULT_OPTIONS: MemoryPoolOptions = {
  tabCapMB: 512,
  maxTotalMB: 4096,
  rebalanceIntervalMs: 30_000,
  reserveForActiveTabsMB: 1024,
};

class MemoryPool {
  private options: MemoryPoolOptions = { ...DEFAULT_OPTIONS };
  private samples: MemorySample[] = [];
  private pool: Map<string, PoolAllocation> = new Map();
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private rebalanceTimer: ReturnType<typeof setInterval> | null = null;

  start(options?: Partial<MemoryPoolOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
    this.pollUsage();
    this.rebalance();
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.rebalanceTimer) clearInterval(this.rebalanceTimer);
    this.metricsTimer = setInterval(() => this.pollUsage(), 20_000);
    this.rebalanceTimer = setInterval(() => this.rebalance(), this.options.rebalanceIntervalMs);
  }

  stop() {
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.rebalanceTimer) clearInterval(this.rebalanceTimer);
    this.metricsTimer = null;
    this.rebalanceTimer = null;
  }

  update(partial: Partial<MemoryPoolOptions>) {
    this.start({ ...this.options, ...partial });
  }

  private async pollUsage() {
    if (!ipc?.tabs?.getAllMetrics) return;
    try {
      const metrics = await ipc.tabs.getAllMetrics();
      const now = Date.now();
      Object.entries(metrics || {}).forEach(([tabId, data]: [string, any]) => {
        if (typeof data?.memoryMB !== 'number') return;
        this.samples.push({ tabId, memoryMB: data.memoryMB, timestamp: now });
        if (this.samples.length > 2000) {
          this.samples.splice(0, this.samples.length - 2000);
        }
      });
      dispatch({
        type: 'redix:memory:sample',
        payload: {
          totalTabs: Object.keys(metrics ?? {}).length,
          timestamp: now,
        },
      });
    } catch (error) {
      console.warn('[MemoryPool] Failed to poll usage', error);
    }
  }

  private async rebalance() {
    if (!ipc?.tabs?.list) return;
    try {
      const tabs = await ipc.tabs.list();
      const now = Date.now();
      const usageByTab = new Map<string, number>();
      this.samples.forEach(sample => {
        if (!usageByTab.has(sample.tabId) || sample.timestamp > now - 60_000) {
          usageByTab.set(sample.tabId, sample.memoryMB);
        }
      });

      const activeTabs = tabs.filter(tab => tab.active);
      const backgroundTabs = tabs.filter(tab => !tab.active);

      const totalBudget = this.options.maxTotalMB;
      const reserveForActive = Math.min(
        totalBudget * 0.5,
        Math.max(
          this.options.reserveForActiveTabsMB,
          activeTabs.length * (this.options.tabCapMB / 2)
        )
      );

      const perActiveCap = activeTabs.length
        ? Math.max(this.options.tabCapMB, reserveForActive / activeTabs.length)
        : 0;
      const perBackgroundCap = backgroundTabs.length
        ? Math.max(256, (totalBudget - reserveForActive) / backgroundTabs.length)
        : this.options.tabCapMB;

      const pending: Array<Promise<any>> = [];

      for (const tab of activeTabs) {
        pending.push(this.setCap(tab.id, Math.round(perActiveCap)));
      }

      for (const tab of backgroundTabs) {
        const observed = usageByTab.get(tab.id) ?? 0;
        const targetCap = Math.max(256, Math.min(perBackgroundCap, observed + 128));
        pending.push(this.setCap(tab.id, Math.round(targetCap)));
      }

      await Promise.allSettled(pending);

      dispatch({
        type: 'redix:memory:pool:update',
        payload: {
          timestamp: now,
          activeTabs: activeTabs.length,
          backgroundTabs: backgroundTabs.length,
          caps: Array.from(this.pool.values()),
        },
      });
    } catch (error) {
      console.warn('[MemoryPool] Failed to rebalance', error);
    }
  }

  private async setCap(tabId: string, capMB: number) {
    const existing = this.pool.get(tabId);
    if (existing && Math.abs(existing.capMB - capMB) < 32) {
      return existing;
    }
    try {
      await ipc.tabs.setMemoryCap(tabId, capMB);
      const record: PoolAllocation = { tabId, capMB, lastUpdated: Date.now() };
      this.pool.set(tabId, record);
      return record;
    } catch (error) {
      console.warn('[MemoryPool] Failed to set cap', { tabId, capMB }, error);
      return existing;
    }
  }
}

export const memoryPool = new MemoryPool();

export function initializeMemoryPool(): void {
  memoryPool.start();
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      memoryPool.start();
    }
  });
}

export function configureMemoryPool(options: Partial<MemoryPoolOptions>): void {
  memoryPool.update(options);
}
