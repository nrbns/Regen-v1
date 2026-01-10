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
 * Updated: 64px width for vertical AI capsule with full avatar (Figma spec)
 */
export const spineVariants: Variants = {
  observing: {
    width: 64, // Vertical AI capsule - 64px per Figma spec (was 48px)
    transition: {
      duration: 0.28,
      ease: MECHANICAL_EASING,
    },
  },
  expanded: {
    width: 320, // Expanded panel width
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

/**
 * Avatar animations - Anime/M3GAN style
 */

/**
 * Blink animation - slow, natural (every 6-8 seconds when idle, faster when aware)
 */
export const avatarBlinkVariants: Variants = {
  idle: {
    scaleY: [1, 0.05, 1],
    transition: {
      duration: 0.3,
      repeat: Infinity,
      repeatDelay: 6, // Blink every ~6 seconds when idle
      ease: "easeInOut",
    },
  },
  aware: {
    scaleY: [1, 0.02, 1],
    transition: {
      duration: 0.25,
      repeat: Infinity,
      repeatDelay: 4, // Blink more frequently when aware
      ease: "easeInOut",
    },
  },
  executing: {
    scaleY: [1, 0.03, 1],
    transition: {
      duration: 0.2,
      repeat: Infinity,
      repeatDelay: 3, // Frequent blinks during execution (tracking)
      ease: "easeInOut",
    },
  },
};

/**
 * Glow intensity - breathing effect, intensifies with state
 */
export const avatarGlowVariants: Variants = {
  idle: {
    opacity: [0.3, 0.5, 0.3],
    scale: [1, 1.02, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  aware: {
    opacity: [0.5, 0.8, 0.5],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  executing: {
    opacity: [0.6, 0.9, 0.6],
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Eye dilation - opens wider when aware, tracks during execution
 */
export const avatarDilationVariants: Variants = {
  neutral: {
    scale: 1,
    transition: {
      duration: 0.5,
      ease: MECHANICAL_EASING,
    },
  },
  dilated: {
    scale: [1, 1.15, 1.1], // Opens wider when aware
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatType: "reverse",
      ease: MECHANICAL_EASING,
    },
  },
  tracking: {
    scale: [1, 1.08, 1], // Subtle tracking motion
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Micro-tilt animation - subtle head movement (only during execution/tracking)
 */
export const avatarMicroTiltVariants: Variants = {
  idle: {
    rotate: 0,
    y: 0,
  },
  tracking: {
    rotate: [0, 2, -2, 0],
    y: [0, 0.5, -0.5, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
