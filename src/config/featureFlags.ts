// Simple runtime feature flags for v1
export const FEATURES: Record<string, boolean> = {
  // v1 decisions
  vpn: false, // VPN deferred from v1
  // UI / demo surface area
  animations: false,
  aiPanels: false,
  enhancedSidebar: false,
  realtimePreview: false,
  modeButtons: false,
  largeIcons: false,
  demoElements: false,
  agentControls: false,
};

export function isFeatureEnabled(flag: string): boolean {
  return Boolean(FEATURES[flag]);
}

export default FEATURES;
export type ModeAvailability = 'ready' | 'beta' | 'soon' | 'hidden';

type ModeId =
  | 'Browse'
  | 'Research'
  | 'Trade'
  | 'Games'
  | 'Docs'
  | 'Images'
  | 'Threats'
  | 'GraphMind';

type ModeFlag = {
  status: ModeAvailability;
  description?: string;
};

type FeatureFlags = {
  modes: Record<ModeId, ModeFlag>;
};

/**
 * Feature Flags - Control visibility of modes and experimental features
 *
 * Production (default):
 * - Browse & Research: ready (core features)
 * - Trade, Docs, Images: beta/soon (visible but not primary focus)
 * - Games, Threats, GraphMind: hidden (unfinished/experimental)
 *
 * Development (import.meta.env.DEV):
 * - All modes visible for testing
 *
 * Environment overrides:
 * - VITE_ENABLE_BETA_MODES=true -> Show all beta modes
 * - VITE_ENABLE_EXPERIMENTAL=true -> Show experimental features
 */
export const featureFlags: FeatureFlags = {
  modes: {
    Browse: { status: 'ready' },
    Research: { status: 'ready' },
    Trade: {
      status: import.meta.env.DEV ? 'beta' : 'hidden',
      description: 'TradingView integration in preview',
    },
    Games: { status: 'hidden' },
    Docs: {
      status: import.meta.env.DEV ? 'soon' : 'hidden',
      description: 'Coming soon: workspace view',
    },
    Images: {
      status: import.meta.env.DEV ? 'soon' : 'hidden',
      description: 'AI image search coming soon',
    },
    Threats: { status: 'hidden', description: 'Threat intelligence dashboard' },
    GraphMind: { status: 'hidden' },
  },
};

export function getModeFlag(mode: ModeId): ModeFlag {
  return featureFlags.modes[mode] ?? { status: 'hidden' };
}

/**
 * Get list of visible modes (for UI display)
 * In production: Browse and Research only
 * In development: All modes visible
 */
export function getVisibleModes(): ModeId[] {
  return (Object.entries(featureFlags.modes) as [ModeId, ModeFlag][])
    .filter(([_, flag]) => flag.status !== 'hidden')
    .map(([mode]) => mode);
}

/**
 * Check if experimental features should be shown
 */
export function areExperimentalFeaturesEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_ENABLE_EXPERIMENTAL === 'true';
}
