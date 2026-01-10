/**
 * Regen Core Animation Configs
 * Motion configurations for Sentinel AI presence
 */

import { Variants } from "framer-motion";

/**
 * Linear mechanical easing (M3GAN-style)
 * No bounce, no elastic, no overshoot
 */
export const MECHANICAL_EASING = [0.4, 0, 0.2, 1] as const;

/**
 * Sentinel Spine animation variants
 */
export const spineVariants: Variants = {
  observing: {
    width: 14,
    transition: {
      duration: 0.28,
      ease: MECHANICAL_EASING,
    },
  },
  expanded: {
    width: 320,
    transition: {
      duration: 0.28,
      ease: MECHANICAL_EASING,
    },
  },
};

/**
 * Vertical light pulse animation
 */
export const lightPulseVariants: Variants = {
  animate: {
    y: [0, -20, 0],
    opacity: [0.3, 0.6, 0.3],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/**
 * Micro flicker animation (every 5-7 seconds)
 */
export const flickerVariants: Variants = {
  animate: {
    opacity: [0, 0.3, 0],
    transition: {
      duration: 0.1,
      repeat: Infinity,
      repeatDelay: 6,
      ease: "linear",
    },
  },
};

/**
 * Horizontal scan line animation
 */
export const scanLineVariants: Variants = {
  animate: {
    x: ["-100%", "200%"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

/**
 * Panel fade in/out
 */
export const panelVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: MECHANICAL_EASING,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: MECHANICAL_EASING,
    },
  },
};
