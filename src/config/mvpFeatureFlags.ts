/**
 * MVP Feature Flags - Week 1 Desktop Shell
 * Control enabled/disabled state of MVP features
 * Persisted in localStorage with Zustand integration
 */

export type FeatureCategory = 'performance' | 'ui' | 'system';

export interface MVPFeature {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  enabled: boolean;
  inactivityTimeoutMs?: number;
}

// LocalStorage key for persisting feature flags
const STORAGE_KEY = 'mvp-feature-flags-v1';

// Default feature configurations
const DEFAULT_FEATURES: MVPFeature[] = [
  // Performance features
  {
    id: 'tab-hibernation',
    name: 'Tab Hibernation',
    description: 'Automatically suspend inactive browser tabs after 30 minutes to save memory and battery',
    category: 'performance',
    enabled: true,
    inactivityTimeoutMs: 30 * 60 * 1000, // 30 minutes
  },
  {
    id: 'low-ram-mode',
    name: 'Low-RAM Mode',
    description: 'Dynamically cap open tabs (3-5) based on available system memory',
    category: 'performance',
    enabled: true,
  },
  {
    id: 'battery-aware-power',
    name: 'Battery-Aware Power Mode',
    description: 'Automatically enable Power Saving Mode when on battery to extend battery life',
    category: 'performance',
    enabled: true,
  },

  // UI features
  {
    id: 'sidebar-toggle',
    name: 'Sidebar Toggle',
    description: 'Toggle Regen AI sidebar with Ctrl+B shortcut or button',
    category: 'ui',
    enabled: true,
  },
  {
    id: 'address-controls',
    name: 'Address Bar Controls',
    description: 'Navigation controls (back, forward, reload) in address bar',
    category: 'ui',
    enabled: true,
  },
  {
    id: 'keyboard-shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'Comprehensive keyboard shortcuts for tab and UI management',
    category: 'ui',
    enabled: true,
  },
];

/**
 * Load feature flags from localStorage or return defaults
 */
function loadFeaturesFromStorage(): MVPFeature[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new features added in updates
      return DEFAULT_FEATURES.map(defaultFeature => {
        const storedFeature = parsed.find((f: MVPFeature) => f.id === defaultFeature.id);
        return storedFeature ? { ...defaultFeature, enabled: storedFeature.enabled } : defaultFeature;
      });
    }
  } catch (error) {
    console.warn('[MVP Features] Failed to load from storage:', error);
  }
  return DEFAULT_FEATURES;
}

/**
 * Save feature flags to localStorage
 */
function saveFeaturesToStorage(features: MVPFeature[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
  } catch (error) {
    console.warn('[MVP Features] Failed to save to storage:', error);
  }
}

// In-memory cache to avoid repeated localStorage reads
let featuresCache: MVPFeature[] | null = null;

/**
 * Get MVP feature flags with current state
 * Can be overridden by environment variables or user settings
 */
export function getMVPFeatureFlags(): MVPFeature[] {
  if (!featuresCache) {
    featuresCache = loadFeaturesFromStorage();
  }
  return [...featuresCache]; // Return copy to prevent mutations
}

/**
 * Check if a specific feature is enabled by ID
 */
export function isMVPFeatureEnabled(featureId: string): boolean {
  const flags = getMVPFeatureFlags();
  const feature = flags.find(f => f.id === featureId);
  return feature?.enabled ?? true;
}

/**
 * Get feature description by ID
 */
export function getMVPFeatureDescription(featureId: string): string {
  const flags = getMVPFeatureFlags();
  const feature = flags.find(f => f.id === featureId);
  return feature?.description ?? 'No description available';
}

/**
 * Toggle a feature on/off by ID
 */
export function toggleMVPFeature(featureId: string): void {
  if (!featuresCache) {
    featuresCache = loadFeaturesFromStorage();
  }

  const feature = featuresCache.find(f => f.id === featureId);
  if (feature) {
    feature.enabled = !feature.enabled;
    saveFeaturesToStorage(featuresCache);
    
    // Log toggle event
    console.log(`[MVP Features] Feature toggled: ${featureId} = ${feature.enabled}`);

    // Dispatch custom event for global listeners
    window.dispatchEvent(
      new CustomEvent('mvp-feature-toggled', {
        detail: { featureId, enabled: feature.enabled },
      })
    );
  }
}

/**
 * Set feature enabled state directly
 */
export function setMVPFeatureEnabled(featureId: string, enabled: boolean): void {
  if (!featuresCache) {
    featuresCache = loadFeaturesFromStorage();
  }

  const feature = featuresCache.find(f => f.id === featureId);
  if (feature && feature.enabled !== enabled) {
    feature.enabled = enabled;
    saveFeaturesToStorage(featuresCache);

    console.log(`[MVP Features] Feature set: ${featureId} = ${enabled}`);
    window.dispatchEvent(
      new CustomEvent('mvp-feature-changed', {
        detail: { featureId, enabled },
      })
    );
  }
}

/**
 * Reset all features to defaults
 */
export function resetMVPFeaturestoDefaults(): void {
  featuresCache = JSON.parse(JSON.stringify(DEFAULT_FEATURES));
  saveFeaturesToStorage(featuresCache);

  console.log('[MVP Features] Reset to defaults');
  window.dispatchEvent(
    new CustomEvent('mvp-features-reset', {
      detail: { features: featuresCache },
    })
  );
}

/**
 * Get features by category
 */
export function getMVPFeaturesByCategory(category: FeatureCategory): MVPFeature[] {
  return getMVPFeatureFlags().filter(f => f.category === category);
}

// Export for testing and debugging
export const DEFAULT_MVP_FLAGS = DEFAULT_FEATURES;
