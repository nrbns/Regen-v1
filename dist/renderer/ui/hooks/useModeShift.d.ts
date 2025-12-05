/**
 * useModeShift Hook
 * Provides mode shifting functionality with session snapshotting
 */
import type { ModeId } from '../tokens-enhanced';
export interface ModeShiftOptions {
    snapshot?: boolean;
    preview?: boolean;
    skipConfirmation?: boolean;
}
export interface ModeShiftResult {
    sessionId: string;
    appliedModules: string[];
    success: boolean;
    error?: string;
}
export declare function useModeShift(): {
    currentMode: "Browse" | "Research" | "Trade" | "Games" | "Docs" | "Images" | "Threats" | "GraphMind";
    isShifting: boolean;
    previewMode: ModeId | null;
    shiftMode: (toMode: ModeId, _options?: ModeShiftOptions) => Promise<ModeShiftResult | null>;
    getAvailableModes: () => Promise<{
        id: ModeId;
        label: string;
        tools: string[];
        themeHints: any;
    }[]>;
    clearPreview: () => void;
};
