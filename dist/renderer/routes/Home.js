import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, Suspense, lazy } from 'react';
import { useAppStore } from '../state/appStore';
import { ipc } from '../lib/ipc-typed';
import { OmniDesk } from '../components/OmniDesk';
import { ResearchPane } from '../components/research/ResearchPane';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../core/errors/ErrorBoundary';
import { WeatherCard } from '../components/WeatherCard';
import { FlightCard } from '../components/FlightCard';
// REDIX MODE: Conditionally load modes based on Redix mode
import { getRedixConfig } from '../lib/redix-mode';
// Tier 3: Load all enabled modes with error handling
// REDIX MODE: Lazy load modes (already lazy, but ensure Redix-compatible)
const ResearchPanel = lazy(() => import('../modes/research'));
const TradePanel = lazy(() => import('../modes/trade'));
const DocumentMode = lazy(() => import('../modes/docs/DocumentMode').then(m => ({ default: m.DocumentMode })));
// REDIX MODE: Only load ThreatsPanel if not in strict Redix mode
const ThreatsPanel = lazy(() => {
    const config = getRedixConfig();
    if (config.enabled && !config.enableHeavyLibs) {
        // Return minimal stub in Redix mode
        return Promise.resolve({
            default: () => (_jsx("div", { className: "flex items-center justify-center h-full text-gray-400", children: _jsx("p", { children: "Threats mode disabled in Redix mode" }) })),
        });
    }
    return import('../modes/threats');
});
// Enhanced loading fallback with skeleton loader
const ModeLoadingFallback = () => (_jsxs("div", { className: "flex flex-col items-center justify-center h-full w-full p-8", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx(Loader2, { className: "w-5 h-5 animate-spin text-emerald-400" }), _jsx("span", { className: "text-sm text-gray-400", children: "Loading mode..." })] }), _jsxs("div", { className: "w-full max-w-2xl space-y-4 animate-pulse", children: [_jsx("div", { className: "h-4 bg-gray-800 rounded w-3/4" }), _jsx("div", { className: "h-4 bg-gray-800 rounded w-1/2" }), _jsx("div", { className: "h-32 bg-gray-800 rounded" }), _jsx("div", { className: "h-4 bg-gray-800 rounded w-5/6" })] })] }));
export default function Home() {
    const mode = useAppStore(s => s.mode);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Initialize fullscreen state on mount - ensure it starts as false
    useEffect(() => {
        // Force initial state to false (window should not start in fullscreen)
        setIsFullscreen(false);
        // Check initial fullscreen state after a brief delay
        const checkFullscreen = () => {
            const isCurrentlyFullscreen = !!(document.fullscreenElement ||
                window.webkitFullscreenElement ||
                window.mozFullScreenElement);
            if (isCurrentlyFullscreen !== isFullscreen) {
                setIsFullscreen(isCurrentlyFullscreen);
            }
        };
        // Check after a brief delay to ensure window is ready
        const timeoutId = setTimeout(checkFullscreen, 100);
        // Listen for fullscreen changes from Electron
        const handleFullscreen = (data) => {
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
    return (_jsxs("div", { className: `h-full w-full bg-[#1A1D28] flex flex-col overflow-hidden ${isFullscreen ? 'absolute inset-0' : ''}`, children: [mode === 'Browse' || !mode ? (_jsx("div", { className: "flex-1 w-full relative min-h-0 overflow-hidden", children: _jsx("div", { className: "absolute inset-0 z-20 pointer-events-none", children: _jsx("div", { className: "pointer-events-auto h-full w-full overflow-hidden", children: _jsx(OmniDesk, { variant: "overlay" }) }) }) })) : mode === 'Research' ? (_jsx("div", { className: "flex-1 w-full relative flex flex-col min-h-0 overflow-hidden", children: _jsx(ErrorBoundary, { componentName: "ResearchPanel", retryable: true, children: _jsx(Suspense, { fallback: _jsx(ModeLoadingFallback, {}), children: _jsx(ResearchPanel, {}) }) }) })) : mode === 'Trade' ? (_jsx("div", { className: "flex-1 w-full relative flex flex-col min-h-0 overflow-hidden", children: _jsx(ErrorBoundary, { componentName: "TradePanel", retryable: true, children: _jsx(Suspense, { fallback: _jsx(ModeLoadingFallback, {}), children: _jsx(TradePanel, {}) }) }) })) : mode === 'Docs' ? (_jsx("div", { className: "flex-1 w-full relative flex flex-col min-h-0 overflow-hidden", children: _jsx(ErrorBoundary, { componentName: "DocumentMode", retryable: true, children: _jsx(Suspense, { fallback: _jsx(ModeLoadingFallback, {}), children: _jsx(DocumentMode, {}) }) }) })) : mode === 'Threats' ? (_jsx("div", { className: "flex-1 w-full relative flex flex-col min-h-0 overflow-hidden", children: _jsx(ErrorBoundary, { componentName: "ThreatsPanel", retryable: true, children: _jsx(Suspense, { fallback: _jsx(ModeLoadingFallback, {}), children: _jsx(ThreatsPanel, {}) }) }) })) : (
            // Show "Coming Soon" placeholder for disabled modes
            _jsx("div", { className: "flex-1 w-full flex items-center justify-center bg-[#1A1D28]", children: _jsxs("div", { className: "text-center space-y-4", children: [_jsxs("h2", { className: "text-2xl font-semibold text-gray-300", children: [mode, " Mode"] }), _jsx("p", { className: "text-gray-500", children: "Coming Soon" }), _jsx("p", { className: "text-sm text-gray-600 max-w-md", children: "This mode is under development. Switch to Research mode to get started with AI-powered browsing." })] }) })), !isFullscreen && mode !== 'Research' && _jsx(ResearchPane, {}), _jsx(WeatherCard, {}), _jsx(FlightCard, {})] }));
}
// Enable HMR for this component (must be after export)
if (import.meta.hot) {
    import.meta.hot.accept();
}
