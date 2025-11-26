/**
 * Framer Motion Mock for Tests
 * Prevents React context errors when testing components with framer-motion
 */

import React from 'react';
import { vi } from 'vitest';

// Mock all framer-motion exports to use plain React elements
export const motion = {
  div: React.forwardRef((props: any, ref: any) => React.createElement('div', { ...props, ref })),
  span: React.forwardRef((props: any, ref: any) => React.createElement('span', { ...props, ref })),
  button: React.forwardRef((props: any, ref: any) =>
    React.createElement('button', { ...props, ref })
  ),
  section: React.forwardRef((props: any, ref: any) =>
    React.createElement('section', { ...props, ref })
  ),
  header: React.forwardRef((props: any, ref: any) =>
    React.createElement('header', { ...props, ref })
  ),
  footer: React.forwardRef((props: any, ref: any) =>
    React.createElement('footer', { ...props, ref })
  ),
  nav: React.forwardRef((props: any, ref: any) => React.createElement('nav', { ...props, ref })),
  main: React.forwardRef((props: any, ref: any) => React.createElement('main', { ...props, ref })),
  aside: React.forwardRef((props: any, ref: any) =>
    React.createElement('aside', { ...props, ref })
  ),
  article: React.forwardRef((props: any, ref: any) =>
    React.createElement('article', { ...props, ref })
  ),
  p: React.forwardRef((props: any, ref: any) => React.createElement('p', { ...props, ref })),
  h1: React.forwardRef((props: any, ref: any) => React.createElement('h1', { ...props, ref })),
  h2: React.forwardRef((props: any, ref: any) => React.createElement('h2', { ...props, ref })),
  h3: React.forwardRef((props: any, ref: any) => React.createElement('h3', { ...props, ref })),
  ul: React.forwardRef((props: any, ref: any) => React.createElement('ul', { ...props, ref })),
  li: React.forwardRef((props: any, ref: any) => React.createElement('li', { ...props, ref })),
};

export const AnimatePresence = ({ children }: any) => children;

export const useAnimation = () => ({
  start: vi.fn(),
  stop: vi.fn(),
  set: vi.fn(),
  controls: {},
});

export const useMotionValue = vi.fn(() => ({ get: vi.fn(), set: vi.fn() }));
export const useTransform = vi.fn(() => vi.fn());
