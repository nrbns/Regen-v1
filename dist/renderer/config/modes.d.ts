/**
 * Mode Configuration for Tier 1
 * Only Research mode is fully enabled; others are marked as "Coming Soon"
 */
export type ModeId = 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
export interface ModeConfig {
    id: ModeId;
    label: string;
    enabled: boolean;
    comingSoon: boolean;
    description?: string;
}
export declare const MODES: Record<ModeId, ModeConfig>;
export declare const ENABLED_MODES: ModeConfig[];
export declare const PRIMARY_MODES: ModeId[];
export declare const TIER1_MODE: ModeId;
/**
 * Check if a mode is available for use
 */
export declare function isModeEnabled(modeId: ModeId): boolean;
/**
 * Get mode config
 */
export declare function getModeConfig(modeId: ModeId): ModeConfig;
