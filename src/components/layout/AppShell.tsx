/**
 * AppShell - Main layout container with all components wired
 */

import React, { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import { AlertTriangle, PanelsTopLeft, PanelRightOpen } from 'lucide-react';
// RotateCcw, Loader2, X - unused (restore banner removed)
import { Outlet } from 'react-router-dom';
import { PermissionRequest, ConsentRequest, ipcEvents } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { useTabsStore, type Tab } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { ResearchHighlight } from '../../types/research';
import { Portal } from '../common/Portal';
import { VoiceControl } from '../VoiceControl';
import { formatDistanceToNow } from 'date-fns';
import { useTabGraphStore } from '../../state/tabGraphStore';
import { isDevEnv, isElectronRuntime, isTauriRuntime } from '../../lib/env';
import { TabContentSurface } from './TabContentSurface';
import { TabIframeManager } from './TabIframeManager';
import { GlobalSearch } from '../search/GlobalSearch';
import { setupIframeBlockedListener } from '../../utils/iframeBlockedFallback';
// Voice components removed by user request
// Lazy load heavy Redix services - DEFER until after first render
const initializeOptimizer = () =>
  new Promise(resolve =>
    setTimeout(
      () => import('../../core/redix/optimizer').then(m => m.initializeOptimizer()).then(resolve),
      2000
    )
  );
const startTabSuspensionService = () =>
  new Promise(resolve =>
    setTimeout(
      () =>
        import('../../core/redix/tab-suspension')
          .then(m => m.startTabSuspensionService())
          .then(resolve),
      2000
    )
  );
const initBatteryManager = () =>
  new Promise(resolve =>
    setTimeout(
      () =>
        import('../../core/redix/battery-manager').then(m => m.initBatteryManager()).then(resolve),
      2000
    )
  );
const initMemoryManager = () =>
  new Promise(resolve =>
    setTimeout(
      () =>
        import('../../core/redix/memory-manager').then(m => m.initMemoryManager()).then(resolve),
      2000
    )
  );
const initPowerModes = () =>
  new Promise(resolve =>
    setTimeout(
      () => import('../../core/redix/power-modes').then(m => m.initPowerModes()).then(resolve),
      2000
    )
  );
// const AgentSummarizeHandlerLazy = React.lazy(() =>
//   import('./AgentSummarizeHandler').then(m => ({ default: m.AgentSummarizeHandler }))
// ); // Reserved for future use
const AgentActionHandlersLazy = React.lazy(() =>
  import('./AgentActionHandlers').then(m => ({ default: m.AgentActionHandlers }))
);
import { useRedix } from '../../core/redix/useRedix';
import { getRedixConfig } from '../../lib/redix-mode';
import { useRedixTabEviction } from '../../hooks/useRedixTabEviction';
import { RedixModeToggle } from '../redix/RedixModeToggle';
import { useI18nSync } from '../../hooks/useI18nSync';
import { initializeRedixMode } from '../../lib/redix-mode/integration';
const updatePolicyMetrics = () =>
  import('../../core/redix/policies').then(m => m.updatePolicyMetrics);
const getPolicyRecommendations = () =>
  import('../../core/redix/policies').then(m => m.getPolicyRecommendations);
import { CrashRecoveryDialog, useCrashRecovery } from '../CrashRecoveryDialog';
import { ResearchMemoryPanel } from '../research/ResearchMemoryPanel';
import { trackVisit } from '../../core/supermemory/tracker';
// Lazy load heavy summarization service - DEFER significantly
const initNightlySummarization = () =>
  new Promise(resolve =>
    setTimeout(
      () =>
        import('../../core/supermemory/summarizer')
          .then(m => m.initNightlySummarization())
          .then(resolve),
      3000
    )
  );
// RedixDebugPanel - lazy loaded, dev only
const RedixDebugPanel = isDevEnv()
  ? React.lazy(() => import('../redix/RedixDebugPanel').then(m => ({ default: m.RedixDebugPanel })))
  : null;
import { SuspensionIndicator } from '../redix/SuspensionIndicator';
import { BatteryIndicator } from '../redix/BatteryIndicator';
import { MemoryMonitor } from '../redix/MemoryMonitor';
import { MiniHoverAI } from '../interaction/MiniHoverAI';
import { WisprOrb } from '../WisprOrb';
import { UnifiedSidePanel } from '../side-panel/UnifiedSidePanel';
import { CommandBar } from '../command-bar/CommandBar';
import { OmniModeSwitcher } from '../omni-mode/OmniModeSwitcher';
import { CommandPalette as QuickCommandPalette } from '../CommandPalette';
// import { WorkspaceTabs } from '../tabs/WorkspaceTabs'; // Reserved for future use
import { SessionRestorePrompt } from '../SessionRestorePrompt';
const SessionRestoreModal = React.lazy(() => import('../SessionRestoreModal'));
import { autoTogglePrivacy } from '../../core/privacy/auto-toggle';
import { useAppStore } from '../../state/appStore';
import { useSessionStore } from '../../state/sessionStore';
import { useHistoryStore } from '../../state/historyStore';
import { initLayoutSync } from '../../utils/layoutSync';
import { useSettingsStore } from '../../state/settingsStore';
// import { ModeManager } from '../../core/modes/manager'; // Unused for now
import { useTradeStore } from '../../state/tradeStore';
import { TradeSidebar } from '../trade/TradeSidebar';
import { TermsAcceptance } from '../Onboarding/TermsAcceptance';
import {
  CookieConsent,
  useCookieConsent,
  type CookiePreferences,
} from '../Onboarding/CookieConsent';
import { useResearchHotkeys } from '../../hooks/useResearchHotkeys';
import { ToastHost } from '../common/ToastHost';
import { reopenMostRecentClosedTab } from '../../lib/tabLifecycle';
import { toast } from '../../utils/toast';
import { startSnapshotting } from '../../core/recovery';
import { initTradeAlertsCron } from '../../services/tradeAlertsCron';
// Tab resurrection functions - imported for future use
// import {
//   startAutoSaveTabs,
//   checkForResurrectableTabs,
//   scheduleAutoResurrection,
// } from '../../core/tabs/resurrection';
import { initExtensionsAPI, setupPreloadHook } from '../../core/extensions/api';
import { useAppError } from '../../hooks/useAppError';
import { LoopResumeModal } from '../agents/LoopResumeModal';
import { checkForCrashedLoops } from '../../core/agents/loopResume';
import { WorkflowMarketplace } from '../workflows/WorkflowMarketplace';
import { MobileDock } from './MobileDock';
import { InstallProgressModal } from '../installer/InstallProgressModal';
import { ConnectionStatus } from '../common/ConnectionStatus';

declare global {
  interface Window {
    __OMNIX_TOPBAR_HEIGHT?: number;
    __omnix_apply_topbar?: () => void;
  }
}

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
  copyStatus: 'success' | 'error' | null;
  copyMessage?: string;
  copying: boolean;
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode; componentName?: string },
  ErrorBoundaryState
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    componentName?: string;
  }) {
    super(props);
    this.state = { hasError: false, copyStatus: null, copying: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `ErrorBoundary caught error${this.props.componentName ? ` in ${this.props.componentName}` : ''}:`,
      error,
      errorInfo
    );
    this.setState({ error, errorInfo: errorInfo.componentStack ?? undefined });

    // Optional: Send to error tracking service (e.g., Sentry)
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleOpenLogs = async () => {
    try {
      const result = await ipc.diagnostics.openLogs();
      this.setState({
        copyStatus: result?.success ? 'success' : 'error',
        copyMessage: result?.success ? 'Logs folder opened.' : 'Unable to open logs folder.',
        copying: false,
      });
    } catch (error) {
      console.error('Failed to open logs folder from error boundary:', error);
      this.setState({
        copyStatus: 'error',
        copyMessage: 'Failed to open logs folder.',
        copying: false,
      });
    }
  };

  private handleCopyDiagnostics = async () => {
    if (this.state.copying) return;
    this.setState({ copying: true, copyStatus: null, copyMessage: undefined });
    try {
      const result = await ipc.diagnostics.copyDiagnostics();
      if (result?.diagnostics && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.diagnostics);
        this.setState({
          copyStatus: 'success',
          copyMessage: 'Diagnostics copied to clipboard.',
          copying: false,
        });
      } else {
        this.setState({
          copyStatus: 'error',
          copyMessage: 'Clipboard unavailable. Diagnostics logged to console.',
          copying: false,
        });
        // Diagnostics summary available
      }
    } catch (error) {
      console.error('Failed to copy diagnostics from error boundary:', error);
      this.setState({
        copyStatus: 'error',
        copyMessage: 'Failed to copy diagnostics.',
        copying: false,
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6 py-12 text-gray-100">
          <div className="w-full max-w-xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-500/20 p-2 text-red-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-red-200">
                  Something went wrong
                  {this.props.componentName ? ` inside ${this.props.componentName}` : ''}.
                </h1>
                {this.state.error?.message && (
                  <p className="mt-2 text-sm text-red-100/80">{this.state.error.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-400">
                  Try reloading the interface. You can also copy diagnostics or inspect the latest
                  logs to share with the team.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReload}
                className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 transition-colors hover:border-blue-500/70"
              >
                Reload app
              </button>
              <button
                onClick={this.handleCopyDiagnostics}
                disabled={this.state.copying}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  this.state.copying
                    ? 'cursor-wait border-indigo-500/30 bg-indigo-500/10 text-indigo-200/60'
                    : 'border-indigo-500/50 bg-indigo-500/10 text-indigo-100 hover:border-indigo-500/70'
                }`}
              >
                {this.state.copying ? 'Copying…' : 'Copy diagnostics'}
              </button>
              <button
                onClick={this.handleOpenLogs}
                className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:border-emerald-500/70"
              >
                Open logs folder
              </button>
            </div>

            {this.state.copyMessage && (
              <div
                className={`text-sm ${
                  this.state.copyStatus === 'success' ? 'text-emerald-300' : 'text-red-300'
                }`}
              >
                {this.state.copyMessage}
              </div>
            )}

            {isDevEnv() && this.state.errorInfo && (
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer text-gray-300">Stack trace</summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/40 p-3">
                  {this.state.errorInfo}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load heavy components
const TopBar = React.lazy(() =>
  import('../../ui/components/TopBar').then(m => ({ default: m.TopBar }))
);
const TabStrip = React.lazy(() => import('./TabStrip').then(m => ({ default: m.TabStrip })));
const RightPanel = React.lazy(() => import('./RightPanel').then(m => ({ default: m.RightPanel })));
const BottomStatus = React.lazy(() =>
  import('./BottomStatus').then(m => ({ default: m.BottomStatus }))
);
const CommandPalette = React.lazy(() =>
  import('./CommandPalette').then(m => ({ default: m.CommandPalette }))
);
const PermissionPrompt = React.lazy(() =>
  import('../Overlays/PermissionPrompt').then(m => ({ default: m.PermissionPrompt }))
);
const ConsentPrompt = React.lazy(() =>
  import('../Overlays/ConsentPrompt').then(m => ({ default: m.ConsentPrompt }))
);
const AgentOverlay = React.lazy(() =>
  import('../AgentOverlay').then(m => ({ default: m.AgentOverlay }))
);
const RegenSidebar = React.lazy(() =>
  import('../regen/RegenSidebar').then(m => ({ default: m.RegenSidebar }))
);

const RegenSidebarWrapper = () => (
  <div className="fixed bottom-0 right-0 top-0 z-50 h-full min-h-0 w-[400px] overflow-hidden border-l border-slate-800/60 bg-gray-900">
    <RegenSidebar />
  </div>
);
const ClipperOverlay = React.lazy(() =>
  import('../Overlays/ClipperOverlay').then(m => ({ default: m.ClipperOverlay }))
);
const ReaderOverlay = React.lazy(() =>
  import('../Overlays/ReaderOverlay').then(m => ({ default: m.ReaderOverlay }))
);
const TabGraphOverlay = React.lazy(() =>
  import('./TabGraphOverlay').then(m => ({ default: m.TabGraphOverlay }))
);
const ConsentDashboard = React.lazy(() =>
  import('../Consent/ConsentDashboard').then(m => ({ default: m.ConsentDashboard }))
);
const TrustEthicsDashboard = React.lazy(() =>
  import('../trust/TrustEthicsDashboard').then(m => ({ default: m.TrustEthicsDashboard }))
);
const ResearchTour = React.lazy(() =>
  import('../Onboarding/ResearchTour').then(m => ({ default: m.ResearchTour }))
);

import { useOnboardingStore, onboardingStorage } from '../../state/onboardingStore';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';

export function AppShell() {
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [unifiedSidePanelOpen, setUnifiedSidePanelOpen] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const memorySidebarOpen = useAppStore(state => state.memorySidebarOpen);
  const setMemorySidebarOpen = useAppStore(state => state.setMemorySidebarOpen);
  const setMode = useAppStore(state => state.setMode);
  const [redixDebugOpen, setRedixDebugOpen] = useState(false);
  const [loopResumeModalOpen, setLoopResumeModalOpen] = useState(false);
  const [workflowMarketplaceOpen, setWorkflowMarketplaceOpen] = useState(false);
  const [showInstaller, setShowInstaller] = useState(false);
  const isDev = isDevEnv();
  const themePreference = useSettingsStore(state => state.appearance.theme);
  const compactUI = useSettingsStore(state => state.appearance.compactUI);
  const clearOnExit = useSettingsStore(state => state.privacy.clearOnExit);
  const { crashedTab, setCrashedTab, handleReload } = useCrashRecovery();

  // PR: Fix layout overlap - Initialize layout sync
  useEffect(() => {
    const cleanup = initLayoutSync();
    return cleanup;
  }, []);

  // PR: Fix tab switch - Setup iframe blocked fallback handler
  useEffect(() => {
    if (isTauriRuntime()) {
      const cleanup = setupIframeBlockedListener();

      // Listen for navigation events from Tauri backend
      // Tauri v2 emits events that we can listen to
      let unlisten: (() => void) | null = null;

      (async () => {
        try {
          const { listen } = await import('@tauri-apps/api/event');
          unlisten = await listen<string>('navigate-to-url', event => {
            // Navigation event received - no logging needed
            window.location.href = event.payload;
          });
        } catch {
          // Tauri navigation listener setup failed - fallback to window events
          // Fallback: listen to window events
          const handleNavigate = (event: CustomEvent<string>) => {
            // Navigation event received (fallback) - no logging needed
            window.location.href = event.detail;
          };
          window.addEventListener('navigate-to-url', handleNavigate as EventListener);
          unlisten = () => {
            window.removeEventListener('navigate-to-url', handleNavigate as EventListener);
          };
        }
      })();

      // PR: Fix tab switch - Listen for postMessage from iframes to create new tabs
      const handlePostMessage = (event: MessageEvent) => {
        // In production, check event.origin for security
        const { type, url, sourceTabId: _sourceTabId } = event.data || {};

        if (type === 'open-in-new-tab' && url) {
          // Open-in-new-tab message received - no logging needed

          // Create new tab with the URL
          const tabsStore = useTabsStore.getState();
          const newTab: Tab = {
            id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url,
            title: 'New Tab',
            active: false,
            createdAt: Date.now(),
          };
          tabsStore.add(newTab);
        }
      };

      window.addEventListener('message', handlePostMessage);

      return () => {
        cleanup();
        if (unlisten) {
          unlisten();
        }
        window.removeEventListener('message', handlePostMessage);
      };
    }
  }, []);

  // Check for crashed loops on mount
  useEffect(() => {
    const crashed = checkForCrashedLoops();
    if (crashed.length > 0) {
      // Show modal after a short delay to not interrupt initial load
      setTimeout(() => {
        setLoopResumeModalOpen(true);
      }, 2000);
    }
  }, []);

  // Memory monitoring - auto-unload tabs when memory is low
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const initMemoryMonitoring = async () => {
      const {
        startMemoryMonitoring,
        stopMemoryMonitoring,
        unloadInactiveTabs: _unloadInactiveTabs,
      } = await import('../../core/monitoring/memoryMonitor');

      // Phase 1, Day 2: Enhanced memory monitoring with hibernation
      const { hibernateInactiveTabs } = await import('../../core/tabs/hibernation');

      startMemoryMonitoring(
        async () => {
          // Low memory: hibernate inactive tabs (with scroll position preservation)
          const count = await hibernateInactiveTabs();
          if (count > 0) {
            toast.info(`${count} tab${count > 1 ? 's' : ''} hibernated to free memory`);
          }
        },
        async () => {
          // Critical memory: hibernate more aggressively
          const count = await hibernateInactiveTabs();
          if (count > 0) {
            toast.warning(
              `Low memory detected. ${count} tab${count > 1 ? 's' : ''} hibernated for better performance.`
            );
          }
        }
      );

      cleanup = () => stopMemoryMonitoring();
    };

    initMemoryMonitoring();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Tab resurrection is now handled in the initialization effect below

  // Initialize fullscreen state on mount - ensure it starts as false
  useEffect(() => {
    // Force initial state to false (window should not start in fullscreen)
    setIsFullscreen(false);

    // Check initial fullscreen state after a brief delay to ensure window is ready
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

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
    };
  }, []);
  const [clipperActive, setClipperActive] = useState(false);
  const [readerActive, setReaderActive] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const onboardingVisible = useOnboardingStore(state => state.visible);
  const startOnboarding = useOnboardingStore(state => state.start);
  const _finishOnboarding = useOnboardingStore(state => state.finish);
  useResearchHotkeys();

  // Debug: log visibility changes (removed for production performance)
  const [graphDropHint, setGraphDropHint] = useState(false);
  const topChromeRef = useRef<HTMLDivElement | null>(null);
  const bottomChromeRef = useRef<HTMLDivElement | null>(null);
  const isElectron = useMemo(() => isElectronRuntime(), []);
  const desktopServicesReady =
    isElectron &&
    typeof window !== 'undefined' &&
    !!(window as typeof window & { ipc?: unknown }).ipc;

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for global shortcut events (OS-level hotkeys)
  useEffect(() => {
    if (!isElectron) {
      return;
    }

    const unsubscribeWakeWispr = ipcEvents.on('wake-wispr', () => {
      // Trigger WISPR activation
      window.dispatchEvent(new CustomEvent('activate-wispr'));
      toast.info('WISPR activated');
    });

    const unsubscribeTradeMode = ipcEvents.on('open-trade-mode', () => {
      setMode('Trade');
      toast.info('Trade mode opened');
    });

    const unsubscribeResearchMode = ipcEvents.on('open-research-mode', () => {
      setMode('Research');
      toast.info('Research mode opened');
    });

    return () => {
      unsubscribeWakeWispr();
      unsubscribeTradeMode();
      unsubscribeResearchMode();
    };
  }, [setMode]);

  useEffect(() => {
    if (!isElectron) {
      return;
    }

    let lastTop = -1;
    let lastBottom = -1;

    const updateOffsets = () => {
      const top = Math.round(topChromeRef.current?.offsetHeight ?? 0);
      const bottomMeasured = Math.round(bottomChromeRef.current?.offsetHeight ?? 0);
      const bottom = isFullscreen ? 0 : bottomMeasured;

      // Set CSS variable for header height (useful for Electron main process)
      if (top !== lastTop) {
        document.documentElement.style.setProperty('--header-height', `${top}px`);
      }
      if (bottom !== lastBottom || bottom !== bottomMeasured) {
        document.documentElement.style.setProperty('--footer-height', `${bottom}px`);
      }

      if (top !== lastTop || bottom !== lastBottom) {
        lastTop = top;
        lastBottom = bottom;
        void ipc.ui.setChromeOffsets({ top, bottom });
      }
    };

    const observers: ResizeObserver[] = [];
    const attachObserver = (element: Element | null | undefined) => {
      if (!element || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(updateOffsets);
      observer.observe(element);
      observers.push(observer);
    };

    attachObserver(topChromeRef.current);
    attachObserver(bottomChromeRef.current);
    updateOffsets();
    window.addEventListener('resize', updateOffsets);

    return () => {
      window.removeEventListener('resize', updateOffsets);
      observers.forEach(observer => observer.disconnect());
    };
  }, [isElectron, isFullscreen]);

  // Set CSS variable for header height (always, not just Electron)
  useEffect(() => {
    if (!topChromeRef.current) return;

    const updateHeaderHeight = () => {
      const height = topChromeRef.current?.offsetHeight ?? 0;
      const px = `${height}px`;
      document.documentElement.style.setProperty('--header-height', px);
      document.documentElement.style.setProperty('--omnix-topbar-height', px);
      if (typeof window !== 'undefined') {
        (window as any).__OMNIX_TOPBAR_HEIGHT = height;
        if (typeof (window as any).__omnix_apply_topbar === 'function') {
          try {
            (window as any).__omnix_apply_topbar();
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('[AppShell] Failed to notify injected topbar script', error);
            }
          }
        }
      }
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    if (topChromeRef.current) {
      observer.observe(topChromeRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Initialize Trade Alerts Cron service on app start
  useEffect(() => {
    initTradeAlertsCron();
  }, []);

  // Initialize Extensions API on app start
  useEffect(() => {
    setupPreloadHook();
    initExtensionsAPI();
  }, []);

  // Check Ollama availability when offline
  useEffect(() => {
    if (isOffline) {
      void ipc.ollama
        .check()
        .then((result: any) => {
          setOllamaAvailable(result?.available ?? false);
        })
        .catch(() => {
          setOllamaAvailable(false);
        });
    } else {
      setOllamaAvailable(false);
    }
  }, [isOffline]);

  const [restoreSummary, setRestoreSummary] = useState<{
    updatedAt: number;
    windowCount: number;
    tabCount: number;
  } | null>(null);
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'restoring'>('idle');
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1920
  );
  const isDesktopLayout = viewportWidth >= 1280;

  // Notify main process when right panel opens/closes so BrowserView bounds can be updated
  useEffect(() => {
    if (
      !isElectron ||
      typeof window === 'undefined' ||
      !(window as any).ui ||
      typeof (window as any).ui.setRightDock !== 'function'
    ) {
      return;
    }

    // Right panel uses w-[340px] max-w-[380px], use 360px as average
    // Only send width if panel is open and not in fullscreen
    const panelWidth = rightPanelOpen && !isFullscreen && isDesktopLayout ? 360 : 0;

    try {
      (window as any).ui.setRightDock(panelWidth);
      if (import.meta.env.DEV) {
        // Debug logging removed for production
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[AppShell] Failed to update right panel width:', error);
      }
    }
  }, [rightPanelOpen, isFullscreen, isDesktopLayout, isElectron]);

  const [, setToolsDrawerOpen] = useState(false);
  const sessionSnapshot = useSessionStore(state => state.snapshot);
  const saveSessionSnapshot = useSessionStore(state => state.saveSnapshot);
  const restoreSessionSnapshot = useSessionStore(state => state.restoreFromSnapshot);
  const clearSessionSnapshot = useSessionStore(state => state.clearSnapshot);
  const clearHistoryEntries = useHistoryStore(state => state.clear);
  const tabsState = useTabsStore();
  const { handleError: _handleError, safeExecute: _safeExecute } = useAppError();

  // REDIX MODE: Enable tab eviction if Redix mode is active
  const redixConfig = getRedixConfig();
  useRedixTabEviction(redixConfig.enabled && redixConfig.enableTabEviction);

  // i18n: Sync language settings with i18n
  useI18nSync();

  // Initialize Redix mode on mount
  useEffect(() => {
    initializeRedixMode();
  }, []);
  const [showTOS, setShowTOS] = useState(false);
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  const [restoreToast, setRestoreToast] = useState<{
    message: string;
    variant: 'success' | 'error';
  } | null>(null);

  // All hooks must be called before any conditional logic
  const { hasConsented } = useCookieConsent();

  // Memoize TOS callbacks to prevent hook order issues - must be called unconditionally
  const handleTOSAccept = useCallback(() => {
    // TOS accepted - closing modal
    setShowTOS(false);
    // The onboarding will start automatically via the useEffect that checks showTOS
    // But first cookie consent will be shown if not already consented
    // TOS modal closed, waiting for cookie consent and onboarding to start...
  }, [showTOS, hasConsented, showCookieConsent]);

  const handleTOSDecline = useCallback(() => {
    // User declined TOS - could show a message or prevent app usage
    // For now, we'll just close the app or show a message
    if (
      window.confirm('You must accept the Terms of Service to use Regen. Would you like to exit?')
    ) {
      // In Electron, we could close the window
      if (typeof window !== 'undefined' && (window as any).api?.app?.quit) {
        (window as any).api.app.quit();
      } else {
        window.close();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tier 2: Initialize snapshotting on mount
  useEffect(() => {
    startSnapshotting();
    return () => {
      // Cleanup handled by stopSnapshotting if needed
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveSessionSnapshot(tabsState.tabs, tabsState.activeId);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [tabsState.tabs, tabsState.activeId, saveSessionSnapshot]);

  useEffect(() => {
    if (!clearOnExit) return;
    const handleBeforeUnload = () => {
      clearSessionSnapshot();
      clearHistoryEntries();
      useTabsStore.getState().clearRecentlyClosed();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [clearOnExit, clearHistoryEntries, clearSessionSnapshot]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyPreferences = () => {
      const resolvedTheme =
        themePreference === 'system' ? (media.matches ? 'dark' : 'light') : themePreference;
      root.dataset.theme = resolvedTheme;
      root.dataset.compact = compactUI ? 'true' : 'false';
    };

    applyPreferences();

    if (themePreference === 'system') {
      const handler = () => applyPreferences();
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }

    return undefined;
  }, [themePreference, compactUI]);

  // Check TOS acceptance on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('regen:tos:accepted');
      if (stored) {
        const data = JSON.parse(stored);
        const currentVersion = '2025-12-17'; // Update when TOS changes
        if (data.version === currentVersion && data.accepted) {
          setShowTOS(false);
          // Only show cookie consent after TOS is accepted
          if (!hasConsented) {
            setShowCookieConsent(true);
          }
          return;
        }
      }
      // TOS not accepted or version mismatch - show TOS
      setShowTOS(true);
    } catch {
      // Invalid stored data - show TOS
      setShowTOS(true);
    }
  }, [hasConsented]);

  // Show cookie consent after TOS is accepted
  useEffect(() => {
    if (!showTOS && !hasConsented) {
      console.log('[AppShell] Showing cookie consent - TOS accepted, cookie consent needed');
      // Small delay to ensure TOS modal is fully closed
      const timer = setTimeout(() => {
        setShowCookieConsent(true);
        console.log('[AppShell] Cookie consent modal shown');
      }, 300);
      return () => clearTimeout(timer);
    } else if (!showTOS && hasConsented) {
      console.log('[AppShell] Cookie consent already given, skipping cookie consent modal');
      setShowCookieConsent(false);
    }
  }, [showTOS, hasConsented]);
  useEffect(() => {
    let dragCounter = 0;

    const isGraphDrag = (event: DragEvent) => {
      const types = event.dataTransfer?.types;
      if (!types) return false;
      return Array.from(types).includes('application/x-regen-tab-id');
    };

    const handleDragEnter = (event: DragEvent) => {
      if (!isGraphDrag(event)) return;
      event.preventDefault();
      dragCounter += 1;
      setGraphDropHint(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!isGraphDrag(event)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!isGraphDrag(event)) return;
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) {
        setGraphDropHint(false);
      }
    };

    const handleDragEnd = () => {
      dragCounter = 0;
      setGraphDropHint(false);
    };

    const handleDrop = (event: DragEvent) => {
      if (!isGraphDrag(event)) return;
      event.preventDefault();
      dragCounter = 0;
      setGraphDropHint(false);
      const tabId = event.dataTransfer?.getData('application/x-regen-tab-id');
      if (tabId) {
        try {
          void useTabGraphStore.getState().focusTab(tabId);
        } catch (error) {
          if (isDevEnv()) {
            console.warn('[AppShell] Failed to focus tab graph from drop', error);
          }
        }
      }
    };

    const handleCustomDragEnd = () => {
      dragCounter = 0;
      setGraphDropHint(false);
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDrop);
    window.addEventListener('tabgraph:dragend', handleCustomDragEnd as EventListener);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDrop);
      window.removeEventListener('tabgraph:dragend', handleCustomDragEnd as EventListener);
    };
  }, []);
  const consentVisible = useConsentOverlayStore(state => state.visible);
  const trustDashboardVisible = useTrustDashboardStore(state => state.visible);

  const cycleTab = useCallback((direction: number) => {
    const { tabs, activeId, setActive } = useTabsStore.getState();
    const currentMode = useAppStore.getState().mode;
    const scopedTabs = tabs.filter(
      tab => !currentMode || !tab.appMode || tab.appMode === currentMode
    );
    if (scopedTabs.length === 0) {
      return false;
    }
    const currentIndex = scopedTabs.findIndex(tab => tab.id === activeId);
    const baseIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (baseIndex + direction + scopedTabs.length) % scopedTabs.length;
    const target = scopedTabs[nextIndex];
    if (target && target.id !== activeId) {
      setActive(target.id);
      void ipc.tabs.activate({ id: target.id });
      return true;
    }
    return false;
  }, []);

  const jumpToTabIndex = useCallback((position: number, snapToEnd = false) => {
    const { tabs, setActive } = useTabsStore.getState();
    const currentMode = useAppStore.getState().mode;
    const scopedTabs = tabs.filter(
      tab => !currentMode || !tab.appMode || tab.appMode === currentMode
    );
    if (scopedTabs.length === 0) {
      return false;
    }

    const index = snapToEnd
      ? Math.max(scopedTabs.length - 1, 0)
      : Math.min(Math.max(position, 0), scopedTabs.length - 1);
    const target = scopedTabs[index];
    if (target) {
      setActive(target.id);
      void ipc.tabs.activate({ id: target.id });
      return true;
    }
    return false;
  }, []);
  const activeTab = useMemo(() => {
    // PR: Fix tab switch - defensive null checks with logging
    const safeTabs = Array.isArray(tabsState.tabs) ? tabsState.tabs.filter(t => t && t.id) : [];
    const found = safeTabs.find(tab => tab.id === tabsState.activeId);

    if (tabsState.activeId && !found) {
      console.warn('[AppShell] activeTab not found', {
        activeId: tabsState.activeId,
        availableIds: safeTabs.map(t => t.id),
        totalTabs: safeTabs.length,
      });
    }

    return found || undefined;
  }, [tabsState.tabs, tabsState.activeId]);
  const mode = useAppStore(state => state.mode);
  const currentMode = mode ?? 'Browse';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const nextMode = (mode ?? 'browse').toLowerCase();
    document.documentElement.dataset.modeTheme = nextMode;
    return () => {
      document.documentElement.dataset.modeTheme = nextMode;
    };
  }, [mode]);
  const researchPaneOpen = useAppStore(state => state.researchPaneOpen);
  const setResearchPaneOpen = useAppStore(state => state.setResearchPaneOpen);
  const tradeSidebarOpen = useTradeStore(state => state.sidebarOpen);
  const setTradeSidebarOpen = useTradeStore(state => state.setSidebarOpen);
  const regenSidebarOpen = useAppStore(state => state.regenSidebarOpen);
  const setRegenSidebarOpen = useAppStore(state => state.setRegenSidebarOpen);
  const [_contentSplit, setContentSplit] = useState(0.62);

  // Track visits when active tab URL changes
  const lastTrackedUrl = useRef<string>('');
  useEffect(() => {
    if (!activeTab?.url || activeTab.url === lastTrackedUrl.current) return;

    // Skip special pages
    if (
      activeTab.url.startsWith('about:') ||
      activeTab.url.startsWith('chrome:') ||
      activeTab.url.startsWith('edge:') ||
      activeTab.url.startsWith('app:') ||
      activeTab.url.startsWith('ob://')
    ) {
      return;
    }

    // Track visit
    lastTrackedUrl.current = activeTab.url;
    trackVisit(activeTab.url, activeTab.title, {
      tabId: activeTab.id,
      containerId: activeTab.containerId,
    }).catch(error => {
      console.warn('[AppShell] Failed to track visit:', error);
    });
  }, [activeTab?.url, activeTab?.title, activeTab?.id, activeTab?.containerId]);

  // Initialize nightly summarization
  useEffect(() => {
    // Defer nightly summarization initialization
    setTimeout(() => {
      initNightlySummarization().catch(err => {
        if (isDevEnv()) console.warn('[AppShell] Nightly summarization init failed:', err);
      });
    }, 2000);
  }, []);
  const [isResizingContent, setIsResizingContent] = useState(false);
  const overlayActive =
    commandPaletteOpen ||
    Boolean(permissionRequest) ||
    Boolean(consentRequest) ||
    clipperActive ||
    readerActive;
  const activeTabUrl = activeTab?.url ?? '';
  // Hide webview content in Research and Trade modes - they have their own UI
  const showWebContent =
    currentMode !== 'Research' &&
    currentMode !== 'Trade' &&
    Boolean(activeTabUrl) &&
    !activeTabUrl.startsWith('ob://') &&
    !activeTabUrl.startsWith('about:') &&
    !activeTabUrl.startsWith('chrome://') &&
    !activeTabUrl.startsWith('edge://') &&
    !activeTabUrl.startsWith('app://');
  useEffect(() => {
    if (isDesktopLayout || !showWebContent) {
      setToolsDrawerOpen(false);
    }
  }, [isDesktopLayout, showWebContent]);
  const shouldShowInlineToolsPanel = showWebContent && isDesktopLayout;
  const handleResizeStart = useCallback(() => {
    if (!showWebContent) return;
    setIsResizingContent(true);
  }, [showWebContent]);

  useEffect(() => {
    if (!isResizingContent) return;

    const handlePointerMove = (event: MouseEvent) => {
      setContentSplit(prev => {
        const ratio = event.clientX / window.innerWidth;
        if (Number.isNaN(ratio)) return prev;
        return Math.min(0.85, Math.max(0.25, ratio));
      });
    };

    const handlePointerUp = () => {
      setIsResizingContent(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [isResizingContent]);

  const _restoreRelativeTime = useMemo(() => {
    if (!restoreSummary) return null;
    try {
      return formatDistanceToNow(new Date(restoreSummary.updatedAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [restoreSummary]);

  // Auto-open mode-specific panels (mode manager handles this via onActivate hooks, but we keep this as a fallback)
  useEffect(() => {
    // Mode manager's onActivate hooks handle most of this, but we ensure UI stays in sync
    if (mode === 'Research') {
      // Don't auto-open memory sidebar in Research Mode - let users toggle it to avoid overlapping the gradient UI
      // if (!memorySidebarOpen) {
      //   setMemorySidebarOpen(true);
      // }
      if (!researchPaneOpen) {
        setResearchPaneOpen(true);
      }
      if (tradeSidebarOpen) {
        setTradeSidebarOpen(false);
      }
    } else if (mode === 'Trade') {
      if (!tradeSidebarOpen) {
        setTradeSidebarOpen(true);
      }
      if (researchPaneOpen) {
        setResearchPaneOpen(false);
      }
      if (memorySidebarOpen) {
        setMemorySidebarOpen(false);
      }
    } else if (mode === 'GraphMind') {
      const graphDockOpen = useAppStore.getState().graphDockOpen;
      if (!graphDockOpen) {
        useAppStore.getState().toggleGraphDock();
      }
      // Close other panels
      if (researchPaneOpen) {
        setResearchPaneOpen(false);
      }
      if (tradeSidebarOpen) {
        setTradeSidebarOpen(false);
      }
      if (memorySidebarOpen) {
        setMemorySidebarOpen(false);
      }
    } else {
      // Browse mode or other modes - close mode-specific panels
      if (researchPaneOpen) {
        setResearchPaneOpen(false);
      }
      if (tradeSidebarOpen) {
        setTradeSidebarOpen(false);
      }
      // Keep memory sidebar open in Browse mode if user wants it
    }
  }, [
    mode,
    memorySidebarOpen,
    researchPaneOpen,
    setResearchPaneOpen,
    tradeSidebarOpen,
    setTradeSidebarOpen,
    setMemorySidebarOpen,
  ]);

  // Initialize Redix optimizer
  // Defer heavy Redix service initialization to avoid blocking initial render
  useEffect(() => {
    // Use requestIdleCallback or setTimeout to defer initialization
    const deferInit = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(
          () => {
            initializeOptimizer().catch(err => {
              if (isDevEnv()) console.warn('[AppShell] Optimizer init failed:', err);
            });
          },
          { timeout: 2000 }
        );
      } else {
        setTimeout(() => {
          initializeOptimizer().catch(_err => {
            if (isDevEnv()) console.warn('[AppShell] Optimizer init failed');
          });
        }, 500);
      }
    };
    deferInit();
  }, []);

  useEffect(() => {
    if (!desktopServicesReady) return;
    const timer = setTimeout(() => {
      startTabSuspensionService().catch(err => {
        if (isDevEnv()) console.warn('[AppShell] Tab suspension init failed:', err);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [desktopServicesReady]);

  useEffect(() => {
    if (!desktopServicesReady) return;
    const timer = setTimeout(() => {
      Promise.all([
        initBatteryManager().catch(err => {
          if (isDevEnv()) console.warn('[AppShell] Battery manager init failed:', err);
        }),
        initPowerModes().catch(err => {
          if (isDevEnv()) console.warn('[AppShell] Power modes init failed:', err);
        }),
        initMemoryManager().catch(err => {
          if (isDevEnv()) console.warn('[AppShell] Memory manager init failed:', err);
        }),
      ]).catch(() => {
        // Silently handle errors - these are optional services
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [desktopServicesReady]);

  // Watch for Redix performance events
  useRedix(event => {
    if (event.type === 'redix:performance:low') {
      if (isDevEnv()) {
        console.log('[Redix] Performance low:', event.payload);
      }
      // Update policy metrics for automatic evaluation (lazy loaded)
      const { memory, cpu, battery } = event.payload || {};
      updatePolicyMetrics()
        .then(updateFn => {
          updateFn({
            memoryUsage: memory,
            cpuUsage: cpu,
            batteryLevel: battery,
          });
        })
        .catch(() => {
          // Silently handle errors - policy metrics are optional
        });
    }

    // Handle policy events
    if (event.type.startsWith('redix:policy:')) {
      // Lazy load policy recommendations
      getPolicyRecommendations()
        .then(getFn => {
          const recommendations = getFn();
          if (recommendations.length > 0 && isDevEnv()) {
            console.log('[Redix] Policy recommendations:', recommendations);
          }
        })
        .catch(() => {
          // Silently handle errors
        });
    }

    // Handle mode transition errors
    if (event.type === 'redix:mode:error') {
      const { mode, error } = event.payload || {};
      console.error('[ModeManager] Mode transition error:', mode, error);
      setRestoreToast({
        message: `Failed to switch to ${mode} mode: ${error || 'Unknown error'}`,
        variant: 'error',
      });
    }

    // Handle successful mode activation
    if (event.type === 'redix:mode:activated') {
      const { mode } = event.payload || {};
      if (mode && mode !== 'Browse') {
        // Optionally show success toast for non-Browse modes
        // setRestoreToast({ message: `Switched to ${mode} mode`, variant: 'success' });
      }
    }
  });

  // Auto-start onboarding for new users (with a small delay to let UI settle)
  // Only start if TOS and Cookie Consent are not showing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (showTOS || showCookieConsent) {
      // Onboarding blocked - modals are showing
      return; // Don't start onboarding if modals are showing
    }

    // Checking if onboarding should start...
    const timer = setTimeout(() => {
      if (!onboardingStorage.isCompleted() && !onboardingVisible) {
        // Starting onboarding...
        startOnboarding();
      } else {
        // Onboarding not started - already completed or visible
      }
    }, 1200); // Delay to let UI render first (increased for slower machines)
    return () => clearTimeout(timer);
  }, [onboardingVisible, startOnboarding, showTOS, showCookieConsent]);

  // Privacy auto-toggle: Auto-enable Private/Ghost mode on sensitive sites (Browse mode only)
  useEffect(() => {
    if (mode !== 'Browse' || !activeTab?.url) return;

    const checkAndToggle = async () => {
      try {
        const url = activeTab.url;
        if (!url) return;
        const result = await autoTogglePrivacy(url, 'Normal');
        if (result) {
          // Debug logging removed for production
        }
      } catch {
        // Error already logged in autoTogglePrivacy
      }
    };

    // Debounce to avoid excessive checks
    const timer = setTimeout(checkAndToggle, 1000);
    return () => clearTimeout(timer);
  }, [activeTab?.url, mode]);

  useEffect(() => {
    if (!sessionSnapshot) {
      setRestoreSummary(null);
      return;
    }
    // Only show restore banner if there are tabs to restore
    if (sessionSnapshot.tabCount === 0) {
      setRestoreSummary(null);
      setRestoreDismissed(true);
      return;
    }
    if (restoreSummary && restoreSummary.updatedAt === sessionSnapshot.updatedAt) {
      return;
    }
    setRestoreSummary({
      updatedAt: sessionSnapshot.updatedAt,
      windowCount: 1,
      tabCount: sessionSnapshot.tabCount,
    });
    setRestoreDismissed(false);
  }, [sessionSnapshot, restoreSummary]);

  // Auto-dismiss restore banner after 30 seconds
  useEffect(() => {
    if (!restoreSummary || restoreDismissed) return;
    const timer = setTimeout(() => {
      setRestoreDismissed(true);
    }, 30000); // 30 seconds
    return () => clearTimeout(timer);
  }, [restoreSummary, restoreDismissed]);

  useEffect(() => {
    if (!restoreToast) return;
    const timeoutId = window.setTimeout(() => {
      setRestoreToast(null);
    }, 6000);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [restoreToast]);

  // Listen for permission requests
  useIPCEvent<PermissionRequest>(
    'permissions:request',
    request => {
      setPermissionRequest(request);
    },
    []
  );

  // Listen for consent requests
  useIPCEvent<any>(
    'agent:consent:request',
    payload => {
      if (!payload || !payload.id || !payload.action) return;
      const request: ConsentRequest = {
        id: payload.id,
        action: {
          type: payload.action.type,
          description: payload.action.description,
          risk: payload.action.risk ?? 'medium',
        },
        callback: async (approved: boolean) => {
          try {
            if (approved) {
              await ipc.consent.approve(payload.id);
            } else {
              await ipc.consent.revoke(payload.id);
            }
          } catch (error) {
            console.error('Failed to resolve consent:', error);
          } finally {
            setConsentRequest(null);
          }
        },
      };
      setConsentRequest(request);
    },
    []
  );

  // Listen for fullscreen changes from Electron IPC
  useEffect(() => {
    const handleFullscreen = (data: { fullscreen: boolean }) => {
      setIsFullscreen(data.fullscreen);
    };

    // Use the IPC event bus
    const unsubscribe = ipcEvents.on<{ fullscreen: boolean }>(
      'app:fullscreen-changed',
      handleFullscreen
    );

    return unsubscribe;
  }, []);

  // Global keyboard shortcuts (Windows/Linux: Ctrl, macOS: Cmd)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'F11') {
        e.preventDefault();
        void ipc.windowControl.toggleFullscreen();
        return;
      }

      // ⌘K / Ctrl+K: Focus Omnibox (primary action - AI omnibar is the hero)
      // Note: TopBar also handles this with capture:true, so this is a fallback
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        // Let TopBar handle this to focus address bar
        // If omnibox is already focused, then open command palette
        const target = e.target as HTMLElement | null;
        const isWithinOmnibox =
          target?.hasAttribute('data-omnibox-input') ||
          target?.closest('[data-onboarding="omnibox"]');
        if (isWithinOmnibox) {
          e.preventDefault();
          setCommandPaletteOpen(true);
          return;
        }
        // Otherwise, let TopBar handle focusing the address bar
        return;
      }

      // ⌘⇧K / Ctrl+Shift+K: Command Palette (alternative shortcut)
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // ⌘L / Ctrl+L: Focus URL bar (handled in Omnibox, but ensure it works)
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        // Let Omnibox handle this, but don't prevent default if it's already handled
        return;
      }

      // ⌘T / Ctrl+T: New Tab
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        ipc.tabs.create('about:blank').catch((error: any) => {
          if (isDevEnv()) {
            console.error('[AppShell] Failed to create tab:', error);
          }
        });
        return;
      }

      // ⌘W / Ctrl+W: Close Tab
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        const state = useTabsStore.getState();
        if (state.activeId) {
          const tab = state.tabs.find(t => t.id === state.activeId);
          if (tab) {
            state.rememberClosedTab(tab);
          }
          ipc.tabs.close({ id: state.activeId }).catch((error: any) => {
            if (isDevEnv()) {
              console.error('[AppShell] Failed to close tab:', error);
            }
          });
        }
        return;
      }

      // ⌘⇧T / Ctrl+Shift+T: Reopen Closed Tab
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        void reopenMostRecentClosedTab();
        return;
      }

      // ⌘⇧A / Ctrl+Shift+A: Toggle Agent Console
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setRightPanelOpen(prev => !prev);
        return;
      }

      // ⌘⇧M / Ctrl+Shift+M: Toggle Memory Sidebar
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setMemorySidebarOpen(!memorySidebarOpen);
        return;
      }

      // ⌘⇧R / Ctrl+Shift+R: Toggle Regen Sidebar
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setRegenSidebarOpen(!regenSidebarOpen);
        return;
      }

      // ⌘⇧L / Ctrl+Shift+L: Toggle Unified Side Panel (History/Bookmarks/Downloads)
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setUnifiedSidePanelOpen(!unifiedSidePanelOpen);
        return;
      }

      // ⌘⇧H / Ctrl+Shift+H: Highlight clipper
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (useTabsStore.getState().activeId) {
          setClipperActive(true);
        }
        return;
      }

      // ⌥⌘P / Alt+Ctrl+P: Proxy Menu (opens NetworkButton menu)
      if (modifier && e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        // Trigger NetworkButton click via data attribute
        const networkButton = document.querySelector('[data-network-button]') as HTMLElement;
        networkButton?.click();
        return;
      }

      // ⌥⌘S / Alt+Ctrl+S: Shields Menu (opens ShieldsButton menu)
      if (modifier && e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // Trigger ShieldsButton click via data attribute
        const shieldsButton = document.querySelector('[data-shields-button]') as HTMLElement;
        shieldsButton?.click();
        return;
      }

      // ⌘F / Ctrl+F: Find in Page (handled by browser)
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f') {
        return;
      }

      // Ctrl/Cmd + Tab to cycle through tabs
      if (modifier && !e.altKey && e.key === 'Tab') {
        const moved = cycleTab(e.shiftKey ? -1 : 1);
        if (moved) {
          e.preventDefault();
        }
        return;
      }

      // Ctrl/Cmd + number keys to jump to tab
      if (modifier && !e.altKey && !e.shiftKey) {
        const digit = Number(e.key);
        if (!Number.isNaN(digit) && digit >= 1 && digit <= 9) {
          e.preventDefault();
          if (digit === 9) {
            jumpToTabIndex(0, true);
          } else {
            jumpToTabIndex(digit - 1);
          }
          return;
        }
      }

      // Alt+← / ⌘←: Go back (handled by TopBar)
      // Alt+→ / ⌘→: Go forward (handled by TopBar)
      // Ctrl+R / ⌘R: Refresh (handled by TopBar)

      // Esc: Close modals
      if (e.key === 'Escape') {
        if (clipperActive) {
          setClipperActive(false);
        } else if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (permissionRequest) {
          setPermissionRequest(null);
        } else if (consentRequest) {
          setConsentRequest(null);
        } else if (rightPanelOpen) {
          setRightPanelOpen(false);
        } else if (memorySidebarOpen) {
          setMemorySidebarOpen(false);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commandPaletteOpen,
    permissionRequest,
    consentRequest,
    rightPanelOpen,
    clipperActive,
    memorySidebarOpen,
    cycleTab,
    jumpToTabIndex,
  ]);

  // Sync memory sidebar state with TopBar and listen for external changes
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('memory-sidebar:toggle', { detail: { open: memorySidebarOpen } })
    );

    const handleMemorySidebarToggle = (event: CustomEvent) => {
      const { open } = event.detail;
      if (open !== memorySidebarOpen) {
        setMemorySidebarOpen(open);
      }
    };

    window.addEventListener('memory-sidebar:toggle', handleMemorySidebarToggle as EventListener);
    return () => {
      window.removeEventListener(
        'memory-sidebar:toggle',
        handleMemorySidebarToggle as EventListener
      );
    };
  }, [memorySidebarOpen, setMemorySidebarOpen]);

  const handleCreateHighlight = async (highlight: ResearchHighlight) => {
    if (!activeTab?.url) {
      setClipperActive(false);
      return;
    }
    try {
      const existing = await ipc.research.getNotes(activeTab.url);
      const notes = existing?.notes ?? '';
      const highlights = Array.isArray(existing?.highlights) ? existing.highlights : [];
      await ipc.research.saveNotes(activeTab.url, notes, [...highlights, highlight]);
      ipcEvents.emit('research:highlight-added', { url: activeTab.url, highlight });
    } catch (error) {
      console.error('Failed to save highlight:', error);
    } finally {
      setClipperActive(false);
    }
  };

  const _handleRestoreSession = async () => {
    if (!restoreSummary || restoreStatus === 'restoring') return;
    setRestoreStatus('restoring');
    try {
      const result = await restoreSessionSnapshot();
      if (result.restored) {
        const restoredCount = result.tabCount ?? restoreSummary?.tabCount ?? 0;
        setRestoreToast({
          message: `Restored ${restoredCount} tab${restoredCount === 1 ? '' : 's'} from last session.`,
          variant: 'success',
        });
        setRestoreDismissed(true);
      } else {
        setRestoreToast({
          message: 'No saved session snapshot available to restore.',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to restore session snapshot:', error);
      setRestoreToast({
        message: 'Failed to restore session snapshot.',
        variant: 'error',
      });
    } finally {
      setRestoreStatus('idle');
    }
  };

  const _handleDismissRestore = () => {
    setRestoreDismissed(true);
    setRestoreSummary(null);
  };

  // Ensure we always render something - never return null or empty
  // Rendering state tracked internally - no logging needed for performance

  return (
    <div
      className="flex w-screen flex-col overflow-hidden bg-slate-950 text-slate-100"
      style={{ height: 'calc(100vh - var(--bottom-bar-height, 80px))' }}
      data-app-shell="true"
    >
      {/* Top Chrome Elements - Fixed header, never scrolls */}
      <div
        ref={topChromeRef}
        data-top-chrome
        className="flex-none shrink-0 border-b border-slate-800 bg-slate-950"
      >
        {/* Top Navigation - Hidden in fullscreen */}
        {!isFullscreen && (
          <Suspense fallback={<div style={{ height: '40px', backgroundColor: '#0f172a' }} />}>
            <ErrorBoundary
              componentName="TopBar"
              fallback={
                <div
                  style={{
                    height: '40px',
                    backgroundColor: '#0f172a',
                    padding: '8px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '12px',
                  }}
                >
                  <span>Loading navigation...</span>
                </div>
              }
            >
              {/* Hide TopBar in Research and Trade modes - they have their own UI */}
              {currentMode !== 'Research' && currentMode !== 'Trade' && (
                <TopBar
                  showAddressBar={true}
                  showQuickActions={true}
                  currentUrl={tabsState.tabs.find(t => t.id === tabsState.activeId)?.url}
                  onModeChange={async (mode: string) => {
                    // Map mode string to AppState mode
                    const modeMap: Record<string, 'Browse' | 'Research' | 'Trade'> = {
                      browse: 'Browse',
                      research: 'Research',
                      trade: 'Trade',
                      dev: 'Browse', // Dev maps to Browse for now
                    };
                    const targetMode = modeMap[mode] || 'Browse';
                    const currentMode = useAppStore.getState().mode;
                    if (targetMode !== currentMode) {
                      // Initialize mode in backend and launch browser if needed
                      try {
                        const { ipc } = await import('../../lib/ipc-typed');

                        // Initialize mode
                        await (ipc as any).invoke('wispr_command', {
                          input: `Init ${targetMode} mode`,
                          mode: mode.toLowerCase(),
                        });

                        // Launch browser for mode-specific URLs
                        if (targetMode === 'Trade') {
                          await (ipc as any).invoke('regen_launch', {
                            url: 'https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT',
                            mode: 'trade',
                          });
                        } else if (targetMode === 'Research') {
                          await (ipc as any).invoke('regen_launch', {
                            url: 'https://www.google.com',
                            mode: 'research',
                          });
                        }
                      } catch (error) {
                        console.warn('[AppShell] Mode init failed:', error);
                      }
                      await setMode(targetMode);
                    }
                  }}
                  onAddressBarSubmit={async query => {
                    // Handle address bar navigation/search
                    try {
                      const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);
                      const isAboutBlank = activeTab?.url === 'about:blank' || !activeTab?.url;

                      // Use normalizeInputToUrlOrSearch to properly handle URLs vs search queries
                      const { normalizeInputToUrlOrSearch } = await import('../../lib/search');
                      const settings = useSettingsStore.getState();
                      const language = settings.language || 'auto';
                      const searchEngine = settings.searchEngine || 'google';

                      // Normalize search engine type to match function signature
                      let searchProvider: 'google' | 'duckduckgo' | 'bing' | 'yahoo' = 'google';
                      if (
                        searchEngine === 'duckduckgo' ||
                        searchEngine === 'bing' ||
                        searchEngine === 'yahoo'
                      ) {
                        searchProvider = searchEngine;
                      } else if (searchEngine === 'all' || searchEngine === 'mock') {
                        searchProvider = 'google'; // Default to Google for 'all' or 'mock'
                      }

                      // Normalize the query to a URL or search URL
                      const targetUrl = normalizeInputToUrlOrSearch(
                        query,
                        searchProvider,
                        language !== 'auto' ? language : undefined
                      );

                      if (isAboutBlank && activeTab) {
                        await ipc.tabs.navigate(activeTab.id, targetUrl);
                      } else {
                        await ipc.tabs.create(targetUrl);
                      }
                    } catch (error) {
                      console.error('[TopBar] Failed to navigate:', error);
                      toast.error('Failed to navigate');
                    }
                  }}
                />
              )}
            </ErrorBoundary>
          </Suspense>
        )}

        {isOffline && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs text-amber-100 sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 text-amber-300" />
              <span>
                Offline mode: remote AI and sync are paused. Local actions remain available.
              </span>
            </div>
            {ollamaAvailable && (
              <button
                type="button"
                onClick={() => {
                  const settingsButton = document.querySelector(
                    '[data-settings-button]'
                  ) as HTMLElement;
                  settingsButton?.click();
                }}
                className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-100 transition-colors hover:border-amber-400/60 hover:bg-amber-500/30"
              >
                <span>Try Local AI</span>
              </button>
            )}
          </div>
        )}

        {/* Restore Banner and TabStrip */}
        {!isFullscreen && (
          <>
            {/* HIDDEN: Restore session banner (kills premium feel - Chrome 2015 vibes) */}
            {/* Banner removed - it looked like Chrome 2015 and killed the premium feel */}
            {/* Hide TabStrip in Research and Trade modes - they have their own UI */}
            {currentMode !== 'Research' && currentMode !== 'Trade' && (
              <Suspense fallback={null}>
                <ErrorBoundary componentName="TabStrip">
                  <div className="relative z-50 w-full" style={{ pointerEvents: 'auto' }}>
                    <TabStrip />
                  </div>
                </ErrorBoundary>
              </Suspense>
            )}
            {showWebContent && !isDesktopLayout && (
              <div className="flex items-center justify-end gap-2 px-3 py-2 text-xs text-slate-300 sm:px-4">
                <button
                  type="button"
                  onClick={() => setToolsDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-100 shadow-sm transition hover:border-slate-500/70"
                >
                  <PanelsTopLeft size={14} />
                  <span>Workspace tools</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-3 py-1.5 font-medium text-slate-100 shadow-sm transition hover:border-slate-500/70"
                >
                  <PanelRightOpen size={14} />
                  <span>Agent console</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Main Layout - Content area that fills remaining space */}
      <div className="flex min-h-0 w-full flex-1 overflow-hidden bg-slate-950">
        {/* Center Content - Full Width, only this area scrolls */}
        <div className="content-wrapper flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Route/Web Content */}
          {showWebContent ? (
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-950">
              {/* Webview container - fills remaining space, only this scrolls */}
              {/* PR: Fix tab switch - Ensure frame area has proper z-index and pointer-events */}
              <div
                className="webview-container relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-950"
                style={{ zIndex: 0, position: 'relative' }}
              >
                {/* PR: Fix tab switch - use iframe-per-tab manager for Tauri, TabContentSurface for Electron */}
                {isTauriRuntime() ? (
                  <TabIframeManager tabs={tabsState.tabs} activeTabId={tabsState.activeId} />
                ) : (
                  <TabContentSurface tab={activeTab} overlayActive={overlayActive} />
                )}
              </div>
              {shouldShowInlineToolsPanel && (
                <>
                  <div
                    onMouseDown={handleResizeStart}
                    className="z-20 h-full w-[6px] flex-shrink-0 cursor-col-resize items-center justify-center bg-slate-900/50 transition-colors hover:bg-slate-800"
                  >
                    <div className="h-24 w-[2px] rounded-full bg-slate-700/80" />
                  </div>
                  <div className="relative w-[320px] min-w-[300px] max-w-sm flex-shrink-0 overflow-hidden border-l border-slate-800/60 bg-slate-950/40">
                    <div className="h-full min-h-0 overflow-y-auto">
                      <Outlet />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div
              className={`min-h-0 min-w-0 flex-1 overflow-hidden bg-slate-950 ${isFullscreen ? 'absolute inset-0' : ''}`}
            >
              {/* Route content - fills remaining space, scrollable */}
              <div
                className={`h-full w-full overflow-auto bg-slate-950 ${overlayActive ? 'webview--masked' : ''}`}
              >
                <Outlet />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel (Agent Console) */}
        {!isFullscreen && isDesktopLayout && rightPanelOpen && (
          <Suspense fallback={null}>
            <ErrorBoundary componentName="RightPanel">
              <div
                className="h-full min-h-0 w-[340px] max-w-[380px] overflow-y-auto border-l border-slate-800/60"
                data-sidebar
              >
                <RightPanel open={rightPanelOpen} onClose={() => setRightPanelOpen(false)} />
              </div>
            </ErrorBoundary>
          </Suspense>
        )}
      </div>

      {/* Bottom Chrome - Fixed footer, never scrolls */}
      <div
        ref={bottomChromeRef}
        id="bottomBar"
        className="fixed bottom-0 left-0 right-0 z-50 flex-none shrink-0 border-t border-slate-800 bg-slate-950"
        style={{
          boxShadow: '0 -6px 24px rgba(0,0,0,0.35)',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(10,12,16,0.96))',
        }}
      >
        {!isFullscreen && currentMode === 'Browse' && (
          <Suspense fallback={null}>
            <ErrorBoundary componentName="BottomStatus">
              <BottomStatus />
            </ErrorBoundary>
          </Suspense>
        )}
      </div>

      {!isFullscreen && !isDesktopLayout && showWebContent && (
        <MobileDock
          activeMode={currentMode}
          onSelectMode={setMode}
          onOpenLibrary={() => setUnifiedSidePanelOpen(true)}
          onOpenAgent={() => setRightPanelOpen(true)}
        />
      )}

      {/* Agent Overlay */}
      <Suspense fallback={null}>
        <Portal>
          <ErrorBoundary componentName="AgentOverlay">
            <AgentOverlay />
          </ErrorBoundary>
        </Portal>
      </Suspense>

      <Suspense fallback={null}>
        <Portal>
          <ErrorBoundary componentName="ClipperOverlay">
            <ClipperOverlay
              active={clipperActive}
              onCancel={() => setClipperActive(false)}
              onCreateHighlight={handleCreateHighlight}
            />
          </ErrorBoundary>
        </Portal>
      </Suspense>

      <Suspense fallback={null}>
        <Portal>
          <ErrorBoundary componentName="ReaderOverlay">
            <ReaderOverlay
              active={readerActive}
              onClose={() => setReaderActive(false)}
              tabId={tabsState.activeId}
              url={activeTab?.url}
            />
          </ErrorBoundary>
        </Portal>
      </Suspense>

      {graphDropHint && (
        <Portal>
          <div className="pointer-events-none fixed inset-0 z-tour flex items-center justify-center">
            <div className="rounded-3xl border border-purple-500/40 bg-purple-900/50 px-8 py-6 text-center shadow-[0_0_60px_rgba(168,85,247,0.35)] backdrop-blur-sm">
              <div className="text-[11px] uppercase tracking-[0.3em] text-purple-200/70">
                Tab graph
              </div>
              <div className="mt-2 text-lg font-semibold text-purple-100">
                Drop to map this tab&apos;s DNA
              </div>
              <div className="mt-1 text-xs text-purple-200/80">
                Release anywhere to open the graph overlay.
              </div>
            </div>
          </div>
        </Portal>
      )}

      <Suspense fallback={null}>
        <Portal>
          <ErrorBoundary componentName="TabGraphOverlay">
            <TabGraphOverlay />
          </ErrorBoundary>
        </Portal>
      </Suspense>

      {/* Voice Control - agentic + voice-first entrypoint */}
      {!isFullscreen && (
        <Suspense fallback={null}>
          <VoiceControl />
        </Suspense>
      )}

      {consentVisible && (
        <Suspense fallback={null}>
          <Portal>
            <ErrorBoundary componentName="ConsentDashboard">
              <ConsentDashboard />
            </ErrorBoundary>
          </Portal>
        </Suspense>
      )}

      {trustDashboardVisible && (
        <Suspense fallback={null}>
          <Portal>
            <ErrorBoundary componentName="TrustEthicsDashboard">
              <TrustEthicsDashboard />
            </ErrorBoundary>
          </Portal>
        </Suspense>
      )}

      {/* Research Tour - Only show if TOS and Cookie Consent are not showing */}
      {onboardingVisible && !showTOS && !showCookieConsent && (
        <Suspense fallback={null}>
          <Portal>
            <ErrorBoundary componentName="ResearchTour">
              <ResearchTour
                onClose={() => {
                  // Component already calls finishOnboarding() before onClose()
                  // This callback is just for cleanup if needed
                }}
              />
            </ErrorBoundary>
          </Portal>
        </Suspense>
      )}

      {/* Overlays */}
      {commandPaletteOpen && (
        <Suspense fallback={null}>
          <Portal>
            <ErrorBoundary componentName="CommandPalette">
              <CommandPalette onClose={() => setCommandPaletteOpen(false)} />
            </ErrorBoundary>
          </Portal>
        </Suspense>
      )}

      {permissionRequest && (
        <Suspense fallback={null}>
          <Portal>
            <ErrorBoundary componentName="PermissionPrompt">
              <PermissionPrompt
                request={permissionRequest}
                onClose={() => setPermissionRequest(null)}
              />
            </ErrorBoundary>
          </Portal>
        </Suspense>
      )}

      {consentRequest && (
        <Suspense fallback={null}>
          <Portal>
            <ErrorBoundary componentName="ConsentPrompt">
              <ConsentPrompt request={consentRequest} onClose={() => setConsentRequest(null)} />
            </ErrorBoundary>
          </Portal>
        </Suspense>
      )}
      {/* Crash Recovery Dialog */}
      {crashedTab && (
        <CrashRecoveryDialog
          tabId={crashedTab.tabId}
          reason={crashedTab.reason}
          exitCode={crashedTab.exitCode}
          onClose={() => setCrashedTab(null)}
          onReload={handleReload}
        />
      )}

      {/* Memory Sidebar - Collapsible in Research Mode, hidden in other modes */}
      {currentMode === 'Research' && (
        <ResearchMemoryPanel
          open={memorySidebarOpen}
          onClose={() => {
            setMemorySidebarOpen(false);
            // Dispatch event for TopBar to sync state
            window.dispatchEvent(
              new CustomEvent('memory-sidebar:toggle', { detail: { open: false } })
            );
          }}
          onCreateMemory={() => {
            // Handled by ResearchMemoryPanel internally via CreateMemoryDialog
          }}
        />
      )}
      {/* TradeSidebar - Hidden in Trade Mode (clean UI) */}
      {currentMode !== 'Trade' && (
        <TradeSidebar open={tradeSidebarOpen} onClose={() => setTradeSidebarOpen(false)} />
      )}

      {/* Regen Sidebar */}
      {!isFullscreen && isDesktopLayout && regenSidebarOpen && (
        <Suspense fallback={null}>
          <ErrorBoundary componentName="RegenSidebar">
            <RegenSidebarWrapper />
          </ErrorBoundary>
        </Suspense>
      )}

      {/* Redix Debug Panel - Dev Only */}
      {isDev && RedixDebugPanel && (
        <Suspense fallback={null}>
          <RedixDebugPanel open={redixDebugOpen} onClose={() => setRedixDebugOpen(false)} />
        </Suspense>
      )}
      <SuspensionIndicator />
      <BatteryIndicator />
      <div className="fixed bottom-6 left-1/2 z-[105] w-full max-w-3xl -translate-x-1/2 px-4">
        <MemoryMonitor />
      </div>

      {/* Agent action handlers */}
      <Suspense fallback={null}>
        <ErrorBoundary componentName="AgentActionHandlers">
          <AgentActionHandlersLazy />
        </ErrorBoundary>
      </Suspense>

      {restoreToast && (
        <Portal>
          <div className="fixed bottom-6 right-6 z-50">
            <div
              className={`rounded-xl border px-4 py-3 text-sm shadow-xl shadow-black/40 ${
                restoreToast.variant === 'success'
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                  : 'border-amber-400/40 bg-amber-500/15 text-amber-100'
              }`}
            >
              {restoreToast.message}
            </div>
          </div>
        </Portal>
      )}

      {/* Terms of Service Acceptance */}
      {showTOS && <TermsAcceptance onAccept={handleTOSAccept} onDecline={handleTOSDecline} />}

      {/* Cookie Consent Banner - Only show if TOS is not showing and onboarding is not active */}
      {showCookieConsent && !showTOS && !onboardingVisible && (
        <CookieConsent
          onAccept={preferences => {
            // Cookie consent accepted
            localStorage.setItem('regen:cookie-consent', JSON.stringify(preferences));
            // Force a small delay to ensure localStorage is written and state updates
            setTimeout(() => {
              setShowCookieConsent(false);
              // Cookie consent modal closed, onboarding should start now
              // Force a re-check of onboarding after cookie consent is closed
              // The useEffect should trigger automatically
              // State after cookie consent tracked internally
            }, 100);
          }}
          onDecline={() => {
            // Cookie consent declined
            // Save minimal consent (essential only)
            const minimal: CookiePreferences = {
              essential: true,
              analytics: false,
              functional: false,
              advertising: false,
              timestamp: Date.now(),
              version: '2025-12-17',
            };
            localStorage.setItem('regen:cookie-consent', JSON.stringify(minimal));
            setTimeout(() => {
              setShowCookieConsent(false);
              // Cookie consent modal closed, onboarding should start now
            }, 100);
          }}
        />
      )}
      <ToastHost />

      {/* Tier 1: Session Restore Modal */}
      <Suspense fallback={null}>
        <SessionRestoreModal />
      </Suspense>

      {/* Loop Resume Modal */}
      <LoopResumeModal open={loopResumeModalOpen} onClose={() => setLoopResumeModalOpen(false)} />

      {/* Workflow Marketplace */}
      <WorkflowMarketplace
        open={workflowMarketplaceOpen}
        onClose={() => setWorkflowMarketplaceOpen(false)}
      />

      <GlobalSearch />
      <WisprOrb />
      <OmniModeSwitcher />

      {/* REDIX MODE: Toggle for Redix mode (dev mode only, bottom-right) */}
      {isDevEnv() && (
        <div className="fixed bottom-4 right-4 z-50">
          <RedixModeToggle compact={true} showLabel={false} />
        </div>
      )}

      {/* Mini Hover AI - Text selection assistant */}
      <MiniHoverAI enabled={!overlayActive && showWebContent} />

      {/* Unified Side Panel - History, Bookmarks, Downloads */}
      {!isFullscreen && isDesktopLayout && (
        <UnifiedSidePanel
          open={unifiedSidePanelOpen}
          onClose={() => setUnifiedSidePanelOpen(false)}
        />
      )}

      {/* Tier 3: Global Command Bar */}
      <CommandBar />

      {/* Quick Command Palette (Cmd+K / Ctrl+K) */}
      <QuickCommandPalette />

      {/* Tier 3: Onboarding Flow - Legacy fallback, only if ResearchTour is not available */}
      {/* ResearchTour is the primary onboarding component, so this is kept as fallback only */}

      {/* Session Restore Prompt - Hidden in Browse mode (shows as toast instead) */}
      {currentMode !== 'Browse' && <SessionRestorePrompt />}

      {/* First Launch Installer */}
      {showInstaller && (
        <InstallProgressModal
          onComplete={async () => {
            const { markSetupComplete } = await import('../../core/installer/firstLaunch');
            markSetupComplete();
            setShowInstaller(false);
            toast.success('Setup complete! Your AI brain is ready.');
          }}
          onError={error => {
            console.error('[AppShell] Installer error:', error);
            toast.error(
              `Setup failed: ${error.message}. You can install Ollama manually from ollama.com`
            );
            // Don't close installer - let user retry or skip
          }}
        />
      )}

      {/* Connection Status Indicator */}
      <ConnectionStatus />
    </div>
  );
}

// Enable HMR for this component (must be after export)
if (import.meta.hot) {
  import.meta.hot.accept();
}
