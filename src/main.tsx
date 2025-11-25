// @ts-nocheck

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/globals.css';
import './styles/mode-themes.css';
import './lib/battery';
import { isDevEnv } from './lib/env';
import { setupClipperHandlers } from './lib/research/clipper-handler';
import { syncRendererTelemetry } from './lib/monitoring/sentry-client';
import { syncAnalyticsOptIn, trackPageView } from './lib/monitoring/analytics-client';
import { ipc } from './lib/ipc-typed';
import { ThemeProvider } from './ui/theme';
import { CSP_DIRECTIVE } from './config/security';

// Import test utility in dev mode
if (isDevEnv()) {
  import('./utils/testOmniDesk').catch(() => {
    // Silently fail if test file doesn't exist
  });
}

// Tier 2: Enhanced Error Boundary
import { GlobalErrorBoundary } from './core/errors/ErrorBoundary';
import { startSnapshotting } from './core/recovery';

// Tier 3: Initialize services
import { crashReporter } from './core/crash-reporting';
import { authService } from './services/auth';
import { syncService } from './services/sync';
import { pluginRegistry } from './core/plugins/registry';

// Lazy load components to avoid loading everything at once
// Add error handling to prevent blank pages on import failures
const lazyWithErrorHandling = (importFn: () => Promise<any>, componentName: string) => {
  return React.lazy(() =>
    importFn().catch(error => {
      console.error(`Failed to load ${componentName}:`, error);
      // Return a fallback component that shows an error
      return {
        default: () => (
          <div className="flex items-center justify-center h-full w-full p-4">
            <div className="text-center">
              <div className="text-red-400 text-lg font-semibold mb-2">
                Failed to load {componentName}
              </div>
              <div className="text-gray-400 text-sm">{String(error)}</div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
const Runs = lazyWithErrorHandling(() => import('./routes/Runs'), 'Runs');
const Replay = lazyWithErrorHandling(() => import('./routes/Replay'), 'Replay');
const PlaybookForge = lazyWithErrorHandling(
  () => import('./routes/PlaybookForge'),
  'PlaybookForge'
);
const HistoryPage = lazyWithErrorHandling(() => import('./routes/History'), 'HistoryPage');
const DownloadsPage = lazyWithErrorHandling(() => import('./routes/Downloads'), 'DownloadsPage');
const WatchersPage = lazyWithErrorHandling(() => import('./routes/Watchers'), 'WatchersPage');
const VideoPage = lazyWithErrorHandling(() => import('./routes/Video'), 'VideoPage');
const ConsentTimelinePage = lazyWithErrorHandling(
  () => import('./routes/ConsentTimeline'),
  'ConsentTimelinePage'
);

const ensureCSPMeta = () => {
  if (typeof document === 'undefined') return;
  const existing = document.querySelector(
    'meta[http-equiv="Content-Security-Policy"]'
  ) as HTMLMetaElement | null;
  if (existing) {
    if (!existing.content || existing.content.trim() !== CSP_DIRECTIVE) {
      existing.content = CSP_DIRECTIVE;
    }
    return;
  }
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = CSP_DIRECTIVE;
  document.head.prepend(meta);
};

ensureCSPMeta();

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
          path: 'downloads',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <DownloadsPage />
            </Suspense>
          ),
        },
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

  // Setup research clipper handlers
  setupClipperHandlers();

  // Tier 2: Track app open
  import('./services/analytics').then(({ track }) => {
    track('app_open');
  });

  // Tier 3: Initialize services - DEFER EVERYTHING to avoid blocking render
  // Initialize crash reporter immediately (lightweight)
  crashReporter.initialize();

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
    try {
      // Initialize auth service (can be slow) - defer even more
      setTimeout(async () => {
        try {
          await authService.initialize();
          if (authService.getState().isAuthenticated) {
            // Defer sync service start even further
            setTimeout(() => {
              syncService.startAutoSync().catch(err => {
                if (isDevEnv()) {
                  console.warn('[Main] Sync service failed to start:', err);
                }
              });
            }, 1000);
          }
        } catch (error) {
          if (isDevEnv()) {
            console.warn('[Main] Failed to initialize auth service:', error);
          }
        }
      }, 1000);
    } catch (error) {
      if (isDevEnv()) {
        console.warn('[Main] Failed to initialize auth service:', error);
      }
    }

    try {
      // Restore plugin state (can be slow) - defer significantly
      setTimeout(() => {
        pluginRegistry.restorePluginState().catch(error => {
          if (isDevEnv()) {
            console.warn('[Main] Failed to restore plugin state:', error);
          }
        });
      }, 2000);
    } catch (error) {
      if (isDevEnv()) {
        console.warn('[Main] Failed to restore plugin state:', error);
      }
    }
  };

  deferHeavyInit();

  // Defer telemetry and analytics initialization - wait longer for better performance
  setTimeout(() => {
    syncRendererTelemetry().catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Monitoring] Failed to initialize renderer telemetry', error);
      }
    });

    syncAnalyticsOptIn()
      .then(() => {
        trackPageView(window.location.pathname);
      })
      .catch(error => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Monitoring] Failed to initialize analytics', error);
        }
      });
  }, 2000); // Increased delay for better performance

  if (typeof performance !== 'undefined' && performance.now) {
    const bootMs = Math.round(performance.now());
    void ipc.telemetry.trackPerf('renderer_boot_ms', bootMs);
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

  // Add unhandled rejection handler to prevent crashes
  window.addEventListener('unhandledrejection', event => {
    console.error('[Main] Unhandled promise rejection:', event.reason);
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

  // Add uncaught error handler
  window.addEventListener('error', event => {
    console.error('[Main] Uncaught error:', event.error);
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

  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <GlobalErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <RouterProvider
              router={router}
              future={{
                v7_startTransition: true,
              }}
            />
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
    rootElement.innerHTML = `
      <div style="padding: 40px; color: white; background-color: #1A1D28; min-height: 100vh; font-family: system-ui, sans-serif;">
        <div style="max-width: 800px; margin: 0 auto;">
          <h1 style="color: #ef4444; font-size: 32px; margin-bottom: 16px;">❌ Failed to Load Application</h1>
          <p style="color: #94a3b8; margin-bottom: 24px; font-size: 16px;">
            The application failed to initialize. This is usually caused by a JavaScript error.
          </p>
          <div style="background-color: #0f172a; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #1e293b;">
            <pre style="color: #f1f5f9; white-space: pre-wrap; font-size: 14px; overflow: auto; max-height: 400px;">${String(error)}</pre>
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
