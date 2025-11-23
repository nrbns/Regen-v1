/**
 * GPU Acceleration Controls
 * Allows toggling GPU acceleration for performance/compatibility
 */

import { app } from 'electron';
import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { createLogger } from './utils/logger';

const log = createLogger('gpu-controls');

let gpuAccelerationEnabled = true;

/**
 * Get current GPU acceleration state
 */
export function isGPUAccelerationEnabled(): boolean {
  return gpuAccelerationEnabled;
}

/**
 * Set GPU acceleration state
 * Note: This requires app restart to take effect
 */
export function setGPUAcceleration(enabled: boolean): void {
  gpuAccelerationEnabled = enabled;
  if (enabled) {
    app.commandLine.removeSwitch('disable-gpu');
    app.commandLine.removeSwitch('disable-gpu-compositing');
  } else {
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
  }
  log.info('GPU acceleration toggled', { enabled });
}

/**
 * Register IPC handlers
 */
export function registerGPUControlsIpc(): void {
  registerHandler('gpu:getStatus', z.object({}), async () => {
    return { enabled: isGPUAccelerationEnabled() };
  });

  registerHandler('gpu:setEnabled', z.object({ enabled: z.boolean() }), async (_event, request) => {
    setGPUAcceleration(request.enabled);
    return {
      success: true,
      enabled: isGPUAccelerationEnabled(),
      requiresRestart: true,
    };
  });
}
