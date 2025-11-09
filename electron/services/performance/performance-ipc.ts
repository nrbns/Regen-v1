/**
 * Performance Controls IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { getGPUControls } from './gpu-controls';
import { getCrashRecovery } from './crash-recovery';
import { updateBatteryState } from './resource-monitor';

export function registerPerformanceIpc(): void {
  // GPU Controls
  registerHandler('performance:gpu:enableRaster', z.object({}), async () => {
    const gpu = getGPUControls();
    gpu.enableRaster();
    return { success: true, config: gpu.getConfig() };
  });

  registerHandler('performance:gpu:disableRaster', z.object({}), async () => {
    const gpu = getGPUControls();
    gpu.disableRaster();
    return { success: true, config: gpu.getConfig() };
  });

  registerHandler('performance:gpu:enableHardwareDecode', z.object({}), async () => {
    const gpu = getGPUControls();
    gpu.enableHardwareDecode();
    return { success: true, config: gpu.getConfig() };
  });

  registerHandler('performance:gpu:disableHardwareDecode', z.object({}), async () => {
    const gpu = getGPUControls();
    gpu.disableHardwareDecode();
    return { success: true, config: gpu.getConfig() };
  });

  registerHandler('performance:gpu:getConfig', z.object({}), async () => {
    const gpu = getGPUControls();
    return { config: gpu.getConfig() };
  });

  registerHandler(
    'performance:battery:update',
    z.object({
      level: z.number().min(0).max(1).nullable().optional(),
      charging: z.boolean().nullable().optional(),
      chargingTime: z.number().nullable().optional(),
      dischargingTime: z.number().nullable().optional(),
    }),
    async (_event, data) => {
      updateBatteryState({
        level: typeof data.level === 'number' ? data.level : null,
        charging: typeof data.charging === 'boolean' ? data.charging : null,
        chargingTime: typeof data.chargingTime === 'number' ? data.chargingTime : null,
        dischargingTime: typeof data.dischargingTime === 'number' ? data.dischargingTime : null,
      });
      return { success: true };
    },
  );

  // Crash Recovery
  registerHandler('performance:snapshot:create', z.object({
    windows: z.array(z.object({
      bounds: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      tabs: z.array(z.object({
        id: z.string(),
        url: z.string(),
        title: z.string().optional(),
      })),
      activeTabId: z.string().optional(),
    })),
    workspace: z.string().optional(),
  }), async (_event, request) => {
    const recovery = getCrashRecovery();
    const snapshotId = await recovery.createSnapshot(request.windows, request.workspace);
    return { snapshotId };
  });

  registerHandler('performance:snapshot:restore', z.object({
    snapshotId: z.string(),
  }), async (_event, request) => {
    const recovery = getCrashRecovery();
    const snapshot = await recovery.restoreSnapshot(request.snapshotId);
    return { snapshot };
  });

  registerHandler('performance:snapshot:latest', z.object({}), async () => {
    const recovery = getCrashRecovery();
    const snapshot = await recovery.getLatestSnapshot();
    return { snapshot };
  });

  registerHandler('performance:snapshot:list', z.object({}), async () => {
    const recovery = getCrashRecovery();
    const snapshots = await recovery.listSnapshots();
    return { snapshots };
  });
}

