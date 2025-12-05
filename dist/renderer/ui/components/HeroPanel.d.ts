/**
 * HeroPanel / LaunchFlow Component
 * Hero section with quick actions and command bar
 */
export interface HeroPanelProps {
    className?: string;
    compact?: boolean;
    onQuickAction?: (action: string) => void;
}
export declare function HeroPanel({ className, compact, onQuickAction }: HeroPanelProps): import("react/jsx-runtime").JSX.Element;
