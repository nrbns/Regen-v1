/**
 * Spiritual Layer IPC Handlers
 */

import { z } from 'zod';
import { registerHandler } from '../../shared/ipc/router';
import { getFocusModeService } from './focus-mode';
import { getMoodDetector } from './mood-detector';
import { getBalanceCoach } from './balance-coach';

export function registerSpiritualIpc(): void {
  // Focus Mode
  registerHandler('spiritual:focusMode:enable', z.object({
    ambientSound: z.enum(['none', 'nature', 'rain', 'ocean', 'meditation']).optional(),
    breathingOverlay: z.boolean().optional(),
    timer: z.number().optional(),
    notifications: z.boolean().optional(),
  }), async (_event, request) => {
    const service = getFocusModeService();
    service.enable(request);
    return { success: true };
  });

  registerHandler('spiritual:focusMode:disable', z.object({}), async () => {
    const service = getFocusModeService();
    service.disable();
    return { success: true };
  });

  registerHandler('spiritual:focusMode:status', z.object({}), async () => {
    const service = getFocusModeService();
    return {
      active: service.isActive(),
      config: service.getConfig(),
    };
  });

  // Mood Detector
  registerHandler('spiritual:mood:recordTyping', z.object({}), async () => {
    const detector = getMoodDetector();
    detector.recordTyping();
    return { success: true };
  });

  registerHandler('spiritual:mood:get', z.object({}), async () => {
    const detector = getMoodDetector();
    const mood = detector.getMood();
    const colors = detector.getThemeColors(mood.mood);
    return { ...mood, colors };
  });

  registerHandler('spiritual:mood:reset', z.object({}), async () => {
    const detector = getMoodDetector();
    detector.reset();
    return { success: true };
  });

  // Balance Coach
  registerHandler('spiritual:balance:start', z.object({
    rest: z.number().optional(),
    stretch: z.number().optional(),
    hydrate: z.number().optional(),
    eyeBreak: z.number().optional(),
  }), async (_event, request) => {
    const coach = getBalanceCoach();
    coach.startReminders(request);
    return { success: true };
  });

  registerHandler('spiritual:balance:stop', z.object({}), async () => {
    const coach = getBalanceCoach();
    coach.stopAllReminders();
    return { success: true };
  });
}

