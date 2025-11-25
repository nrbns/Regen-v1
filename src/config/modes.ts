/**
 * Mode Configuration for Tier 1
 * Only Research mode is fully enabled; others are marked as "Coming Soon"
 */

export type ModeId =
  | 'Browse'
  | 'Research'
  | 'Trade'
  | 'Games'
  | 'Docs'
  | 'Images'
  | 'Threats'
  | 'GraphMind';

export interface ModeConfig {
  id: ModeId;
  label: string;
  enabled: boolean;
  comingSoon: boolean;
  description?: string;
}

export const MODES: Record<ModeId, ModeConfig> = {
  Browse: {
    id: 'Browse',
    label: 'Browse',
    enabled: false,
    comingSoon: true,
    description: 'Standard browsing returns after the Research alpha.',
  },
  Research: {
    id: 'Research',
    label: 'Research',
    enabled: true,
    comingSoon: false,
    description: 'AI-powered research and summarization',
  },
  Trade: {
    id: 'Trade',
    label: 'Trade',
    enabled: false,
    comingSoon: true,
    description: 'Trading mode (coming after the Research alpha)',
  },
  Games: {
    id: 'Games',
    label: 'Games',
    enabled: false,
    comingSoon: true,
    description: 'Game mode with AI recommendations (Coming Soon)',
  },
  Docs: {
    id: 'Docs',
    label: 'Docs',
    enabled: false,
    comingSoon: true,
    description: 'Document mode (coming soon)',
  },
  Images: {
    id: 'Images',
    label: 'Images',
    enabled: false,
    comingSoon: true,
    description: 'Image mode (Coming Soon)',
  },
  Threats: {
    id: 'Threats',
    label: 'Threats',
    enabled: false,
    comingSoon: true,
    description: 'Threat intelligence mode (coming soon)',
  },
  GraphMind: {
    id: 'GraphMind',
    label: 'GraphMind',
    enabled: false,
    comingSoon: true,
    description: 'GraphMind mode (Coming Soon)',
  },
};

export const ENABLED_MODES = Object.values(MODES).filter(m => m.enabled);
export const PRIMARY_MODES: ModeId[] = ['Research'];
export const TIER1_MODE: ModeId = 'Research';

/**
 * Check if a mode is available for use
 */
export function isModeEnabled(modeId: ModeId): boolean {
  return MODES[modeId]?.enabled ?? false;
}

/**
 * Get mode config
 */
export function getModeConfig(modeId: ModeId): ModeConfig {
  return MODES[modeId] ?? MODES.Browse;
}
