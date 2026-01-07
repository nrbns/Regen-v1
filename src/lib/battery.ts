import { ipc } from './ipc-typed';
import { getEnvVar, isDevEnv, isElectronRuntime } from './env';

type BatteryManager = {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (name: string, listener: () => void) => void;
};

const carbonEndpoints: Record<string, string> = {
  global: 'https://api.co2signal.com/v1/latest?country=',
};

let carbonTokenWarningLogged = false;

async function fetchCarbonIntensity(regionCode?: string | null): Promise<{ intensity: number | null; region: string | null }> {
  const defaultRegion = getEnvVar('CARBON_DEFAULT_REGION') || 'global';
  const region = regionCode ?? defaultRegion;

  const apiBase = getEnvVar('CARBON_API_URL') ?? carbonEndpoints.global;
  const apiToken = getEnvVar('CARBON_API_TOKEN');

  if (!apiBase) {
    return { intensity: null, region };
  }

  if (apiBase === carbonEndpoints.global && !apiToken) {
    if (isDevEnv() && !carbonTokenWarningLogged) {
      carbonTokenWarningLogged = true;
      console.info('[battery] Skipping carbon intensity fetch: CARBON_API_TOKEN not configured.');
    }
    return { intensity: null, region };
  }

  try {
    const response = await fetch(`${apiBase}${encodeURIComponent(region)}`, {
      headers: apiToken
        ? { Authorization: `Bearer ${apiToken}` }
        : undefined,
    });

    if (!response.ok) {
      return { intensity: null, region };
    }

    const json = await response.json() as { data?: { carbonIntensity?: number; intensity?: { forecast?: number; average?: number } } };
    const direct = json.data?.carbonIntensity ?? json.data?.intensity?.forecast ?? json.data?.intensity?.average;
    if (typeof direct === 'number' && Number.isFinite(direct)) {
      return { intensity: direct, region };
    }
  } catch (error) {
    if (isDevEnv()) {
      console.warn('[battery] Carbon intensity lookup failed', error);
    }
  }

  return { intensity: null, region };
}

async function watchBattery(): Promise<void> {
  if (typeof navigator === 'undefined' || typeof (navigator as any).getBattery !== 'function') {
    return;
  }

  if (!isElectronRuntime()) {
    return;
  }

  try {
    const battery: BatteryManager = await (navigator as any).getBattery();

    let lastCarbonFetch = 0;
    let lastRegionCode: string | null = null;
    let lastCarbonValue: number | null = null;

    const pushUpdate = async (forceCarbon = false) => {
      const now = Date.now();
      const needsCarbon = forceCarbon || (now - lastCarbonFetch > 15 * 60 * 1000);

      if (needsCarbon) {
        const { intensity, region } = await fetchCarbonIntensity(lastRegionCode);
        lastCarbonFetch = Date.now();
        lastCarbonValue = intensity ?? lastCarbonValue;
        lastRegionCode = region ?? lastRegionCode;
      }

      try {
        if (ipc.performance?.battery?.update) {
          await ipc.performance.battery.update({
            level: typeof battery.level === 'number' ? battery.level : null,
            charging: battery.charging,
            chargingTime: Number.isFinite(battery.chargingTime) ? battery.chargingTime : null,
            dischargingTime: Number.isFinite(battery.dischargingTime) ? battery.dischargingTime : null,
            carbonIntensity: lastCarbonValue,
            regionCode: lastRegionCode,
          });
        }
      } catch (error) {
        if (isDevEnv()) {
          console.warn('[battery] Failed to push battery update', error);
        }
      }
    };

    void pushUpdate(true);

    battery.addEventListener('levelchange', () => void pushUpdate());
    battery.addEventListener('chargingchange', () => void pushUpdate(true));
    battery.addEventListener('chargingtimechange', () => void pushUpdate());
    battery.addEventListener('dischargingtimechange', () => void pushUpdate());
  } catch (error) {
    if (isDevEnv()) {
      console.warn('[battery] Battery API unavailable', error);
    }
  }
}

void watchBattery();
