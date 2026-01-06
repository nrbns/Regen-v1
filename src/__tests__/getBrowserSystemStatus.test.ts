import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBrowserSystemStatus } from '../lib/system/getBrowserSystemStatus';

describe('getBrowserSystemStatus', () => {
  let origNavigator: any;
  let origPerformance: any;

  beforeEach(() => {
    origNavigator = globalThis.navigator;
    origPerformance = globalThis.performance;

    // Minimal performance mock
    (globalThis as any).performance = {
      timeOrigin: Date.now() - 60_000,
      memory: { usedJSHeapSize: 5_000_000, totalJSHeapSize: 10_000_000 },
    } as any;

    // Minimal navigator.getBattery mock
    (globalThis as any).navigator = { getBattery: vi.fn().mockResolvedValue({ charging: true, level: 0.75 }) } as any;
  });

  afterEach(() => {
    (globalThis as any).navigator = origNavigator;
    (globalThis as any).performance = origPerformance;
    vi.resetAllMocks();
  });

  it('returns a well-formed system status object with memory and battery', async () => {
    const status = await getBrowserSystemStatus();
    expect(status).toBeTruthy();
    expect(typeof status.uptime).toBe('number');
    expect(status.memoryUsage).toBeDefined();
    expect(typeof status.memoryUsage.heapUsed).toBe('number');
    expect(status.battery).toBeDefined();
    expect(typeof status.battery.level).toBe('number');
    expect(status.battery.charging).toBe(true);
  });
});