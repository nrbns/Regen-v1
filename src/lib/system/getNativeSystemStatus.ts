/**
 * Native system collector
 * Attempts to gather system metrics from Node `os` and `process` when available (Electron renderer/main)
 * and falls back gracefully when not present.
 */
export async function getNativeSystemStatus() {
  try {
    // Prefer Node's os module when available (Electron/Node contexts)
    const os = await import('os');
    const mem: NodeJS.MemoryUsage =
      (typeof process !== 'undefined' && typeof process.memoryUsage === 'function')
        ? process.memoryUsage()
        : { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, arrayBuffers: 0 };

    const uptimeMs = (typeof os.uptime === 'function' ? os.uptime() : 0) * 1000;
    const cpus = os.cpus ? os.cpus() : [];

    // Compute CPU usage percent based on aggregate times if available
    const totalTimes = cpus.reduce(
      (acc: { idle: number; total: number }, cpu: any) => {
        const times = cpu.times || {};
        const t = (times.user || 0) + (times.nice || 0) + (times.sys || 0) + (times.idle || 0) + (times.irq || 0);
        return { idle: acc.idle + (times.idle || 0), total: acc.total + t };
      },
      { idle: 0, total: 0 }
    );

    // Use a module-level previous snapshot to compute delta percent
    const prev: any = (getNativeSystemStatus as any)._prev || null;
    let cpuPercent = null;
    if (prev && prev.total && totalTimes.total && totalTimes.total > prev.total) {
      const idleDiff = totalTimes.idle - prev.idle;
      const totalDiff = totalTimes.total - prev.total;
      cpuPercent = Math.max(0, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)));
    }

    // Save snapshot for next call
    (getNativeSystemStatus as any)._prev = { idle: totalTimes.idle, total: totalTimes.total };

    return {
      redisConnected: false,
      redixAvailable: false,
      workerState: 'running',
      vpn: { connected: false },
      tor: { running: false, bootstrapped: false },
      mode: (globalThis as any).__APP_MODE__ || 'Browse',
      uptime: uptimeMs,
      memoryUsage: {
        heapUsed: mem.heapUsed || 0,
        heapTotal: mem.heapTotal || 0,
        external: mem.external || 0,
        rss: mem.rss || 0,
      },
      cpu: {
        model: cpus[0]?.model ?? 'unknown',
        cores: cpus.length,
        percent: cpuPercent,
      },
      cpuPercent,
      battery: { charging: false, level: 0 },
      agentStatus: 'idle',
      health: 'Stable',
      lastRepair: null,
    };
  } catch (err) {
    // Not available - return a minimal structure for SystemBar to use
    return {
      redisConnected: false,
      redixAvailable: false,
      workerState: 'running',
      vpn: { connected: false },
      tor: { running: false, bootstrapped: false },
      mode: (globalThis as any).__APP_MODE__ || 'Browse',
      uptime: 0,
      memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 },
      battery: { charging: false, level: 0 },
    };
  }
}

export default getNativeSystemStatus;