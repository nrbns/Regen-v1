/**
 * SPRINT 2: Adaptive Layout Manager
 * Adjusts UI based on network quality and screen size
 * Respects user preferences when overridden
 */

import {
  getNetworkQuality,
  isLowBandwidth,
  supportsFullUI,
  onNetworkChange,
  type NetworkQuality,
} from './networkDetector';

export type LayoutMode = 'full' | 'compact' | 'minimal';

interface AdaptiveLayoutState {
  networkQuality: NetworkQuality;
  layoutMode: LayoutMode;
  screenWidth: number;
  hideSidebars: boolean;
  compactTabs: boolean;
  verticalTabs: boolean;
  isUserOverride: boolean; // Whether user has overridden automatic detection
}

interface LayoutPreferences {
  layoutModeOverride?: 'auto' | 'full' | 'compact' | 'minimal';
  verticalTabsOverride?: boolean | null;
  compactTabsOverride?: boolean | null;
  hideSidebarsOverride?: boolean | null;
}

class AdaptiveLayoutManager {
  private state: AdaptiveLayoutState = {
    networkQuality: 'wifi',
    layoutMode: 'full',
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    hideSidebars: false,
    compactTabs: false,
    verticalTabs: false,
    isUserOverride: false,
  };

  private listeners = new Set<(state: AdaptiveLayoutState) => void>();
  private networkUnsubscribe: (() => void) | null = null;
  private userPreferences: LayoutPreferences = {};
  private preferencesUnsubscribe: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadUserPreferences();
      this.updateScreenWidth();
      window.addEventListener('resize', () => this.updateScreenWidth());

      // Listen to network changes
      this.networkUnsubscribe = onNetworkChange(quality => {
        this.updateNetworkQuality(quality);
      });

      // Initial network quality
      this.updateNetworkQuality(getNetworkQuality());

      // Listen to settings changes (for preference updates)
      this.setupPreferencesListener();
    }
  }

  /**
   * Load user preferences from settings store
   */
  private loadUserPreferences(): void {
    try {
      // Try to load synchronously first (Zustand persist middleware stores in localStorage)
      const stored = localStorage.getItem('regen:settings-v1');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.appearance) {
            const appearance = parsed.state.appearance;
            this.userPreferences = {
              layoutModeOverride: appearance.layoutModeOverride,
              verticalTabsOverride: appearance.verticalTabsOverride,
              compactTabsOverride: appearance.compactTabsOverride,
              hideSidebarsOverride: appearance.hideSidebarsOverride,
            };
            return; // Successfully loaded from localStorage
          }
        } catch {
          // Invalid JSON, fall through to async import
        }
      }

      // Fallback: dynamically import to avoid circular dependencies
      import('../../state/settingsStore')
        .then(({ useSettingsStore }) => {
          const settings = useSettingsStore.getState();
          this.userPreferences = {
            layoutModeOverride: settings.appearance.layoutModeOverride,
            verticalTabsOverride: settings.appearance.verticalTabsOverride,
            compactTabsOverride: settings.appearance.compactTabsOverride,
            hideSidebarsOverride: settings.appearance.hideSidebarsOverride,
          };
          this.recalculateLayout();
        })
        .catch(loadError => {
          console.warn('[AdaptiveLayout] Failed to load preferences:', loadError);
        });
    } catch (error) {
      console.warn('[AdaptiveLayout] Failed to load preferences:', error);
    }
  }

  /**
   * Setup listener for preference changes
   */
  private setupPreferencesListener(): void {
    try {
      import('../../state/settingsStore').then(({ useSettingsStore }) => {
        this.preferencesUnsubscribe = useSettingsStore.subscribe(state => {
          const newPrefs: LayoutPreferences = {
            layoutModeOverride: state.appearance.layoutModeOverride,
            verticalTabsOverride: state.appearance.verticalTabsOverride,
            compactTabsOverride: state.appearance.compactTabsOverride,
            hideSidebarsOverride: state.appearance.hideSidebarsOverride,
          };

          // Only update if preferences actually changed
          if (
            newPrefs.layoutModeOverride !== this.userPreferences.layoutModeOverride ||
            newPrefs.verticalTabsOverride !== this.userPreferences.verticalTabsOverride ||
            newPrefs.compactTabsOverride !== this.userPreferences.compactTabsOverride ||
            newPrefs.hideSidebarsOverride !== this.userPreferences.hideSidebarsOverride
          ) {
            this.userPreferences = newPrefs;
            this.recalculateLayout();
          }
        });
      });
    } catch (error) {
      console.warn('[AdaptiveLayout] Failed to setup preferences listener:', error);
    }
  }

  private updateScreenWidth(): void {
    this.state.screenWidth = window.innerWidth;
    this.recalculateLayout();
  }

  private updateNetworkQuality(quality: NetworkQuality): void {
    this.state.networkQuality = quality;
    this.recalculateLayout();
  }

  private recalculateLayout(): void {
    const wasCompact = this.state.layoutMode === 'compact';
    const wasMinimal = this.state.layoutMode === 'minimal';
    const wasOverride = this.state.isUserOverride;

    // Check if user has overridden layout mode
    const hasLayoutOverride =
      this.userPreferences.layoutModeOverride && this.userPreferences.layoutModeOverride !== 'auto';
    this.state.isUserOverride =
      (hasLayoutOverride ||
        this.userPreferences.verticalTabsOverride !== null ||
        this.userPreferences.compactTabsOverride !== null ||
        this.userPreferences.hideSidebarsOverride !== null) ??
      false;

    // Determine layout mode based on user preferences or network/screen size
    if (hasLayoutOverride) {
      // User has explicitly set a layout mode
      this.state.layoutMode = this.userPreferences.layoutModeOverride as LayoutMode;

      // Apply user overrides for individual settings, or use defaults for the mode
      if (
        this.userPreferences.hideSidebarsOverride !== null &&
        this.userPreferences.hideSidebarsOverride !== undefined
      ) {
        this.state.hideSidebars = this.userPreferences.hideSidebarsOverride;
      } else {
        // Default for the mode
        this.state.hideSidebars = !!(
          this.state.layoutMode === 'minimal' || this.state.layoutMode === 'compact'
        );
      }

      if (
        this.userPreferences.compactTabsOverride !== null &&
        this.userPreferences.compactTabsOverride !== undefined
      ) {
        this.state.compactTabs = this.userPreferences.compactTabsOverride;
      } else {
        this.state.compactTabs = !!(
          this.state.layoutMode === 'minimal' || this.state.layoutMode === 'compact'
        );
      }

      if (
        this.userPreferences.verticalTabsOverride !== null &&
        this.userPreferences.verticalTabsOverride !== undefined
      ) {
        this.state.verticalTabs = this.userPreferences.verticalTabsOverride;
      } else {
        this.state.verticalTabs = !!(
          this.state.layoutMode === 'full' &&
          this.state.screenWidth > 1400 &&
          supportsFullUI()
        );
      }
    } else {
      // Auto mode: determine layout mode based on network and screen size
      if (isLowBandwidth()) {
        // Low bandwidth: minimal layout
        this.state.layoutMode = 'minimal';
        this.state.hideSidebars = !!(this.userPreferences.hideSidebarsOverride ?? true);
        this.state.compactTabs = !!(this.userPreferences.compactTabsOverride ?? true);
        this.state.verticalTabs = !!(this.userPreferences.verticalTabsOverride ?? false);
      } else if (this.state.screenWidth < 768) {
        // Mobile: compact layout
        this.state.layoutMode = 'compact';
        this.state.hideSidebars = !!(this.userPreferences.hideSidebarsOverride ?? true);
        this.state.compactTabs = !!(this.userPreferences.compactTabsOverride ?? true);
        this.state.verticalTabs = !!(this.userPreferences.verticalTabsOverride ?? false);
      } else if (this.state.screenWidth > 1400) {
        // Wide screen: full layout with vertical tabs
        this.state.layoutMode = 'full';
        this.state.hideSidebars = this.userPreferences.hideSidebarsOverride ?? false;
        this.state.compactTabs = this.userPreferences.compactTabsOverride ?? false;
        this.state.verticalTabs = this.userPreferences.verticalTabsOverride ?? supportsFullUI();
      } else {
        // Medium screen: full layout with horizontal tabs
        this.state.layoutMode = 'full';
        this.state.hideSidebars = this.userPreferences.hideSidebarsOverride ?? false;
        this.state.compactTabs = this.userPreferences.compactTabsOverride ?? false;
        this.state.verticalTabs = this.userPreferences.verticalTabsOverride ?? false;
      }
    }

    // Notify listeners if layout changed
    const layoutChanged =
      wasCompact !== (this.state.layoutMode === 'compact') ||
      wasMinimal !== (this.state.layoutMode === 'minimal') ||
      wasOverride !== this.state.isUserOverride;

    if (layoutChanged) {
      this.notifyListeners();
    } else {
      this.notifyListeners(); // Always notify to ensure UI stays in sync
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Get current layout state
   */
  getState(): AdaptiveLayoutState {
    return { ...this.state };
  }

  /**
   * Subscribe to layout changes
   */
  subscribe(listener: (state: AdaptiveLayoutState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener({ ...this.state });

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get user preferences (for external use)
   */
  getUserPreferences(): LayoutPreferences {
    return { ...this.userPreferences };
  }

  /**
   * Update user preferences (for external use)
   */
  setUserPreferences(preferences: Partial<LayoutPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    this.recalculateLayout();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    if (this.preferencesUnsubscribe) {
      this.preferencesUnsubscribe();
      this.preferencesUnsubscribe = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', () => this.updateScreenWidth());
    }
    this.listeners.clear();
  }
}

// Singleton instance
let adaptiveLayoutInstance: AdaptiveLayoutManager | null = null;

export function getAdaptiveLayoutManager(): AdaptiveLayoutManager {
  if (!adaptiveLayoutInstance) {
    adaptiveLayoutInstance = new AdaptiveLayoutManager();
  }
  return adaptiveLayoutInstance;
}

export function initializeAdaptiveLayout(): () => void {
  const manager = getAdaptiveLayoutManager();
  return () => manager.destroy();
}
