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
import { QuickTour } from './components/Onboarding/QuickTour';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { AgentOverlay } from './components/AgentOverlay';

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
const lazyWithErrorHandling = (importFn: () => Promise<any>, componentName: string) => {
  return React.lazy(() =>
    importFn().catch(error => {
      console.error(`Failed to load ${componentName}:`, error);
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
const SkillStorePage = lazyWithErrorHandling(
  () => import('./components/skills/SkillStore').then(m => ({ default: m.SkillStore })),
  'SkillStore'
);
const BountyPage = lazyWithErrorHandling(
  () => import('./components/bounty/BountySubmission').then(m => ({ default: m.BountySubmission })),
  'BountySubmission'
);
const ResumeFixerPage = lazyWithErrorHandling(
  () => import('./components/resume/ResumeFixer').then(m => ({ default: m.ResumeFixer })),
  'ResumeFixer'
);
const ClipRecorderPage = lazyWithErrorHandling(
  () => import('./components/recorder/ClipRecorder').then(m => ({ default: m.ClipRecorder })),
  'ClipRecorder'
);

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
        pointerEvents: 'auto',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
        <div style={{ fontSize: '16px' }}>Initializing...</div>
      </div>
    </div>
  );
}

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
        {
          path: 'skills',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <SkillStorePage />
            </Suspense>
          ),
        },
        {
          path: 'bounty',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <BountyPage />
            </Suspense>
          ),
        },
        {
          path: 'resume',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <ResumeFixerPage />
            </Suspense>
          ),
        },
        {
          path: 'recorder',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <ClipRecorderPage />
            </Suspense>
          ),
        },
      ],
    },
  ],
  { future: { v7_startTransition: true } }
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  const root = ReactDOM.createRoot(rootElement);
  setupClipperHandlers();

  crashReporter.initialize();

  const initializeHeavyServices = async () => {
    try {
      await authService.initialize();
      if (authService.getState().isAuthenticated) {
        setTimeout(() => {
          syncService.startAutoSync().catch(() => {});
        }, 500);
      }
    } catch (error) {
      if (isDevEnv()) {
        console.warn('[Main] Failed to initialize auth service:', error);
      }
    }
    try {
      pluginRegistry.restorePluginState();
    } catch (error) {
      if (isDevEnv()) {
        console.warn('[Main] Failed to restore plugin state:', error);
      }
    }
  };

  setTimeout(initializeHeavyServices, 100);

  setTimeout(() => {
    syncRendererTelemetry().catch(() => {});
    syncAnalyticsOptIn()
      .then(() => trackPageView(window.location.pathname))
      .catch(() => {});
  }, 500);

  if (typeof performance !== 'undefined' && performance.now) {
    const bootMs = Math.round(performance.now());
    void ipc.telemetry.trackPerf('renderer_boot_ms', bootMs);
  }

  startSnapshotting();

  window.addEventListener('unhandledrejection', event => {
    console.error('[Main] Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });

  window.addEventListener('error', event => {
    console.error('[Main] Uncaught error:', event.error);
  });

  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <GlobalErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </Suspense>
        </GlobalErrorBoundary>
        <AgentOverlay />
        <QuickTour />
        <PerformanceMonitor />
      </ThemeProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error('❌ Failed to mount application:', error);
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; color: white; background-color: #1A1D28; min-height: 100vh; font-family: system-ui, sans-serif;">
        <h1 style="color: #ef4444;">❌ Failed to Load Application</h1>
        <p style="color: #94a3b8; margin-top: 16px;">${String(error)}</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 16px;">
          🔄 Reload Application
        </button>
      </div>
    `;
  }
}
