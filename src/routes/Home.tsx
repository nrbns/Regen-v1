import { useEffect, useState, Suspense, lazy } from 'react';
import { useAppStore } from '../state/appStore';
import { ipcEvents } from '../lib/ipc-events';
import { ResearchSplit } from '../components/Panels/ResearchSplit';
import { OmniDesk } from '../components/OmniDesk';
import { ResearchPane } from '../components/research/ResearchPane';
import { Loader2 } from 'lucide-react';

// Tier 3: Load all enabled modes
const ResearchPanel = lazy(() => import('../modes/research'));
const TradePanel = lazy(() => import('../modes/trade'));
const DocumentMode = lazy(() =>
  import('../modes/docs/DocumentMode').then(m => ({ default: m.DocumentMode }))
);
const ThreatsPanel = lazy(() => import('../modes/threats'));

// Loading fallback component
const ModeLoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="flex items-center gap-2 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Loading mode...</span>
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
              <Suspense fallback={<ModeLoadingFallback />}>
                <ResearchPanel />
              </Suspense>
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
          <Suspense fallback={<ModeLoadingFallback />}>
            <TradePanel />
          </Suspense>
        </div>
      ) : mode === 'Docs' ? (
        <div className="flex-1 w-full relative flex flex-col min-h-0 overflow-hidden">
          <Suspense fallback={<ModeLoadingFallback />}>
            <DocumentMode />
          </Suspense>
        </div>
      ) : mode === 'Threats' ? (
        <div className="flex-1 w-full relative flex flex-col min-h-0 overflow-hidden">
          <Suspense fallback={<ModeLoadingFallback />}>
            <ThreatsPanel />
          </Suspense>
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
