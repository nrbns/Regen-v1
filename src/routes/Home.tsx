import { useEffect, useState, Suspense, lazy } from 'react';
import { useAppStore } from '../state/appStore';
import { ipc } from '../lib/ipc-typed';
import { OmniDesk } from '../components/OmniDesk';
import { ResearchPane } from '../components/research/ResearchPane';
import { ErrorBoundary } from '../core/errors/ErrorBoundary';
import { WeatherCard } from '../components/WeatherCard';
import { FlightCard } from '../components/FlightCard';
import { ModeSwitchLoader } from '../components/common/ModeSwitchLoader';

// REDIX MODE: Conditionally load modes based on Redix mode
import { getRedixConfig } from '../lib/redix-mode';

// Tier 3: Load all enabled modes with error handling
// REDIX MODE: Lazy load modes (already lazy, but ensure Redix-compatible)
const ResearchPanel = lazy(() => import('../modes/research'));
const TradePanel = lazy(() => import('../modes/trade'));
const DocumentMode = lazy(() =>
  import('../modes/docs/DocumentMode').then(m => ({ default: m.DocumentMode }))
);
// REDIX MODE: Only load ThreatsPanel if not in strict Redix mode
const ThreatsPanel = lazy(() => {
  const config = getRedixConfig();
  if (config.enabled && !config.enableHeavyLibs) {
    // Return minimal stub in Redix mode
    return Promise.resolve({
      default: () => (
        <div className="flex h-full items-center justify-center text-gray-400">
          <p>Threats mode disabled in Redix mode</p>
        </div>
      ),
    });
  }
  return import('../modes/threats');
});

// LAG FIX #3: Enhanced loading fallback with skeleton loader
const ModeLoadingFallback = () => <ModeSwitchLoader />;

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
    const unsubscribe = ipc.events.on('app:fullscreen-changed', handleFullscreen);

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
      className={`flex h-full w-full flex-col overflow-hidden bg-[#1A1D28] ${isFullscreen ? 'absolute inset-0' : ''}`}
    >
      {mode === 'Browse' || !mode ? (
        <div className="relative min-h-0 w-full flex-1 overflow-hidden">
          {/* Browser content is handled by AppShell via TabContentSurface */}
          {/* Show OmniDesk when no tabs or active tab is about:blank (search page) */}
          {/* OmniDesk will handle its own visibility logic */}
          {/* z-20 is below TabStrip (z-50) to ensure tabs are always clickable */}
          <div className="pointer-events-none absolute inset-0 z-20">
            <div className="pointer-events-auto h-full w-full overflow-hidden">
              <OmniDesk variant="overlay" />
            </div>
          </div>
        </div>
      ) : mode === 'Research' ? (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          {/* Research Panel - Full height, no browser view, no tabs, pure AI interface */}
          <ErrorBoundary componentName="ResearchPanel" retryable={true}>
            <Suspense fallback={<ModeLoadingFallback />}>
              <ResearchPanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : mode === 'Trade' ? (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <ErrorBoundary componentName="TradePanel" retryable={true}>
            <Suspense fallback={<ModeLoadingFallback />}>
              <TradePanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : mode === 'Docs' ? (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <ErrorBoundary componentName="DocumentMode" retryable={true}>
            <Suspense fallback={<ModeLoadingFallback />}>
              <DocumentMode />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : mode === 'Threats' ? (
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          <ErrorBoundary componentName="ThreatsPanel" retryable={true}>
            <Suspense fallback={<ModeLoadingFallback />}>
              <ThreatsPanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      ) : (
        // Show "Coming Soon" placeholder for disabled modes
        <div className="flex w-full flex-1 items-center justify-center bg-[#1A1D28]">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-semibold text-gray-300">{mode} Mode</h2>
            <p className="text-gray-500">Coming Soon</p>
            <p className="max-w-md text-sm text-gray-600">
              This mode is under development. Switch to Research mode to get started with AI-powered
              browsing.
            </p>
          </div>
        </div>
      )}

      {/* Research Pane - Available in all modes except Research (which has its own panel) */}
      {!isFullscreen && mode !== 'Research' && <ResearchPane />}

      {/* Weather Card - Shows when weather command is executed */}
      <WeatherCard />

      {/* Flight Card - Shows when flight booking is initiated */}
      <FlightCard />
    </div>
  );
}

// Enable HMR for this component (must be after export)
if (import.meta.hot) {
  import.meta.hot.accept();
}
