/**
 * IPC handlers for video call optimization
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { getVideoCallOptimizer } from './video-call-optimizer';

export function registerVideoCallIpc() {
  // Get video call optimizer config
  registerHandler('videoCall:getConfig', z.object({}), async () => {
    const optimizer = getVideoCallOptimizer();
    return optimizer.getConfig();
  });

  // Update video call optimizer config
  registerHandler('videoCall:updateConfig', z.object({
    enabled: z.boolean().optional(),
    adaptiveQuality: z.boolean().optional(),
    maxResolution: z.enum(['720p', '480p', '360p', '240p']).optional(),
    maxFrameRate: z.number().min(1).max(30).optional(),
    bandwidthEstimate: z.number().optional(),
    priorityMode: z.enum(['performance', 'balanced', 'quality']).optional(),
  }), async (_event, request) => {
    const optimizer = getVideoCallOptimizer();
    optimizer.updateConfig(request);
    return { success: true };
  });

  // Get network quality
  registerHandler('videoCall:getNetworkQuality', z.object({}), async () => {
    const optimizer = getVideoCallOptimizer();
    return optimizer.getNetworkQuality();
  });

  // Update network quality estimate
  registerHandler('videoCall:updateNetworkQuality', z.object({
    bandwidth: z.number(),
    latency: z.number().optional(),
    packetLoss: z.number().optional(),
  }), async (_event, request) => {
    const optimizer = getVideoCallOptimizer();
    optimizer.updateNetworkQuality(
      request.bandwidth,
      request.latency || 50,
      request.packetLoss || 0
    );
    return { success: true };
  });
}

