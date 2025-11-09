import { BrowserWindow } from 'electron';
import { getTabs } from '../tabs';
import { hibernateTab, isTabSleeping } from '../tab-sleep';

export type EfficiencyMode = 'normal' | 'battery-saver' | 'extreme';

export type ResourceSnapshot = {
  batteryPct: number | null;
  charging: boolean | null;
  ramMb: number;
  cpuLoad1: number;
  activeTabs: number;
};

export type EfficiencyAlertSeverity = 'info' | 'warning' | 'critical';
export type EfficiencyAlertAction =
  | { id: string; label: string; type: 'mode'; mode: EfficiencyMode }
  | { id: string; label: string; type: 'hibernate' };
export type EfficiencyAlert = {
  id: string;
  severity: EfficiencyAlertSeverity;
  title: string;
  message: string;
  timestamp: number;
  actions: EfficiencyAlertAction[];
};

type BatterySample = { timestamp: number; pct: number };

type AutoThreshold = {
  level: number;
  minMinutes: number;
  severity: EfficiencyAlertSeverity;
};

const BATTERY_SAVER_THRESHOLD = 30; // %
const EXTREME_THRESHOLD = 20; // %
const RAM_SAVER_THRESHOLD = 155; // MB
const RAM_EXTREME_THRESHOLD = 180; // MB
const CPU_SAVER_THRESHOLD = 1.5;
const CPU_EXTREME_THRESHOLD = 2.5;

const HIBERNATION_COOLDOWN_MS = 60_000;
const BATTERY_HISTORY_WINDOW_MS = 10 * 60_000;
const MAX_BATTERY_HISTORY = 12;
const ALERT_COOLDOWN_MS = 8 * 60_000;
const ESTIMATED_RAM_PER_TAB_MB = 18;

const MODE_LABELS: Record<EfficiencyMode, string> = {
  normal: 'Performance Mode',
  'battery-saver': 'Battery Saver Mode',
  extreme: 'Regen Mode',
};

const MODE_BADGES: Record<EfficiencyMode, string | null> = {
  normal: null,
  'battery-saver': '+0.8hr battery',
  extreme: '+1.8hr battery',
};

const MODE_TAGS: Record<EfficiencyMode, string[]> = {
  normal: ['eco', 'action', 'mode:normal'],
  'battery-saver': ['eco', 'action', 'mode:battery-saver'],
  extreme: ['eco', 'action', 'mode:extreme', 'regen'],
};

const ALERT_THRESHOLDS: AutoThreshold[] = [
  { level: 30, minMinutes: 25, severity: 'warning' },
  { level: 20, minMinutes: 15, severity: 'critical' },
  { level: 15, minMinutes: 10, severity: 'critical' },
];

let currentMode: EfficiencyMode = 'normal';
let manualOverride: EfficiencyMode | null = null;
let appliedFrameRate = 60;
let lastHibernateAt = 0;
let lastTelemetryHash: string | null = null;
let lastSnapshot: ResourceSnapshot = {
  batteryPct: null,
  charging: null,
  ramMb: 0,
  cpuLoad1: 0,
  activeTabs: 0,
};

const batteryHistory: BatterySample[] = [];
const lastAlertAt = new Map<string, number>();

export function applyEfficiencyPolicies(snapshot: ResourceSnapshot): void {
  lastSnapshot = snapshot;
  recordBatterySample(snapshot);
  maybeReleaseOverride(snapshot);

  const autoMode = determineAutoMode(snapshot);
  const nextMode = manualOverride ?? autoMode;

  if (nextMode !== currentMode) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[efficiency] mode change: ${currentMode} -> ${nextMode}`);
    }
    applyMode(nextMode);
    currentMode = nextMode;
    notifyModeChange(nextMode, snapshot);
  }

  if (nextMode !== 'normal') {
    maybeHibernateInactiveTabs(nextMode);
  }

  maybeEmitPredictiveAlerts(snapshot);
}

export function setManualOverride(mode: EfficiencyMode | null): void {
  manualOverride = mode;
  if (mode) {
    applyMode(mode);
    currentMode = mode;
    notifyModeChange(mode, lastSnapshot);
  } else {
    applyEfficiencyPolicies(lastSnapshot);
  }
}

export function getManualOverride(): EfficiencyMode | null {
  return manualOverride;
}

export function getCurrentMode(): EfficiencyMode {
  return currentMode;
}

export function forceHibernateTabs(): number {
  return maybeHibernateInactiveTabs('extreme', true);
}

function determineAutoMode(snapshot: ResourceSnapshot): EfficiencyMode {
  const { batteryPct, charging, ramMb, cpuLoad1 } = snapshot;
  const onBattery = charging === false || charging === null;
  let nextMode: EfficiencyMode = 'normal';

  if (ramMb >= RAM_EXTREME_THRESHOLD || cpuLoad1 >= CPU_EXTREME_THRESHOLD) {
    nextMode = 'extreme';
  } else if (ramMb >= RAM_SAVER_THRESHOLD || cpuLoad1 >= CPU_SAVER_THRESHOLD) {
    nextMode = 'battery-saver';
  }

  if (onBattery && batteryPct !== null) {
    if (batteryPct <= EXTREME_THRESHOLD) {
      nextMode = 'extreme';
    } else if (batteryPct <= BATTERY_SAVER_THRESHOLD) {
      nextMode = nextMode === 'extreme' ? 'extreme' : 'battery-saver';
    }
  }

  return nextMode;
}

function applyMode(mode: EfficiencyMode): void {
  switch (mode) {
    case 'extreme':
      setGlobalFrameRate(24);
      setBackgroundThrottling(true);
      break;
    case 'battery-saver':
      setGlobalFrameRate(30);
      setBackgroundThrottling(true);
      break;
    case 'normal':
    default:
      setGlobalFrameRate(60);
      setBackgroundThrottling(false);
      break;
  }
}

function setGlobalFrameRate(fps: number): void {
  if (appliedFrameRate === fps) {
    return;
  }

  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    const wc = win.webContents;
    if (typeof wc.setFrameRate === 'function') {
      try {
        wc.setFrameRate(fps);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[efficiency] failed to set frame rate', error);
        }
      }
    }
  }

  appliedFrameRate = fps;
}

function setBackgroundThrottling(enabled: boolean): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.setBackgroundThrottling(enabled);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[efficiency] failed to set throttling', error);
      }
    }
  }
}

function maybeHibernateInactiveTabs(mode: EfficiencyMode, force = false): number {
  const now = Date.now();
  if (!force && now - lastHibernateAt < HIBERNATION_COOLDOWN_MS) {
    return 0;
  }

  const limit = mode === 'extreme' ? 6 : 3;
  const staleThreshold = mode === 'extreme' ? 60_000 : 5 * 60_000;

  const candidates: Array<{ tabId: string; lastActiveAt: number }> = [];

  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    const tabs = getTabs(win);

    for (const tab of tabs) {
      if (tab.active) continue;
      if (tab.sleeping) continue;
      if (isTabSleeping(tab.id)) continue;

      const lastActive = tab.lastActiveAt ?? 0;
      if (now - lastActive < staleThreshold) continue;

      candidates.push({ tabId: tab.id, lastActiveAt: lastActive });
    }
  }

  if (candidates.length === 0) {
    return 0;
  }

  candidates.sort((a, b) => a.lastActiveAt - b.lastActiveAt);
  const toHibernate = candidates.slice(0, limit);

  for (const item of toHibernate) {
    try {
      hibernateTab(item.tabId);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[efficiency] hibernated tab ${item.tabId}`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[efficiency] failed to hibernate tab', error);
      }
    }
  }

  lastHibernateAt = now;
  if (toHibernate.length > 0) {
    emitHibernateAlert(toHibernate.length, mode);
  }
  return toHibernate.length;
}

function emitHibernateAlert(count: number, mode: EfficiencyMode): void {
  const estimatedRam = Math.max(10, Math.round(count * ESTIMATED_RAM_PER_TAB_MB));
  const title = count === 1 ? 'Rested 1 tab' : `Rested ${count} tabs`;
  const messageParts = [
    `≈${estimatedRam}MB memory freed`,
    `Mode: ${MODE_LABELS[mode]}`,
  ];

  const alert: EfficiencyAlert = {
    id: `hibernate-${Date.now()}`,
    severity: 'info',
    title,
    message: messageParts.join(' · '),
    timestamp: Date.now(),
    actions: [],
  };

  broadcastAlert(alert);
}

function notifyModeChange(mode: EfficiencyMode, snapshot: ResourceSnapshot): void {
  const payload = {
    mode,
    label: MODE_LABELS[mode],
    badge: MODE_BADGES[mode],
    snapshot,
    timestamp: Date.now(),
  };

  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send('efficiency:mode', payload);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[efficiency] failed to broadcast mode change', error);
      }
    }
  }

  void logModeTelemetry(mode, snapshot);
}

async function logModeTelemetry(mode: EfficiencyMode, snapshot: ResourceSnapshot): Promise<void> {
  const baseUrl = process.env.MEMORY_BASE || process.env.REDIX_MEMORY_BASE;
  if (!baseUrl) {
    return;
  }

  const project =
    process.env.ALLOWED_PROJECTS?.split(',')
      .map((entry) => entry.trim())
      .find((entry) => entry === 'redix') ?? 'redix';

  const payload = {
    project,
    type: 'action',
    text: `efficiency.mode:${mode}`,
    tags: MODE_TAGS[mode],
    origin: { app: 'omnibrowser', module: 'efficiency-manager' },
    rich: {
      mode,
      battery_pct: snapshot.batteryPct,
      charging: snapshot.charging,
      ram_mb: snapshot.ramMb,
      cpu_load1: snapshot.cpuLoad1,
      active_tabs: snapshot.activeTabs,
    },
    created_at: new Date().toISOString(),
  };

  const hash = JSON.stringify(payload.rich);
  if (hash === lastTelemetryHash) {
    return;
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/memory.write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant': process.env.MEMORY_TENANT || 'dev',
        'x-user': process.env.MEMORY_USER || 'u42',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok && process.env.NODE_ENV === 'development') {
      console.warn('[efficiency] failed to log mode change', response.status, await response.text());
    } else {
      lastTelemetryHash = hash;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[efficiency] telemetry error', error);
    }
  }
}

function recordBatterySample(snapshot: ResourceSnapshot): void {
  if (typeof snapshot.batteryPct !== 'number') {
    return;
  }

  const now = Date.now();
  batteryHistory.push({ timestamp: now, pct: snapshot.batteryPct });

  while (batteryHistory.length > MAX_BATTERY_HISTORY) {
    batteryHistory.shift();
  }

  while (batteryHistory.length > 0 && now - batteryHistory[0].timestamp > BATTERY_HISTORY_WINDOW_MS) {
    batteryHistory.shift();
  }
}

function estimateMinutesToLevel(targetPct: number): number | null {
  if (batteryHistory.length < 2) {
    return null;
  }

  const now = Date.now();
  const recent = batteryHistory.filter((sample) => now - sample.timestamp <= BATTERY_HISTORY_WINDOW_MS);
  if (recent.length < 2) {
    return null;
  }

  const first = recent[0];
  const last = recent[recent.length - 1];
  const deltaPct = last.pct - first.pct;
  const deltaMinutes = (last.timestamp - first.timestamp) / 60000;

  if (deltaMinutes <= 0) {
    return null;
  }

  const slope = deltaPct / deltaMinutes;
  if (slope >= 0) {
    return null;
  }

  const minutes = (last.pct - targetPct) / -slope;
  if (!Number.isFinite(minutes) || minutes < 0) {
    return null;
  }

  return minutes;
}

function maybeEmitPredictiveAlerts(snapshot: ResourceSnapshot): void {
  if (snapshot.charging || typeof snapshot.batteryPct !== 'number') {
    return;
  }

  const currentPct = snapshot.batteryPct;

  for (const threshold of ALERT_THRESHOLDS) {
    const key = `battery-${threshold.level}`;
    const lastIssued = lastAlertAt.get(key) ?? 0;
    const now = Date.now();

    if (now - lastIssued < ALERT_COOLDOWN_MS) {
      continue;
    }

    const minutes = estimateMinutesToLevel(threshold.level);
    const triggeredByLevel = currentPct <= threshold.level;
    const triggeredByPrediction = typeof minutes === 'number' && minutes <= threshold.minMinutes;

    if (!triggeredByLevel && !triggeredByPrediction) {
      continue;
    }

    const approxMinutes = triggeredByPrediction && typeof minutes === 'number' ? Math.max(1, Math.round(minutes)) : null;
    const title = triggeredByLevel ? 'Battery critically low' : 'Battery draining fast';
    const messageParts: string[] = [`Battery at ${Math.round(currentPct)}%`];

    if (approxMinutes !== null) {
      messageParts.push(`~${approxMinutes} min to ${threshold.level}%`);
    }

    messageParts.push('Consider enabling Regen to stretch runtime.');

    const actions: EfficiencyAlertAction[] = [];

    if (currentMode !== 'extreme') {
      actions.push({ id: 'enable-regen', label: 'Enable Regen Mode', type: 'mode', mode: 'extreme' });
    } else if (currentMode !== 'battery-saver') {
      actions.push({ id: 'enable-saver', label: 'Battery Saver', type: 'mode', mode: 'battery-saver' });
    }

    actions.push({ id: 'hibernate-tabs', label: 'Hibernate Idle Tabs', type: 'hibernate' });

    const alert: EfficiencyAlert = {
      id: `${key}-${now}`,
      severity: threshold.severity,
      title,
      message: messageParts.join(' · '),
      timestamp: now,
      actions,
    };

    broadcastAlert(alert);
    lastAlertAt.set(key, now);
  }
}

function broadcastAlert(alert: EfficiencyAlert): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send('efficiency:alert', alert);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[efficiency] failed to broadcast alert', error);
      }
    }
  }
}

function maybeReleaseOverride(snapshot: ResourceSnapshot): void {
  if (!manualOverride) {
    return;
  }

  if (snapshot.charging) {
    manualOverride = null;
    return;
  }

  if (
    manualOverride === 'battery-saver' &&
    typeof snapshot.batteryPct === 'number' &&
    snapshot.batteryPct >= BATTERY_SAVER_THRESHOLD + 15
  ) {
    manualOverride = null;
  }

  if (
    manualOverride === 'extreme' &&
    typeof snapshot.batteryPct === 'number' &&
    snapshot.batteryPct >= BATTERY_SAVER_THRESHOLD + 25
  ) {
    manualOverride = null;
  }
}

