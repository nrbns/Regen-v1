// @ts-nocheck

import { BrowserWindow, session } from 'electron';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { registerHandler } from '../shared/ipc/router';

type SandboxMetrics = {
  fps?: number;
  droppedFrames?: number;
  memoryMb?: number;
  cpuPercent?: number;
  timestamp?: number;
};

type SandboxRecord = {
  id: string;
  partition: string;
  gameId: string;
  url: string;
  createdAt: number;
  lastMetrics?: SandboxMetrics;
};

const sandboxes = new Map<string, SandboxRecord>();

const createSandboxSchema = z.object({
  gameId: z.string(),
  url: z.string().min(1),
  title: z.string().optional(),
});

const destroySandboxSchema = z.object({
  sandboxId: z.string(),
});

const metricsSchema = z.object({
  sandboxId: z.string(),
  metrics: z.object({
    fps: z.number().optional(),
    droppedFrames: z.number().optional(),
    memoryMb: z.number().optional(),
    cpuPercent: z.number().optional(),
  }),
});

function broadcast(channel: string, payload: any) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

function evaluateMetrics(record: SandboxRecord) {
  const metrics = record.lastMetrics;
  if (!metrics) return;

  const warnings: Array<{ severity: 'warning' | 'critical'; message: string }> = [];

  if (typeof metrics.fps === 'number' && metrics.fps < 30) {
    warnings.push({
      severity: metrics.fps < 18 ? 'critical' : 'warning',
      message: metrics.fps < 18 ? 'Game FPS is critically low.' : 'Game FPS is dropping below 30.',
    });
  }

  if (typeof metrics.memoryMb === 'number' && metrics.memoryMb > 512) {
    warnings.push({
      severity: metrics.memoryMb > 768 ? 'critical' : 'warning',
      message: 'Game memory usage is high and may impact other tabs.',
    });
  }

  if (typeof metrics.cpuPercent === 'number' && metrics.cpuPercent > 85) {
    warnings.push({
      severity: metrics.cpuPercent > 95 ? 'critical' : 'warning',
      message: 'Game CPU usage is high. Consider pausing other workloads.',
    });
  }

  if (warnings.length > 0) {
    broadcast('games:sandbox:warning', {
      sandboxId: record.id,
      gameId: record.gameId,
      warnings,
      metrics,
    });
  }
}

async function destroySandboxSession(record: SandboxRecord) {
  try {
    const ses = session.fromPartition(record.partition);
    await ses.clearCache();
    await ses.clearStorageData();
  } catch (error) {
    console.warn('[Games] Failed to clear sandbox session', record.partition, error);
  }
}

export function registerGamesIpc() {
  registerHandler('games:sandbox:create', createSandboxSchema, async (_event, request) => {
    const sandboxId = randomUUID();
    const partition = `persist:game-${sandboxId}`;
    const ses = session.fromPartition(partition, { cache: false });

    try {
      await ses.clearStorageData();
      await ses.clearCache();
    } catch (error) {
      console.warn('[Games] Failed to initialize sandbox session', error);
    }

    ses.setPermissionRequestHandler((_wc, permission, callback) => {
      if (permission === 'fullscreen' || permission === 'pointerLock') {
        callback(true);
        return;
      }
      callback(false);
    });

    const record: SandboxRecord = {
      id: sandboxId,
      partition,
      gameId: request.gameId,
      url: request.url,
      createdAt: Date.now(),
    };
    sandboxes.set(sandboxId, record);

    return {
      sandboxId,
      partition,
      url: request.url,
      hardened: true,
      createdAt: record.createdAt,
    };
  });

  registerHandler('games:sandbox:destroy', destroySandboxSchema, async (_event, request) => {
    const record = sandboxes.get(request.sandboxId);
    if (!record) {
      return { success: false, error: 'sandbox:not-found' };
    }
    sandboxes.delete(request.sandboxId);
    await destroySandboxSession(record);
    return { success: true };
  });

  registerHandler('games:sandbox:metrics', metricsSchema, async (_event, request) => {
    const record = sandboxes.get(request.sandboxId);
    if (!record) {
      return { success: false, error: 'sandbox:not-found' };
    }
    record.lastMetrics = {
      ...request.metrics,
      timestamp: Date.now(),
    };
    evaluateMetrics(record);
    return { success: true };
  });
}
