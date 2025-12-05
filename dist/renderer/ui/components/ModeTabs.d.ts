/**
 * ModeTabs Component
 * Mode switching tabs with visual indicators and mode shifting
 */
import { type ModeId } from '../tokens-enhanced';
export interface ModeTabsProps {
    className?: string;
    compact?: boolean;
    onModeChange?: (mode: ModeId) => void;
}
export declare function ModeTabs({ className, compact, onModeChange }: ModeTabsProps): import("react/jsx-runtime").JSX.Element;
