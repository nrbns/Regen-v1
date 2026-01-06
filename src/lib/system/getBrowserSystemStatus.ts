export async function getBrowserSystemStatus() {
  // Gather best-effort system metrics in web environments
  const mem = (performance as any)?.memory;
  const memoryUsage = mem
    ? {
        heapUsed: mem.usedJSHeapSize || 0,
        heapTotal: mem.totalJSHeapSize || 0,
        external: 0,
        rss: 0,
      }
    : { heapUsed: 0, heapTotal: 0, external: 0, rss: 0 };

  let batteryState = { charging: false, level: 0 };
  try {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      // Some browsers implement navigator.getBattery()
      const bat: any = await (navigator as any).getBattery();
      batteryState = { charging: !!bat.charging, level: typeof bat.level === 'number' ? bat.level : 0 };
    }
  } catch (err) {
    // ignore
  }

  const uptime = typeof performance !== 'undefined' && (performance as any).timeOrigin
    ? Date.now() - (performance as any).timeOrigin
    : 0;

  // Mode is an optional global hint; fall back to Browse
  const mode = (window as any)?.__APP_MODE__ || 'Browse';

  return {
    redisConnected: false,
    redixAvailable: false,
    workerState: 'running',
    vpn: { connected: false },
    tor: { running: false, bootstrapped: false },
    mode,
    uptime,
    memoryUsage,
    battery: batteryState,
    cpuPercent: null,
    agentStatus: 'idle',
    health: 'Stable',
    lastRepair: null,
  };
}

export default getBrowserSystemStatus;