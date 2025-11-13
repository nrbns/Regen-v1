/**
 * BottomStatus - Status bar with live indicators and AI prompt
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { useMetricsStore, type MetricSample } from '../../state/metricsStore';
import { getEnvVar, isElectronRuntime } from '../../lib/env';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';
import { Badge } from '../Badge';

export function BottomStatus() {
  const { activeId } = useTabsStore();
  const [prompt, setPrompt] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const extraRef = useRef<HTMLDivElement | null>(null);
  const trendRef = useRef<HTMLDivElement | null>(null);
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
  const dailyCarbon = useMetricsStore((state) => state.dailyTotalCarbon);
  const highCpuRef = useRef<MetricSample[]>([]);
  const highRamRef = useRef<MetricSample[]>([]);
  const [metricsAlert, setMetricsAlert] = useState<{
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  } | null>(null);
  const [vpnProfiles, setVpnProfiles] = useState<Array<{ id: string; name: string; type: string; server?: string }>>([]);
  const vpnProfilesRef = useRef<Array<{ id: string; name: string; type: string; server?: string }>>([]);
  const [vpnActiveId, setVpnActiveId] = useState<string | null>(null);
  const [vpnBusy, setVpnBusy] = useState(false);
  const [vpnError, setVpnError] = useState<string | null>(null);
  const isElectron = useMemo(() => isElectronRuntime(), []);
  const apiBaseUrl = useMemo(() => {
    return (
      getEnvVar('API_BASE_URL') ??
      getEnvVar('OMNIBROWSER_API_URL') ??
      getEnvVar('OB_API_BASE_URL') ??
      getEnvVar('VITE_REDIX_HTTP_URL') ??
      'http://localhost:4000'
    );
  }, []);
  const metricsSocketRef = useRef<WebSocket | EventSource | null>(null);
  const openTrustDashboard = useTrustDashboardStore((state) => state.open);
  const trustRefresh = useTrustDashboardStore((state) => state.refresh);
  const trustBadgeData = useTrustDashboardStore((state) => ({
    pending: state.consentStats.pending,
    blocked: state.blockedSummary.trackers,
    loading: state.loading,
  }));

  const prevVpnRef = useRef(vpnStatus);
  const prevTorRef = useRef(torStatus);

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
    if (status.vpn) {
      if (!status.vpn.connected) {
        setVpnActiveId(null);
      } else {
        const profiles = vpnProfilesRef.current;
        const match =
          profiles.find((p) => p.name === status.vpn?.provider) ||
          profiles.find((p) => p.server && p.server === status.vpn?.server);
        if (match) {
          setVpnActiveId(match.id);
        } else if (status.vpn.provider) {
          setVpnActiveId(status.vpn.provider);
        }
      }
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
    let cancelled = false;

    const loadProfiles = async () => {
      try {
        const profiles = await ipc.vpn.listProfiles();
        if (!cancelled && Array.isArray(profiles)) {
          setVpnProfiles(profiles);
          vpnProfilesRef.current = profiles;
        }
      } catch (error) {
        console.warn('[vpn] Failed to load profiles', error);
      }
    };

    loadProfiles();
    const interval = window.setInterval(loadProfiles, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

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

      const samples = metricsHistory.slice(-5);
      highCpuRef.current = samples.filter((sample) => sample.cpu >= 85);
      highRamRef.current = samples.filter((sample) => sample.memory >= 85);

      if (highCpuRef.current.length >= 3) {
        setMetricsAlert({
          title: 'CPU running hot',
          message: 'Consider enabling Performance Mode or closing heavy tabs.',
          severity: 'warning',
        });
      } else if (highRamRef.current.length >= 3) {
        setMetricsAlert({
          title: 'Memory pressure detected',
          message: 'Try hibernating inactive tabs to free RAM.',
          severity: 'warning',
        });
      }
    }
  }, [latestSample, metricsHistory]);

  useEffect(() => {
    const previous = prevTorRef.current;
    if (!previous.running && torStatus.running) {
      pushPrivacyEvent({ kind: 'tor', status: 'info', message: 'Tor daemon starting…' });
    }
    if (!previous.bootstrapped && torStatus.bootstrapped) {
      pushPrivacyEvent({ kind: 'tor', status: 'success', message: 'Tor circuit established' });
    }
    if (previous.running && !torStatus.running) {
      pushPrivacyEvent({ kind: 'tor', status: 'info', message: 'Tor stopped' });
    }
    if (!previous.stub && torStatus.stub) {
      pushPrivacyEvent({ kind: 'tor', status: 'warning', message: 'Tor binary not found – running in stub mode' });
    }
    if (torStatus.error && torStatus.error !== previous.error) {
      pushPrivacyEvent({ kind: 'tor', status: 'warning', message: `Tor warning: ${torStatus.error}` });
    }
    prevTorRef.current = torStatus;
  }, [torStatus, pushPrivacyEvent]);

  useEffect(() => {
    const previous = prevVpnRef.current;
    if (!previous.connected && vpnStatus.connected) {
      const label = vpnStatus.name || vpnStatus.type || 'VPN';
      pushPrivacyEvent({ kind: 'vpn', status: 'success', message: `VPN connected${label ? `: ${label}` : ''}` });
    }
    if (previous.connected && !vpnStatus.connected) {
      pushPrivacyEvent({ kind: 'vpn', status: 'info', message: 'VPN disconnected' });
    }
    prevVpnRef.current = vpnStatus;
  }, [vpnStatus, pushPrivacyEvent]);

  useEffect(() => {
    if (!isElectron) {
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

  const TrendChart = ({
    label,
    points,
    color,
    labels,
  }: {
    label: string;
    points: number[];
    color: string;
    labels: number[];
  }) => {
    const recent = points.length > 0 ? points : [0];
    const path = recent
      .map((value, index, arr) => {
        const x = (index / Math.max(arr.length - 1, 1)) * 200;
        const y = 80 - (value / 100) * 80;
        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');
    const spanMs = labels.length >= 2 ? labels[labels.length - 1] - labels[0] : 0;
    const spanMinutes = Math.max(Math.round(spanMs / 60000), 0);
    const spanLabel = spanMinutes > 0 ? `${spanMinutes}m window` : 'Live';

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-gray-300">
          <span>{label}</span>
          <span className="opacity-70">{spanLabel}</span>
        </div>
        <svg viewBox="0 0 200 80" className="h-20 w-full rounded-md bg-gray-900/70 p-1">
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  };

  const sparklinePoints = useMemo(() => metricsHistory.map((sample) => clampPercent(sample.cpu)), [metricsHistory]);
  const trendSamples = useMemo(() => metricsHistory.slice(-180), [metricsHistory]);
  const trendCpuPoints = useMemo(() => trendSamples.map((sample) => clampPercent(sample.cpu)), [trendSamples]);
  const trendRamPoints = useMemo(() => trendSamples.map((sample) => clampPercent(sample.memory)), [trendSamples]);
  const trendLabels = useMemo(() => trendSamples.map((sample) => sample.timestamp), [trendSamples]);

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
          <motion.div
            className={`h-full bg-gradient-to-r ${gradient}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
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
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
        title={title}
        aria-label={title || label}
        aria-busy={loading}
        className={`${palette[variant]} ${className ?? ''} flex items-center gap-1.5 rounded-full px-2 py-1 text-xs ${
          onClick ? 'cursor-pointer transition-colors hover:border-gray-500/70 focus:outline-none focus:ring-1 focus:ring-blue-400/30' : ''
        }`}
      >
        <Icon size={12} className="opacity-80" aria-hidden="true" />
        <span className="font-medium">{label}</span>
        {description && <span className="text-[11px] opacity-75">{description}</span>}
        {loading && (
          <span
            className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent"
            aria-label="Loading"
            role="status"
          />
        )}
        {pulse && (
          <motion.span
            className="inline-flex h-1.5 w-1.5 rounded-full bg-current"
            animate={{ 
              opacity: [0.4, 1, 0.4],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
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
    if (!extraOpen && !trendOpen) return;
    const listenerOptions: AddEventListenerOptions = { capture: true };
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (extraOpen && extraRef.current && extraRef.current.contains(target)) return;
      if (trendOpen && trendRef.current && trendRef.current.contains(target)) return;
      setExtraOpen(false);
      setTrendOpen(false);
    };
    document.addEventListener('mousedown', handleOutside, listenerOptions);
    return () => document.removeEventListener('mousedown', handleOutside, listenerOptions);
  }, [extraOpen, trendOpen]);

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
    dailyCarbon > 0 ? `${dailyCarbon.toFixed(2)} gCO₂ saved today` : null,
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
    <>
      <AnimatePresence>
        {privacyToast && (
          <motion.div
            key={privacyToast.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-20 right-6 z-50 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg shadow-black/40 ${
              privacyToast.status === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                : privacyToast.status === 'warning'
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                : 'border-sky-500/40 bg-sky-500/15 text-sky-100'
            }`}
          >
            {privacyToast.kind === 'tor' ? (
              <Shield size={16} aria-hidden="true" />
            ) : (
              <Wifi size={16} aria-hidden="true" />
            )}
            <div className="flex flex-col">
              <span className="font-medium">{privacyToast.message}</span>
              <span className="text-[10px] opacity-80">{formatRelativeTime(privacyToast.timestamp)}</span>
            </div>
            <button
              type="button"
              onClick={() => setPrivacyToast(null)}
              className="ml-2 rounded p-1 text-[10px] transition-colors hover:text-white"
              aria-label="Dismiss privacy notification"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-col gap-2 border-t border-slate-800/60 bg-slate-950/90 px-4 py-2 text-xs text-gray-300">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 text-xs text-gray-300">
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
              icon={Brain}
              label="Model"
              description={modelReady ? 'Ready' : 'Loading'}
              variant={modelReady ? 'positive' : 'default'}
              pulse={modelReady}
              loading={!modelReady}
              title="Local model status"
            />

            <button
              type="button"
              className="hidden sm:flex items-center gap-1 rounded-full border border-gray-700/50 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
              onClick={() => setTrendOpen((prev) => !prev)}
              title="View detailed performance trends"
            >
              <Activity size={14} />
              Trends
            </button>

            <div className="relative w-48 sm:w-60 hidden sm:block">
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
                            pushPrivacyEvent({ kind: 'tor', status: 'info', message: 'Stopping Tor…' });
                            void stopTor();
                          } else {
                            pushPrivacyEvent({ kind: 'tor', status: 'info', message: 'Starting Tor…' });
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
                            if (torStatus.loading) return;
                            pushPrivacyEvent({ kind: 'tor', status: 'info', message: 'Requesting new Tor identity…' });
                            void newTorIdentity()
                              .then(() => {
                                pushPrivacyEvent({ kind: 'tor', status: 'success', message: 'Tor identity refreshed' });
                              })
                              .catch((error) => {
                                const message = error instanceof Error ? error.message : String(error);
                                pushPrivacyEvent({ kind: 'tor', status: 'warning', message: `Tor identity error: ${message}` });
                              });
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
                      {vpnProfiles.length > 0 && (
                        <div className="space-y-2 rounded-md border border-gray-800/60 bg-gray-900/40 p-2">
                          <span className="text-[10px] uppercase text-gray-400">VPN Profiles</span>
                          <div className="space-y-1">
                            {vpnProfiles.map((profile) => {
                              const isActive = vpnActiveId === profile.id;
                              return (
                                <button
                                  key={profile.id}
                                  type="button"
                                  onClick={() => handleVpnConnect(profile.id)}
                                  disabled={vpnBusy}
                                  className={`w-full rounded-md px-2 py-1 text-left text-[11px] transition-colors ${
                                    isActive
                                      ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/40'
                                      : 'border border-transparent text-gray-300 hover:border-gray-700'
                                  } ${vpnBusy ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{profile.name}</span>
                                    {isActive && <span className="text-[10px] opacity-70">Active</span>}
                                  </div>
                                  {profile.server && (
                                    <div className="text-[10px] opacity-60">{profile.server}</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleVpnDisconnect()}
                              disabled={!vpnActiveId || vpnBusy}
                              className="flex-1 rounded-md border border-gray-700/50 px-2 py-1 text-[10px] text-gray-300 transition-colors hover:border-gray-600 disabled:opacity-50"
                            >
                              Disconnect
                            </button>
                            {vpnBusy && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" />
                            )}
                          </div>
                          {vpnError && <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">{vpnError}</div>}
                        </div>
                      )}
                      {privacyEvents.length > 0 && (
                        <div className="space-y-2 rounded-md border border-gray-800/60 bg-gray-900/40 p-2">
                          <div className="flex items-center justify-between text-[10px] uppercase text-gray-400">
                            <span>Privacy activity</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPrivacyEvents([]);
                                setPrivacyToast(null);
                              }}
                              className="rounded px-1.5 py-0.5 text-[9px] text-gray-400 transition-colors hover:text-gray-200"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="max-h-32 space-y-1 overflow-auto">
                            {privacyEvents
                              .slice()
                              .reverse()
                              .map((event) => {
                                const dotColor =
                                  event.status === 'success'
                                    ? 'bg-emerald-400'
                                    : event.status === 'warning'
                                    ? 'bg-amber-400'
                                    : 'bg-sky-400';
                                return (
                                  <div key={event.id} className="flex items-start gap-2 text-[11px] text-gray-300">
                                    <span className={`mt-1 h-2 w-2 rounded-full ${dotColor}`} aria-hidden="true" />
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1">
                                        {event.kind === 'tor' ? (
                                          <Shield size={12} className="text-purple-300" />
                                        ) : (
                                          <Wifi size={12} className="text-emerald-300" />
                                        )}
                                        <span>{event.message}</span>
                                      </div>
                                      <div className="text-[9px] text-gray-500">{formatRelativeTime(event.timestamp)}</div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
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
                      <StatusBadge
                        icon={Cpu}
                        label="CPU"
                        description={`${cpuUsage}%`}
                        variant={cpuUsage > 70 ? 'warning' : 'default'}
                        title="CPU usage"
                        className="justify-start"
                      />
                      <StatusBadge
                        icon={MemoryStick}
                        label="RAM"
                        description={`${memoryUsage}%`}
                        variant={memoryUsage > 75 ? 'warning' : 'default'}
                        title="Memory usage"
                        className="justify-start"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {trendOpen && (
                <motion.div
                  ref={trendRef}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 top-12 w-72 rounded-lg border border-gray-800 bg-slate-950/95 p-4 shadow-xl"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-300">
                    <span className="font-semibold uppercase tracking-wide">Performance Trends</span>
                    <button
                      className="text-xs opacity-70 transition-opacity hover:opacity-100"
                      onClick={() => setTrendOpen(false)}
                      aria-label="Close trends panel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <TrendChart label="CPU %" points={trendCpuPoints} color="#38bdf8" labels={trendLabels} />
                  <TrendChart
                    label="RAM %"
                    points={trendRamPoints}
                    color="#22d3ee"
                    labels={trendLabels}
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
            {metricsAlert && (
              <motion.div
                key="metrics-alert"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className={`flex w-full max-w-xl items-center gap-3 rounded-lg border px-3 py-2 shadow-inner ${severityStyles[metricsAlert.severity]}`}
              >
                <Activity size={14} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold">{metricsAlert.title}</span>
                  <span className="text-[11px] opacity-80">{metricsAlert.message}</span>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => setMetricsAlert(null)}
                    className="p-1 text-xs opacity-70 transition-opacity hover:opacity-100"
                    aria-label="Dismiss metrics alert"
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
    </>
  );
}
