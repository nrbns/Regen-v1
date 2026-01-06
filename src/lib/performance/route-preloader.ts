/**
 * Route Preloader
 * Preload routes when user is likely to navigate to them
 */

import { prefetchComponents } from './lazy-loader';
import { isV1ModeEnabled } from '../../config/mvpFeatureFlags';

// Route import functions
const routeImports = {
  settings: () => import('../../routes/Settings'),
  history: () => import('../../routes/History'),
  offline: () => import('../../routes/OfflineDocuments'),
  agents: isV1ModeEnabled() ? undefined : () => import('../../routes/AgentConsole'),
  research: () => import('../../modes/research'),
  trade: () => import('../../modes/trade'),
};

/**
 * Preload a specific route
 */
export function preloadRoute(routeName: keyof typeof routeImports): void {
  const importFn = routeImports[routeName];
  if (importFn) {
    importFn().catch(error => {
      console.warn(`[RoutePreloader] Failed to preload route ${routeName}:`, error);
    });
  }
}

/**
 * Preload multiple routes in parallel
 */
export function preloadRoutes(routeNames: Array<keyof typeof routeImports>): void {
  const importFns = routeNames.map(name => routeImports[name]).filter(Boolean);
  prefetchComponents(importFns);
}

/**
 * Smart preloading based on user behavior
 * Preload routes when user hovers over navigation links
 */
export function setupSmartPreloading(): void {
  if (typeof document === 'undefined') return;

  // Preload routes on hover
  const links = document.querySelectorAll('a[href]');
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      const href = (link as HTMLAnchorElement).href;
      if (href.includes('/settings')) preloadRoute('settings');
      if (href.includes('/history')) preloadRoute('history');
      if (href.includes('/offline')) preloadRoute('offline');
      if (href.includes('/agents')) preloadRoute('agents');
    });
  });
}
