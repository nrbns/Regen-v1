/**
 * First Launch Detection and Setup
 * Checks if this is first launch and triggers installer if needed
 */

import { checkOllamaInstalled, checkInstalledModels } from './ollamaInstaller';

const FIRST_LAUNCH_KEY = 'regen:firstLaunch';
const SETUP_COMPLETE_KEY = 'regen:setupComplete';

export interface FirstLaunchStatus {
  isFirstLaunch: boolean;
  needsSetup: boolean;
  ollamaInstalled: boolean;
  modelsInstalled: boolean;
}

/**
 * Check if this is the first launch
 */
export function isFirstLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  const firstLaunch = localStorage.getItem(FIRST_LAUNCH_KEY);
  return firstLaunch === null;
}

/**
 * Mark first launch as complete
 */
export function markFirstLaunchComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FIRST_LAUNCH_KEY, 'false');
}

/**
 * Check if setup is complete
 */
export function isSetupComplete(): boolean {
  if (typeof window === 'undefined') return true;
  const complete = localStorage.getItem(SETUP_COMPLETE_KEY);
  return complete === 'true';
}

/**
 * Mark setup as complete
 */
export function markSetupComplete(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETUP_COMPLETE_KEY, 'true');
}

/**
 * Check current setup status
 */
export async function checkSetupStatus(): Promise<FirstLaunchStatus> {
  const isFirst = isFirstLaunch();
  const setupComplete = isSetupComplete();

  let ollamaInstalled = false;
  let modelsInstalled = false;

  if (!setupComplete) {
    ollamaInstalled = await checkOllamaInstalled();
    if (ollamaInstalled) {
      const installedModels = await checkInstalledModels();
      modelsInstalled = ['phi3:mini', 'llava:7b'].every(m =>
        installedModels.some((im: string) => im.includes(m.split(':')[0]))
      );
    }
  } else {
    ollamaInstalled = true;
    modelsInstalled = true;
  }

  return {
    isFirstLaunch: isFirst,
    needsSetup: !setupComplete || !ollamaInstalled || !modelsInstalled,
    ollamaInstalled,
    modelsInstalled,
  };
}
