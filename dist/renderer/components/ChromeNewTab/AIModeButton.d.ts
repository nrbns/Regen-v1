/**
 * AIModeButton - Prominent green AI Mode button
 * Used in top right corner and next to search bar
 */
interface AIModeButtonProps {
    onClick: () => void;
    variant?: 'default' | 'search';
    className?: string;
}
export declare function AIModeButton({ onClick, variant, className }: AIModeButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
