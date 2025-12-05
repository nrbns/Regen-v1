/**
 * UI Transition Utilities
 * Helper functions for consistent animations and transitions
 */
/**
 * Standard fade in animation
 */
export const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};
/**
 * Slide up animation
 */
export const slideUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};
/**
 * Slide down animation
 */
export const slideDown = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
};
/**
 * Slide left animation
 */
export const slideLeft = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
};
/**
 * Slide right animation
 */
export const slideRight = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
};
/**
 * Scale in animation
 */
export const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
};
/**
 * Stagger children animation
 */
export const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1,
        },
    },
};
/**
 * Standard transition timing
 */
export const transition = {
    fast: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
    base: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    slow: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    smooth: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
    bounce: { duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] },
};
/**
 * Common animation variants with transitions
 */
export const animations = {
    fadeIn: {
        ...fadeIn,
        transition: transition.base,
    },
    slideUp: {
        ...slideUp,
        transition: transition.base,
    },
    slideDown: {
        ...slideDown,
        transition: transition.base,
    },
    slideLeft: {
        ...slideLeft,
        transition: transition.base,
    },
    slideRight: {
        ...slideRight,
        transition: transition.base,
    },
    scaleIn: {
        ...scaleIn,
        transition: transition.base,
    },
};
/**
 * Hover animation variants
 */
export const hoverVariants = {
    hover: {
        scale: 1.05,
        transition: transition.fast,
    },
    tap: {
        scale: 0.98,
        transition: transition.fast,
    },
};
/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion() {
    if (typeof window === 'undefined')
        return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
/**
 * Get transition based on user preference
 */
export function getTransition(duration = 'base') {
    if (prefersReducedMotion()) {
        return { duration: 0.01 };
    }
    return transition[duration];
}
/**
 * Get animation variants based on user preference
 */
export function getVariants(baseVariants) {
    if (prefersReducedMotion()) {
        return {
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
        };
    }
    return baseVariants;
}
