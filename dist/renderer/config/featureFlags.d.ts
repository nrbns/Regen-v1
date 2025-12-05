export type ModeAvailability = 'ready' | 'beta' | 'soon' | 'hidden';
type ModeId = 'Browse' | 'Research' | 'Trade' | 'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind';
type ModeFlag = {
    status: ModeAvailability;
    description?: string;
};
type FeatureFlags = {
    modes: Record<ModeId, ModeFlag>;
};
export declare const featureFlags: FeatureFlags;
export declare function getModeFlag(mode: ModeId): ModeFlag;
export {};
