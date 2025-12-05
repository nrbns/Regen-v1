/**
 * Keyboard Navigation Hooks
 * Utilities for keyboard accessibility
 */
import { RefObject } from 'react';
/**
 * Hook to handle arrow key navigation in lists
 */
export declare function useArrowKeyNavigation<T extends HTMLElement>(ref: RefObject<T>, itemCount: number, onSelect?: (index: number) => void): {
    selectedIndex: number;
    setSelectedIndex: import("react").Dispatch<import("react").SetStateAction<number>>;
};
/**
 * Hook to handle Escape key
 */
export declare function useEscapeKey(onEscape: () => void, enabled?: boolean): void;
/**
 * Hook to handle Enter/Space key activation
 */
export declare function useActivationKey(onActivate: () => void, enabled?: boolean, ref?: RefObject<HTMLElement>): void;
