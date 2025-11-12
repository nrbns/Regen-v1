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
  carbonIntensity?: number | null;
  carbonRegion?: string | null;
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

interface AutoThreshold {
  level: number;
  minMinutes: number;
  severity: EfficiencyAlertSeverity;
}

type BatterySample = { timestamp: number; pct: number };
type CarbonSample = { timestamp: number; intensity: number };

export type BatteryProjectionPoint = {
  level: number;
  minutes: number | null;
  label: string;
};

export type BatteryForecast = {
  currentPct: number | null;
  charging: boolean | null;
  slopePerMinute: number | null;
  slopePerHour: number | null;
  minutesToEmpty: number | null;
  minutesToFull: number | null;
  projections: BatteryProjectionPoint[];
  samples: BatterySample[];
};

export type CarbonForecast = {
  currentIntensity: number | null;
  region: string | null;
  slopePerHour: number | null;
  trend: 'rising' | 'falling' | 'stable' | 'unknown';
  forecastIntensity: number | null;
  confidence: number;
  samples: CarbonSample[];
};

export type EcoImpactRecommendation = {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: 'battery' | 'carbon' | 'system';
};

export type EcoImpactForecast = {
  generatedAt: number;
  horizonMinutes: number;
  battery: BatteryForecast;
  carbon: CarbonForecast;
  recommendations: EcoImpactRecommendation[];
  summary: string;
};

export type EcoImpactOptions = {
  horizonMinutes?: number;
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
const CARBON_HISTORY_WINDOW_MS = 90 * 60_000;
const MAX_CARBON_HISTORY = 48;
const ALERT_COOLDOWN_MS = 8 * 60_000;
const ESTIMATED_RAM_PER_TAB_MB = 18;
const BATTERY_FORECAST_LEVELS_DISCHARGE = [80, 60, 40, 30, 20, 10, 5];
const BATTERY_FORECAST_LEVELS_CHARGE = [40, 60, 80, 95, 100];
const TREND_HYSTERESIS = 12; // gCO2 per hour threshold for trend change

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

const CARBON_THRESHOLD_HIGH = Number(process.env.CARBON_INTENSITY_EXTREME ?? 600); // gCO2/kWh
const CARBON_THRESHOLD_MEDIUM = Number(process.env.CARBON_INTENSITY_SAVER ?? 450);

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
  carbonIntensity: null,
  carbonRegion: null,
};

let lastHibernateCount = 0;

function setLastHibernateCount(count: number): void {
  lastHibernateCount = count;
}

const batteryHistory: BatterySample[] = [];
const carbonHistory: CarbonSample[] = [];
const lastAlertAt = new Map<string, number>();

export function applyEfficiencyPolicies(snapshot: ResourceSnapshot): void {
  lastSnapshot = snapshot;
  recordBatterySample(snapshot);
  recordCarbonSample(snapshot);
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
  const { batteryPct, charging, ramMb, cpuLoad1, carbonIntensity } = snapshot;
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

  if (typeof carbonIntensity === 'number' && Number.isFinite(carbonIntensity)) {
    if (carbonIntensity >= CARBON_THRESHOLD_HIGH) {
      nextMode = 'extreme';
    } else if (carbonIntensity >= CARBON_THRESHOLD_MEDIUM) {
      nextMode = nextMode === 'extreme' ? 'extreme' : 'battery-saver';
    } else if (carbonIntensity < CARBON_THRESHOLD_MEDIUM / 2 && nextMode === 'battery-saver') {
      nextMode = manualOverride ?? 'normal';
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
      const metadata = extractTabMetadata(tab);
      if (metadata.active) continue;
      if (isTabSleeping(tab.id)) continue;

      const lastActive = tab.lastActiveAt ?? 0;
      if (now - lastActive < staleThreshold) continue;

      candidates.push({ tabId: tab.id, lastActiveAt: lastActive });
    }
  }

  if (candidates.length === 0) {
    setLastHibernateCount(0);
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
  setLastHibernateCount(toHibernate.length);
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
  const pct = Math.max(0, Math.min(100, snapshot.batteryPct));
  batteryHistory.push({ timestamp: now, pct });

  while (batteryHistory.length > MAX_BATTERY_HISTORY) {
    batteryHistory.shift();
  }

  while (batteryHistory.length > 0 && now - batteryHistory[0].timestamp > BATTERY_HISTORY_WINDOW_MS) {
    batteryHistory.shift();
  }
}

function recordCarbonSample(snapshot: ResourceSnapshot): void {
  if (typeof snapshot.carbonIntensity !== 'number' || !Number.isFinite(snapshot.carbonIntensity)) {
    return;
  }

  const now = Date.now();
  carbonHistory.push({ timestamp: now, intensity: snapshot.carbonIntensity });

  while (carbonHistory.length > MAX_CARBON_HISTORY) {
    carbonHistory.shift();
  }

  while (carbonHistory.length > 0 && now - carbonHistory[0].timestamp > CARBON_HISTORY_WINDOW_MS) {
    carbonHistory.shift();
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

function computeBatteryTrend(): {
  slopePerMinute: number;
  slopePerHour: number;
  samples: BatterySample[];
  latest: BatterySample;
} | null {
  if (batteryHistory.length < 2) {
    return null;
  }

  const now = Date.now();
  const samples = batteryHistory.filter((sample) => now - sample.timestamp <= BATTERY_HISTORY_WINDOW_MS);
  if (samples.length < 2) {
    return null;
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const deltaMinutes = (last.timestamp - first.timestamp) / 60000;

  if (deltaMinutes <= 0) {
    return null;
  }

  const slopePerMinute = (last.pct - first.pct) / deltaMinutes;
  const slopePerHour = slopePerMinute * 60;

  if (!Number.isFinite(slopePerMinute)) {
    return null;
  }

  return { slopePerMinute, slopePerHour, samples, latest: last };
}

function computeCarbonTrend(): {
  slopePerHour: number;
  samples: CarbonSample[];
  latest: CarbonSample;
} | null {
  if (carbonHistory.length < 2) {
    return null;
  }

  const now = Date.now();
  const samples = carbonHistory.filter((sample) => now - sample.timestamp <= CARBON_HISTORY_WINDOW_MS);
  if (samples.length < 2) {
    return null;
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const deltaHours = (last.timestamp - first.timestamp) / 3_600_000;

  if (deltaHours <= 0) {
    return null;
  }

  const slopePerHour = (last.intensity - first.intensity) / deltaHours;
  if (!Number.isFinite(slopePerHour)) {
    return null;
  }

  return { slopePerHour, samples, latest: last };
}

function minutesToReachLevel(currentPct: number, slopePerMinute: number, targetLevel: number): number | null {
  if (!Number.isFinite(slopePerMinute) || slopePerMinute === 0) {
    return null;
  }

  const delta = targetLevel - currentPct;
  const minutes = delta / slopePerMinute;

  if (!Number.isFinite(minutes) || minutes < 0) {
    return null;
  }

  return minutes;
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) {
    return 'unknown';
  }

  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;

  if (hours <= 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

export function getEcoImpactForecast(options: EcoImpactOptions = {}): EcoImpactForecast {
  const horizonMinutes = Math.max(30, Math.min(options.horizonMinutes ?? 120, 240));
  const now = Date.now();

  const batteryTrend = computeBatteryTrend();
  const carbonTrend = computeCarbonTrend();

  const currentPct = batteryTrend?.latest.pct ?? (typeof lastSnapshot.batteryPct === 'number' ? lastSnapshot.batteryPct : null);
  const charging = lastSnapshot.charging;
  const slopePerMinute = batteryTrend?.slopePerMinute ?? null;
  const slopePerHour = batteryTrend?.slopePerHour ?? (slopePerMinute !== null ? slopePerMinute * 60 : null);

  const minutesToEmpty = currentPct !== null && slopePerMinute !== null && slopePerMinute < 0
    ? minutesToReachLevel(currentPct, slopePerMinute, 0)
    : null;

  const minutesToFull = currentPct !== null && slopePerMinute !== null && slopePerMinute > 0
    ? minutesToReachLevel(currentPct, slopePerMinute, 100)
    : null;

  const dischargeProjections = slopePerMinute !== null && slopePerMinute < 0 && currentPct !== null
    ? BATTERY_FORECAST_LEVELS_DISCHARGE
        .filter((level) => level < currentPct)
        .map<BatteryProjectionPoint>((level) => ({
          level,
          minutes: minutesToReachLevel(currentPct, slopePerMinute, level),
          label: `${level}%`,
        }))
    : [];

  const chargeProjections = slopePerMinute !== null && slopePerMinute > 0 && currentPct !== null
    ? BATTERY_FORECAST_LEVELS_CHARGE
        .filter((level) => level > currentPct)
        .map<BatteryProjectionPoint>((level) => ({
          level,
          minutes: minutesToReachLevel(currentPct, slopePerMinute, level),
          label: `${level}%`,
        }))
    : [];

  const battery: BatteryForecast = {
    currentPct,
    charging,
    slopePerMinute,
    slopePerHour,
    minutesToEmpty,
    minutesToFull,
    projections: charging ? chargeProjections : dischargeProjections,
    samples: batteryTrend?.samples ?? batteryHistory.slice(-Math.min(batteryHistory.length, MAX_BATTERY_HISTORY)),
  };

  const carbonCurrent = carbonTrend?.latest.intensity ?? (Number.isFinite(lastSnapshot.carbonIntensity ?? NaN) ? lastSnapshot.carbonIntensity ?? null : null);
  const carbonSlope = carbonTrend?.slopePerHour ?? null;
  const carbonForecastValue = carbonCurrent !== null && carbonSlope !== null
    ? carbonCurrent + carbonSlope * (horizonMinutes / 60)
    : null;

  let carbonTrendLabel: CarbonForecast['trend'] = 'unknown';
  if (carbonSlope !== null) {
    if (carbonSlope > TREND_HYSTERESIS) {
      carbonTrendLabel = 'rising';
    } else if (carbonSlope < -TREND_HYSTERESIS) {
      carbonTrendLabel = 'falling';
    } else {
      carbonTrendLabel = 'stable';
    }
  }

  const carbon: CarbonForecast = {
    currentIntensity: carbonCurrent,
    region: lastSnapshot.carbonRegion ?? null,
    slopePerHour: carbonSlope,
    trend: carbonTrendLabel,
    forecastIntensity: carbonForecastValue,
    confidence: Math.min(1, (carbonTrend?.samples.length ?? 0) / 6),
    samples: carbonTrend?.samples ?? carbonHistory.slice(-Math.min(carbonHistory.length, MAX_CARBON_HISTORY)),
  };

  const recommendations: EcoImpactRecommendation[] = [];

  if (battery.minutesToEmpty !== null && charging !== true) {
    if (battery.minutesToEmpty < 45) {
      recommendations.push({
        id: 'battery-saver',
        title: 'Enable Battery Saver Mode',
        description: `Projected ${formatMinutes(battery.minutesToEmpty)} until empty. Switching to Battery Saver extends runtime by throttling heavy tabs and reducing animations.`,
        impact: battery.minutesToEmpty < 25 ? 'high' : 'medium',
        category: 'battery',
      });
    }
    if (battery.minutesToEmpty < 30) {
      recommendations.push({
        id: 'hibernate-tabs',
        title: 'Hibernate idle workspaces',
        description: 'Resting background tabs could free RAM and slow the discharge slope by ~15%.',
        impact: 'medium',
        category: 'system',
      });
    }
  }

  if (carbon.currentIntensity !== null) {
    const forecast = carbon.forecastIntensity ?? carbon.currentIntensity;
    if (forecast >= CARBON_THRESHOLD_HIGH) {
      recommendations.push({
        id: 'carbon-delay',
        title: 'Delay heavy compute tasks',
        description: `Grid intensity heading toward ${Math.round(forecast)} gCO₂/kWh. Consider postponing AI training, large downloads, or switch to offline tasks until the grid cools.`,
        impact: 'high',
        category: 'carbon',
      });
    } else if (carbon.currentIntensity <= CARBON_THRESHOLD_MEDIUM / 2 && (carbon.trend === 'falling' || carbon.trend === 'stable')) {
      recommendations.push({
        id: 'carbon-window',
        title: 'Great window for energy-heavy work',
        description: `Local grid intensity near ${Math.round(carbon.currentIntensity)} gCO₂/kWh. This is a low-carbon window for downloads, syncs, or GPU sessions.`,
        impact: 'medium',
        category: 'carbon',
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'status-green',
      title: 'Systems balanced',
      description: 'Battery trajectory and carbon footprint look balanced. Maintain normal workflow.',
      impact: 'low',
      category: 'system',
    });
  }

  const summaryParts: string[] = [];
  if (battery.currentPct !== null) {
    summaryParts.push(`Battery ${Math.round(battery.currentPct)}%`);
  }
  if (charging === true && battery.minutesToFull !== null) {
    summaryParts.push(`≈${formatMinutes(battery.minutesToFull)} to full`);
  } else if (charging !== true && battery.minutesToEmpty !== null) {
    summaryParts.push(`≈${formatMinutes(battery.minutesToEmpty)} to empty`);
  }
  if (carbon.currentIntensity !== null) {
    summaryParts.push(`Carbon ${Math.round(carbon.currentIntensity)} gCO₂/kWh${carbon.trend !== 'unknown' ? ` • ${carbon.trend}` : ''}`);
  }
  if (carbon.forecastIntensity !== null && Math.abs((carbon.forecastIntensity ?? 0) - (carbon.currentIntensity ?? 0)) > 15) {
    summaryParts.push(`Forecast ${Math.round(carbon.forecastIntensity)} g`);
  }

  return {
    generatedAt: now,
    horizonMinutes,
    battery,
    carbon,
    recommendations,
    summary: summaryParts.join(' · '),
  };
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
    } else {
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

function extractTabMetadata(tab: any): { title: string; url: string; active: boolean } {
  let title = 'Untitled tab';
  let url = 'about:blank';
  let active = false;
  try {
    const wc = tab.view?.webContents;
    if (wc && !wc.isDestroyed()) {
      title = wc.getTitle() || title;
      url = wc.getURL() || url;
      active = Boolean(wc.isFocused?.());
    }
  } catch {
    // ignore
  }
  return { title, url, active };
}

