// @ts-nocheck

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/globals.css';
import './lib/battery';
import { isDevEnv } from './lib/env';
import { setupClipperHandlers } from './lib/research/clipper-handler';
import { syncRendererTelemetry } from './lib/monitoring/sentry-client';
import { syncAnalyticsOptIn, trackPageView } from './lib/monitoring/analytics-client';

// Import test utility in dev mode
if (isDevEnv()) {
  import('./utils/testOmniDesk').catch(() => {
    // Silently fail if test file doesn't exist
  });
}

// Error boundary with better UX
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error; errorInfo?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          color: 'white', 
          backgroundColor: '#1A1D28', 
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ color: '#ef4444', fontSize: '32px', marginBottom: '16px' }}>
              ⚠️ Application Error
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '16px' }}>
              Something went wrong while loading the application. The error details are below.
            </p>
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid #1e293b'
            }}>
              <pre style={{ 
                color: '#f1f5f9', 
                whiteSpace: 'pre-wrap', 
                fontSize: '14px',
                overflow: 'auto',
                maxHeight: '400px'
              }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.error?.stack}
                {this.state.errorInfo && `\n\nComponent Stack:\n${this.state.errorInfo}`}
              </pre>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                🔄 Reload Application
              </button>
              <button 
                onClick={() => this.setState({ hasError: false, error: undefined })}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#475569', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load components to avoid loading everything at once
const AppShell = React.lazy(() => import('./components/layout/AppShell').then(m => ({ default: m.AppShell })));
const Home = React.lazy(() => import('./routes/Home'));
const Settings = React.lazy(() => import('./routes/Settings'));
const Workspace = React.lazy(() => import('./routes/Workspace'));
const AgentConsole = React.lazy(() => import('./routes/AgentConsole'));
const Runs = React.lazy(() => import('./routes/Runs'));
const Replay = React.lazy(() => import('./routes/Replay'));
const PlaybookForge = React.lazy(() => import('./routes/PlaybookForge'));
const HistoryPage = React.lazy(() => import('./routes/History'));
const DownloadsPage = React.lazy(() => import('./routes/Downloads'));
const WatchersPage = React.lazy(() => import('./routes/Watchers'));
const VideoPage = React.lazy(() => import('./routes/Video'));
const ConsentTimelinePage = React.lazy(() => import('./routes/ConsentTimeline'));

// Loading component
function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1A1D28',
      color: '#94a3b8',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
        <div style={{ fontSize: '16px' }}>Initializing...</div>
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
          ) 
        },
        { 
          path: 'settings', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Settings />
            </Suspense>
          ) 
        },
        { 
          path: 'w/:id', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Workspace />
            </Suspense>
          ) 
        },
        { 
          path: 'agent', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <AgentConsole />
            </Suspense>
          ) 
        },
        { 
          path: 'runs', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Runs />
            </Suspense>
          ) 
        },
        { 
          path: 'replay/:id', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <Replay />
            </Suspense>
          ) 
        },
        { 
          path: 'playbooks', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <PlaybookForge />
            </Suspense>
          ) 
        },
        { 
          path: 'history', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <HistoryPage />
            </Suspense>
          ) 
        },
        { 
          path: 'downloads', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <DownloadsPage />
            </Suspense>
          ) 
        },
        { 
          path: 'watchers', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <WatchersPage />
            </Suspense>
          ) 
        },
        { 
          path: 'video', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <VideoPage />
            </Suspense>
          ) 
        },
        { 
          path: 'consent-timeline', 
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <ConsentTimelinePage />
            </Suspense>
          ) 
        },
      ]
    }
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

try {
  if (isDevEnv()) {
    console.log('%c🚀 Mounting OmniBrowser...', 'color:#34d399;font-weight:bold;');
  }

  const rootKey = '__OMNIBROWSER_REACT_ROOT__';
  const existingRoot = (window as any)[rootKey];
  const root = existingRoot || ReactDOM.createRoot(rootElement);
  
  // Setup research clipper handlers
  setupClipperHandlers();

syncRendererTelemetry().catch((error) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Monitoring] Failed to initialize renderer telemetry', error);
  }
});

syncAnalyticsOptIn()
  .then(() => {
    trackPageView(window.location.pathname);
  })
  .catch((error) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Monitoring] Failed to initialize analytics', error);
    }
  });

  if (!existingRoot) {
    (window as any)[rootKey] = root;
  }

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <RouterProvider
            router={router}
            future={{
              v7_startTransition: true,
            }}
          />
        </Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );
  
  if (isDevEnv()) {
    console.log('%c✅ OmniBrowser mounted successfully', 'color:#60a5fa;font-weight:bold;');
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
