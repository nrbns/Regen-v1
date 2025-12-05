/**
 * Animation Hooks
 * Utilities for controlling animations
 */
/**
 * Hook to trigger animation when element enters viewport
 */
export declare function useInViewAnimation(options?: {
    threshold?: number;
    once?: boolean;
    margin?: string;
}): {
    ref: import("react").MutableRefObject<null>;
    isInView: boolean;
};
/**
 * Hook for staggered animations
 */
export declare function useStaggeredAnimation(count: number, delay?: number): {
    visible: boolean;
    getDelay: (index: number) => number;
};
/**
 * Hook for scroll-triggered animations
 */
export declare function useScrollAnimation(threshold?: number): {
    ref: import("react").RefObject<HTMLElement>;
    isVisible: boolean;
};
