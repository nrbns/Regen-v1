import os from 'node:os';
import { BrowserWindow } from 'electron';
import { getTabs } from '../tabs';
import { applyEfficiencyPolicies } from './efficiency-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('resource-monitor');

const ALLOWED_PROJECTS = new Set(
  (process.env.ALLOWED_PROJECTS || 'omnibrowser,redix')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
);

const REDIX_PROJECT = ALLOWED_PROJECTS.has('redix') ? 'redix' : Array.from(ALLOWED_PROJECTS)[0];

const TELEMETRY_INTERVAL_MS = Number(process.env.REDIX_TELEMETRY_INTERVAL ?? 60_000);

let monitorTimer: NodeJS.Timeout | null = null;
let lastPayloadHash = '';

let lastSuccessfulHibernateCount = 0;

export function getLastHibernateCount(): number {
  return lastSuccessfulHibernateCount;
}

export function setLastHibernateCount(count: number): void {
  lastSuccessfulHibernateCount = count;
}

type BatteryState = {
  level?: number | null;
  charging?: boolean | null;
  chargingTime?: number | null;
  dischargingTime?: number | null;
  carbonIntensity?: number | null;
  regionCode?: string | null;
};

const batteryState: BatteryState = {};

export function updateBatteryState(update: BatteryState): void {
  batteryState.level = update.level ?? batteryState.level ?? null;
  batteryState.charging = update.charging ?? batteryState.charging ?? null;
  batteryState.chargingTime = update.chargingTime ?? batteryState.chargingTime ?? null;
  batteryState.dischargingTime = update.dischargingTime ?? batteryState.dischargingTime ?? null;
  batteryState.carbonIntensity = update.carbonIntensity ?? batteryState.carbonIntensity ?? null;
  batteryState.regionCode = update.regionCode ?? batteryState.regionCode ?? null;
}

function getActiveTabCount(): number {
  return BrowserWindow.getAllWindows().reduce((acc, win) => acc + getTabs(win).length, 0);
}

async function getProcessRamMb(): Promise<number> {
  if (typeof process.getProcessMemoryInfo === 'function') {
    try {
      const info = await process.getProcessMemoryInfo();
      return Math.round(info.private / 1024);
    } catch (error) {
      logger.warn('Failed to read process memory info', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const memoryUsage = process.memoryUsage();
  return Math.round(memoryUsage.rss / 1024 / 1024);
}

async function pushTelemetry(): Promise<void> {
  if (!REDIX_PROJECT || !ALLOWED_PROJECTS.has(REDIX_PROJECT)) {
    return;
  }

  const ramMb = await getProcessRamMb();
  const cpuLoad1 = os.loadavg()[0] || 0;
  const activeTabs = getActiveTabCount();
  const batteryPct = typeof batteryState.level === 'number' ? Math.round(batteryState.level * 100) : null;

  const carbonIntensity = batteryState.carbonIntensity ?? null;
  const carbonRegion = batteryState.regionCode ?? null;

  const payload = {
    project: REDIX_PROJECT,
    type: 'telemetry',
    text: `battery:${batteryPct ?? '?'}% ram:${ramMb}MB cpuLoad1:${cpuLoad1.toFixed(2)} tabs:${activeTabs}`,
    tags: ['eco', 'telemetry'],
    rich: {
      battery_pct: batteryPct,
      battery_charging: batteryState.charging ?? null,
      ram_mb: ramMb,
      cpu_load1: Number(cpuLoad1.toFixed(2)),
      active_tabs: activeTabs,
      carbon_intensity: carbonIntensity,
      carbon_region: carbonRegion,
    },
    origin: { app: 'omnibrowser', module: 'resource-monitor' },
  } as const;

  const serialized = JSON.stringify(payload.rich);
  if (serialized === lastPayloadHash) {
    applyEfficiencyPolicies({
      batteryPct,
      charging: batteryState.charging ?? null,
      ramMb,
      cpuLoad1,
      activeTabs,
      carbonIntensity,
      carbonRegion,
    });
    return;
  }

  const baseUrl = process.env.MEMORY_BASE || process.env.REDIX_MEMORY_BASE;
  if (!baseUrl) {
    logger.warn('MEMORY_BASE not configured; telemetry skipped');
    return;
  }

  try {
    applyEfficiencyPolicies({
      batteryPct,
      charging: batteryState.charging ?? null,
      ramMb,
      cpuLoad1,
      activeTabs,
      carbonIntensity,
      carbonRegion,
    });

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/memory.write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant': process.env.MEMORY_TENANT || 'dev',
        'x-user': process.env.MEMORY_USER || 'u42',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.warn('Telemetry write failed', {
        status: response.status,
        body: await response.text(),
      });
    }

    lastPayloadHash = serialized;
  } catch (error) {
    logger.warn('Telemetry push error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function startResourceMonitor(): void {
  if (monitorTimer) {
    return;
  }

  logger.info('Starting resource monitor', { intervalMs: Math.max(15_000, TELEMETRY_INTERVAL_MS) });
  monitorTimer = setInterval(() => {
    void pushTelemetry();
  }, Math.max(15_000, TELEMETRY_INTERVAL_MS));

  void pushTelemetry();
}

export function stopResourceMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
    logger.info('Resource monitor stopped');
  }
}
