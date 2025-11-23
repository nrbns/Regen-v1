/**
 * Real-time IPC Event System
 * Typed event listeners for live updates from main process
 */

// @ts-nocheck

export interface TabUpdate {
  id: string;
  title: string;
  url: string;
  active: boolean;
  favicon?: string;
  progress?: number;
  isLoading?: boolean;
  mode?: 'normal' | 'ghost' | 'private';
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  createdAt?: number;
  lastActiveAt?: number;
  sessionId?: string;
  profileId?: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  scope?: 'global' | 'session' | 'ephemeral';
  persistent?: boolean;
  system?: boolean;
}

export type ProfileKind = 'default' | 'work' | 'personal' | 'custom';

export interface ProfilePolicy {
  allowDownloads: boolean;
  allowPrivateWindows: boolean;
  allowGhostTabs: boolean;
  allowScreenshots: boolean;
  allowClipping: boolean;
}

export interface ProfileInfo {
  id: string;
  name: string;
  color?: string;
  kind?: ProfileKind;
  system?: boolean;
  policy?: ProfilePolicy;
  description?: string;
}

export type ProfilePolicyAction =
  | 'downloads'
  | 'private-window'
  | 'ghost-tab'
  | 'screenshot'
  | 'clip';

export interface ProfilePolicyBlockedEvent {
  profileId: string;
  action: ProfilePolicyAction;
}

export interface ShieldsCounters {
  tabId: string;
  ads: number;
  trackers: number;
  httpsUpgrades: number;
  cookiesBlocked: number;
}

export interface NetworkStatus {
  proxy?: {
    enabled: boolean;
    type: 'socks5' | 'http' | 'tor';
    host?: string;
  };
  tor?: {
    enabled: boolean;
    circuitEstablished: boolean;
    identity: string;
    progress?: number;
    bootstrapped?: boolean;
    error?: string;
    stub?: boolean;
  };
  vpn?: {
    enabled: boolean;
    connected: boolean;
    provider?: string;
    server?: string;
    interface?: string;
  };
  doh?: {
    enabled: boolean;
    provider: string;
  };
}

export interface PageWatcher {
  id: string;
  url: string;
  createdAt: number;
  intervalMinutes: number;
  lastCheckedAt?: number;
  lastHash?: string;
  lastChangeAt?: number;
  status: 'idle' | 'checking' | 'changed' | 'error';
  error?: string;
}

export interface DownloadUpdate {
  id: string;
  url: string;
  filename: string;
  status:
    | 'pending'
    | 'downloading'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'paused'
    | 'blocked'
    | 'verifying';
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number;
  path?: string;
  checksum?: string;
  createdAt?: number;
  speedBytesPerSec?: number;
  etaSeconds?: number;
  safety?: {
    status: 'pending' | 'clean' | 'warning' | 'blocked' | 'unknown';
    threatLevel?: 'low' | 'medium' | 'high' | 'critical';
    details?: string;
    recommendations?: string[];
    scannedAt?: number;
    quarantinePath?: string;
  };
}

export interface AgentStep {
  taskId: string;
  stepId: string;
  type: 'plan' | 'tool' | 'log' | 'result';
  content: string;
  timestamp: number;
}

export interface AgentPlan {
  taskId: string;
  steps: Array<{ id: string; description: string; tool?: string }>;
  budget: { tokens: number; seconds: number; requests: number };
  remaining: { tokens: number; seconds: number; requests: number };
}

export interface PermissionRequest {
  id: string;
  origin: string;
  permission: 'camera' | 'microphone' | 'filesystem' | 'notifications';
  callback: (granted: boolean, remember?: boolean) => void;
}

export interface ConsentRequest {
  id: string;
  action: {
    type: string;
    description: string;
    risk: 'low' | 'medium' | 'high';
  };
  callback: (approved: boolean) => void;
}

export interface TabNavigationState {
  tabId: string;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface EfficiencyModeEvent {
  mode: 'normal' | 'battery-saver' | 'extreme';
  label?: string | null;
  badge?: string | null;
  timestamp: number;
  snapshot: {
    batteryPct: number | null;
    charging: boolean | null;
    ramMb: number;
    cpuLoad1: number;
    activeTabs: number;
    carbonIntensity?: number | null;
    carbonRegion?: string | null;
  };
}

export interface EfficiencyAlertAction {
  id: string;
  label: string;
  type: 'mode' | 'hibernate';
  mode?: 'normal' | 'battery-saver' | 'extreme';
}

export interface EfficiencyAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  actions: EfficiencyAlertAction[];
}

export interface GameSandboxWarning {
  sandboxId: string;
  gameId: string;
  warnings: Array<{ severity: 'warning' | 'critical'; message: string }>;
  metrics?: {
    fps?: number;
    droppedFrames?: number;
    memoryMb?: number;
    cpuPercent?: number;
  };
}

export interface ShadowVisitedEntry {
  url: string;
  title: string;
  firstSeen: number;
}

export interface ShadowSessionSummaryEvent {
  sessionId: string;
  persona?: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  totalVisits: number;
  uniqueHosts: number;
  visited: ShadowVisitedEntry[];
  recommendations: string[];
}

export interface ShadowSessionEndedEvent {
  sessionId: string;
  summary: ShadowSessionSummaryEvent | null;
}

export interface PrivacyAuditSummary {
  score: number;
  grade: 'low' | 'moderate' | 'high';
  trackers: Array<{ host: string; count: number }>;
  thirdPartyHosts: Array<{ host: string; count: number }>;
  message: string;
  suggestions: string[];
  timestamp: number;
  ai?: {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    summary: string;
    actions: string[];
    issues: Array<{ category: string; detail: string; severity: 'low' | 'medium' | 'high' }>;
    generatedAt?: string;
  } | null;
}

// Event bus for renderer-side state management
class IPCEventBus {
  private listeners = new Map<string, Set<(data: any) => void>>();
  private ipcListeners = new Map<string, WeakSet<(data: any) => void>>(); // Use WeakSet to track IPC listeners
  private customEventHandlers = new Map<string, WeakMap<(data: any) => void, EventListener>>(); // Use WeakMap for custom handlers
  private registeredChannels = new Set<string>(); // Track which IPC channels we've registered globally
  private ipcHandlers = new Map<string, (event: any, data: any) => void>(); // Store IPC handlers in a Map instead of on window.ipc

  on<T>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Subscribe to IPC channel if window.ipc exists (only once per event channel)
    if (window.ipc && (window.ipc as any).on) {
      if (!this.ipcListeners.has(event)) {
        this.ipcListeners.set(event, new WeakSet());
      }
      const ipcCallbacks = this.ipcListeners.get(event)!;

      // Only register the channel once globally, not per callback
      if (!this.registeredChannels.has(event)) {
        this.registeredChannels.add(event);
        const globalHandler = (_event: any, data: any) => {
          // Emit to all listeners for this event
          const callbacks = this.listeners.get(event);
          if (callbacks) {
            const eventData = data || _event;
            callbacks.forEach(cb => {
              try {
                cb(eventData);
              } catch (error) {
                console.error(`Error in IPC event handler for ${event}:`, error);
              }
            });
          }
        };
        (window.ipc as any).on(event, globalHandler);
        // Store the handler in our Map instead of on window.ipc
        this.ipcHandlers.set(event, globalHandler);
      }

      // Track this callback (using WeakSet, so it's automatically cleaned up)
      ipcCallbacks.add(callback);
    }

    // Also listen for custom events (only once per callback)
    if (!this.customEventHandlers.has(event)) {
      this.customEventHandlers.set(event, new WeakMap());
    }
    const customHandlers = this.customEventHandlers.get(event)!;
    if (!customHandlers.has(callback)) {
      const handler = (e: CustomEvent) => {
        try {
          callback(e.detail);
        } catch (error) {
          console.error(`Error in custom event handler for ${event}:`, error);
        }
      };
      customHandlers.set(callback, handler);
      window.addEventListener(event, handler as EventListener);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);

      // Remove custom event listener
      const customHandlers = this.customEventHandlers.get(event);
      if (customHandlers?.has(callback)) {
        const handler = customHandlers.get(callback);
        if (handler) {
          window.removeEventListener(event, handler as EventListener);
        }
      }
    };
  }

  emit(event: string, data: any) {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
    // Note: IPC listeners are managed globally, not per-callback
    // They will be cleaned up when the channel is no longer needed
  }

  // Cleanup all listeners for an event (call when component unmounts or event is no longer needed)
  removeAllListeners(event: string) {
    this.listeners.delete(event);
    this.ipcListeners.delete(event);
    this.customEventHandlers.delete(event);
    this.registeredChannels.delete(event);

    // Remove global IPC handler if it exists
    if (window.ipc && (window.ipc as any).removeListener) {
      const handler = this.ipcHandlers.get(event);
      if (handler) {
        (window.ipc as any).removeListener(event, handler);
        this.ipcHandlers.delete(event);
      }
    }
  }
}

export const ipcEvents = new IPCEventBus();

// Subscribe to typed IPC channels
if (typeof window !== 'undefined') {
  // Listen for tab updates
  if (window.ipc && (window.ipc as any).on) {
    const tabUpdateHandler = (_event: any, tabs: any) => {
      // Handle both direct data and event+data formats
      const tabList = Array.isArray(tabs) ? tabs : Array.isArray(_event) ? _event : [];
      ipcEvents.emit('tabs:updated', tabList);
    };
    const tabProgressHandler = (_event: any, data: any) => {
      const progressData = data || _event;
      ipcEvents.emit('tabs:progress', progressData);
    };
    const navigationStateHandler = (_event: any, data: any) => {
      const navData = data || _event;
      ipcEvents.emit('tabs:navigation-state', navData);
    };

    // Listen to both legacy and typed IPC channels
    (window.ipc as any).on('tabs:updated', tabUpdateHandler);
    (window.ipc as any).on('ob://ipc/v1/tabs:updated', tabUpdateHandler);
    (window.ipc as any).on('tabs:progress', tabProgressHandler);
    (window.ipc as any).on('ob://ipc/v1/tabs:progress', tabProgressHandler);
    (window.ipc as any).on('tabs:navigation-state', navigationStateHandler);
    (window.ipc as any).on('ob://ipc/v1/tabs:navigation-state', navigationStateHandler);

    // Proper cleanup using Page Lifecycle API instead of unload
    const cleanup = () => {
      if (window.ipc && (window.ipc as any).removeListener) {
        (window.ipc as any).removeListener('tabs:updated', tabUpdateHandler);
        (window.ipc as any).removeListener('ob://ipc/v1/tabs:updated', tabUpdateHandler);
        (window.ipc as any).removeListener('tabs:progress', tabProgressHandler);
        (window.ipc as any).removeListener('ob://ipc/v1/tabs:progress', tabProgressHandler);
        (window.ipc as any).removeListener('tabs:navigation-state', navigationStateHandler);
        (window.ipc as any).removeListener(
          'ob://ipc/v1/tabs:navigation-state',
          navigationStateHandler
        );
      }
    };

    // Use pagehide event (modern alternative to unload)
    if ('onpagehide' in window) {
      window.addEventListener('pagehide', cleanup);
    }
    // Fallback for browsers that don't support pagehide
    if (typeof document !== 'undefined' && 'visibilityState' in document) {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          // Don't cleanup on visibility change, only on actual page unload
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  }

  // Listen for shields counters
  window.addEventListener('shields:counters', ((e: CustomEvent<ShieldsCounters>) => {
    ipcEvents.emit('shields:counters', e.detail);
  }) as EventListener);

  // Listen for network status
  window.addEventListener('net:status', ((e: CustomEvent<NetworkStatus>) => {
    ipcEvents.emit('net:status', e.detail);
  }) as EventListener);

  // Listen for downloads
  window.addEventListener('downloads:started', ((e: CustomEvent<DownloadUpdate>) => {
    ipcEvents.emit('downloads:started', e.detail);
  }) as EventListener);
  window.addEventListener('downloads:progress', ((e: CustomEvent<DownloadUpdate>) => {
    ipcEvents.emit('downloads:progress', e.detail);
  }) as EventListener);
  window.addEventListener('downloads:done', ((e: CustomEvent<DownloadUpdate>) => {
    ipcEvents.emit('downloads:done', e.detail);
  }) as EventListener);

  // Listen for agent events
  window.addEventListener('agent:plan', ((e: CustomEvent<AgentPlan>) => {
    ipcEvents.emit('agent:plan', e.detail);
  }) as EventListener);
  window.addEventListener('agent:step', ((e: CustomEvent<AgentStep>) => {
    ipcEvents.emit('agent:step', e.detail);
  }) as EventListener);
  window.addEventListener('agent:log', ((e: CustomEvent<AgentStep>) => {
    ipcEvents.emit('agent:log', e.detail);
  }) as EventListener);
  window.addEventListener('agent:consent:request', ((e: CustomEvent<ConsentRequest>) => {
    ipcEvents.emit('agent:consent:request', e.detail);
  }) as EventListener);

  // Listen for streaming AI events via IPC
  if (window.ipc && (window.ipc as any).on) {
    (window.ipc as any).on('agent:stream:chunk', (_event: any, data: any) => {
      ipcEvents.emit('agent:stream:chunk', data);
    });
    (window.ipc as any).on('agent:stream:done', (_event: any, data: any) => {
      ipcEvents.emit('agent:stream:done', data);
    });
    (window.ipc as any).on('agent:stream:error', (_event: any, data: any) => {
      ipcEvents.emit('agent:stream:error', data);
    });
  }

  // Listen for permission requests
  window.addEventListener('permissions:request', ((e: CustomEvent<PermissionRequest>) => {
    ipcEvents.emit('permissions:request', e.detail);
  }) as EventListener);

  // Listen for fullscreen changes
  window.addEventListener('app:fullscreen-changed', ((e: CustomEvent<{ fullscreen: boolean }>) => {
    ipcEvents.emit('app:fullscreen-changed', e.detail);
  }) as EventListener);

  window.addEventListener('games:sandbox:warning', ((e: CustomEvent<GameSandboxWarning>) => {
    ipcEvents.emit('games:sandbox:warning', e.detail);
  }) as EventListener);

  // Also listen via IPC if available
  if (window.ipc && (window.ipc as any).on) {
    const fullscreenHandler = (data: { fullscreen: boolean }) => {
      ipcEvents.emit('app:fullscreen-changed', data);
    };
    (window.ipc as any).on('app:fullscreen-changed', fullscreenHandler);

    const sandboxWarningHandler = (_event: any, data: GameSandboxWarning) => {
      ipcEvents.emit('games:sandbox:warning', data);
    };
    (window.ipc as any).on('games:sandbox:warning', sandboxWarningHandler);

    // Cleanup handler for fullscreen events
    const cleanupFullscreen = () => {
      if (window.ipc && (window.ipc as any).removeListener) {
        (window.ipc as any).removeListener('app:fullscreen-changed', fullscreenHandler);
        (window.ipc as any).removeListener('games:sandbox:warning', sandboxWarningHandler);
      }
    };

    // Use pagehide for cleanup (modern alternative to unload)
    if ('onpagehide' in window) {
      window.addEventListener('pagehide', cleanupFullscreen, { once: true });
    }
  }
}

// React hooks for easy component integration
// Note: This hook must be imported and used in React components
// The actual hook implementation is in a separate file to avoid require() in browser
