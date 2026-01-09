import React from 'react';
import {
  motion as framerMotion,
  AnimatePresence,
  Reorder,
  useInView,
  Variants,
  HTMLMotionProps,
} from 'framer-motion';

// Default animation variants for calm, minimal feel
export const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

// Page transition variants
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  in: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeInOut',
    },
  },
  out: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

// Button hover variants
export const buttonVariants: Variants = {
  idle: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Card hover variants
export const cardVariants: Variants = {
  idle: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  hover: {
    y: -2,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: { duration: 0.2 },
  },
};

// Sidebar slide variants
export const sidebarVariants: Variants = {
  closed: {
    x: '-100%',
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
  open: {
    x: 0,
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
};

// Typing indicator variants
export const typingVariants: Variants = {
  start: { opacity: 0.4 },
  end: {
    opacity: 1,
    transition: {
      duration: 0.8,
      repeat: Infinity,
      repeatType: 'reverse' as const,
    },
  },
};

// Enhanced motion component with default animations
const createMotionComponent = (tag: string) => {
  return React.forwardRef<any, any>((props, ref) => {
    const {
      children,
      variants = defaultVariants,
      initial = 'hidden',
      animate = 'visible',
      exit = 'exit',
      whileHover,
      whileTap,
      layout,
      layoutId,
      transition,
      ...rest
    } = props;

    return React.createElement(
      framerMotion[tag] || framerMotion.div,
      {
        ref,
        variants,
        initial,
        animate,
        exit,
        whileHover: whileHover || (tag === 'button' ? 'hover' : undefined),
        whileTap: whileTap || (tag === 'button' ? 'tap' : undefined),
        layout,
        layoutId,
        transition: transition || { duration: 0.3 },
        ...rest,
      },
      children
    );
  });
};

// Motion proxy with enhanced components
const motionHandler: ProxyHandler<any> = {
  get(_, prop: string) {
    // Return actual Framer Motion components for known elements
    if (['div', 'span', 'button', 'input', 'section', 'article', 'aside', 'nav', 'header', 'footer', 'main'].includes(prop)) {
      return createMotionComponent(prop);
    }

    // Return framer-motion component if it exists
    if ((framerMotion as any)[prop]) {
      return (framerMotion as any)[prop];
    }

    // Fallback to div for unknown components
    return createMotionComponent('div');
  },
};

export const motion: any = new Proxy({}, motionHandler);

// Export actual Framer Motion components
export { AnimatePresence, Reorder, useInView };
export type { Variants, HTMLMotionProps };

export default motion;
