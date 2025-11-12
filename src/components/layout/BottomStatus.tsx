/**
 * BottomStatus - Status bar with live indicators and AI prompt
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Send, Cpu, MemoryStick, Network, Brain, Shield, Activity, AlertTriangle, X, RefreshCw, Wifi, MoonStar, FileText, Loader2, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { EfficiencyModeEvent, NetworkStatus, EfficiencyAlert, EfficiencyAlertAction, ShadowSessionEndedEvent } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { PrivacySwitch } from '../PrivacySwitch';
import { useEfficiencyStore } from '../../state/efficiencyStore';
import { usePrivacyStore } from '../../state/privacyStore';
import { useShadowStore } from '../../state/shadowStore';
import { SymbioticVoiceCompanion } from '../voice';
import { useMetricsStore } from '../../state/metricsStore';
import { getEnvVar, isElectronRuntime } from '../../lib/env';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';

export function BottomStatus() {
  const { activeId } = useTabsStore();
  const [prompt, setPrompt] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const extraRef = useRef<HTMLDivElement | null>(null);
  const [dohStatus, setDohStatus] = useState({ enabled: false, provider: 'cloudflare' });
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [modelReady] = useState(true);
  const [privacyMode, setPrivacyMode] = useState<'Normal' | 'Ghost' | 'Tor'>('Normal');
  const [efficiencyAlert, setEfficiencyAlert] = useState<EfficiencyAlert | null>(null);
  const efficiencyLabel = useEfficiencyStore((state) => state.label);
  const efficiencyBadge = useEfficiencyStore((state) => state.badge);
  const efficiencySnapshot = useEfficiencyStore((state) => state.snapshot);
  const setEfficiencyEvent = useEfficiencyStore((state) => state.setEvent);
  const shadowSessionId = useShadowStore((state) => state.activeSessionId);
  const shadowLoading = useShadowStore((state) => state.loading);
  const shadowSummary = useShadowStore((state) => state.summary);
  const handleShadowEnded = useShadowStore((state) => state.handleSessionEnded);
  const clearShadowSummary = useShadowStore((state) => state.clearSummary);
  const carbonIntensity = efficiencySnapshot.carbonIntensity ?? null;
  const torStatus = usePrivacyStore((state) => state.tor);
  const vpnStatus = usePrivacyStore((state) => state.vpn);
  const refreshTor = usePrivacyStore((state) => state.refreshTor);
  const refreshVpn = usePrivacyStore((state) => state.refreshVpn);
  const startTor = usePrivacyStore((state) => state.startTor);
  const stopTor = usePrivacyStore((state) => state.stopTor);
  const newTorIdentity = usePrivacyStore((state) => state.newTorIdentity);
  const checkVpn = usePrivacyStore((state) => state.checkVpn);
  const pushMetricSample = useMetricsStore((state) => state.pushSample);
  const latestSample = useMetricsStore((state) => state.latest);
  const metricsHistory = useMetricsStore((state) => state.history);
  const isElectron = useMemo(() => isElectronRuntime(), []);
  const apiBaseUrl = useMemo(
    () => getEnvVar('API_BASE_URL') ?? getEnvVar('OMNIBROWSER_API_URL') ?? getEnvVar('OB_API_BASE_URL') ?? null,
    [],
  );
  const metricsSocketRef = useRef<WebSocket | EventSource | null>(null);
  const openTrustDashboard = useTrustDashboardStore((state) => state.open);
  const trustRefresh = useTrustDashboardStore((state) => state.refresh);
  const trustBadgeData = useTrustDashboardStore((state) => ({
    pending: state.consentStats.pending,
    blocked: state.blockedSummary.trackers,
    loading: state.loading,
  }));

  // Listen for network status
  useIPCEvent<NetworkStatus>('net:status', (status) => {
    if (status.doh) {
      setDohStatus(status.doh);
    }
    if (status.tor?.enabled && status.tor.circuitEstablished) {
      setPrivacyMode('Tor');
    } else if (status.proxy?.enabled) {
      setPrivacyMode('Ghost');
    } else {
      setPrivacyMode('Normal');
    }
  }, []);

  useIPCEvent<EfficiencyModeEvent>('efficiency:mode', (event) => {
    setEfficiencyEvent(event);
  }, [setEfficiencyEvent]);

  useIPCEvent<EfficiencyAlert>('efficiency:alert', (alert) => {
    setEfficiencyAlert(alert);
  }, []);

  useIPCEvent<ShadowSessionEndedEvent>('private:shadow:ended', (payload) => {
    handleShadowEnded(payload);
  }, [handleShadowEnded]);

  useEffect(() => {
    void refreshTor();
    void refreshVpn();
    const interval = window.setInterval(() => {
      void refreshTor();
      void refreshVpn();
    }, 20000);
    return () => window.clearInterval(interval);
  }, [refreshTor, refreshVpn]);

  useEffect(() => {
    const startupTimer = window.setTimeout(() => {
      void trustRefresh();
    }, 450);
    const interval = window.setInterval(() => {
      void trustRefresh();
    }, 60000);
    return () => {
      window.clearTimeout(startupTimer);
      window.clearInterval(interval);
    };
  }, [trustRefresh]);

  useEffect(() => {
    if (latestSample) {
      setCpuUsage((prev) => smoothValue(prev, latestSample.cpu));
      setMemoryUsage((prev) => smoothValue(prev, latestSample.memory));
    }
  }, [latestSample]);

  useEffect(() => {
    if (!isElectron) {
      if (!apiBaseUrl) {
        console.warn('[metrics] API_BASE_URL not configured; skipping metrics websocket.');
        return;
      }
      const socket = new WebSocket(`${apiBaseUrl.replace(/^http/, 'ws')}/ws/metrics`);
      metricsSocketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'metrics') return;
          const sample = {
            timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
            cpu: typeof data.cpu === 'number' ? data.cpu : 0,
            memory: typeof data.memory === 'number' ? data.memory : 0,
            carbonIntensity: typeof data.carbon_intensity === 'number' ? data.carbon_intensity : undefined,
          };
          pushMetricSample(sample);
        } catch (error) {
          console.warn('[metrics] Failed to parse message', error);
        }
      };

      socket.onopen = () => {
        console.info('[metrics] Connected to metrics websocket');
      };

      socket.onerror = (event) => {
        console.warn('[metrics] Metrics websocket error', event);
      };

      socket.onclose = () => {
        console.info('[metrics] Metrics websocket closed');
      };

      return () => {
        socket.close();
        metricsSocketRef.current = null;
      };
    }
  }, [isElectron, apiBaseUrl, pushMetricSample]);

  useEffect(() => {
    let isMounted = true;
    
    // Wait a bit for IPC to be ready before making calls
    const initStatus = async () => {
      if (!isMounted) return;
      
      // Wait for IPC to be ready
      if (!window.ipc || typeof window.ipc.invoke !== 'function') {
        // Retry after a delay
        setTimeout(initStatus, 500);
        return;
      }
      
      // Load DoH status
      try {
        const status = await ipc.dns.status();
        if (isMounted && status && typeof status === 'object') {
          setDohStatus(status as any);
        }
      } catch {
        // Silently handle - set default state on error
        if (isMounted) {
          setDohStatus({ enabled: false, provider: 'cloudflare' });
        }
      }

      // Check model status (would check Ollama heartbeat)
      // ipc.agent.getModelStatus().then(status => {
      //   setModelReady(status.ready);
      // }).catch(() => {});
    };
    
    // Delay initial load to allow IPC to initialize
    setTimeout(initStatus, 400);
    
    return () => {
      isMounted = false;
    };
  }, []);

  const privacyModeColors = {
    Normal: 'text-gray-400',
    Ghost: 'text-blue-400',
    Tor: 'text-purple-400',
  };

  const trustVariant =
    trustBadgeData.pending > 0 ? 'warning' : trustBadgeData.blocked > 0 ? 'info' : 'default';
  const trustDescription =
    trustBadgeData.pending > 0
      ? `${trustBadgeData.pending} pending`
      : trustBadgeData.blocked > 0
        ? `${trustBadgeData.blocked} trackers blocked`
        : 'Ledger clean';

  const torStatusLabel = torStatus.stub
    ? 'Tor: Stub'
    : torStatus.running
      ? torStatus.circuitEstablished
        ? 'Tor: On'
        : `Tor: ${Math.round(torStatus.progress)}%`
      : 'Tor: Off';
  const torTooltip = torStatus.error
    ? `Tor warning: ${torStatus.error}`
    : torStatus.stub
      ? 'Tor binary not found; using stub mode for UI only.'
      : torStatus.running
        ? torStatus.circuitEstablished
          ? 'Tor circuit established. Click to stop.'
          : 'Tor starting up. Click to stop.'
        : 'Route traffic through Tor. Click to enable.';

  const vpnTooltip = vpnStatus.connected
    ? `VPN connected${vpnStatus.name ? ` (${vpnStatus.name})` : ''}. Click to re-check.`
    : 'Check whether a system VPN is active.';

  const severityStyles: Record<'info' | 'warning' | 'critical', string> = {
    info: 'bg-blue-500/10 border-blue-400/40 text-blue-100',
    warning: 'bg-amber-500/10 border-amber-400/40 text-amber-100',
    critical: 'bg-red-500/10 border-red-400/40 text-red-100',
  };
 
  const clampPercent = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  };

  const smoothValue = (previous: number, next: number, factor = 0.35) => {
    if (!Number.isFinite(previous)) return next;
    return previous + (next - previous) * factor;
  };

  const sparklinePoints = useMemo(() => metricsHistory.map((sample) => clampPercent(sample.cpu)), [metricsHistory]);

  const StatusMeter = ({
    icon: Icon,
    label,
    value,
    percent,
    gradient = 'from-blue-500 via-cyan-500 to-blue-500',
    title,
    onClick,
    sparklinePoints,
  }: {
    icon: LucideIcon;
    label: string;
    value: string;
    percent?: number;
    gradient?: string;
    title?: string;
    onClick?: () => void;
    sparklinePoints?: number[];
  }) => {
    const Component = onClick ? 'button' : 'div';
    const pct = clampPercent(percent);

    return (
      <Component
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        title={title}
        className={`flex items-center gap-1.5 rounded-full border border-gray-700/60 bg-gray-800/60 px-2 py-1 text-xs text-gray-200 ${
          onClick ? 'cursor-pointer transition-colors hover:border-gray-500/70 focus:outline-none focus:ring-1 focus:ring-blue-400/40' : ''
        }`}
      >
        <Icon size={12} className="text-gray-400" />
        <span className="font-semibold text-gray-100">{label}</span>
        <span className="text-[11px] opacity-75">{value}</span>
        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-700">
          <div className={`h-full bg-gradient-to-r ${gradient}`} style={{ width: `${pct}%` }} />
        </div>
        {sparklinePoints && sparklinePoints.length > 4 && (
          <svg viewBox="0 0 40 12" className="ml-2 h-3 w-10 text-blue-400/70">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparklinePoints
                .slice(-12)
                .map((value, index, arr) => {
                  const x = (index / Math.max(arr.length - 1, 1)) * 40;
                  const y = 12 - (value / 100) * 12;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          </svg>
        )}
      </Component>
    );
  };

  const StatusBadge = ({
    icon: Icon,
    label,
    description,
    variant = 'default',
    title,
    onClick,
    pulse = false,
    loading = false,
    className,
  }: {
    icon: LucideIcon;
    label: string;
    description?: string;
    variant?: 'default' | 'positive' | 'warning' | 'danger' | 'info';
    title?: string;
    onClick?: () => void;
    pulse?: boolean;
    loading?: boolean;
    className?: string;
  }) => {
    const palette: Record<string, string> = {
      default: 'border-gray-700/60 bg-gray-800/60 text-gray-200',
      positive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
      warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
      danger: 'border-red-500/30 bg-red-500/10 text-red-100',
      info: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
    };

    const Component = onClick ? 'button' : 'div';

    return (
      <Component
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        title={title}
        className={`${palette[variant]} ${className ?? ''} flex items-center gap-1.5 rounded-full px-2 py-1 text-xs ${
          onClick ? 'cursor-pointer transition-colors hover:border-gray-500/70 focus:outline-none focus:ring-1 focus:ring-blue-400/30' : ''
        }`}
      >
        <Icon size={12} className="opacity-80" />
        <span className="font-medium">{label}</span>
        {description && <span className="text-[11px] opacity-75">{description}</span>}
        {loading && <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />}
        {pulse && (
          <motion.span
            className="inline-flex h-1.5 w-1.5 rounded-full bg-current"
            animate={{ 
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </Component>
    );
  };

  useEffect(() => {
    if (!efficiencyAlert) return;
    const timer = setTimeout(() => {
      setEfficiencyAlert(null);
    }, 20000);
    return () => clearTimeout(timer);
  }, [efficiencyAlert]);

  const handleEfficiencyAction = async (action: EfficiencyAlertAction) => {
    try {
      if (action.type === 'mode' && action.mode) {
        await ipc.efficiency.applyMode(action.mode);
      } else if (action.type === 'hibernate') {
        await ipc.efficiency.hibernateInactiveTabs();
      }
    } catch (error) {
      console.error('Efficiency action failed:', error);
    } finally {
      setEfficiencyAlert(null);
    }
  };

  const handlePromptSubmit = async () => {
    if (!prompt.trim() || !activeId || promptLoading) {
      return;
    }

    try {
      setPromptLoading(true);
      await ipc.agent.createTask({
        title: 'User Prompt',
        role: 'researcher',
        goal: prompt.trim(),
        budget: { tokens: 4096, seconds: 120, requests: 20 },
      });
      setPrompt('');
    } catch (error) {
      console.error('Failed to create agent task:', error);
    } finally {
      setPromptLoading(false);
    }
  };

  useEffect(() => {
    if (!extraOpen) return;
    const listenerOptions: AddEventListenerOptions = { capture: true };
    const handleOutside = (event: MouseEvent) => {
      if (!extraRef.current) return;
      if (extraRef.current.contains(event.target as Node)) return;
      setExtraOpen(false);
    };
    document.addEventListener('mousedown', handleOutside, listenerOptions);
    return () => document.removeEventListener('mousedown', handleOutside, listenerOptions);
  }, [extraOpen]);

  const handleDoHToggle = async () => {
    try {
      if (dohStatus.enabled) {
        await ipc.dns.disableDoH();
        setDohStatus({ enabled: false, provider: 'cloudflare' });
      } else {
        await ipc.dns.enableDoH('cloudflare');
        setDohStatus({ enabled: true, provider: 'cloudflare' });
      }
    } catch (error) {
      console.error('Failed to toggle DoH:', error);
    }
  };

  const efficiencyDetails = [
    efficiencyBadge || null,
    typeof efficiencySnapshot.batteryPct === 'number' ? `${Math.round(efficiencySnapshot.batteryPct)}%` : null,
    typeof carbonIntensity === 'number' ? `${Math.round(carbonIntensity)} gCO₂/kWh` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const efficiencyVariant: 'default' | 'positive' | 'info' = efficiencyLabel.includes('Regen')
    ? 'positive'
    : efficiencyLabel.includes('Battery')
    ? 'info'
    : 'default';

  const torBadgeDescription = torStatusLabel.replace(/^Tor:?\s*/i, '');
  const torBadgeVariant: 'default' | 'positive' | 'warning' | 'info' = torStatus.stub
    ? 'warning'
    : torStatus.running
    ? 'info'
    : 'default';

  const vpnBadgeDescription = vpnStatus.connected
    ? vpnStatus.type
      ? vpnStatus.type.toUpperCase()
      : 'Active'
    : 'Disconnected';

 
  return (
    <div
      className="px-4 py-2 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700/50 flex flex-col gap-2"
      data-onboarding="status-bar"
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
        <PrivacySwitch />

        <StatusMeter
          icon={Cpu}
          label="CPU"
          value={`${cpuUsage}%`}
          percent={cpuUsage}
          gradient="from-blue-500 via-cyan-500 to-blue-500"
          title="CPU usage"
          sparklinePoints={sparklinePoints}
        />

        <StatusMeter
          icon={MemoryStick}
          label="RAM"
          value={`${memoryUsage}%`}
          percent={memoryUsage}
          title="System memory usage"
          gradient="from-green-500 via-emerald-500 to-green-500"
        />

        <StatusBadge
          icon={Activity}
          label={efficiencyLabel}
          description={efficiencyDetails || undefined}
          variant={efficiencyVariant}
          title={efficiencyBadge ?? efficiencyLabel}
        />

        <StatusBadge
          icon={MoonStar}
          label="Shadow"
          description={shadowSessionId ? 'Active' : 'Idle'}
          variant={shadowSessionId ? 'info' : 'default'}
          pulse={shadowLoading}
          title={shadowSessionId ? 'Shadow Mode active' : 'Shadow Mode inactive'}
        />

        <StatusBadge
          icon={Network}
          label="Mode"
          description={privacyMode}
          className={privacyModeColors[privacyMode]}
          title={`Privacy mode: ${privacyMode}`}
        />

        <StatusBadge
          icon={Shield}
          label="Trust"
          description={trustDescription}
          variant={trustVariant}
          onClick={() => void openTrustDashboard()}
          title="Open trust & ethics dashboard"
          loading={trustBadgeData.loading}
        />

        <div className="ml-auto flex items-center gap-2">
          <StatusBadge
            icon={Cpu}
            label="CPU"
            description={`${cpuUsage}%`}
            variant={cpuUsage > 70 ? 'warning' : 'default'}
            title="CPU usage"
          />
          <StatusBadge
            icon={MemoryStick}
            label="RAM"
            description={`${memoryUsage}%`}
            variant={memoryUsage > 75 ? 'warning' : 'default'}
            title="Memory usage"
          />
          <StatusBadge
            icon={Brain}
            label="Model"
            description={modelReady ? 'Ready' : 'Loading'}
            variant={modelReady ? 'positive' : 'default'}
            pulse={modelReady}
            loading={!modelReady}
            title="Local model status"
          />

          <div className="relative w-60">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handlePromptSubmit();
                }
              }}
              placeholder="Prompt agent (e.g., 'summarize this page')..."
              disabled={promptLoading}
              className={`h-8 w-full rounded-full border border-gray-700/60 bg-gray-800/70 pl-3 pr-9 text-xs text-gray-200 placeholder-gray-400 focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/40 ${promptLoading ? 'opacity-70 cursor-wait' : ''}`}
            />
            {promptLoading ? (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-blue-300" aria-label="Sending prompt" />
            ) : (
              <button
                type="button"
                onClick={() => void handlePromptSubmit()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200"
                title="Send prompt"
              >
                <Send size={14} />
              </button>
            )}
          </div>

          <SymbioticVoiceCompanion />

          <div className="relative" ref={extraRef}>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border border-gray-700/50 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
              onClick={() => setExtraOpen((prev) => !prev)}
              title="Security & network controls"
            >
              <MoreHorizontal size={14} />
              More
            </button>
            <AnimatePresence>
              {extraOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-800 bg-slate-950/95 p-3 shadow-xl"
                >
                  <div className="grid gap-2">
                    <StatusBadge
                      icon={Shield}
                      label="Tor"
                      description={torBadgeDescription}
                      variant={torBadgeVariant}
                      onClick={!torStatus.loading ? () => {
                        if (torStatus.running) {
                          void stopTor();
                        } else {
                          void startTor();
                        }
                      } : undefined}
                      loading={torStatus.loading}
                      title={torTooltip}
                      className={`justify-start ${torStatus.loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    {torStatus.running && !torStatus.stub && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!torStatus.loading) {
                            void newTorIdentity();
                          }
                        }}
                        className="flex items-center gap-2 rounded-md border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-[11px] text-purple-100 transition-colors hover:border-purple-400/60"
                      >
                        <RefreshCw size={12} />
                        Request new Tor identity
                      </button>
                    )}
                    <StatusBadge
                      icon={Wifi}
                      label="VPN"
                      description={vpnBadgeDescription}
                      variant={vpnStatus.connected ? 'positive' : 'default'}
                      onClick={!vpnStatus.loading ? () => void checkVpn() : undefined}
                      loading={vpnStatus.loading}
                      title={vpnTooltip}
                      className={`justify-start ${vpnStatus.loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                    <StatusBadge
                      icon={Shield}
                      label="DoH"
                      description={dohStatus.enabled ? dohStatus.provider : 'Disabled'}
                      variant={dohStatus.enabled ? 'info' : 'default'}
                      onClick={handleDoHToggle}
                      title="Toggle DNS-over-HTTPS"
                      className="justify-start"
                    />
                    <StatusBadge
                      icon={Activity}
                      label="Efficiency"
                      description={efficiencyLabel || 'Normal'}
                      variant="default"
                      className="justify-start"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <AnimatePresence>
          {efficiencyAlert && (
            <motion.div
              key="efficiency-alert"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className={`flex w-full max-w-xl items-center gap-3 rounded-lg border px-3 py-2 shadow-inner ${severityStyles[efficiencyAlert.severity]}`}
            >
              <AlertTriangle size={14} />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold">{efficiencyAlert.title}</span>
                <span className="text-[11px] opacity-80">{efficiencyAlert.message}</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {efficiencyAlert.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleEfficiencyAction(action)}
                    className="rounded bg-gray-900/60 px-2 py-1 text-[11px] font-medium transition-colors hover:bg-gray-900/80"
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  onClick={() => setEfficiencyAlert(null)}
                  className="p-1 text-xs opacity-70 transition-opacity hover:opacity-100"
                  aria-label="Dismiss efficiency alert"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {shadowSummary && (
            <motion.div
              key="shadow-summary"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex w-full max-w-xl items-start gap-3 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs text-purple-100 shadow-inner"
            >
              <FileText size={14} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide">Shadow Summary</span>
                  <button
                    onClick={clearShadowSummary}
                    className="p-1 text-[10px] text-purple-200/80 transition-colors hover:text-purple-50"
                    aria-label="Dismiss shadow summary"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="text-[11px] opacity-90">
                  {shadowSummary.recommendations?.[0] ?? 'Review your shadow session.'}
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] opacity-80">
                  <span>{Math.round(shadowSummary.durationMs / 1000)}s</span>
                  <span>Visits: {shadowSummary.totalVisits}</span>
                  <span>Domains: {shadowSummary.uniqueHosts}</span>
                </div>
                {shadowSummary.visited?.length > 0 && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase opacity-70">Recent</span>
                    <ul className="space-y-0.5">
                      {shadowSummary.visited.slice(0, 3).map((entry) => (
                        <li key={`${entry.url}-${entry.firstSeen}`} className="truncate">
                          <a
                            href={entry.url}
                            className="text-[11px] text-purple-200 transition-colors hover:text-purple-50"
                            title={entry.url}
                          >
                            {entry.title || entry.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {shadowSummary.recommendations?.length > 1 && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase opacity-70">Recommendations</span>
                    <ul className="space-y-0.5">
                      {shadowSummary.recommendations.slice(1).map((rec, idx) => (
                        <li key={idx} className="text-[11px] opacity-80">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
