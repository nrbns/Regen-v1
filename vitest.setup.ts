/**
 * Vitest Setup - Mocks that must be hoisted
 * This file is imported first to ensure mocks are set up before any imports
 */

import { vi } from 'vitest';

// Mock MeiliSearch to prevent unhandled promise rejections during tests
vi.mock('./src/lib/meili', () => ({
  indexDocuments: vi.fn(() => Promise.resolve()),
  ensureIndex: vi.fn(() => Promise.resolve()),
  checkMeiliSearch: vi.fn(() => Promise.resolve(false)),
  searchMeili: vi.fn(() =>
    Promise.resolve({ hits: [], limit: 0, offset: 0, processingTimeMs: 0, query: '' })
  ),
}));

// Mock meiliIndexer service to prevent async initialization during tests
vi.mock('./src/services/meiliIndexer', () => ({
  indexTab: vi.fn(() => Promise.resolve()),
  indexTabs: vi.fn(() => Promise.resolve()),
  indexResearch: vi.fn(() => Promise.resolve()),
  indexNote: vi.fn(() => Promise.resolve()),
  initMeiliIndexing: vi.fn(() => Promise.resolve()),
  setIndexingEnabled: vi.fn(),
}));

// Mock framer-motion - MUST be hoisted before any component imports
// This prevents React context errors when testing components with framer-motion
vi.mock('framer-motion', async () => {
  // Dynamic import to avoid circular dependencies
  const React = await import('react');

  const createMotionComponent = (tagName: string) => {
    return React.default.forwardRef((props: any, ref: any) => {
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
      return React.default.createElement(tagName, { ...domProps, ref });
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

  return {
    motion: new Proxy(motion, {
      get(target, prop: string | symbol) {
        if (prop in target) return target[prop];
        return createMotionComponent(String(prop));
      },
    }),
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      set: vi.fn(),
      controls: {},
    }),
    useMotionValue: vi.fn(() => ({ get: vi.fn(), set: vi.fn() })),
    useTransform: vi.fn(() => vi.fn()),
  };
});
