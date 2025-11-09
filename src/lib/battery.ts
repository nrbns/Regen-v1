import { ipc } from './ipc-typed';

type BatteryManager = {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (name: string, listener: () => void) => void;
};

async function watchBattery(): Promise<void> {
  if (typeof navigator === 'undefined' || typeof (navigator as any).getBattery !== 'function') {
    return;
  }

  try {
    const battery: BatteryManager = await (navigator as any).getBattery();

    const pushUpdate = () => {
      void ipc.performance.updateBattery({
        level: typeof battery.level === 'number' ? battery.level : null,
        charging: battery.charging,
        chargingTime: Number.isFinite(battery.chargingTime) ? battery.chargingTime : null,
        dischargingTime: Number.isFinite(battery.dischargingTime) ? battery.dischargingTime : null,
      }).catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[battery] Failed to push battery update', error);
        }
      });
    };

    pushUpdate();

    battery.addEventListener('levelchange', pushUpdate);
    battery.addEventListener('chargingchange', pushUpdate);
    battery.addEventListener('chargingtimechange', pushUpdate);
    battery.addEventListener('dischargingtimechange', pushUpdate);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[battery] Battery API unavailable', error);
    }
  }
}

void watchBattery();
