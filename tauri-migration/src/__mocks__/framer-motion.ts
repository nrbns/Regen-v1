/**
 * Framer Motion Mock
 * Replaces framer-motion with plain React elements for testing
 */

import React from 'react';

const createMotionComponent = (tagName: string) => {
  return React.forwardRef((props: any, ref: any) => {
    // Filter out framer-motion specific props
    const {
      animate,
      initial,
      transition,
      whileHover,
      whileTap,
      layout,
      layoutId,
      variants,
      exit,
      ...domProps
    } = props;
    return React.createElement(tagName, { ...domProps, ref });
  });
};

const motionElements = [
  'div',
  'span',
  'button',
  'section',
  'header',
  'footer',
  'nav',
  'main',
  'aside',
  'article',
  'p',
  'h1',
  'h2',
  'h3',
  'ul',
  'li',
  'form',
  'input',
  'textarea',
  'select',
  'a',
  'img',
  'svg',
];

const motion: any = {};
motionElements.forEach(el => {
  motion[el] = createMotionComponent(el);
});

// Proxy for any other element
const motionProxy = new Proxy(motion, {
  get(target, prop: string | symbol) {
    if (prop in target) return target[prop];
    return createMotionComponent(String(prop));
  },
});

export const motionExport = motionProxy;

export const AnimatePresence = ({ children }: any) => children;

export const useAnimation = () => ({
  start: () => {},
  stop: () => {},
  set: () => {},
  controls: {},
});

export const useMotionValue = () => ({
  get: () => 0,
  set: () => {},
});

export const useTransform = () => () => 0;

export default {
  motion: motionExport,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useTransform,
};
