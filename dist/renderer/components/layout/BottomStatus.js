import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * BottomStatus - Status bar with live indicators and AI prompt
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Cpu, MemoryStick, Network, Brain, Shield, Activity, AlertTriangle, X, RefreshCw, Wifi, Loader2, MoreHorizontal, } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EcoBadgeCompact } from '../EcoBadge';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { PrivacySwitch } from '../PrivacySwitch';
import { useEfficiencyStore } from '../../state/efficiencyStore';
import { usePrivacyStore } from '../../state/privacyStore';
// Voice components disabled by user request
// Voice components removed by user request
import { useMetricsStore } from '../../state/metricsStore';
import { getEnvVar, isElectronRuntime, isWebMode } from '../../lib/env';
import { isBackendAvailable, onBackendStatusChange } from '../../lib/backend-status';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';
import { useSettingsStore } from '../../state/settingsStore';
const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function createEventId() {
    const cryptoRandom = globalThis.crypto?.randomUUID?.();
    if (cryptoRandom) {
        return cryptoRandom;
    }
    return `privacy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function formatRelativeTime(timestamp) {
    const now = Date.now();
    let difference = timestamp - now;
    const divisions = [
        [1000, 'second'],
        [60, 'minute'],
        [60, 'hour'],
        [24, 'day'],
        [7, 'week'],
        [4.34524, 'month'],
        [12, 'year'],
    ];
    for (const [amount, unit] of divisions) {
        if (Math.abs(difference) < amount) {
            return RELATIVE_TIME_FORMATTER.format(Math.round(difference), unit);
        }
        difference /= amount;
    }
    return RELATIVE_TIME_FORMATTER.format(Math.round(difference), 'year');
}
export function BottomStatus() {
    const { activeId } = useTabsStore();
    const uiLanguage = useSettingsStore(state => state.language || 'en');
    const [prompt, setPrompt] = useState('');
    const [promptLoading, setPromptLoading] = useState(false);
    const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
    const [promptResponse, setPromptResponse] = useState('');
    const [promptError, setPromptError] = useState(null);
    const [promptEcoScore, setPromptEcoScore] = useState(null);
    // const promptSessionRef = useRef<string | null>(null); // Unused for now
    const [extraOpen, setExtraOpen] = useState(false);
    const [trendOpen, setTrendOpen] = useState(false);
    const extraRef = useRef(null);
    const trendRef = useRef(null);
    const [dohStatus, setDohStatus] = useState({ enabled: false, provider: 'cloudflare' });
    const latestSample = useMetricsStore(state => state.latest);
    // Use metrics store for real-time CPU/memory updates
    const cpuUsage = latestSample?.cpu ?? 0;
    const memoryUsage = latestSample?.memory ?? 0;
    const pushMetricSample = useMetricsStore(state => state.pushSample);
    const [modelReady] = useState(true);
    const [backendOnline, setBackendOnline] = useState(() => isBackendAvailable());
    const [privacyMode, setPrivacyMode] = useState('Normal');
    const [efficiencyAlert, setEfficiencyAlert] = useState(null);
    const efficiencyLabel = useEfficiencyStore(state => state.label);
    const efficiencyBadge = useEfficiencyStore(state => state.badge);
    const efficiencySnapshot = useEfficiencyStore(state => state.snapshot);
    const setEfficiencyEvent = useEfficiencyStore(state => state.setEvent);
    const carbonIntensity = efficiencySnapshot.carbonIntensity ?? null;
    const torStatus = usePrivacyStore(state => state.tor);
    const vpnStatus = usePrivacyStore(state => state.vpn);
    const refreshTor = usePrivacyStore(state => state.refreshTor);
    const refreshVpn = usePrivacyStore(state => state.refreshVpn);
    const startTor = usePrivacyStore(state => state.startTor);
    const stopTor = usePrivacyStore(state => state.stopTor);
    const newTorIdentity = usePrivacyStore(state => state.newTorIdentity);
    const checkVpn = usePrivacyStore(state => state.checkVpn);
    const metricsHistory = useMetricsStore(state => state.history);
    const dailyCarbon = useMetricsStore(state => state.dailyTotalCarbon);
    const highCpuRef = useRef([]);
    const highRamRef = useRef([]);
    const [metricsAlert, setMetricsAlert] = useState(null);
    const [vpnProfiles, setVpnProfiles] = useState([]);
    const vpnProfilesRef = useRef([]);
    const [vpnActiveId, setVpnActiveId] = useState(null);
    const [vpnBusy, setVpnBusy] = useState(false);
    const [vpnError, setVpnError] = useState(null);
    const [privacyEvents, setPrivacyEvents] = useState([]);
    const [privacyToast, setPrivacyToast] = useState(null);
    const [shieldsStats, setShieldsStats] = useState({ trackersBlocked: 0, adsBlocked: 0 });
    // Privacy scorecard: Track blocked trackers and ads
    useEffect(() => {
        const updateShieldsStats = async () => {
            try {
                const status = await ipc.shields.getStatus();
                if (status) {
                    setShieldsStats({
                        trackersBlocked: status.trackersBlocked || 0,
                        adsBlocked: status.adsBlocked || 0,
                    });
                }
            }
            catch (error) {
                console.debug('[BottomStatus] Failed to get shields stats:', error);
            }
        };
        updateShieldsStats();
        const interval = setInterval(updateShieldsStats, 5000); // Update every 5 seconds
        return () => clearInterval(interval);
    }, []);
    const isElectron = useMemo(() => isElectronRuntime(), []);
    const apiBaseUrl = useMemo(() => {
        return (getEnvVar('API_BASE_URL') ??
            getEnvVar('OMNIBROWSER_API_URL') ??
            getEnvVar('OB_API_BASE_URL') ??
            getEnvVar('VITE_REDIX_HTTP_URL') ??
            'http://localhost:4000');
    }, []);
    const metricsSocketRef = useRef(null);
    const openTrustDashboard = useTrustDashboardStore(state => state.open);
    const trustRefresh = useTrustDashboardStore(state => state.refresh);
    const trustBadgeData = useTrustDashboardStore(state => ({
        pending: state.consentStats.pending,
        blocked: state.blockedSummary.trackers,
        loading: state.loading,
    }));
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        const unsubscribe = onBackendStatusChange(status => {
            setBackendOnline(status);
        });
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsubscribe();
        };
    }, []);
    // Real-time metrics: Electron uses IPC, non-Electron uses WebSocket/SSE
    // This effect is removed - metrics are handled in the unified effect below
    const pushPrivacyEvent = useCallback((event) => {
        const entry = {
            id: createEventId(),
            timestamp: event.timestamp ?? Date.now(),
            kind: event.kind,
            status: event.status,
            message: event.message,
        };
        setPrivacyEvents(current => [...current.slice(-29), entry]);
        setPrivacyToast(entry);
    }, []);
    // Temporary alias for compatibility with new naming while keeping existing references working.
    const addPrivacyEvent = pushPrivacyEvent;
    const prevVpnRef = useRef(vpnStatus);
    const prevTorRef = useRef(torStatus);
    // Listen for network status
    useIPCEvent('net:status', status => {
        if (status.doh) {
            setDohStatus(status.doh);
        }
        if (status.tor?.enabled && status.tor.circuitEstablished) {
            setPrivacyMode('Tor');
        }
        else if (status.proxy?.enabled) {
            setPrivacyMode('Ghost');
        }
        else {
            setPrivacyMode('Normal');
        }
        if (status.vpn) {
            if (!status.vpn.connected) {
                setVpnActiveId(null);
            }
            else {
                const profiles = vpnProfilesRef.current;
                const match = profiles.find(p => p.name === status.vpn?.provider) ||
                    profiles.find(p => p.server && p.server === status.vpn?.server);
                if (match) {
                    setVpnActiveId(match.id);
                }
                else if (status.vpn.provider) {
                    setVpnActiveId(status.vpn.provider);
                }
            }
        }
    }, []);
    useIPCEvent('efficiency:mode', event => {
        setEfficiencyEvent(event);
    }, [setEfficiencyEvent]);
    useIPCEvent('efficiency:alert', alert => {
        setEfficiencyAlert(alert);
    }, []);
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
            }
            catch (error) {
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
            // CPU and memory now come directly from latestSample (real-time updates)
            const samples = metricsHistory.slice(-5);
            highCpuRef.current = samples.filter(sample => sample.cpu >= 85);
            highRamRef.current = samples.filter(sample => sample.memory >= 85);
            if (highCpuRef.current.length >= 3) {
                setMetricsAlert({
                    title: 'CPU running hot',
                    message: 'Consider enabling Performance Mode or closing heavy tabs.',
                    severity: 'warning',
                });
            }
            else if (highRamRef.current.length >= 3) {
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
            addPrivacyEvent({ kind: 'tor', status: 'info', message: 'Tor daemon starting…' });
        }
        if (!previous.bootstrapped && torStatus.bootstrapped) {
            addPrivacyEvent({ kind: 'tor', status: 'success', message: 'Tor circuit established' });
        }
        if (previous.running && !torStatus.running) {
            addPrivacyEvent({ kind: 'tor', status: 'info', message: 'Tor stopped' });
        }
        if (!previous.stub && torStatus.stub) {
            addPrivacyEvent({
                kind: 'tor',
                status: 'warning',
                message: 'Tor binary not found – running in stub mode',
            });
        }
        // Only show Tor warning if Tor is enabled but not available (not just stub mode)
        if (torStatus.error && torStatus.error !== previous.error && !torStatus.stub) {
            addPrivacyEvent({
                kind: 'tor',
                status: 'warning',
                message: `Tor warning: ${torStatus.error}`,
            });
        }
        prevTorRef.current = torStatus;
    }, [torStatus, addPrivacyEvent]);
    useEffect(() => {
        const previous = prevVpnRef.current;
        if (!previous.connected && vpnStatus.connected) {
            const label = vpnStatus.name || vpnStatus.type || 'VPN';
            addPrivacyEvent({
                kind: 'vpn',
                status: 'success',
                message: `VPN connected${label ? `: ${label}` : ''}`,
            });
        }
        if (previous.connected && !vpnStatus.connected) {
            addPrivacyEvent({ kind: 'vpn', status: 'info', message: 'VPN disconnected' });
        }
        prevVpnRef.current = vpnStatus;
    }, [vpnStatus, addPrivacyEvent]);
    // Real-time metrics: Electron uses IPC, non-Electron uses WebSocket with auto-reconnect
    useEffect(() => {
        if (isElectron) {
            let cancelled = false;
            let pollInterval = null;
            const pollMetrics = async () => {
                if (cancelled)
                    return;
                try {
                    const metrics = await ipc.performance.getMetrics();
                    if (cancelled || !metrics)
                        return;
                    const sample = {
                        timestamp: metrics.timestamp || Date.now(),
                        cpu: metrics.cpu || 0,
                        memory: metrics.memory || 0,
                        carbonIntensity: undefined, // Can be added later if available
                    };
                    pushMetricSample(sample);
                }
                catch (error) {
                    if (!cancelled) {
                        console.warn('[metrics] Failed to poll metrics:', error);
                    }
                }
            };
            // Start polling immediately, then every 1 second for real-time feel
            pollMetrics();
            pollInterval = setInterval(pollMetrics, 1000);
            return () => {
                cancelled = true;
                if (pollInterval) {
                    clearInterval(pollInterval);
                }
            };
        }
        else {
            // Skip WebSocket connections in web mode - no backend available
            if (isWebMode()) {
                // In web mode, use dummy metrics (no backend)
                pushMetricSample({
                    timestamp: Date.now(),
                    cpu: 0,
                    memory: 0,
                });
                return;
            }
            if (!backendOnline) {
                if (metricsSocketRef.current) {
                    try {
                        metricsSocketRef.current.close();
                    }
                    catch {
                        // ignore
                    }
                    metricsSocketRef.current = null;
                }
                pushMetricSample({
                    timestamp: Date.now(),
                    cpu: 0,
                    memory: 0,
                });
                return;
            }
            // Non-Electron: Use WebSocket with auto-reconnect
            let socket = null;
            let reconnectTimeout = null;
            let reconnectAttempts = 0;
            const maxReconnectAttempts = 10;
            const reconnectDelay = 3000; // Start with 3 seconds
            const connectWebSocket = () => {
                // Skip WebSocket connections in web mode - no backend available
                if (isWebMode()) {
                    // In web mode, never attempt WebSocket connection
                    return;
                }
                if (socket?.readyState === WebSocket.OPEN)
                    return;
                try {
                    const wsUrl = `${apiBaseUrl.replace(/^http/, 'ws')}/ws/metrics`;
                    socket = new WebSocket(wsUrl);
                    metricsSocketRef.current = socket;
                    socket.onmessage = event => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data.type !== 'metrics')
                                return;
                            const sample = {
                                timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
                                cpu: typeof data.cpu === 'number' ? data.cpu : 0,
                                memory: typeof data.memory === 'number' ? data.memory : 0,
                                carbonIntensity: typeof data.carbon_intensity === 'number' ? data.carbon_intensity : undefined,
                            };
                            pushMetricSample(sample);
                            reconnectAttempts = 0; // Reset on successful message
                        }
                        catch (error) {
                            console.warn('[metrics] Failed to parse message', error);
                        }
                    };
                    socket.onopen = () => {
                        reconnectAttempts = 0;
                        // Don't log - WebSocket connection is expected in Electron/Tauri
                    };
                    socket.onerror = event => {
                        // Suppress error logging completely - metrics WebSocket is optional
                        event.stopPropagation();
                        event.preventDefault();
                        // Don't log - backend is optional in web mode
                    };
                    socket.onclose = () => {
                        socket = null;
                        metricsSocketRef.current = null;
                        // Auto-reconnect with exponential backoff (skip in web mode)
                        if (!isWebMode() && reconnectAttempts < maxReconnectAttempts) {
                            reconnectAttempts++;
                            const delay = reconnectDelay * Math.min(reconnectAttempts, 5); // Cap at 5x delay
                            reconnectTimeout = setTimeout(() => {
                                connectWebSocket();
                            }, delay);
                        }
                        // Don't log warnings or attempt fallback polling in web mode
                    };
                }
                catch (error) {
                    // Suppress all WebSocket creation errors - backend is optional
                    // Only log if we're in Electron/Tauri (backend expected)
                    if (!isWebMode()) {
                        console.error('[metrics] Failed to create websocket:', error);
                    }
                }
            };
            connectWebSocket();
            return () => {
                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }
                if (socket) {
                    try {
                        // Only close if WebSocket is in a valid state to prevent browser errors
                        if (socket.readyState === WebSocket.OPEN ||
                            socket.readyState === WebSocket.CONNECTING) {
                            socket.close();
                        }
                    }
                    catch {
                        // ignore - WebSocket errors are expected if server isn't running
                    }
                    socket = null;
                }
                metricsSocketRef.current = null;
            };
        }
    }, [isElectron, apiBaseUrl, pushMetricSample, backendOnline]);
    // Poll shields stats for privacy scorecard
    useEffect(() => {
        if (!isElectron)
            return;
        let cancelled = false;
        let pollInterval = null;
        const pollShieldsStats = async () => {
            if (cancelled)
                return;
            try {
                const status = await ipc.shields.getStatus();
                if (cancelled || !status)
                    return;
                setShieldsStats({
                    trackersBlocked: status.trackersBlocked || 0,
                    adsBlocked: status.adsBlocked || 0,
                });
            }
            catch (error) {
                if (!cancelled) {
                    console.warn('[BottomStatus] Failed to poll shields stats:', error);
                }
            }
        };
        // Start polling immediately, then every 2 seconds
        pollShieldsStats();
        pollInterval = setInterval(pollShieldsStats, 2000);
        return () => {
            cancelled = true;
            if (pollInterval) {
                clearInterval(pollInterval);
            }
        };
    }, [isElectron]);
    useEffect(() => {
        let isMounted = true;
        // Wait a bit for IPC to be ready before making calls
        const initStatus = async () => {
            if (!isMounted)
                return;
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
                    setDohStatus(status);
                }
            }
            catch {
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
    const trustVariant = trustBadgeData.pending > 0 ? 'warning' : trustBadgeData.blocked > 0 ? 'info' : 'default';
    const trustDescription = trustBadgeData.pending > 0
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
    const torTooltip = torStatus.stub
        ? 'Tor is optional and not installed. Privacy features work without it.'
        : torStatus.error && !torStatus.stub
            ? `Tor warning: ${torStatus.error}`
            : torStatus.running
                ? torStatus.circuitEstablished
                    ? 'Tor circuit established. Click to stop.'
                    : 'Tor starting up. Click to stop.'
                : 'Route traffic through Tor. Click to enable.';
    const vpnTooltip = vpnStatus.connected
        ? `VPN connected${vpnStatus.name ? ` (${vpnStatus.name})` : ''}. Click to re-check.`
        : 'Check whether a system VPN is active.';
    const severityStyles = {
        info: 'bg-blue-500/10 border-blue-400/40 text-blue-100',
        warning: 'bg-amber-500/10 border-amber-400/40 text-amber-100',
        critical: 'bg-red-500/10 border-red-400/40 text-red-100',
    };
    const clampPercent = (value) => {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return 0;
        }
        return Math.max(0, Math.min(100, Math.round(value)));
    };
    // const smoothValue = (previous: number, next: number, factor = 0.35) => {
    //   if (!Number.isFinite(previous)) return next;
    //   return previous + (next - previous) * factor;
    // }; // Unused for now
    const TrendChart = ({ label, points, color, labels, }) => {
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
        return (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] text-gray-300", children: [_jsx("span", { children: label }), _jsx("span", { className: "opacity-70", children: spanLabel })] }), _jsx("svg", { viewBox: "0 0 200 80", className: "h-20 w-full rounded-md bg-gray-900/70 p-1", children: _jsx("path", { d: path, fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round" }) })] }));
    };
    const sparklinePoints = useMemo(() => metricsHistory.map(sample => clampPercent(sample.cpu)), [metricsHistory]);
    const trendSamples = useMemo(() => metricsHistory.slice(-180), [metricsHistory]);
    const trendCpuPoints = useMemo(() => trendSamples.map(sample => clampPercent(sample.cpu)), [trendSamples]);
    const trendRamPoints = useMemo(() => trendSamples.map(sample => clampPercent(sample.memory)), [trendSamples]);
    const trendLabels = useMemo(() => trendSamples.map(sample => sample.timestamp), [trendSamples]);
    const StatusMeter = ({ icon: Icon, label, value, percent, gradient = 'from-blue-500 via-cyan-500 to-blue-500', title, onClick, sparklinePoints, }) => {
        const Component = onClick ? 'button' : 'div';
        const pct = clampPercent(percent);
        return (_jsxs(Component, { type: onClick ? 'button' : undefined, onClick: onClick, title: title, className: `flex items-center gap-1.5 rounded-full border border-gray-700/60 bg-gray-800/60 px-2 py-1 text-xs text-gray-200 ${onClick
                ? 'cursor-pointer transition-colors hover:border-gray-500/70 focus:outline-none focus:ring-1 focus:ring-blue-400/40'
                : ''}`, children: [_jsx(Icon, { size: 12, className: "text-gray-400" }), _jsx("span", { className: "font-semibold text-gray-100", children: label }), _jsx("span", { className: "text-[11px] opacity-75", children: value }), _jsx("div", { className: "h-1.5 w-14 overflow-hidden rounded-full bg-gray-700", children: _jsx(motion.div, { className: `h-full bg-gradient-to-r ${gradient}`, initial: { width: 0 }, animate: { width: `${pct}%` }, transition: { duration: 0.5, ease: 'easeOut' } }) }), sparklinePoints && sparklinePoints.length > 4 && (_jsx("svg", { viewBox: "0 0 40 12", className: "ml-2 h-3 w-10 text-blue-400/70", children: _jsx("polyline", { fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", points: sparklinePoints
                            .slice(-12)
                            .map((value, index, arr) => {
                            const x = (index / Math.max(arr.length - 1, 1)) * 40;
                            const y = 12 - (value / 100) * 12;
                            return `${x},${y}`;
                        })
                            .join(' ') }) }))] }));
    };
    const StatusBadge = ({ icon: Icon, label, description, variant = 'default', title, onClick, pulse = false, loading = false, className, }) => {
        const palette = {
            default: 'border-gray-700/60 bg-gray-800/60 text-gray-200',
            positive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
            warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
            danger: 'border-red-500/30 bg-red-500/10 text-red-100',
            info: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
        };
        const Component = onClick ? 'button' : 'div';
        return (_jsxs(Component, { type: onClick ? 'button' : undefined, onClick: onClick, onKeyDown: onClick
                ? e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick();
                    }
                }
                : undefined, title: title, "aria-label": title || label, "aria-busy": loading, className: `${palette[variant]} ${className ?? ''} flex items-center gap-1.5 rounded-full px-2 py-1 text-xs ${onClick
                ? 'cursor-pointer transition-colors hover:border-gray-500/70 focus:outline-none focus:ring-1 focus:ring-blue-400/30'
                : ''}`, children: [_jsx(Icon, { size: 12, className: "opacity-80", "aria-hidden": "true" }), _jsx("span", { className: "font-medium", children: label }), description && _jsx("span", { className: "text-[11px] opacity-75", children: description }), loading && (_jsx("span", { className: "h-3 w-3 animate-spin rounded-full border border-current border-t-transparent", "aria-label": "Loading", role: "status" })), pulse && (_jsx(motion.span, { className: "inline-flex h-1.5 w-1.5 rounded-full bg-current", animate: {
                        opacity: [0.4, 1, 0.4],
                        scale: [1, 1.2, 1],
                    }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }, "aria-hidden": "true" }))] }));
    };
    useEffect(() => {
        if (!efficiencyAlert)
            return;
        const timer = setTimeout(() => {
            setEfficiencyAlert(null);
        }, 20000);
        return () => clearTimeout(timer);
    }, [efficiencyAlert]);
    useEffect(() => {
        if (!privacyToast)
            return;
        const timer = window.setTimeout(() => {
            setPrivacyToast(null);
        }, 8000);
        return () => window.clearTimeout(timer);
    }, [privacyToast]);
    const handleEfficiencyAction = async (action) => {
        try {
            if (action.type === 'mode' && action.mode) {
                await ipc.efficiency.applyMode(action.mode);
            }
            else if (action.type === 'hibernate') {
                await ipc.efficiency.hibernateInactiveTabs();
            }
        }
        catch (error) {
            console.error('Efficiency action failed:', error);
        }
        finally {
            setEfficiencyAlert(null);
        }
    };
    const handlePromptSubmit = useCallback(async () => {
        if (!prompt.trim() || promptLoading)
            return;
        setPromptLoading(true);
        setPromptError(null);
        setPromptResponse('');
        // Get active tab context for better AI responses
        const activeTab = useTabsStore.getState().tabs.find(t => t.id === activeId);
        const tabContext = activeTab
            ? {
                url: activeTab.url,
                title: activeTab.title,
                tabId: activeTab.id,
            }
            : undefined;
        const redixUrl = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:8001';
        try {
            // Try Redix /workflow endpoint with RAG workflow for better context-aware responses
            const workflowResponse = await fetch(`${redixUrl}/workflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: prompt,
                    context: tabContext ? `Current page: ${tabContext.title} (${tabContext.url})` : '',
                    workflowType: 'rag',
                    options: {
                        useOllama: true, // Prefer local for efficiency
                        stream: false, // Can enable streaming later
                        temperature: 0.7,
                    },
                }),
            }).catch(() => null);
            if (workflowResponse?.ok) {
                const workflowData = await workflowResponse.json();
                setPromptResponse(workflowData.result || 'No response generated.');
                // Store eco metrics if available
                if (workflowData.greenScore !== undefined) {
                    setPromptEcoScore({
                        score: workflowData.greenScore,
                        tier: workflowData.greenTier || 'Green',
                        co2Saved: workflowData.co2SavedG || 0,
                    });
                }
                return;
            }
            // Fallback to Redix /ask endpoint
            const askResponse = await fetch(`${redixUrl}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: prompt,
                    context: tabContext,
                    options: {
                        provider: 'auto',
                        maxTokens: 500,
                    },
                }),
            }).catch(() => null);
            if (askResponse?.ok) {
                const askData = await askResponse.json();
                setPromptResponse(askData.text || 'No response generated.');
                // Store eco metrics if available
                if (askData.greenScore !== undefined) {
                    setPromptEcoScore({
                        score: askData.greenScore,
                        tier: askData.greenTier || 'Green',
                        co2Saved: askData.co2SavedG || 0,
                    });
                }
                return;
            }
            // Final fallback: Use LLM adapter directly
            try {
                const { sendPrompt } = await import('../../core/llm/adapter');
                const contextPrompt = tabContext
                    ? `Context: You are viewing "${tabContext.title}" at ${tabContext.url}\n\nUser question: ${prompt}`
                    : prompt;
                const response = await sendPrompt(contextPrompt, {
                    systemPrompt: 'You are a helpful AI assistant in a browser. Answer concisely.',
                    maxTokens: 500,
                });
                setPromptResponse(response.text);
            }
            catch {
                throw new Error('AI service unavailable. Please check your API keys or Redix server.');
            }
        }
        catch (error) {
            console.error('[BottomStatus] Prompt failed:', error);
            setPromptError(error.message || 'Failed to get AI response. Check Redix server or API keys.');
        }
        finally {
            setPromptLoading(false);
        }
    }, [prompt, promptLoading, activeId]);
    // Legacy IPC-based prompt handler (kept for backward compatibility)
    // The new handler above uses Redix /workflow with tab context
    // This can be removed once IPC redix.stream is fully deprecated
    useEffect(() => {
        if (!extraOpen && !trendOpen)
            return;
        const listenerOptions = { capture: true };
        const handleOutside = (event) => {
            const target = event.target;
            if (extraOpen && extraRef.current && extraRef.current.contains(target))
                return;
            if (trendOpen && trendRef.current && trendRef.current.contains(target))
                return;
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
            }
            else {
                await ipc.dns.enableDoH('cloudflare');
                setDohStatus({ enabled: true, provider: 'cloudflare' });
            }
        }
        catch (error) {
            console.error('Failed to toggle DoH:', error);
        }
    };
    const handleVpnConnect = useCallback(async (profileId) => {
        if (!profileId || vpnBusy) {
            return;
        }
        setVpnError(null);
        setVpnBusy(true);
        try {
            const result = await ipc.vpn.connect(profileId);
            await checkVpn().catch(() => { });
            if (result?.connected) {
                setVpnActiveId(profileId);
                const label = result.name || result.server || result.interface || 'VPN';
                addPrivacyEvent({
                    kind: 'vpn',
                    status: 'success',
                    message: label ? `VPN connected: ${label}` : 'VPN connected',
                });
            }
            else {
                addPrivacyEvent({
                    kind: 'vpn',
                    status: 'info',
                    message: 'VPN connect command sent',
                });
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setVpnError(message);
            addPrivacyEvent({ kind: 'vpn', status: 'warning', message: `VPN error: ${message}` });
        }
        finally {
            setVpnBusy(false);
        }
    }, [checkVpn, addPrivacyEvent, vpnBusy]);
    const handleVpnDisconnect = useCallback(async () => {
        if (vpnBusy) {
            return;
        }
        setVpnError(null);
        setVpnBusy(true);
        try {
            await ipc.vpn.disconnect();
            await checkVpn().catch(() => { });
            setVpnActiveId(null);
            addPrivacyEvent({ kind: 'vpn', status: 'info', message: 'VPN disconnect requested' });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setVpnError(message);
            addPrivacyEvent({ kind: 'vpn', status: 'warning', message: `VPN error: ${message}` });
        }
        finally {
            setVpnBusy(false);
        }
    }, [checkVpn, addPrivacyEvent, vpnBusy]);
    const efficiencyDetails = [
        efficiencyBadge || null,
        typeof efficiencySnapshot.batteryPct === 'number'
            ? `${Math.round(efficiencySnapshot.batteryPct)}%`
            : null,
        typeof carbonIntensity === 'number' ? `${Math.round(carbonIntensity)} gCO₂/kWh` : null,
        dailyCarbon > 0 ? `${dailyCarbon.toFixed(2)} gCO₂ saved today` : null,
    ]
        .filter(Boolean)
        .join(' · ');
    const efficiencyVariant = efficiencyLabel.includes('Regen')
        ? 'positive'
        : efficiencyLabel.includes('Battery')
            ? 'info'
            : 'default';
    const torBadgeDescription = torStatusLabel.replace(/^Tor:?\s*/i, '');
    // Don't show warning badge for stub mode (Tor not installed is fine)
    const torBadgeVariant = torStatus.stub
        ? 'default' // Changed from 'warning' - stub mode is normal, not an error
        : torStatus.running
            ? 'info'
            : 'default';
    const vpnBadgeDescription = vpnStatus.connected
        ? vpnStatus.type
            ? vpnStatus.type.toUpperCase()
            : 'Active'
        : 'Disconnected';
    const localeKey = uiLanguage?.startsWith('hi')
        ? 'hi'
        : uiLanguage?.startsWith('ta')
            ? 'ta'
            : 'en';
    const localeStrings = {
        shieldsOn: {
            en: 'Shields ON',
            hi: 'शील्ड चालू',
            ta: 'கவசம் இயக்கம்',
        },
        blocked: {
            en: 'Blocked',
            hi: 'रोकें',
            ta: 'தடுக்கப்பட்டது',
        },
    };
    return (_jsxs(_Fragment, { children: [_jsx(AnimatePresence, { children: privacyToast && (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 12 }, transition: { duration: 0.2 }, className: `fixed bottom-20 right-6 z-50 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-lg shadow-black/40 ${privacyToast.status === 'success'
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                        : privacyToast.status === 'warning'
                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
                            : 'border-sky-500/40 bg-sky-500/15 text-sky-100'}`, children: [privacyToast.kind === 'tor' ? (_jsx(Shield, { size: 16, "aria-hidden": "true" })) : (_jsx(Wifi, { size: 16, "aria-hidden": "true" })), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "font-medium", children: privacyToast.message }), _jsx("span", { className: "text-[10px] opacity-80", children: formatRelativeTime(privacyToast.timestamp) })] }), _jsx("button", { type: "button", onClick: () => setPrivacyToast(null), className: "ml-2 rounded p-1 text-[10px] transition-colors hover:text-white", "aria-label": "Dismiss privacy notification", children: _jsx(X, { size: 12 }) })] }, privacyToast.id)) }), _jsxs("div", { className: "hidden flex-col gap-2 border-t border-slate-800/60 bg-slate-950/90 px-4 py-2.5 text-xs text-gray-300 md:flex", "data-onboarding": "status-bar", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1.5 text-xs text-gray-300 sm:gap-2 sm:text-sm md:gap-3", children: [_jsx(PrivacySwitch, {}), _jsx(StatusMeter, { icon: Cpu, label: "CPU", value: `${cpuUsage}%`, percent: cpuUsage, gradient: "from-blue-500 via-cyan-500 to-blue-500", title: "CPU usage", sparklinePoints: sparklinePoints }), _jsx(StatusMeter, { icon: MemoryStick, label: "RAM", value: `${memoryUsage}%`, percent: memoryUsage, title: "System memory usage", gradient: "from-green-500 via-emerald-500 to-green-500" }), _jsx(StatusBadge, { icon: Activity, label: efficiencyLabel, description: efficiencyDetails || undefined, variant: efficiencyVariant, title: efficiencyBadge ?? efficiencyLabel }), _jsx(StatusBadge, { icon: Network, label: "Mode", description: privacyMode, className: privacyModeColors[privacyMode], title: `Privacy mode: ${privacyMode}` }), _jsx(StatusBadge, { icon: Shield, label: "Trust", description: trustDescription, variant: trustVariant, onClick: () => void openTrustDashboard(), title: "Open trust & ethics dashboard", loading: trustBadgeData.loading }), isOffline && (_jsx(StatusBadge, { icon: AlertTriangle, label: "Offline", description: "Local mode", variant: "warning", title: "Offline mode: remote services paused" })), _jsx(StatusBadge, { icon: Shield, label: "Blocked", description: shieldsStats.trackersBlocked > 0 || shieldsStats.adsBlocked > 0
                                    ? shieldsStats.trackersBlocked > 0 && shieldsStats.adsBlocked > 0
                                        ? `${shieldsStats.trackersBlocked} trackers, ${shieldsStats.adsBlocked} ads`
                                        : shieldsStats.trackersBlocked > 0
                                            ? `${shieldsStats.trackersBlocked} trackers`
                                            : `${shieldsStats.adsBlocked} ads`
                                    : '0 trackers', variant: shieldsStats.trackersBlocked > 0 || shieldsStats.adsBlocked > 0
                                    ? 'positive'
                                    : 'default', onClick: () => void openTrustDashboard(), title: shieldsStats.trackersBlocked > 0 || shieldsStats.adsBlocked > 0
                                    ? `Privacy shields active: ${shieldsStats.trackersBlocked} tracker${shieldsStats.trackersBlocked === 1 ? '' : 's'} and ${shieldsStats.adsBlocked} ad${shieldsStats.adsBlocked === 1 ? '' : 's'} blocked. Click to view details.`
                                    : 'Privacy shields: No trackers or ads blocked yet. Click to view privacy dashboard.' }), _jsxs("div", { className: "ml-auto flex flex-shrink-0 items-center gap-1.5 sm:gap-2", children: [_jsx(StatusBadge, { icon: Brain, label: "Model", description: modelReady ? 'Ready' : 'Loading', variant: modelReady ? 'positive' : 'default', pulse: modelReady, loading: !modelReady, title: "Local model status" }), _jsxs("button", { type: "button", className: "hidden items-center gap-1 rounded-full border border-gray-700/50 bg-gray-800/60 px-2 py-1 text-xs text-gray-300 transition-colors hover:border-gray-600 hover:text-white sm:px-3 sm:py-1.5 md:flex", onClick: () => setTrendOpen(prev => !prev), title: "View detailed performance trends", children: [_jsx(Activity, { size: 14 }), _jsx("span", { className: "hidden lg:inline", children: "Trends" })] }), _jsxs("div", { className: "relative hidden w-32 sm:block sm:w-48 md:w-60", children: [_jsx("input", { type: "text", value: prompt, onChange: e => setPrompt(e.target.value), onKeyDown: e => {
                                                    if (e.key === 'Enter') {
                                                        void handlePromptSubmit();
                                                    }
                                                }, placeholder: "Prompt agent (e.g., 'summarize this page')...", disabled: promptLoading || isOffline, className: `h-8 w-full rounded-full border border-gray-700/60 bg-gray-800/70 pl-3 pr-9 text-xs text-gray-200 placeholder-gray-400 focus:border-blue-500/60 focus:outline-none focus:ring-1 focus:ring-blue-500/40 ${promptLoading || isOffline ? 'cursor-not-allowed opacity-70' : ''}` }), promptLoading ? (_jsx(Loader2, { className: "absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-blue-300", "aria-label": "Sending prompt" })) : (_jsx("button", { type: "button", onClick: () => void handlePromptSubmit(), disabled: isOffline, className: "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-200 disabled:opacity-50", title: "Send prompt", children: _jsx(Send, { size: 14 }) }))] }), (promptResponse || promptError || promptLoading) && (_jsxs("div", { className: "hidden w-full space-y-2 sm:block", children: [_jsx("div", { className: "rounded-xl border border-gray-800 bg-gray-900/70 p-3 text-left text-xs text-gray-200", children: promptError ? (_jsx("span", { className: "text-red-400", children: promptError })) : (_jsx("span", { className: "whitespace-pre-wrap", children: promptResponse || (promptLoading ? 'Redix is thinking…' : '') })) }), promptEcoScore && !promptLoading && (_jsx("div", { className: "flex items-center justify-end", children: _jsx(EcoBadgeCompact, { score: promptEcoScore.score, tier: promptEcoScore.tier, co2SavedG: promptEcoScore.co2Saved }) }))] })), _jsxs("div", { className: "relative", ref: extraRef, children: [_jsxs("button", { type: "button", className: "flex items-center gap-1 rounded-full border border-gray-700/50 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-600 hover:text-white", onClick: () => setExtraOpen(prev => !prev), title: "Security & network controls", children: [_jsx(MoreHorizontal, { size: 14 }), "More"] }), _jsx(AnimatePresence, { children: extraOpen && (_jsx(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 }, transition: { duration: 0.16 }, className: "absolute right-0 mt-2 w-64 rounded-lg border border-gray-800 bg-slate-950/95 p-3 shadow-xl", children: _jsxs("div", { className: "grid gap-2", children: [_jsx(StatusBadge, { icon: Shield, label: "Tor", description: torBadgeDescription, variant: torBadgeVariant, onClick: !torStatus.loading
                                                                    ? async () => {
                                                                        if (torStatus.running) {
                                                                            addPrivacyEvent({
                                                                                kind: 'tor',
                                                                                status: 'info',
                                                                                message: 'Stopping Tor…',
                                                                            });
                                                                            await stopTor();
                                                                            // Verify status after stopping
                                                                            setTimeout(async () => {
                                                                                await refreshTor();
                                                                                const status = (await ipc.proxy.status());
                                                                                if (status?.tor?.enabled === false) {
                                                                                    addPrivacyEvent({
                                                                                        kind: 'tor',
                                                                                        status: 'success',
                                                                                        message: 'Tor stopped. Proxy disabled.',
                                                                                    });
                                                                                }
                                                                            }, 1000);
                                                                        }
                                                                        else {
                                                                            addPrivacyEvent({
                                                                                kind: 'tor',
                                                                                status: 'info',
                                                                                message: 'Starting Tor…',
                                                                            });
                                                                            await startTor();
                                                                            // Verify status after starting
                                                                            setTimeout(async () => {
                                                                                await refreshTor();
                                                                                const status = (await ipc.proxy.status());
                                                                                if (status?.tor?.enabled && status?.tor?.circuitEstablished) {
                                                                                    addPrivacyEvent({
                                                                                        kind: 'tor',
                                                                                        status: 'success',
                                                                                        message: `Tor active. Circuit: ${status.tor.circuitId || 'established'}`,
                                                                                    });
                                                                                }
                                                                                else if (status?.tor?.enabled) {
                                                                                    addPrivacyEvent({
                                                                                        kind: 'tor',
                                                                                        status: 'info',
                                                                                        message: 'Tor starting, circuit establishing…',
                                                                                    });
                                                                                }
                                                                            }, 2000);
                                                                        }
                                                                    }
                                                                    : undefined, loading: torStatus.loading, title: torTooltip, className: `justify-start ${torStatus.loading ? 'cursor-not-allowed opacity-60' : ''}` }), torStatus.running && !torStatus.stub && (_jsxs("button", { type: "button", onClick: () => {
                                                                    if (torStatus.loading)
                                                                        return;
                                                                    addPrivacyEvent({
                                                                        kind: 'tor',
                                                                        status: 'info',
                                                                        message: 'Requesting new Tor identity…',
                                                                    });
                                                                    void newTorIdentity()
                                                                        .then(() => {
                                                                        addPrivacyEvent({
                                                                            kind: 'tor',
                                                                            status: 'success',
                                                                            message: 'Tor identity refreshed',
                                                                        });
                                                                    })
                                                                        .catch(error => {
                                                                        const message = error instanceof Error ? error.message : String(error);
                                                                        addPrivacyEvent({
                                                                            kind: 'tor',
                                                                            status: 'warning',
                                                                            message: `Tor identity error: ${message}`,
                                                                        });
                                                                    });
                                                                }, className: "flex items-center gap-2 rounded-md border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-[11px] text-purple-100 transition-colors hover:border-purple-400/60", children: [_jsx(RefreshCw, { size: 12 }), "Request new Tor identity"] })), _jsx(StatusBadge, { icon: Wifi, label: "VPN", description: vpnBadgeDescription, variant: vpnStatus.connected ? 'positive' : 'default', onClick: !vpnStatus.loading ? () => void checkVpn() : undefined, loading: vpnStatus.loading, title: vpnTooltip, className: `justify-start ${vpnStatus.loading ? 'cursor-not-allowed opacity-60' : ''}` }), vpnProfiles.length > 0 && (_jsxs("div", { className: "space-y-2 rounded-md border border-gray-800/60 bg-gray-900/40 p-2", children: [_jsx("span", { className: "text-[10px] uppercase text-gray-400", children: "VPN Profiles" }), _jsx("div", { className: "space-y-1", children: vpnProfiles.map(profile => {
                                                                            const isActive = vpnActiveId === profile.id;
                                                                            return (_jsxs("button", { type: "button", onClick: () => handleVpnConnect(profile.id), disabled: vpnBusy, className: `w-full rounded-md px-2 py-1 text-left text-[11px] transition-colors ${isActive
                                                                                    ? 'border border-emerald-400/40 bg-emerald-500/20 text-emerald-100'
                                                                                    : 'border border-transparent text-gray-300 hover:border-gray-700'} ${vpnBusy ? 'cursor-wait opacity-70' : ''}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: profile.name }), isActive && (_jsx("span", { className: "text-[10px] opacity-70", children: "Active" }))] }), profile.server && (_jsx("div", { className: "text-[10px] opacity-60", children: profile.server }))] }, profile.id));
                                                                        }) }), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("button", { type: "button", onClick: () => handleVpnDisconnect(), disabled: !vpnActiveId || vpnBusy, className: "flex-1 rounded-md border border-gray-700/50 px-2 py-1 text-[10px] text-gray-300 transition-colors hover:border-gray-600 disabled:opacity-50", children: "Disconnect" }), vpnBusy && (_jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin text-emerald-300" }))] }), vpnError && (_jsx("div", { className: "rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200", children: vpnError }))] })), privacyEvents.length > 0 && (_jsxs("div", { className: "space-y-2 rounded-md border border-gray-800/60 bg-gray-900/40 p-2", children: [_jsxs("div", { className: "flex items-center justify-between text-[10px] uppercase text-gray-400", children: [_jsx("span", { children: "Privacy activity" }), _jsx("button", { type: "button", onClick: () => {
                                                                                    setPrivacyEvents([]);
                                                                                    setPrivacyToast(null);
                                                                                }, className: "rounded px-1.5 py-0.5 text-[9px] text-gray-400 transition-colors hover:text-gray-200", children: "Clear" })] }), _jsx("div", { className: "max-h-32 space-y-1 overflow-auto", children: privacyEvents
                                                                            .slice()
                                                                            .reverse()
                                                                            .map(event => {
                                                                            const dotColor = event.status === 'success'
                                                                                ? 'bg-emerald-400'
                                                                                : event.status === 'warning'
                                                                                    ? 'bg-amber-400'
                                                                                    : 'bg-sky-400';
                                                                            return (_jsxs("div", { className: "flex items-start gap-2 text-[11px] text-gray-300", children: [_jsx("span", { className: `mt-1 h-2 w-2 rounded-full ${dotColor}`, "aria-hidden": "true" }), _jsxs("div", { className: "space-y-0.5", children: [_jsxs("div", { className: "flex items-center gap-1", children: [event.kind === 'tor' ? (_jsx(Shield, { size: 12, className: "text-purple-300" })) : (_jsx(Wifi, { size: 12, className: "text-emerald-300" })), _jsx("span", { children: event.message })] }), _jsx("div", { className: "text-[9px] text-gray-500", children: formatRelativeTime(event.timestamp) })] })] }, event.id));
                                                                        }) })] })), _jsx(StatusBadge, { icon: Shield, label: "DoH", description: dohStatus.enabled ? dohStatus.provider : 'Disabled', variant: dohStatus.enabled ? 'info' : 'default', onClick: handleDoHToggle, title: "Toggle DNS-over-HTTPS", className: "justify-start" }), _jsx(StatusBadge, { icon: Activity, label: "Efficiency", description: efficiencyLabel || 'Normal', variant: "default", className: "justify-start" }), _jsx(StatusBadge, { icon: Cpu, label: "CPU", description: `${cpuUsage}%`, variant: cpuUsage > 70 ? 'warning' : 'default', title: "CPU usage", className: "justify-start" }), _jsx(StatusBadge, { icon: MemoryStick, label: "RAM", description: `${memoryUsage}%`, variant: memoryUsage > 75 ? 'warning' : 'default', title: "Memory usage", className: "justify-start" })] }) })) })] }), _jsx(AnimatePresence, { children: trendOpen && (_jsxs(motion.div, { ref: trendRef, initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 }, transition: { duration: 0.16 }, className: "absolute right-0 top-12 w-72 rounded-lg border border-gray-800 bg-slate-950/95 p-4 shadow-xl", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between text-xs text-gray-300", children: [_jsx("span", { className: "font-semibold uppercase tracking-wide", children: "Performance Trends" }), _jsx("button", { className: "text-xs opacity-70 transition-opacity hover:opacity-100", onClick: () => setTrendOpen(false), "aria-label": "Close trends panel", children: _jsx(X, { size: 12 }) })] }), _jsx(TrendChart, { label: "CPU %", points: trendCpuPoints, color: "#38bdf8", labels: trendLabels }), _jsx(TrendChart, { label: "RAM %", points: trendRamPoints, color: "#22d3ee", labels: trendLabels })] })) })] })] }), _jsxs("div", { className: "flex flex-wrap items-start gap-3", children: [_jsx(AnimatePresence, { children: efficiencyAlert && (_jsxs(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 }, className: `flex w-full max-w-xl items-center gap-3 rounded-lg border px-3 py-2 shadow-inner ${severityStyles[efficiencyAlert.severity]}`, children: [_jsx(AlertTriangle, { size: 14 }), _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "text-xs font-semibold", children: efficiencyAlert.title }), _jsx("span", { className: "text-[11px] opacity-80", children: efficiencyAlert.message })] }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [efficiencyAlert.actions.map(action => (_jsx("button", { onClick: () => handleEfficiencyAction(action), className: "rounded bg-gray-900/60 px-2 py-1 text-[11px] font-medium transition-colors hover:bg-gray-900/80", children: action.label }, action.id))), _jsx("button", { onClick: () => setEfficiencyAlert(null), className: "p-1 text-xs opacity-70 transition-opacity hover:opacity-100", "aria-label": "Dismiss efficiency alert", children: _jsx(X, { size: 12 }) })] })] }, "efficiency-alert")) }), _jsx(AnimatePresence, { children: metricsAlert && (_jsxs(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 6 }, className: `flex w-full max-w-xl items-center gap-3 rounded-lg border px-3 py-2 shadow-inner ${severityStyles[metricsAlert.severity]}`, children: [_jsx(Activity, { size: 14 }), _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "text-xs font-semibold", children: metricsAlert.title }), _jsx("span", { className: "text-[11px] opacity-80", children: metricsAlert.message })] }), _jsx("div", { className: "ml-auto", children: _jsx("button", { onClick: () => setMetricsAlert(null), className: "p-1 text-xs opacity-70 transition-opacity hover:opacity-100", "aria-label": "Dismiss metrics alert", children: _jsx(X, { size: 12 }) }) })] }, "metrics-alert")) })] })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-slate-900/70 bg-slate-950/95 px-4 py-3 text-xs text-gray-200 md:hidden", children: [_jsxs("div", { className: "flex flex-col", children: [_jsxs("span", { className: "text-[11px] text-gray-400", children: ["CPU ", cpuUsage, "% \u00B7 RAM ", memoryUsage, "%"] }), _jsxs("button", { type: "button", onClick: () => setPrivacyMode(prev => (prev === 'Normal' ? 'Ghost' : 'Normal')), className: "mt-1 inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-medium text-gray-100", children: [_jsx(Shield, { size: 12 }), localeStrings.shieldsOn[localeKey]] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "text-[11px] text-gray-400", children: [localeStrings.blocked[localeKey], ":", ' ', shieldsStats.trackersBlocked + shieldsStats.adsBlocked] }), _jsxs("span", { className: "text-[10px] text-gray-500", children: ["VPN: ", vpnStatus.connected ? vpnBadgeDescription : 'OFF'] })] })] })] }));
}
