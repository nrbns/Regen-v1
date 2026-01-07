/**
 * Redix Mode Runtime Detection & Control
 * Handles runtime enforcement of Redix low-RAM mode
 */

/**
 * Check if Redix mode is enabled
 * Checks in order: localStorage, URL param, env var, default false
 */
export function isRedixMode(): boolean {
  // 1. Check localStorage (user preference, persists across sessions)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('REDIX_MODE');
    if (stored !== null) {
      return stored === 'true';
    }

    // 2. Check URL parameter (for quick testing: ?redix=true)
    const params = new URLSearchParams(window.location.search);
    if (params.has('redix')) {
      const redixParam = params.get('redix');
      const enabled = redixParam === 'true' || redixParam === '1';
      // Save to localStorage for persistence
      localStorage.setItem('REDIX_MODE', enabled ? 'true' : 'false');
      return enabled;
    }
  }

  // 3. Check environment variable (build-time override)
  const envRedix = import.meta.env.VITE_REDIX_MODE;
  if (envRedix !== undefined) {
    return envRedix === 'true' || envRedix === '1';
  }

  // 4. Default: disabled
  return false;
}

/**
 * Enable Redix mode
 */
export function enableRedixMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('REDIX_MODE', 'true');
    // Reload page to apply changes
    window.location.reload();
  }
}

/**
 * Disable Redix mode
 */
export function disableRedixMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('REDIX_MODE', 'false');
    // Reload page to apply changes
    window.location.reload();
  }
}

/**
 * Toggle Redix mode
 */
export function toggleRedixMode(): boolean {
  const current = isRedixMode();
  if (current) {
    disableRedixMode();
    return false;
  } else {
    enableRedixMode();
    return true;
  }
}

/**
 * Get Redix mode configuration
 */
export interface RedixConfig {
  enabled: boolean;
  maxTabs: number;
  enableMonaco: boolean;
  enableHeavyLibs: boolean;
  enableTabEviction: boolean;
  enableDeveloperMode: boolean;
}

/**
 * Advanced Redix optimizer integration
 */
export async function initializeRedixOptimizer(): Promise<void> {
  if (!isRedixMode()) return;

  const { getRedixOptimizer } = await import('./redix-mode/advanced-optimizer');
  const optimizer = getRedixOptimizer();
  optimizer.initialize();
}

export function getRedixConfig(): RedixConfig {
  const enabled = isRedixMode();

  if (!enabled) {
    // Full mode - no restrictions
    return {
      enabled: false,
      maxTabs: 50, // High limit
      enableMonaco: true,
      enableHeavyLibs: true,
      enableTabEviction: false, // Don't evict in full mode
      enableDeveloperMode: true,
    };
  }

  // Redix mode - aggressive restrictions
  return {
    enabled: true,
    maxTabs: 5, // Low limit
    enableMonaco: false, // Disable Monaco in Redix mode
    enableHeavyLibs: false, // Disable heavy libraries
    enableTabEviction: true, // Aggressive tab eviction
    enableDeveloperMode: false, // Disable developer tools
  };
}

/**
 * Check if a module should be loaded in Redix mode
 */
export function shouldLoadModule(moduleName: string): boolean {
  if (!isRedixMode()) {
    return true; // Load everything in full mode
  }

  // Blocklist of heavy modules in Redix mode
  const blockedModules = [
    'monaco-editor',
    '@monaco-editor/react',
    'monaco',
    '@langchain/core',
    '@langchain/openai',
    '@langchain/anthropic',
    'framer-motion', // Heavy animation library
    'lightweight-charts', // Heavy charting
    'playwright', // Heavy browser automation
    'puppeteer', // Heavy browser automation
  ];

  return !blockedModules.some(blocked => moduleName.includes(blocked));
}
