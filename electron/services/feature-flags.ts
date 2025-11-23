/**
 * Feature Flags System
 * Enables/disables experimental features
 */

import { registerHandler } from '../shared/ipc/router';
import { z } from 'zod';
import { createLogger } from './utils/logger';

const log = createLogger('feature-flags');

interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
}

const flags = new Map<string, FeatureFlag>();

/**
 * Register a feature flag
 */
export function registerFlag(name: string, enabled: boolean, description?: string): void {
  flags.set(name, { name, enabled, description });
  log.info('Feature flag registered', { name, enabled });
}

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(name: string): boolean {
  const flag = flags.get(name);
  if (!flag) {
    // Default to false for unknown flags
    return false;
  }
  return flag.enabled;
}

/**
 * Set feature flag state
 */
export function setFeatureFlag(name: string, enabled: boolean): void {
  const flag = flags.get(name);
  if (flag) {
    flag.enabled = enabled;
    log.info('Feature flag updated', { name, enabled });
  } else {
    log.warn('Attempted to set unknown feature flag', { name });
  }
}

/**
 * Get all feature flags
 */
export function getAllFlags(): FeatureFlag[] {
  return Array.from(flags.values());
}

/**
 * Register IPC handlers
 */
export function registerFeatureFlagsIpc(): void {
  registerHandler('features:list', z.object({}), async () => {
    return { flags: getAllFlags() };
  });

  registerHandler('features:get', z.object({ name: z.string() }), async (_event, request) => {
    return { enabled: isFeatureEnabled(request.name) };
  });

  registerHandler(
    'features:set',
    z.object({ name: z.string(), enabled: z.boolean() }),
    async (_event, request) => {
      setFeatureFlag(request.name, request.enabled);
      return { success: true };
    }
  );
}

// Register some default feature flags
registerFlag('agent-sandbox', true, 'Enable agent sandbox execution');
registerFlag('agent-memory-persistence', true, 'Enable agent memory persistence');
registerFlag('log-rotation', true, 'Enable log rotation');
registerFlag('performance-markers', true, 'Enable performance markers');
registerFlag('crash-dump', true, 'Enable crash dump collection');
