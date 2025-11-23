import { useEffect, useState, Suspense, lazy } from 'react';
import { useAppStore } from '../state/appStore';
import { ipcEvents } from '../lib/ipc-events';
import { ResearchSplit } from '../components/Panels/ResearchSplit';
import { OmniDesk } from '../components/OmniDesk';
import { ResearchPane } from '../components/research/ResearchPane';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../core/errors/ErrorBoundary';

// Tier 3: Load all enabled modes with error handling
const ResearchPanel = lazy(() => import('../modes/research'));
const TradePanel = lazy(() => import('../modes/trade'));
const DocumentMode = lazy(() =>
  import('../modes/docs/DocumentMode').then(m => ({ default: m.DocumentMode }))
);
const ThreatsPanel = lazy(() => import('../modes/threats'));

// Enhanced loading fallback with skeleton loader
const ModeLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center h-full w-full p-8">
    <div className="flex items-center gap-3 mb-4">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
      <span className="text-sm text-gray-400">Loading mode...</span>
    </div>
    {/* Skeleton loader */}
    <div className="w-full max-w-2xl space-y-4 animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-3/4"></div>
      <div className="h-4 bg-gray-800 rounded w-1/2"></div>
      <div className="h-32 bg-gray-800 rounded"></div>
      <div className="h-4 bg-gray-800 rounded w-5/6"></div>
    </div>
  </div>
);

export default function Home() {
  const mode = useAppStore(s => s.mode);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize fullscreen state on mount - ensure it starts as false
  useEffect(() => {
    // Force initial state to false (window should not start in fullscreen)
    setIsFullscreen(false);

    // Check initial fullscreen state after a brief delay
    const checkFullscreen = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (window as any).webkitFullscreenElement ||
        (window as any).mozFullScreenElement
      );
      if (isCurrentlyFullscreen !== isFullscreen) {
        setIsFullscreen(isCurrentlyFullscreen);
      }
    };

    // Check after a brief delay to ensure window is ready
    const timeoutId = setTimeout(checkFullscreen, 100);

    // Listen for fullscreen changes from Electron
    const handleFullscreen = (data: { fullscreen: boolean }) => {
      setIsFullscreen(data.fullscreen);
    };

    // Use the IPC event bus
    const unsubscribe = ipcEvents.on<{ fullscreen: boolean }>(
      'app:fullscreen-changed',
      handleFullscreen
    );

    // Also listen for browser fullscreen changes
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
    };
  }, []);

  return (
    <div
      className={`h-full w-full bg-[#1A1D28] flex flex-col overflow-hidden ${isFullscreen ? 'absolute inset-0' : ''}`}
    >
      {mode === 'Browse' || !mode ? (
        <div className="flex-1 w-full relative min-h-0 overflow-hidden">
          {/* Browser content is handled by AppShell via TabContentSurface */}
          {/* Show OmniDesk when no tabs or active tab is about:blank (search page) */}
          {/* OmniDesk will handle its own visibility logic */}
          {/* z-20 is below TabStrip (z-50) to ensure tabs are always clickable */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            <div className="pointer-events-auto h-full w-full overflow-hidden">
              <OmniDesk variant="overlay" />
            </div>
          </div>
        </div>
      ) : mode === 'Research' ? (
        <div className="flex-1 w-full relative flex flex-col min-h-0 overflow-hidden">
          {/* Top: Research Panel (full width) */}
          {!isFullscreen && (
            <div className="h-96 border-b border-gray-700/30 flex-shrink-0 overflow-hidden">
              <ErrorBoundary componentName="ResearchPanel" retryable={true}>
                <Suspense fallback={<ModeLoadingFallback />}>
                  <ResearchPanel />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}
          {/* Bottom: Browser view with ResearchSplit overlay */}
          {/* Browser content is handled by AppShell via TabContentSurface */}
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {/* Show ResearchSplit overlay when not fullscreen */}
            {!isFullscreen && (
              <div className="absolute inset-0 pointer-events-none z-30">
                <div className="pointer-events-auto h-full w-full overflow-hidden">
                  <ResearchSplit />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : mode === 'Trade' ? (
        <div className="flex-1 w-full relative flex flex-col min-h-0 overflow-hidden">
          <ErrorBoundary componentName="TradePanel" retryable={true}>
            <Suspense fallback={<ModeLoadingFallback />}>
              <TradePanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : mode === 'Docs' ? (
        <div className="flex-1 w-full relative flex flex-col min-h-0 overflow-hidden">
          <ErrorBoundary componentName="DocumentMode" retryable={true}>
            <Suspense fallback={<ModeLoadingFallback />}>
              <DocumentMode />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : mode === 'Threats' ? (
        <div className="flex-1 w-full relative flex flex-col min-h-0 overflow-hidden">
          <ErrorBoundary componentName="ThreatsPanel" retryable={true}>
            <Suspense fallback={<ModeLoadingFallback />}>
              <ThreatsPanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : (
        // Show "Coming Soon" placeholder for disabled modes
        <div className="flex-1 w-full flex items-center justify-center bg-[#1A1D28]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-gray-300">{mode} Mode</h2>
            <p className="text-gray-500">Coming Soon</p>
            <p className="text-sm text-gray-600 max-w-md">
              This mode is under development. Switch to Research mode to get started with AI-powered
              browsing.
            </p>
          </div>
        </div>
      )}

      {/* Research Pane - Available in all modes except Research (which has its own panel) */}
      {!isFullscreen && mode !== 'Research' && <ResearchPane />}
    </div>
  );
}
