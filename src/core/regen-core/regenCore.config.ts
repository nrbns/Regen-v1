/**
 * Regen Core Configuration
 * User-configurable thresholds and behavior settings
 */

export interface RegenCoreConfig {
  // Tab Redundancy Detection
  tabRedundancyThreshold: number; // Min tabs from same domain (default: 3)
  tabRedundancyCooldown: number; // Cooldown in ms (default: 30000)
  autoCloseDuplicates: boolean; // Auto-close duplicate tabs (default: false)

  // Search Loop Detection
  searchLoopThreshold: number; // Min searches in window (default: 3)
  searchLoopWindow: number; // Window in ms (default: 60000)
  enableSearchLoopDetection: boolean; // Enable search loop detection (default: true)

  // Long Scroll Detection
  scrollDepthThreshold: number; // Scroll depth % (default: 80)
  scrollCooldown: number; // Cooldown in ms (default: 10000)
  enableLongScrollDetection: boolean; // Enable long scroll detection (default: true)

  // Idle Detection
  idleThreshold: number; // Idle time in ms (default: 1320000 = 22 min)
  idleCheckInterval: number; // Check interval in ms (default: 60000)
  enableIdleDetection: boolean; // Enable idle detection (default: true)

  // Error Detection
  errorCooldown: number; // Cooldown per URL in ms (default: 300000 = 5 min)
  errorThreshold: number; // Number of errors before intervention (default: 3)
  enableErrorDetection: boolean; // Enable error detection (default: true)

  // General
  enabled: boolean; // Master enable/disable
  respectIgnoreCount: boolean; // Get quieter after ignores
  maxIgnoreCount: number; // Threshold multiplier after this many ignores
  minInterventionConfidence: number; // Minimum confidence for interventions 0-1 (default: 0.7)
}

const DEFAULT_CONFIG: RegenCoreConfig = {
  tabRedundancyThreshold: 3,
  tabRedundancyCooldown: 30000,
  autoCloseDuplicates: false, // Disabled by default (user must enable)
  searchLoopThreshold: 3,
  searchLoopWindow: 60000,
  enableSearchLoopDetection: true,
  scrollDepthThreshold: 80,
  scrollCooldown: 10000,
  enableLongScrollDetection: true,
  idleThreshold: 22 * 60 * 1000, // 22 minutes
  idleCheckInterval: 60000, // 1 minute
  enableIdleDetection: true,
  errorCooldown: 5 * 60 * 1000, // 5 minutes
  errorThreshold: 3,
  enableErrorDetection: true,
  enabled: true,
  respectIgnoreCount: true,
  maxIgnoreCount: 3,
  minInterventionConfidence: 0.7, // 70% confidence required
};

const STORAGE_KEY = 'regen:core:config';

/**
 * Get current configuration
 */
export function getRegenCoreConfig(): RegenCoreConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (error) {
    console.warn('[RegenCore] Failed to load config:', error);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Update configuration
 */
export function updateRegenCoreConfig(updates: Partial<RegenCoreConfig>): void {
  try {
    const current = getRegenCoreConfig();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('[RegenCore] Failed to save config:', error);
  }
}

/**
 * Reset to default configuration
 */
export function resetRegenCoreConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[RegenCore] Failed to reset config:', error);
  }
}
