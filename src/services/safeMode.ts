/**
 * Safe Mode Manager
 *
 * Disables heavy features if browser crashes or user enables safe mode
 * Ensures browser always starts even if features are broken
 */

export interface SafeModeConfig {
  enabled: boolean;
  reason?: 'user-enabled' | 'crash-detected' | 'performance-issue';
  timestamp: number;
  disabledFeatures: string[];
}

const SAFE_MODE_KEY = 'regen:safe-mode';
const CRASH_COUNT_KEY = 'regen:crash-count';
const CRASH_THRESHOLD = 3; // Enable safe mode after 3 crashes

/**
 * Check if safe mode should be enabled
 */
export function shouldEnableSafeMode(): boolean {
  try {
    const safeMode = getSafeModeConfig();
    return safeMode?.enabled || false;
  } catch {
    return false;
  }
}

/**
 * Get current safe mode configuration
 */
export function getSafeModeConfig(): SafeModeConfig | null {
  try {
    const stored = localStorage.getItem(SAFE_MODE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Enable safe mode
 */
export function enableSafeMode(reason: SafeModeConfig['reason'] = 'user-enabled'): void {
  const config: SafeModeConfig = {
    enabled: true,
    reason,
    timestamp: Date.now(),
    disabledFeatures: [
      'ai-execution',
      'background-agents',
      'auto-actions',
      'trade-automation',
      'realtime-sync',
      'voice-commands',
      'heavy-animations',
    ],
  };

  localStorage.setItem(SAFE_MODE_KEY, JSON.stringify(config));
  console.log('[SafeMode] Enabled:', config);
}

/**
 * Disable safe mode
 */
export function disableSafeMode(): void {
  localStorage.removeItem(SAFE_MODE_KEY);
  localStorage.removeItem(CRASH_COUNT_KEY);
  console.log('[SafeMode] Disabled');
}

/**
 * Check if specific feature is disabled in safe mode
 */
export function isFeatureDisabled(featureId: string): boolean {
  const config = getSafeModeConfig();
  if (!config?.enabled) return false;
  return config.disabledFeatures.includes(featureId);
}

/**
 * Track crash and auto-enable safe mode if threshold exceeded
 */
export function trackCrash(): void {
  try {
    const countStr = localStorage.getItem(CRASH_COUNT_KEY) || '0';
    const count = parseInt(countStr, 10) + 1;

    localStorage.setItem(CRASH_COUNT_KEY, count.toString());
    console.warn(`[SafeMode] Crash count: ${count}`);

    if (count >= CRASH_THRESHOLD) {
      console.error(`[SafeMode] Crash threshold exceeded (${CRASH_THRESHOLD}), enabling safe mode`);
      enableSafeMode('crash-detected');
    }
  } catch (error) {
    console.error('[SafeMode] Failed to track crash:', error);
  }
}

/**
 * Reset crash counter (call on successful session)
 */
export function resetCrashCounter(): void {
  localStorage.removeItem(CRASH_COUNT_KEY);
}

/**
 * Get safe mode status for UI display
 */
export function getSafeModeStatus(): {
  enabled: boolean;
  reason?: string;
  disabledCount: number;
} {
  const config = getSafeModeConfig();
  return {
    enabled: config?.enabled || false,
    reason: config?.reason,
    disabledCount: config?.disabledFeatures.length || 0,
  };
}

/**
 * Initialize safe mode on app start
 */
export function initSafeMode(): void {
  // Check if last session ended in crash
  const wasClean = sessionStorage.getItem('regen:clean-shutdown');

  if (!wasClean) {
    console.warn('[SafeMode] Detected unclean shutdown');
    trackCrash();
  }

  // Mark this session as started
  sessionStorage.removeItem('regen:clean-shutdown');

  // Log safe mode status
  const status = getSafeModeStatus();
  if (status.enabled) {
    console.warn('[SafeMode] Running in safe mode:', status);
  } else {
    console.log('[SafeMode] Normal mode');
  }
}

/**
 * Mark clean shutdown
 */
export function markCleanShutdown(): void {
  sessionStorage.setItem('regen:clean-shutdown', 'true');

  // Reset crash counter on successful run
  resetCrashCounter();
}

// Register clean shutdown handler
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    markCleanShutdown();
  });
}
