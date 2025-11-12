/**
 * AppShell - Main layout container with all components wired
 */

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { PermissionRequest, ConsentRequest, ipcEvents } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { ResearchHighlight } from '../../types/research';
import { Portal } from '../common/Portal';
import { formatDistanceToNow } from 'date-fns';
import { useTabGraphStore } from '../../state/tabGraphStore';
import { isDevEnv } from '../../lib/env';
import { TabContentSurface } from './TabContentSurface';
import { VoiceTips } from '../voice/VoiceTips';

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
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode; componentName?: string }) {
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
      errorInfo,
    );
    this.setState({ error, errorInfo: errorInfo.componentStack ?? undefined });
    
    // Optional: Send to error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
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
        console.info('[Diagnostics] Summary:', result?.diagnostics);
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
                  Something went wrong{this.props.componentName ? ` inside ${this.props.componentName}` : ''}.
                </h1>
                {this.state.error?.message && (
                  <p className="mt-2 text-sm text-red-100/80">{this.state.error.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-400">
                  Try reloading the interface. You can also copy diagnostics or inspect the latest logs to share with the
                  team.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={this.handleReload}
                className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 hover:border-blue-500/70 transition-colors"
              >
                Reload app
              </button>
              <button
                onClick={this.handleCopyDiagnostics}
                disabled={this.state.copying}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  this.state.copying
                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200/60 cursor-wait'
                    : 'border-indigo-500/50 bg-indigo-500/10 text-indigo-100 hover:border-indigo-500/70'
                }`}
              >
                {this.state.copying ? 'Copying…' : 'Copy diagnostics'}
              </button>
              <button
                onClick={this.handleOpenLogs}
                className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:border-emerald-500/70 transition-colors"
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
const TopNav = React.lazy(() => import('./TopNav').then(m => ({ default: m.TopNav })));
const TabStrip = React.lazy(() => import('./TabStrip').then(m => ({ default: m.TabStrip })));
const RightPanel = React.lazy(() => import('./RightPanel').then(m => ({ default: m.RightPanel })));
const BottomStatus = React.lazy(() => import('./BottomStatus').then(m => ({ default: m.BottomStatus })));
const CommandPalette = React.lazy(() => import('./CommandPalette').then(m => ({ default: m.CommandPalette })));
const PermissionPrompt = React.lazy(() => import('../Overlays/PermissionPrompt').then(m => ({ default: m.PermissionPrompt })));
const ConsentPrompt = React.lazy(() => import('../Overlays/ConsentPrompt').then(m => ({ default: m.ConsentPrompt })));
const AgentOverlay = React.lazy(() => import('../AgentOverlay').then(m => ({ default: m.AgentOverlay })));
const ClipperOverlay = React.lazy(() => import('../Overlays/ClipperOverlay').then(m => ({ default: m.ClipperOverlay })));
const ReaderOverlay = React.lazy(() => import('../Overlays/ReaderOverlay').then(m => ({ default: m.ReaderOverlay })));
const TabGraphOverlay = React.lazy(() => import('./TabGraphOverlay').then(m => ({ default: m.TabGraphOverlay })));
const ConsentDashboard = React.lazy(() => import('../Consent/ConsentDashboard').then(m => ({ default: m.ConsentDashboard })));
const TrustEthicsDashboard = React.lazy(() => import('../trust/TrustEthicsDashboard').then(m => ({ default: m.TrustEthicsDashboard })));
const OnboardingTour = React.lazy(() => import('../Onboarding/OnboardingTour').then(m => ({ default: m.OnboardingTour })));

import { useOnboardingStore, onboardingStorage } from '../../state/onboardingStore';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';

export function AppShell() {
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
  const [consentRequest, setConsentRequest] = useState<ConsentRequest | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [clipperActive, setClipperActive] = useState(false);
  const [readerActive, setReaderActive] = useState(false);
  const onboardingVisible = useOnboardingStore((state) => state.visible);
  const startOnboarding = useOnboardingStore((state) => state.start);
  const finishOnboarding = useOnboardingStore((state) => state.finish);
  
  // Debug: log visibility changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[AppShell] onboardingVisible changed:', onboardingVisible);
    }
  }, [onboardingVisible]);
  const [graphDropHint, setGraphDropHint] = useState(false);
  useEffect(() => {
    let dragCounter = 0;

    const isGraphDrag = (event: DragEvent) => {
      const types = event.dataTransfer?.types;
      if (!types) return false;
      return Array.from(types).includes('application/x-omnibrowser-tab-id');
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
      const tabId = event.dataTransfer?.getData('application/x-omnibrowser-tab-id');
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
  const consentVisible = useConsentOverlayStore((state) => state.visible);
  const trustDashboardVisible = useTrustDashboardStore((state) => state.visible);
  const tabsState = useTabsStore();
  const activeTab = tabsState.tabs.find(tab => tab.id === tabsState.activeId);
  const [contentSplit, setContentSplit] = useState(0.62);
  const [isResizingContent, setIsResizingContent] = useState(false);
  const overlayActive =
    commandPaletteOpen ||
    Boolean(permissionRequest) ||
    Boolean(consentRequest) ||
    clipperActive ||
    readerActive;
  const activeTabUrl = activeTab?.url ?? '';
  const showWebContent =
    Boolean(activeTabUrl) &&
    !activeTabUrl.startsWith('ob://') &&
    !activeTabUrl.startsWith('about:') &&
    !activeTabUrl.startsWith('chrome://') &&
    !activeTabUrl.startsWith('edge://') &&
    !activeTabUrl.startsWith('app://');
  const handleResizeStart = useCallback(() => {
    if (!showWebContent) return;
    setIsResizingContent(true);
  }, [showWebContent]);

  useEffect(() => {
    if (!isResizingContent) return;

    const handlePointerMove = (event: MouseEvent) => {
      setContentSplit((prev) => {
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

  const [restoreSummary, setRestoreSummary] = useState<{ updatedAt: number; windowCount: number; tabCount: number } | null>(null);
  const [restoreDismissed, setRestoreDismissed] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'restoring'>('idle');
  const [restoreToast, setRestoreToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null);
  const restoreRelativeTime = useMemo(() => {
    if (!restoreSummary) return null;
    try {
      return formatDistanceToNow(new Date(restoreSummary.updatedAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [restoreSummary]);

  // Auto-start onboarding for new users (with a small delay to let UI settle)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      if (!onboardingStorage.isCompleted() && !onboardingVisible) {
        startOnboarding();
      }
    }, 800); // Delay to let UI render first
    return () => clearTimeout(timer);
  }, [onboardingVisible, startOnboarding]);

  useEffect(() => {
    if (restoreDismissed) return;
    let cancelled = false;
    ipc.sessionState
      .summary()
      .then((res) => {
        if (cancelled) return;
        const summary = res?.summary;
        if (summary && summary.tabCount > 0) {
          setRestoreSummary(summary);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRestoreSummary(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [restoreDismissed]);

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
  useIPCEvent<PermissionRequest>('permissions:request', (request) => {
    setPermissionRequest(request);
  }, []);

  // Listen for consent requests
  useIPCEvent<any>(
    'agent:consent:request',
    (payload) => {
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
    [],
  );

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreen = (data: { fullscreen: boolean }) => {
      setIsFullscreen(data.fullscreen);
    };
    
    // Use the IPC event bus
    const unsubscribe = ipcEvents.on<{ fullscreen: boolean }>('app:fullscreen-changed', handleFullscreen);
    
    return unsubscribe;
  }, []);

  // Global keyboard shortcuts (Windows/Linux: Ctrl, macOS: Cmd)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // ⌘K / Ctrl+K: Command Palette
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
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
        ipc.tabs.create('about:blank').catch(console.error);
        return;
      }

      // ⌘W / Ctrl+W: Close Tab
      if (modifier && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        const state = useTabsStore.getState();
        if (state.activeId) {
          ipc.tabs.close({ id: state.activeId }).catch(console.error);
        }
        return;
      }

      // ⌘⇧T / Ctrl+Shift+T: Reopen Closed Tab
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        // Would reopen last closed tab - need to implement closed tab history
        return;
      }

      // ⌘⇧A / Ctrl+Shift+A: Toggle Agent Console
      if (modifier && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setRightPanelOpen(prev => !prev);
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

      // Alt+← / ⌘←: Go back (handled by TopNav)
      // Alt+→ / ⌘→: Go forward (handled by TopNav)
      // Ctrl+R / ⌘R: Refresh (handled by TopNav)

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
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, permissionRequest, consentRequest, rightPanelOpen, clipperActive]);

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

  const handleRestoreSession = async () => {
    if (!restoreSummary || restoreStatus === 'restoring') return;
    setRestoreStatus('restoring');
    try {
      const result = await ipc.sessionState.restore();
      if (result?.restored) {
        const restoredCount = result.tabCount ?? restoreSummary.tabCount ?? 0;
        setRestoreToast({
          message: `Restored ${restoredCount} tab${restoredCount === 1 ? '' : 's'} from last session.`,
          variant: 'success',
        });
        setRestoreSummary(null);
        setRestoreDismissed(true);
      } else if (result?.error) {
        setRestoreToast({
          message: `Restore failed: ${result.error}`,
          variant: 'error',
        });
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

  const handleDismissRestore = () => {
    setRestoreDismissed(true);
    setRestoreSummary(null);
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#1A1D28] text-gray-100">
      {/* Top Navigation - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="flex-none">
          <Suspense fallback={<div style={{ height: '40px', backgroundColor: '#0f172a' }} />}>
            <ErrorBoundary
              componentName="TopNav"
              fallback={
                <div style={{ height: '40px', backgroundColor: '#0f172a', padding: '8px', color: '#94a3b8' }}>
                  Navigation Error
                </div>
              }
            >
              <TopNav
                onAgentToggle={() => setRightPanelOpen(!rightPanelOpen)}
                onCommandPalette={() => setCommandPaletteOpen(true)}
                onClipperToggle={() => {
                  if (tabsState.activeId) {
                    setClipperActive(true);
                  }
                }}
                onReaderToggle={() => {
                  if (tabsState.activeId) {
                    setReaderActive(true);
                  }
                }}
              />
            </ErrorBoundary>
          </Suspense>
        </div>
      )}

      {/* Main Layout - Full Width (No Sidebar) */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Center Content - Full Width */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {!isFullscreen && restoreSummary && !restoreDismissed && (
            <div className="px-4 pt-3">
              <div className="flex flex-col gap-3 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-blue-100">Restore your last browsing session?</p>
                  <p className="text-xs text-blue-200">
                    Last saved {restoreRelativeTime ?? 'recently'} • {restoreSummary.windowCount} window
                    {restoreSummary.windowCount === 1 ? '' : 's'}, {restoreSummary.tabCount} tab
                    {restoreSummary.tabCount === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreSession}
                    disabled={restoreStatus === 'restoring'}
                    className="inline-flex items-center rounded-lg border border-blue-500/60 bg-blue-600/20 px-3 py-1.5 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {restoreStatus === 'restoring' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissRestore}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700/80"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Tab Strip - Hidden in fullscreen */}
          {!isFullscreen && (
        <Suspense fallback={null}>
          <ErrorBoundary componentName="TabStrip">
            <TabStrip />
          </ErrorBoundary>
        </Suspense>
          )}

          {/* Route/Web Content */}
          {showWebContent ? (
            <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
              <div
                className="min-h-0 min-w-[320px] flex-shrink-0 flex-grow-0"
                style={{ width: `${Math.round(contentSplit * 100)}%` }}
              >
                <TabContentSurface tab={activeTab} overlayActive={overlayActive} />
              </div>
              <div
                onMouseDown={handleResizeStart}
                className="z-20 flex h-full w-[6px] cursor-col-resize items-center justify-center bg-slate-900/50 transition-colors hover:bg-slate-800"
              >
                <div className="h-24 w-[2px] rounded-full bg-slate-700/80" />
              </div>
              <div
                className="relative min-h-0 min-w-[260px] flex-1 overflow-hidden"
                style={{ width: `${Math.round((1 - contentSplit) * 100)}%` }}
              >
                <div className={`h-full min-h-0 overflow-auto border-l border-slate-800/60 bg-slate-950/40`}>
                  <Outlet />
                </div>
              </div>
            </div>
          ) : (
            <div className={`relative flex-1 min-h-0 min-w-0 overflow-hidden ${isFullscreen ? 'absolute inset-0' : ''}`}>
              <div className={`h-full min-h-0 overflow-auto ${overlayActive ? 'webview--masked' : ''}`}>
                <Outlet />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel (Agent Console) - Hidden in fullscreen */}
        {!isFullscreen && (
        <Suspense fallback={null}>
          <ErrorBoundary componentName="RightPanel">
            <div className="h-full min-h-0 w-[340px] max-w-[380px] overflow-y-auto border-l border-slate-800/60">
              <RightPanel 
                open={rightPanelOpen}
                onClose={() => setRightPanelOpen(false)}
              />
            </div>
          </ErrorBoundary>
        </Suspense>
        )}
      </div>

      {/* Bottom Status Bar - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="flex-none">
          <Suspense fallback={null}>
            <ErrorBoundary componentName="BottomStatus">
              <BottomStatus />
            </ErrorBoundary>
          </Suspense>
        </div>
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
              <div className="text-[11px] uppercase tracking-[0.3em] text-purple-200/70">Tab graph</div>
              <div className="mt-2 text-lg font-semibold text-purple-100">Drop to map this tab&apos;s DNA</div>
              <div className="mt-1 text-xs text-purple-200/80">Release anywhere to open the graph overlay.</div>
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

      {/* Regen Whisper - Voice Tips */}
      {!isFullscreen && (
        <Suspense fallback={null}>
          <ErrorBoundary componentName="VoiceTips">
            <VoiceTips />
          </ErrorBoundary>
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

      {onboardingVisible && (
        <Suspense fallback={null}>
          <Portal>
            <ErrorBoundary componentName="OnboardingTour">
              <OnboardingTour
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
              <ConsentPrompt 
                request={consentRequest}
                onClose={() => setConsentRequest(null)}
              />
            </ErrorBoundary>
          </Portal>
        </Suspense>
      )}
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
    </div>
  );
}
