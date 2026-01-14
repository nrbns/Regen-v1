/**
 * Vitest Setup - Mocks that must be hoisted
 * This file is imported first to ensure mocks are set up before any imports
 */

import { vi } from 'vitest';
import { systemState } from '../src/backend/state/SystemState';

// Provide Jest-compatible globals for legacy tests
const jestLike = {
  fn: vi.fn,
  spyOn: vi.spyOn,
  mock: vi.mock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
};
(globalThis as any).jest = { ...jestLike };

// Basic browser API shims for tests
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = {
    randomUUID: () => `uuid-${Math.random().toString(16).slice(2)}`,
  };
} else if (!(globalThis as any).crypto.randomUUID) {
  (globalThis as any).crypto.randomUUID = () => `uuid-${Math.random().toString(16).slice(2)}`;
}

if (!(globalThis as any).requestAnimationFrame) {
  (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as any;
}

const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
};
if (!(globalThis as any).localStorage) (globalThis as any).localStorage = makeStorage();
if (!(globalThis as any).sessionStorage) (globalThis as any).sessionStorage = makeStorage();

// Reset system state after each test to avoid cross-test bleed
afterEach(() => {
  if (systemState?.reset) {
    systemState.reset();
  }
});

// Suppress deprecated done warnings that fail legacy tests
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
  if (typeof warning === 'string' && warning.includes('done() callback is deprecated')) {
    return;
  }
  return originalEmitWarning.call(process, warning as any, ...(args as any));
};

// Mock MeiliSearch to prevent unhandled promise rejections during tests
vi.mock('../src/lib/meili', () => ({
  fetchWithTimeout: vi.fn((_resource: string) =>
    Promise.resolve({ ok: true, json: async () => ({}) })
  ),
  ensureIndex: vi.fn(() => Promise.resolve()),
  indexDocuments: vi.fn(() => Promise.resolve([])),
  waitForTask: vi.fn(() => Promise.resolve(true)),
  searchDocuments: vi.fn(() =>
    Promise.resolve({ hits: [], estimatedTotalHits: 0, processingTimeMs: 0 })
  ),
  multiSearch: vi.fn(() => Promise.resolve({ results: [] })),
  deleteDocuments: vi.fn(() => Promise.resolve({})),
  checkMeiliSearch: vi.fn(() => Promise.resolve(false)),
}));

// Mock meiliIndexer service to prevent async initialization during tests
vi.mock('../src/services/meiliIndexer', () => ({
  indexTab: vi.fn(() => Promise.resolve()),
  indexTabs: vi.fn(() => Promise.resolve()),
  indexResearch: vi.fn(() => Promise.resolve()),
  indexNote: vi.fn(() => Promise.resolve()),
  indexContext: vi.fn(() => Promise.resolve()),
  searchContexts: vi.fn(() => Promise.resolve({ hits: [], estimatedTotalHits: 0, processingTimeMs: 0 })),
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

// Provide a synchronous default global mock for Tauri invoke so tests that call it during setup won't fail
const defaultMockInvoke = vi.fn(() => Promise.resolve(false));
(globalThis as any).mockInvoke = defaultMockInvoke;

// Asynchronously patch the mock to delegate to the real test stub when available
(async () => {
  try {
    const tauriStub = await import('../src/test-stubs/tauri-api.js');
    const defaultInvoke = tauriStub.invoke ?? (tauriStub.default && tauriStub.default.invoke);
    const mockInvoke = vi.fn(defaultInvoke);

    // Replace global mock with the patched one
    (globalThis as any).mockInvoke = mockInvoke;

    // Patch the stub so other modules import invoke and get the mock
    if (tauriStub && typeof tauriStub === 'object') {
      tauriStub.invoke = (...args: any[]) => mockInvoke(...args);
      if (tauriStub.default && typeof tauriStub.default === 'object') {
        tauriStub.default.invoke = (...args: any[]) => mockInvoke(...args);
      }
    }
  } catch {
    // ignore in environments where test-stub isn't available
  }
})();

// Global guard: disallow real network fetches during tests unless explicitly mocked
// Tests should spy/mock global.fetch when they need to simulate network responses.
(globalThis as any).fetch = (..._args: any[]) => {
  throw new Error(
    'Real network fetch() is disabled in tests. Mock `fetch` (e.g., `vi.spyOn(global, "fetch")`) when needed.'
  );
};
