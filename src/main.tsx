// @ts-nocheck

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/globals.css';
import './styles/mode-themes.css';
// Mobile styles imported via mobile module
import './mobile';
import './lib/battery';
import './services/tabHibernation/init';
import { isDevEnv, isElectronRuntime, isTauriRuntime } from './lib/env';
import { setupClipperHandlers } from './lib/research/clipper-handler';
import { syncRendererTelemetry } from './lib/monitoring/sentry-client';
import { syncAnalyticsOptIn, trackPageView } from './lib/monitoring/analytics-client';
import { ipc } from './lib/ipc-typed';
import { ThemeProvider } from './ui/theme';
import { CSP_DIRECTIVE } from './config/security';
import { suppressBrowserWarnings } from './utils/suppressBrowserWarnings';
import { SettingsSync } from './components/settings/SettingsSync';
// Disable console logs in production for better performance
import './utils/console';

// DOGFOODING: Safe mode for crash recovery
import { initSafeMode } from './services/safeMode';

// DAY 6: Register service worker for caching and offline support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  import('./lib/service-worker').then(({ registerServiceWorker }) => {
    registerServiceWorker().catch(error => {
      console.warn('[ServiceWorker] Registration failed:', error);
    });
  });
}

// DAY 6: Preload critical resources
if (typeof window !== 'undefined') {
  import('./lib/performance/preload').then(({ preloadCriticalResources }) => {
    preloadCriticalResources();
  });
}

// Initialize agent client early
import './lib/agent-client';

// Initialize agent system (planner, executor, memory, tools)
import { initializeAgentSystem } from './core/agent/integration';
initializeAgentSystem();

// Initialize app connections
import { initializeApp } from './lib/initialize-app';

// Import test utility in dev mode
if (isDevEnv()) {
  import('./utils/testOmniDesk').catch(() => {
    // Silently fail if test file doesn't exist
  });
}

// Tier 2: Enhanced Error Boundary
import { GlobalErrorBoundary } from './core/errors/ErrorBoundary';
import { startSnapshotting } from './core/recovery';

// DAY 9 FIX: Onboarding tour for first-time users
import { QuickStartTour } from './components/Onboarding/QuickStartTour';

// REDIX MODE: Runtime enforcement - check mode early
// import { initializeRedixMode } from './lib/redix-mode/integration'; // Unused
import { getRedixConfig } from './lib/redix-mode';

// i18n: Initialize internationalization
import './lib/i18n/config';

// DAY 3-4 FIX: Defer non-critical services - lazy load after first paint
// These are moved to lazy initialization to improve startup time

// REDIX MODE: Conditionally load heavy services only if not in Redix mode
const redixConfig = getRedixConfig();

// Lazy load heavy services based on Redix mode
let initializePrefetcher: any = () => Promise.resolve();
let getVectorWorkerService: any = () => ({ initialize: () => Promise.resolve() });
let getLRUCache: any = () => new Map();

// Only load heavy services if not in Redix mode or if enabled in config
if (!redixConfig.enabled || redixConfig.enableHeavyLibs) {
  // Dynamically import heavy services (ESM-compatible)
  import('./services/prefetch/queryPrefetcher')
    .then(module => {
      initializePrefetcher = module.initializePrefetcher;
    })
    .catch(() => {
      // Silently fail if module not available
    });

  import('./services/vector/vectorWorkerService')
    .then(module => {
      getVectorWorkerService = module.getVectorWorkerService;
    })
    .catch(() => {
      // Silently fail if module not available
    });

  import('./services/embedding/lruCache')
    .then(module => {
      getLRUCache = module.getLRUCache;
    })
    .catch(() => {
      // Silently fail if module not available
    });
}
// Migration functions available but not auto-run (call manually if needed)
// import { migrateLocalStorageHistory } from './services/history';
// import { migrateLocalStorageBookmarks } from './services/bookmarks';
// initializeCriticalPath not yet implemented - removed for now

// Lazy load components to avoid loading everything at once
// Add error handling to prevent blank pages on import failures
const lazyWithErrorHandling = (importFn: () => Promise<any>, componentName: string) => {
  return React.lazy(() =>
    importFn().catch(error => {
      console.error(`Failed to load ${componentName}:`, error);
      // Return a fallback component that shows an error
      return {
        default: () => (
          <div className="flex h-full w-full items-center justify-center p-4">
            <div className="text-center">
              <div className="mb-2 text-lg font-semibold text-red-400">
                Failed to load {componentName}
              </div>
              <div className="text-sm text-gray-400">{String(error)}</div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        ),
      };
    })
  );
};

const AppShell = lazyWithErrorHandling(
  () => import('./components/layout/AppShell').then(m => ({ default: m.AppShell })),
  'AppShell'
);
const Home = lazyWithErrorHandling(() => import('./routes/Home'), 'Home');
const Settings = lazyWithErrorHandling(() => import('./routes/Settings'), 'Settings');
const Workspace = lazyWithErrorHandling(() => import('./routes/Workspace'), 'Workspace');
const AgentConsole = lazyWithErrorHandling(() => import('./routes/AgentConsole'), 'AgentConsole');
// Agent route not found - removed for now
// // Agent routes not found - removed for now
// const Agent = lazyWithErrorHandling(() => import('./routes/Agent'), 'Agent');
// const AgentDemo = lazyWithErrorHandling(() => import('./routes/AgentDemo'), 'AgentDemo');
const Runs = lazyWithErrorHandling(() => import('./routes/Runs'), 'Runs');
const Replay = lazyWithErrorHandling(() => import('./routes/Replay'), 'Replay');
const PlaybookForge = lazyWithErrorHandling(
  () => import('./routes/PlaybookForge'),
  'PlaybookForge'
);
const HistoryPage = lazyWithErrorHandling(() => import('./routes/History'), 'HistoryPage');
const DownloadsPage = lazyWithErrorHandling(() => import('./routes/Downloads'), 'DownloadsPage');
const AISearch = lazyWithErrorHandling(() => import('./routes/AISearch'), 'AISearch');
const AIPanelRoute = lazyWithErrorHandling(() => import('./routes/AIPanelRoute'), 'AIPanelRoute');
const OfflineDocuments = lazyWithErrorHandling(
  () => import('./routes/OfflineDocuments'),
  'OfflineDocuments'
);
const DocumentEditorPage = lazyWithErrorHandling(
  () => import('./routes/DocumentEditor'),
  'DocumentEditorPage'
);
const WatchersPage = lazyWithErrorHandling(() => import('./routes/Watchers'), 'WatchersPage');
const VideoPage = lazyWithErrorHandling(() => import('./routes/Video'), 'VideoPage');
const ConsentTimelinePage = lazyWithErrorHandling(
  () => import('./routes/ConsentTimeline'),
  'ConsentTimelinePage'
);
// PluginMarketplace not found - removed for now
// const PluginMarketplace = lazyWithErrorHandling(
//   () =>
//     import('./components/plugins/PluginMarketplace').then(m => ({ default: m.PluginMarketplace })),
//   'PluginMarketplace'
// );
// AnalyticsDashboard not found - removed for now
// const AnalyticsDashboard = lazyWithErrorHandling(
//   () => import('./routes/AnalyticsDashboard'),
//   'AnalyticsDashboard'
// );

// USER REQUEST: No restrictions - completely open for all websites
// CSP is now completely permissive to allow all websites
const ensureCSPMeta = () => {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector(
    'meta[http-equiv="Content-Security-Policy"]'
  ) as HTMLMetaElement | null;
  if (existing) {
    // Update to completely permissive CSP (allows everything)
    existing.content = CSP_DIRECTIVE;
  } else {
    // Add permissive CSP that allows all websites
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = CSP_DIRECTIVE;
    document.head.prepend(meta);
  }
};

ensureCSPMeta();

// Suppress known browser-native console warnings (Tracking Prevention, CSP violations, etc.)
suppressBrowserWarnings();

// Ultra-lightweight loading component - minimal DOM for fast render
function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#1A1D28',
        color: '#94a3b8',
        fontFamily: 'system-ui, sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌐</div>
        <div style={{ fontSize: '14px' }}>Loading...</div>
      </div>
    </div>
  );
}

// Router configuration with v7 future flags
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <Suspense fallback={<LoadingFallback />}>
          <AppShell />
        </Suspense>
      ),
      children: [
        {
          index: true,
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Home />
            </Suspense>
          ),
        },
        {
          path: 'settings',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Settings />
            </Suspense>
          ),
        },
        {
          path: 'w/:id',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Workspace />
            </Suspense>
          ),
        },
        {
          path: 'agent',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <AgentConsole />
            </Suspense>
          ),
        },
        // Agent route removed - file not found
        // {
        //   path: 'agent-new',
        //   element: (
        //     <Suspense fallback={<LoadingFallback />}>
        //       <Agent />
        //     </Suspense>
        //   ),
        // },
        // AgentDemo route removed - file not found
        // {
        //   path: 'agent-demo',
        //   element: (
        //     <Suspense fallback={<LoadingFallback />}>
        //       <AgentDemo />
        //     </Suspense>
        //   ),
        // },
        {
          path: 'runs',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Runs />
            </Suspense>
          ),
        },
        {
          path: 'replay/:id',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Replay />
            </Suspense>
          ),
        },
        {
          path: 'playbooks',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <PlaybookForge />
            </Suspense>
          ),
        },
        {
          path: 'history',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <HistoryPage />
            </Suspense>
          ),
        },
        {
          path: 'offline',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <OfflineDocuments />
            </Suspense>
          ),
        },
        {
          path: 'downloads',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <DownloadsPage />
            </Suspense>
          ),
        },
        {
          path: 'ai-search',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <AISearch />
            </Suspense>
          ),
        },
        {
          path: 'ai-panel',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <AIPanelRoute />
            </Suspense>
          ),
        },
        // PluginMarketplace route removed - component not found
        // {
        //   path: 'plugins',
        //   element: (
        //     <Suspense fallback={<LoadingFallback />}>
        //       <PluginMarketplace />
        //     </Suspense>
        //   ),
        // },
        // AnalyticsDashboard route removed - component not found
        // {
        //   path: 'analytics',
        //   element: (
        //     <Suspense fallback={<LoadingFallback />}>
        //       <AnalyticsDashboard />
        //     </Suspense>
        //   ),
        // },
        {
          path: 'watchers',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <WatchersPage />
            </Suspense>
          ),
        },
        {
          path: 'video',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <VideoPage />
            </Suspense>
          ),
        },
        {
          path: 'consent-timeline',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <ConsentTimelinePage />
            </Suspense>
          ),
        },
        {
          path: 'doc-editor',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <DocumentEditorPage />
            </Suspense>
          ),
        },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true, // Opt-in to React.startTransition wrapping in v7
    },
  }
);

// Mount the application
const rootElement = document.getElementById('root');
if (!rootElement) {
  // If root doesn't exist, create a visible error
  document.body.innerHTML = `
    <div style="padding: 40px; color: white; background-color: #1A1D28; min-height: 100vh; font-family: system-ui, sans-serif;">
      <h1 style="color: #ef4444;">❌ Critical Error</h1>
      <p style="color: #94a3b8; margin-top: 16px;">Root element (#root) not found in the DOM.</p>
      <p style="color: #94a3b8; margin-top: 8px;">Please check that index.html contains &lt;div id="root"&gt;&lt;/div&gt;</p>
    </div>
  `;
  throw new Error('Root element not found');
}

// Ensure root element is visible and properly initialized
rootElement.style.display = 'block';
rootElement.style.visibility = 'visible';
rootElement.style.opacity = '1';
if (!rootElement.hasAttribute('data-initialized')) {
  rootElement.setAttribute('data-initialized', 'true');
  if (isDevEnv()) {
    console.log('[Main] Root element initialized:', rootElement);
  }
}

try {
  if (isDevEnv()) {
    console.log('%c🚀 Mounting Regen...', 'color:#34d399;font-weight:bold;');
    console.log('[Main] Root element:', rootElement);
    console.log('[Main] Document ready state:', document.readyState);
  }

  const rootKey = '__OMNIBROWSER_REACT_ROOT__';
  const existingRoot = (window as any)[rootKey];

  if (existingRoot) {
    if (isDevEnv()) {
      console.log('[Main] Reusing existing React root');
    }
  }

  const root = existingRoot || ReactDOM.createRoot(rootElement);

  // DOGFOODING: Initialize safe mode crash detection
  initSafeMode();

  // Initialize app connections (AI, API, Browser)
  initializeApp()
    .then(status => {
      if (isDevEnv()) {
        console.log('[Main] App initialization status:', status);
      }
    })
    .catch(error => {
      console.warn('[Main] App initialization warning:', error);
    });

  // Setup research clipper handlers
  setupClipperHandlers();

  // Tier 2: Track app open
  import('./services/analytics').then(({ track }) => {
    track('app_open');
  });

  // Tier 3: Initialize services - DEFER EVERYTHING to avoid blocking render
  // Initialize crash reporter immediately (lightweight) - async to avoid blocking
  import('./core/crash-reporting')
    .then(({ crashReporter }) => {
      crashReporter.initialize();
    })
    .catch(() => {
      // Silently fail if crash reporter is not available
      if (isDevEnv()) {
        console.warn('[Main] Crash reporter not available');
      }
    });

  // Listen for Ollama progress events (Tauri)
  if (isElectronRuntime()) {
    // Tauri events are handled via window events
    window.addEventListener('ollama-progress', ((e: CustomEvent<number>) => {
      if (isDevEnv()) {
        console.log(`[Ollama] Setup progress: ${e.detail}%`);
      }
    }) as EventListener);

    window.addEventListener('ai-ready', () => {
      if (isDevEnv()) {
        console.log('[Ollama] AI ready!');
      }
      // Show notification
      import('./utils/toast').then(({ toast }) => {
        toast.success('AI brain ready! Press Ctrl+Space for WISPR.');
      });
    });

    // Listen for backend-ready event
    window.addEventListener('backend-ready', () => {
      if (isDevEnv()) {
        console.log('[Backend] All services ready!');
      }
      import('./utils/toast').then(({ toast }) => {
        toast.success('Backend ready! Ollama, MeiliSearch, and n8n are running.');
        // SEARCH SYSTEM VERIFICATION: Initialize and verify search system
        Promise.all([
          import('./services/meiliIndexer').then(({ initMeiliIndexing }) => {
            return initMeiliIndexing().catch(() => {
              // Suppress MeiliSearch errors - it's optional
            });
          }),
          import('./lib/meili-setup').then(({ setupMeiliIndexes }) => {
            return setupMeiliIndexes().catch(console.error);
          }),
          import('./services/searchHealth').then(
            ({ verifySearchSystem, startSearchHealthMonitoring }) => {
              // Verify search system on startup
              return verifySearchSystem().then(result => {
                if (result.success) {
                  console.log(`[Search] ${result.message}`);
                  // Start health monitoring
                  startSearchHealthMonitoring(30000); // Check every 30 seconds
                } else {
                  console.warn(`[Search] ${result.message}`);
                }
                return result;
              });
            }
          ),
        ]).then(() => {
          console.log('[Search] Search system initialization complete');
        });

        // Initialize search services
        import('./services/multiSourceSearch')
          .then(() => {
            console.log('[Search] Search services initialized');
          })
          .catch(console.error);
        import('./services/liveWebSearch')
          .then(() => {
            console.log('[Search] Live web search initialized');
          })
          .catch(console.error);
      });
    });

    window.addEventListener('ollama-ready', () => {
      if (isDevEnv()) {
        console.log('[Ollama] Ready!');
      }
    });

    // Listen for WISPR wake event (global hotkey Ctrl+Shift+Space)
    window.addEventListener('wispr-wake', () => {
      console.log('[Main] WISPR wake triggered via global hotkey');
      window.dispatchEvent(new CustomEvent('activate-wispr'));
    });

    // Listen for research metrics events (citations, hallucination risk)
    window.addEventListener('research-metrics', ((e: CustomEvent) => {
      console.log('[Research] Metrics updated:', e.detail);
      // Metrics are handled by RegenResearchPanel component
    }) as EventListener);

    // Listen for research start/end events
    window.addEventListener('research-start', ((e: CustomEvent) => {
      console.log('[Research] Started:', e.detail);
    }) as EventListener);

    window.addEventListener('research-end', ((e: CustomEvent) => {
      console.log('[Research] Completed:', e.detail);
    }) as EventListener);

    // Listen for iframe-call events (fixes #6204)
    window.addEventListener('iframe-call', ((e: CustomEvent<string>) => {
      try {
        const payload = typeof e.detail === 'string' ? JSON.parse(e.detail) : e.detail;
        const fnName = payload.fn;
        const args = payload.args || {};
        // Execute in main context (bypasses iframe sandbox)
        if (ipc && typeof (ipc as any)[fnName] === 'function') {
          (ipc as any)[fnName](args).catch((err: Error) => {
            console.warn('[Iframe] Invoke failed:', err);
          });
        }
      } catch {
        console.warn('[Iframe] Invalid iframe-call payload');
      }
    }) as EventListener);

    // Listen for Ollama missing notification
    window.addEventListener('ollama-missing', () => {
      import('./utils/toast').then(({ toast }) => {
        toast.warning('Ollama not detected. Install from ollama.com for offline AI features.');
      });
    });

    // Listen for localhost access request (security prompt)
    window.addEventListener('request-localhost-access', ((_e: CustomEvent) => {
      // Show permission prompt (one-time)
      const hasPrompted = localStorage.getItem('localhost-access-prompted');
      if (!hasPrompted) {
        import('./utils/toast').then(({ toast }) => {
          toast.info(
            'RegenBrowser needs localhost access for offline AI. This is safe and local-only.',
            {
              duration: 8000,
            }
          );
          localStorage.setItem('localhost-access-prompted', 'true');
        });
      }
    }) as EventListener);
  }

  // Telepathy Upgrade Phase 3: Pre-connect Ollama on app start
  if (isTauriRuntime()) {
    // Pre-connect Ollama immediately (don't block render)
    import('./services/ollama/preconnect')
      .then(({ preconnectOllama }) => {
        // Start pre-connection in background
        setTimeout(() => {
          preconnectOllama().catch(() => {
            // Non-critical - Ollama may not be available
          });
        }, 1000); // Wait 1s after startup
      })
      .catch(() => {
        // Pre-connect service not available
      });
  }

  // CRITICAL PATH: Initialize critical path items (SQLite, Tab Suspension, Whisper, Trade, Testing)
  // Initialize these early but after first paint to ensure they're ready
  setTimeout(() => {
    // initializeCriticalPath not yet implemented
    Promise.resolve().catch(error => {
      console.error('[Main] Critical path initialization failed:', error);
    });
  }, 500); // Initialize after 500ms (after first paint)

  // Defer ALL heavy service initialization until after first paint
  // Use requestIdleCallback with longer delay for better performance
  const deferHeavyInit = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          initializeHeavyServices();
        },
        { timeout: 3000 } // Longer timeout for better performance
      );
    } else {
      setTimeout(initializeHeavyServices, 500); // Increased delay
    }
  };

  const initializeHeavyServices = async () => {
    // DAY 2 FIX: Defer ALL non-critical services until after UI shows
    // These services are loaded in background after first paint

    // Initialize auth service (can be slow) - defer even more
    setTimeout(async () => {
      try {
        const authModule = await import('./services/auth').catch(() => null);
        if (authModule?.authService) {
          await authModule.authService.initialize();
          if (authModule.authService.getState().isAuthenticated) {
            // Defer sync service start even further
            setTimeout(async () => {
              try {
                const syncModule = await import('./services/sync').catch(() => null);
                if (syncModule?.syncService) {
                  await syncModule.syncService.startAutoSync();
                }
              } catch {
                // Silently fail - sync service is optional
              }
            }, 1000);
          }
        }
      } catch {
        // Silently fail - auth service is optional for development
      }
    }, 2000); // Increased delay to 2s

    // Restore plugin state (can be slow) - defer significantly
    setTimeout(async () => {
      try {
        const pluginModule = await import('./core/plugins/registry').catch(() => null);
        if (pluginModule?.pluginRegistry) {
          pluginModule.pluginRegistry.restorePluginState();
        }
      } catch {
        // Silently fail - plugin registry is optional
      }
    }, 3000); // Increased delay to 3s

    // DAY 2 FIX: Move analytics/update checks to background
    // These don't need to block startup
    setTimeout(() => {
      // Analytics check (non-blocking)
      syncAnalyticsOptIn().catch(() => {
        // Analytics initialization is not critical
      });

      // Update check (non-blocking) - Optional, only if updater plugin is available
      // Note: @tauri-apps/api/updater is an optional plugin and may not be installed
      if (isTauriRuntime()) {
        // Use a more defensive approach - check if we're in a build environment
        // where the stub might not handle this properly
        try {
          // Only attempt import if we're actually in Tauri runtime (not web build)
          if (typeof window !== 'undefined' && (window as any).__TAURI__) {
            // Use dynamic import with proper error handling
            Promise.resolve()
              .then(() => {
                // Only import if we're sure we're in Tauri
                return import('@tauri-apps/api/updater');
              })
              .then(module => {
                if (module && typeof module.check === 'function') {
                  module.check().catch(() => {
                    // Update check failed, not critical
                  });
                }
              })
              .catch(err => {
                // Updater plugin not installed or not available - this is fine
                // The updater is an optional Tauri plugin
                if (import.meta.env.DEV) {
                  console.debug('[Updater] Not available:', err.message);
                }
              });
          }
        } catch (err) {
          // Silently ignore - updater is optional
          if (import.meta.env.DEV) {
            console.debug('[Updater] Import failed:', err);
          }
        }
      }
    }, 5000); // Wait 5 seconds before checking updates
  };

  // DAY 2 FIX: Measure startup time (target: <3s to first paint)
  const startTime = performance.now();
  const metrics = {
    domContentLoaded: 0,
    load: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    timeToInteractive: 0,
  };

  // Measure DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      metrics.domContentLoaded = performance.now() - startTime;
      console.log(`[Perf] DOMContentLoaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
    });
  } else {
    metrics.domContentLoaded = performance.now() - startTime;
  }

  // Measure load event
  window.addEventListener('load', () => {
    metrics.load = performance.now() - startTime;
    console.log(`[Perf] Load: ${metrics.load.toFixed(2)}ms`);

    // Measure First Paint and First Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const paintObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-paint') {
              metrics.firstPaint = entry.startTime;
              console.log(`[Perf] First Paint: ${metrics.firstPaint.toFixed(2)}ms`);
            }
            if (entry.name === 'first-contentful-paint') {
              metrics.firstContentfulPaint = entry.startTime;
              console.log(
                `[Perf] First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`
              );
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
      } catch {
        console.warn('[Perf] Paint observer not supported');
      }
    }

    // Measure Time to Interactive (simplified)
    setTimeout(() => {
      metrics.timeToInteractive = performance.now() - startTime;
      console.log(`[Perf] Time to Interactive: ${metrics.timeToInteractive.toFixed(2)}ms`);

      // Send metrics to analytics (if enabled)
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.setMeasurement('startup_time', metrics.load);
        (window as any).Sentry.setMeasurement('first_paint', metrics.firstPaint);
        (window as any).Sentry.setMeasurement('time_to_interactive', metrics.timeToInteractive);
      }

      // Log warning if startup is slow
      if (metrics.firstPaint > 3000) {
        console.warn(
          `[Perf] Slow startup: First Paint took ${metrics.firstPaint.toFixed(2)}ms (target: <3000ms)`
        );
      }
    }, 100);
  });

  // DAY 3-4 FIX: Initialize performance monitoring first
  import('./utils/performance')
    .then(({ initPerformanceMonitoring }) => {
      initPerformanceMonitoring();
    })
    .catch(() => {
      // Performance monitoring not critical
    });

  // SPRINT FEATURES: Initialize all 15-day sprint features
  import('./lib/integration/sprintFeatures')
    .then(({ initializeSprintFeaturesDeferred }) => {
      initializeSprintFeaturesDeferred();
    })
    .catch(() => {
      // Sprint features initialization not critical for startup
    });

  // SPRINT 0: Initialize low-data mode based on settings
  import('./services/lowDataMode')
    .then(({ applyLowDataMode, isLowDataModeEnabled }) => {
      applyLowDataMode(isLowDataModeEnabled());
    })
    .catch(() => {
      // Low-data mode initialization not critical for startup
    });

  // SPRINT 2: Initialize adaptive layout manager
  import('./services/adaptiveUI/adaptiveLayoutManager')
    .then(({ initializeAdaptiveLayout }) => {
      initializeAdaptiveLayout();
      console.log('[Startup] Adaptive layout manager initialized');
    })
    .catch(error => {
      console.warn('[Startup] Adaptive layout manager initialization failed:', error);
    });

  // TELEMETRY FIX: Initialize telemetry metrics tracking
  import('./services/telemetryMetrics')
    .then(({ telemetryMetrics }) => {
      // Track app startup
      const startupTime = performance.now();
      telemetryMetrics.trackPerformance('app_startup', startupTime, 'ms');

      // Track feature usage
      telemetryMetrics.trackFeature('app_launched');

      console.log('[Telemetry] Metrics tracking initialized');
    })
    .catch(() => {
      // Telemetry not critical
    });

  // NETWORK FIX: Register service worker for caching
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('[SW] Service Worker registered:', registration.scope);
        })
        .catch(error => {
          console.warn('[SW] Service Worker registration failed:', error);
        });
    });
  }

  // CPU/BATTERY FIX: Use visibilitychange to pause heavy tasks
  import('./utils/visibilityManager')
    .then(({ visibilityManager }) => {
      // Register visibility manager for background tab optimization
      visibilityManager.onHidden(() => {
        // Pause heavy operations when tab is hidden
        console.log('[Visibility] Tab hidden - pausing heavy tasks');
      });
    })
    .catch(() => {
      // Visibility manager not critical
    });

  // DAY 1 FIX: Initialize Sentry early for crash reporting
  // Initialize Sentry immediately (before other services) for crash capture
  if (import.meta.env.VITE_SENTRY_DSN || import.meta.env.SENTRY_DSN) {
    syncRendererTelemetry().catch(error => {
      if (import.meta.env.DEV) {
        console.warn('[Monitoring] Failed to initialize Sentry', error);
      }
    });
  }

  // DAY 1 FIX: Add unhandled exception handlers
  // Global error handlers for unhandled errors
  window.addEventListener('error', event => {
    console.error('[Global Error]', event.error);
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(event.error, {
        tags: { source: 'unhandled-error' },
      });
    }
  });

  window.addEventListener('unhandledrejection', event => {
    console.error('[Unhandled Rejection]', event.reason);
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(event.reason, {
        tags: { source: 'unhandled-rejection' },
      });
    }
    // Prevent default browser behavior
    event.preventDefault();
  });

  // DAY 1 FIX: Monitor OOM (Out of Memory) kills
  // Monitor memory usage and detect potential OOM
  if ('performance' in window && 'memory' in (performance as any)) {
    const checkMemory = () => {
      const memInfo = (performance as any).memory;
      if (memInfo) {
        const usedMB = memInfo.usedJSHeapSize / 1048576;
        const limitMB = memInfo.jsHeapSizeLimit / 1048576;
        const usagePercent = (usedMB / limitMB) * 100;

        // Warn if memory usage is high (>85%)
        if (usagePercent > 85) {
          console.warn(
            `[Memory] High usage: ${usagePercent.toFixed(1)}% (${usedMB.toFixed(0)}MB / ${limitMB.toFixed(0)}MB)`
          );
          if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureMessage(
              `High memory usage: ${usagePercent.toFixed(1)}%`,
              (window as any).Sentry.Severity.Warning
            );
          }
        }

        // Critical if >95%
        if (usagePercent > 95) {
          console.error(`[Memory] CRITICAL: ${usagePercent.toFixed(1)}% - OOM risk!`);
          if (typeof window !== 'undefined' && (window as any).Sentry) {
            (window as any).Sentry.captureMessage(
              `Critical memory usage: ${usagePercent.toFixed(1)}% - OOM risk`,
              (window as any).Sentry.Severity.Error
            );
          }
        }
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
  }

  // DAY 3-4 FIX: Defer ALL non-critical services until after first paint
  // This significantly improves startup time
  const deferNonCriticalServices = () => {
    // Defer telemetry and analytics initialization
    syncRendererTelemetry().catch(error => {
      if (import.meta.env.DEV) {
        console.warn('[Monitoring] Failed to initialize renderer telemetry', error);
      }
    });

    syncAnalyticsOptIn()
      .then(() => {
        trackPageView(window.location.pathname);
      })
      .catch(error => {
        if (import.meta.env.DEV) {
          console.warn('[Monitoring] Failed to initialize analytics', error);
        }
      });

    // DAY 3-4 FIX: Lazy load heavy services after first paint
    Promise.all([
      import('./core/crash-reporting').catch(() => null),
      import('./services/auth').catch(() => null),
      import('./services/sync').catch(() => null),
      import('./core/plugins/registry').catch(() => null),
    ]).then(([_crashReporter, _authService, _syncService, _pluginRegistry]) => {
      // Services loaded, but don't initialize yet - wait for user interaction
      if (isDevEnv()) {
        console.log('[Startup] Heavy services loaded (deferred)');
      }
    });

    // Future Enhancements: Initialize after first paint
    // 1. Initialize LRU cache for embeddings
    getLRUCache(1000); // 1000 item capacity

    // 2. Initialize vector worker service (offloads heavy computations)
    getVectorWorkerService()
      .initialize()
      .catch(error => {
        console.warn('[Startup] Vector worker initialization failed:', error);
      });

    // 3. Initialize query prefetcher (smart prefetching)
    initializePrefetcher();

    // 4. Initialize tab sync (Yjs) - deferred to avoid blocking
    if (isTauriRuntime()) {
      setTimeout(() => {
        import('./services/sync/tabSyncService')
          .then(({ initializeTabSync }) => {
            const sessionId = `session-${Date.now()}`;
            initializeTabSync(sessionId, 'ws://127.0.0.1:18080/yjs').catch(error => {
              console.warn('[Startup] Tab sync initialization failed:', error);
            });
          })
          .catch(() => {
            // Tab sync not critical for startup
          });
      }, 2000); // Wait 2s after first paint
    }

    // SPRINT 1: Initialize tab hibernation manager
    setTimeout(() => {
      Promise.all([
        import('./services/tabHibernation/hibernationManager'),
        import('./state/tabsStore'),
      ])
        .then(([{ initializeHibernationManager, trackTabActivity }, { useTabsStore }]) => {
          const cleanup = initializeHibernationManager();
          console.log('[Startup] Tab hibernation manager initialized');

          // Track tab activity when tabs become active
          const tabsStore = useTabsStore.getState();
          const unsubscribe = tabsStore.subscribe(
            state => ({ activeId: state.activeId }),
            state => {
              if (state.activeId) {
                trackTabActivity(state.activeId);
              }
            }
          );

          // Cleanup on app shutdown (if needed)
          if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
              cleanup();
              unsubscribe();
            });
          }
        })
        .catch(error => {
          console.warn('[Startup] Tab hibernation manager initialization failed:', error);
        });
    }, 3000); // Wait 3s after first paint
  };

  // Wait for first paint, then defer services
  if (document.readyState === 'complete') {
    // Already loaded, defer immediately
    if (requestIdleCallback) {
      requestIdleCallback(deferNonCriticalServices);
    } else {
      setTimeout(deferNonCriticalServices, 100);
    }
  } else {
    // Wait for load event
    window.addEventListener(
      'load',
      () => {
        if (requestIdleCallback) {
          requestIdleCallback(deferNonCriticalServices);
        } else {
          setTimeout(deferNonCriticalServices, 100);
        }
      },
      { once: true }
    );
  }

  // Keep existing deferHeavyInit for backward compatibility
  deferHeavyInit();

  if (typeof performance !== 'undefined' && performance.now) {
    const bootMs = Math.round(performance.now());
    void ipc.telemetry?.trackPerf?.('renderer_boot_ms', bootMs);
  }

  if (!existingRoot) {
    (window as any)[rootKey] = root;
  }

  // Tier 2: Start session snapshotting - defer to avoid blocking
  setTimeout(() => {
    startSnapshotting();
  }, 1000);

  // Ensure root element is visible before rendering (redundant but safe)
  if (rootElement) {
    rootElement.style.display = 'block';
    rootElement.style.visibility = 'visible';
    rootElement.style.opacity = '1';
  }

  // DAY 1 FIX: Add comprehensive error handlers
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;
    console.error('[Main] Unhandled promise rejection:', error);

    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        (window as any).Sentry.captureException(error, {
          tags: { error_type: 'unhandled_rejection' },
        });
      } catch (sentryError) {
        console.warn('[Sentry] Failed to capture unhandled rejection:', sentryError);
      }

      // TELEMETRY FIX: Track unhandled rejection
      import('./services/telemetryMetrics')
        .then(({ telemetryMetrics }) => {
          telemetryMetrics.trackError(String(reason), { type: 'unhandled_rejection' });
        })
        .catch(() => {
          // Telemetry not available
        });
    }

    // Prevent default browser error handling
    event.preventDefault();

    // Log but don't crash
    if (isDevEnv()) {
      console.error('[Main] Promise rejection details:', {
        reason: event.reason,
        promise: event.promise,
      });
    }
  });

  // DAY 1 FIX: Add uncaught error handler with Sentry integration
  window.addEventListener('error', event => {
    const error = event.error || new Error(event.message);
    console.error('[Main] Uncaught error:', error);

    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      try {
        (window as any).Sentry.captureException(error, {
          tags: { error_type: 'uncaught_error' },
          contexts: {
            error: {
              message: event.message,
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno,
            },
          },
        });
      } catch (sentryError) {
        console.warn('[Sentry] Failed to capture uncaught error:', sentryError);
      }

      // TELEMETRY FIX: Track uncaught error
      import('./services/telemetryMetrics')
        .then(({ telemetryMetrics }) => {
          telemetryMetrics.trackError(error.message, {
            type: 'uncaught_error',
            stack: error.stack,
          });
        })
        .catch(() => {
          // Telemetry not available
        });
    }

    // Log but don't crash - let error boundary handle it
    if (isDevEnv()) {
      console.error('[Main] Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    }
  });

  if (isDevEnv()) {
    console.log('[Main] Rendering React app...');
  }

  // Enable HMR for React Fast Refresh
  if (import.meta.hot) {
    import.meta.hot.accept();
    import.meta.hot.on('vite:beforeUpdate', () => {
      if (import.meta.env.DEV) {
        console.log('[HMR] Update available, applying changes...');
      }
    });
    import.meta.hot.on('vite:afterUpdate', () => {
      if (import.meta.env.DEV) {
        console.log('[HMR] Update applied successfully');
      }
    });
  }

  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <GlobalErrorBoundary>
          <SettingsSync />
          <Suspense fallback={<LoadingFallback />}>
            <RouterProvider
              router={router}
              future={{
                v7_startTransition: true,
              }}
            />
            {/* DAY 9 FIX: Show onboarding tour for first-time users */}
            <QuickStartTour />
          </Suspense>
        </GlobalErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>
  );

  if (isDevEnv()) {
    console.log('%c✅ Regen mounted successfully', 'color:#60a5fa;font-weight:bold;');
  }
} catch (error) {
  console.error('❌ Failed to mount application:', error);

  // Fallback UI if React fails to mount
  if (rootElement) {
    // Get safe error text
    let safeErrorText = 'Unknown error';
    if (error instanceof Error) {
      safeErrorText = `${error.name}: ${error.message}${error.stack ? `\n\nStack:\n${error.stack}` : ''}`;
    } else if (typeof error === 'object' && error !== null) {
      // Try to serialize safely, avoiding circular references
      try {
        const seen = new WeakSet();
        safeErrorText = JSON.stringify(
          error,
          (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular]';
              }
              seen.add(value);
              // Skip React elements and DOM nodes
              if (
                (value as any).$$typeof ||
                (value as any).nodeType ||
                (value as any)._reactInternalFiber
              ) {
                return '[React/DOM Element]';
              }
            }
            return value;
          },
          2
        );
      } catch {
        safeErrorText = String(error);
      }
    } else {
      safeErrorText = String(error);
    }

    // Escape HTML
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    rootElement.innerHTML = `
      <div style="padding: 40px; color: white; background-color: #1A1D28; min-height: 100vh; font-family: system-ui, sans-serif;">
        <div style="max-width: 800px; margin: 0 auto;">
          <h1 style="color: #ef4444; font-size: 32px; margin-bottom: 16px;">❌ Failed to Load Application</h1>
          <p style="color: #94a3b8; margin-bottom: 24px; font-size: 16px;">
            The application failed to initialize. This is usually caused by a JavaScript error.
          </p>
          <div style="background-color: #0f172a; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #1e293b;">
            <pre style="color: #f1f5f9; white-space: pre-wrap; font-size: 14px; overflow: auto; max-height: 400px;">${escapeHtml(safeErrorText)}</pre>
          </div>
          <div style="display: flex; gap: 12px;">
            <button onclick="window.location.reload()" style="padding: 12px 24px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;">
              🔄 Reload Application
            </button>
            <button onclick="console.clear(); location.reload();" style="padding: 12px 24px; background-color: #475569; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
              Clear & Reload
            </button>
          </div>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #1e293b;">
            <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">Troubleshooting:</p>
            <ul style="color: #64748b; font-size: 14px; padding-left: 24px; line-height: 1.8;">
              <li>Open Developer Tools (F12) to see detailed error messages</li>
              <li>Check the Console tab for JavaScript errors</li>
              <li>Ensure all dependencies are installed: <code style="background: #0f172a; padding: 2px 6px; border-radius: 4px;">npm install</code></li>
              <li>Try clearing browser cache and reloading</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}
