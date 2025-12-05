/**
 * EcoBadge - Real-time eco feedback component
 * Shows green tier, score, and CO2 saved
 */
type GreenTier = 'Ultra Green' | 'Green' | 'Yellow' | 'Red';
interface EcoBadgeProps {
    score: number;
    tier: GreenTier;
    co2SavedG?: number;
    className?: string;
}
export declare function EcoBadge({ score, tier, co2SavedG, className }: EcoBadgeProps): import("react/jsx-runtime").JSX.Element;
export declare function EcoBadgeCompact({ score, tier, co2SavedG }: EcoBadgeProps): import("react/jsx-runtime").JSX.Element;
export {};
