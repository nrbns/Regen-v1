/**
 * Toggle Component
 * Accessible toggle switch
 */
export interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    'aria-label'?: string;
    className?: string;
}
/**
 * Toggle - Accessible toggle switch
 *
 * Features:
 * - Keyboard accessible
 * - ARIA attributes
 * - Smooth animations
 * - Reduced motion support
 */
export declare function Toggle({ checked, onChange, disabled, label, 'aria-label': ariaLabel, className, }: ToggleProps): import("react/jsx-runtime").JSX.Element;
