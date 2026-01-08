/**
 * Production Console Wrapper
 * Disables console logs in production to improve performance
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Create optimized console that only logs in development
export const optimizedConsole = {
  log: isDev ? originalConsole.log : () => {},
  warn: isDev ? originalConsole.warn : () => {},
  error: isDev ? originalConsole.error : () => {},
  info: isDev ? originalConsole.info : () => {},
  debug: isDev ? originalConsole.debug : () => {},
};

// Replace global console in production
if (!isDev && typeof window !== 'undefined') {
  // Only disable non-error logs in production
  // Keep errors for debugging critical issues
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  console.debug = () => {};
  // Keep console.error for critical errors
}
