/**
 * UI Transition Utilities
 * Helper functions for consistent animations and transitions
 */
import { Variants } from 'framer-motion';
/**
 * Standard fade in animation
 */
export declare const fadeIn: Variants;
/**
 * Slide up animation
 */
export declare const slideUp: Variants;
/**
 * Slide down animation
 */
export declare const slideDown: Variants;
/**
 * Slide left animation
 */
export declare const slideLeft: Variants;
/**
 * Slide right animation
 */
export declare const slideRight: Variants;
/**
 * Scale in animation
 */
export declare const scaleIn: Variants;
/**
 * Stagger children animation
 */
export declare const staggerContainer: Variants;
/**
 * Standard transition timing
 */
export declare const transition: {
    fast: {
        duration: number;
        ease: number[];
    };
    base: {
        duration: number;
        ease: number[];
    };
    slow: {
        duration: number;
        ease: number[];
    };
    smooth: {
        duration: number;
        ease: number[];
    };
    bounce: {
        duration: number;
        ease: number[];
    };
};
/**
 * Common animation variants with transitions
 */
export declare const animations: {
    fadeIn: {
        transition: {
            duration: number;
            ease: number[];
        };
    };
    slideUp: {
        transition: {
            duration: number;
            ease: number[];
        };
    };
    slideDown: {
        transition: {
            duration: number;
            ease: number[];
        };
    };
    slideLeft: {
        transition: {
            duration: number;
            ease: number[];
        };
    };
    slideRight: {
        transition: {
            duration: number;
            ease: number[];
        };
    };
    scaleIn: {
        transition: {
            duration: number;
            ease: number[];
        };
    };
};
/**
 * Hover animation variants
 */
export declare const hoverVariants: {
    hover: {
        scale: number;
        transition: {
            duration: number;
            ease: number[];
        };
    };
    tap: {
        scale: number;
        transition: {
            duration: number;
            ease: number[];
        };
    };
};
/**
 * Check if user prefers reduced motion
 */
export declare function prefersReducedMotion(): boolean;
/**
 * Get transition based on user preference
 */
export declare function getTransition(duration?: keyof typeof transition): {
    duration: number;
    ease: number[];
} | {
    duration: number;
};
/**
 * Get animation variants based on user preference
 */
export declare function getVariants(baseVariants: Variants): Variants;
