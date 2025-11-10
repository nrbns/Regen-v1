/**
 * BottomStatus - Status bar with live indicators and AI prompt
 */

import { useState, useEffect, useRef } from 'react';
import { Lock, Send, Cpu, MemoryStick, Network, Brain, Shield, Activity, AlertTriangle, X, RefreshCw, Wifi, MoonStar, FileText } from 'lucide-react';
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

export function BottomStatus() {
  const { activeId } = useTabsStore();
  const [prompt, setPrompt] = useState('');
  const [dohStatus, setDohStatus] = useState({ enabled: false, provider: 'cloudflare' });
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [modelReady, setModelReady] = useState(true);
  const [privacyMode, setPrivacyMode] = useState<'Normal' | 'Ghost' | 'Tor'>('Normal');
  const [efficiencyAlert, setEfficiencyAlert] = useState<EfficiencyAlert | null>(null);
  const efficiencyLabel = useEfficiencyStore((state) => state.label);
  const efficiencyBadge = useEfficiencyStore((state) => state.badge);
  const efficiencyColor = useEfficiencyStore((state) => state.colorClass);
  const efficiencySnapshot = useEfficiencyStore((state) => state.snapshot);
  const setEfficiencyEvent = useEfficiencyStore((state) => state.setEvent);
  const shadowSessionId = useShadowStore((state) => state.activeSessionId);
  const shadowLoading = useShadowStore((state) => state.loading);
  const shadowSummary = useShadowStore((state) => state.summary);
  const handleShadowEnded = useShadowStore((state) => state.handleSessionEnded);
  const clearShadowSummary = useShadowStore((state) => state.clearSummary);
  const carbonIntensity = efficiencySnapshot.carbonIntensity ?? null;
  const carbonTooltip =
    typeof carbonIntensity === 'number'
      ? `Local grid intensity ≈ ${Math.round(carbonIntensity)} gCO₂/kWh`
      : 'Carbon intensity data unavailable';
  const torStatus = usePrivacyStore((state) => state.tor);
  const vpnStatus = usePrivacyStore((state) => state.vpn);
  const refreshTor = usePrivacyStore((state) => state.refreshTor);
  const refreshVpn = usePrivacyStore((state) => state.refreshVpn);
  const startTor = usePrivacyStore((state) => state.startTor);
  const stopTor = usePrivacyStore((state) => state.stopTor);
  const newTorIdentity = usePrivacyStore((state) => state.newTorIdentity);
  const checkVpn = usePrivacyStore((state) => state.checkVpn);

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

  // Update CPU and memory (throttled) - use ref to prevent infinite loops
  const statsUpdateRef = useRef<number>(0);
  
  useEffect(() => {
    const updateSystemStats = () => {
      try {
        // Would use actual IPC call to get process stats
        // const stats = await ipc.system.getStats();
        // setCpuUsage(stats.cpu);
        // setMemoryUsage(stats.memory);
        
        // Mock for now - only update if interval has passed to prevent loops
        const now = Date.now();
        if (now - statsUpdateRef.current >= 1000) {
          statsUpdateRef.current = now;
          setCpuUsage(prev => {
            const newVal = Math.floor(Math.random() * 30) + 5;
            return prev !== newVal ? newVal : prev;
          });
          setMemoryUsage(prev => {
            const newVal = Math.floor(Math.random() * 60) + 20;
            return prev !== newVal ? newVal : prev;
          });
        }
      } catch {}
    };

    updateSystemStats();
    const interval = setInterval(updateSystemStats, 1000); // Throttled to 1s
    return () => clearInterval(interval);
  }, []);

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

  const torStatusLabel = torStatus.stub
    ? 'Tor: Stub'
    : torStatus.running
      ? torStatus.circuitEstablished
        ? 'Tor: On'
        : `Tor: ${Math.round(torStatus.progress)}%`
      : 'Tor: Off';
  const torColorClass = torStatus.stub
    ? 'text-amber-300'
    : torStatus.running
      ? torStatus.circuitEstablished
        ? 'text-purple-300'
        : 'text-amber-300'
      : 'text-gray-500';
  const torTooltip = torStatus.error
    ? `Tor warning: ${torStatus.error}`
    : torStatus.stub
      ? 'Tor binary not found; using stub mode for UI only.'
      : torStatus.running
        ? torStatus.circuitEstablished
          ? 'Tor circuit established. Click to stop.'
          : 'Tor starting up. Click to stop.'
        : 'Route traffic through Tor. Click to enable.';

  const vpnStatusLabel = vpnStatus.connected
    ? `VPN: ${vpnStatus.type ? vpnStatus.type.toUpperCase() : 'Active'}`
    : 'VPN: Disconnected';
  const vpnColorClass = vpnStatus.connected ? 'text-emerald-300' : 'text-gray-500';
  const vpnTooltip = vpnStatus.connected
    ? `VPN connected${vpnStatus.name ? ` (${vpnStatus.name})` : ''}. Click to re-check.`
    : 'Check whether a system VPN is active.';

  const severityStyles: Record<'info' | 'warning' | 'critical', string> = {
    info: 'bg-blue-500/10 border-blue-400/40 text-blue-100',
    warning: 'bg-amber-500/10 border-amber-400/40 text-amber-100',
    critical: 'bg-red-500/10 border-red-400/40 text-red-100',
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

  return (
    <div
      className="h-10 flex items-center justify-between px-4 bg-gray-800/90 backdrop-blur-sm border-t border-gray-700/50"
      data-onboarding="status-bar"
    >
      {/* Left: Status Indicators */}
      <div className="flex items-center gap-4 text-xs text-gray-300">
        {/* Privacy Mode Switch */}
        <PrivacySwitch />
        
        {/* Efficiency Alerts */}
        <AnimatePresence>
          {efficiencyAlert && (
            <motion.div
              key="efficiency-alert"
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className={`flex items-center gap-3 px-3 py-2 border rounded-lg shadow-inner ${severityStyles[efficiencyAlert.severity]}`}
            >
              <AlertTriangle size={14} />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold">{efficiencyAlert.title}</span>
                <span className="text-[11px] opacity-80">{efficiencyAlert.message}</span>
              </div>
              <div className="flex items-center gap-2 ml-2">
                {efficiencyAlert.actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleEfficiencyAction(action)}
                    className="px-2 py-1 text-[11px] font-medium rounded bg-gray-900/60 hover:bg-gray-900/80 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  onClick={() => setEfficiencyAlert(null)}
                  className="p-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                  aria-label="Dismiss efficiency alert"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CPU & Memory Gauges (clickable) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-1.5 hover:text-gray-200 transition-colors"
          title="Click to open performance inspector"
        >
          <Cpu size={14} className="text-gray-500" />
          <span>CPU: {cpuUsage}%</span>
          <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
              initial={{ width: 0 }}
              animate={{ width: `${cpuUsage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-1.5 hover:text-gray-200 transition-colors"
          title="Memory usage"
        >
          <MemoryStick size={14} className="text-gray-500" />
          <span>RAM: {memoryUsage}%</span>
          <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${memoryUsage}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.button>

        {/* Efficiency Mode */}
        <div
          className={`flex items-center gap-1.5 ${efficiencyColor}`}
          title={
            efficiencyBadge
              ? `${efficiencyLabel} · ${efficiencyBadge}`
              : efficiencyLabel
          }
        >
          <Activity size={14} />
          <span>{efficiencyLabel}</span>
          {efficiencyBadge && (
            <span className="text-xs text-emerald-300">{efficiencyBadge}</span>
          )}
          {typeof efficiencySnapshot.batteryPct === 'number' && (
            <span className="text-xs text-gray-400">
              ({Math.round(efficiencySnapshot.batteryPct)}%)
            </span>
          )}
          {typeof carbonIntensity === 'number' && (
            <span className="text-xs text-emerald-200/80" title={carbonTooltip}>
              · {Math.round(carbonIntensity)} gCO₂/kWh
            </span>
          )}
        </div>

        {/* Shadow Mode Status */}
        <div
          className={`flex items-center gap-1.5 ${
            shadowSessionId ? 'text-purple-300' : 'text-gray-500'
          }`}
          title={
            shadowSessionId
              ? 'Shadow Mode is active. Click the Shadow button to end.'
              : 'Shadow Mode inactive.'
          }
        >
          <MoonStar size={14} />
          <span>{shadowSessionId ? 'Shadow: On' : 'Shadow: Off'}</span>
          {shadowLoading && (
            <motion.div
              className="w-1.5 h-1.5 bg-purple-300 rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
        </div>

        <AnimatePresence>
          {shadowSummary && (
            <motion.div
              key="shadow-summary"
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="flex items-start gap-3 px-3 py-2 border rounded-lg shadow-inner border-purple-500/40 bg-purple-500/10 text-xs text-purple-100 max-w-sm"
            >
              <FileText size={14} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide">Shadow Summary</span>
                  <button
                    onClick={clearShadowSummary}
                    className="p-1 text-[10px] text-purple-200/80 hover:text-purple-50 transition-colors"
                    aria-label="Dismiss shadow summary"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="text-[11px] opacity-90">
                  {shadowSummary.recommendations?.[0] ?? 'Review your shadow session.'}
                </div>
                <div className="text-[10px] flex flex-wrap gap-2 opacity-80">
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
                            className="text-[11px] text-purple-200 hover:text-purple-50"
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

        {/* Tor / VPN Controls */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: torStatus.loading ? 1 : 1.05 }}
            onClick={() => {
              if (torStatus.loading) return;
              if (torStatus.running) {
                void stopTor();
              } else {
                void startTor();
              }
            }}
            disabled={torStatus.loading}
            className={`flex items-center gap-1.5 transition-colors ${torColorClass} ${torStatus.loading ? 'opacity-60 cursor-not-allowed' : 'hover:text-gray-200'}`}
            title={torTooltip}
          >
            <Shield size={14} />
            <span>{torStatusLabel}</span>
          </motion.button>
          {torStatus.running && !torStatus.stub && (
            <motion.button
              whileHover={{ scale: torStatus.loading ? 1 : 1.05 }}
              onClick={() => {
                if (!torStatus.loading) {
                  void newTorIdentity();
                }
              }}
              disabled={torStatus.loading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-60"
              title="Request a new Tor identity"
            >
              <RefreshCw size={12} />
              <span>New ID</span>
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: vpnStatus.loading ? 1 : 1.05 }}
            onClick={() => {
              if (!vpnStatus.loading) {
                void checkVpn();
              }
            }}
            disabled={vpnStatus.loading}
            className={`flex items-center gap-1.5 transition-colors ${vpnColorClass} ${vpnStatus.loading ? 'opacity-60 cursor-not-allowed' : 'hover:text-gray-200'}`}
            title={vpnTooltip}
          >
            <Wifi size={14} />
            <span>{vpnStatusLabel}</span>
          </motion.button>
        </div>

        {/* Network Status */}
        <div className="flex items-center gap-1.5" title={`Network: ${privacyMode} mode`}>
          <Network size={14} className={
            privacyMode === 'Tor' ? 'text-purple-400' :
            privacyMode === 'Ghost' ? 'text-blue-400' :
            'text-gray-500'
          } />
          <span className={privacyModeColors[privacyMode]}>{privacyMode}</span>
        </div>
        
        {/* DoH Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={async () => {
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
          }}
          className={`flex items-center gap-1.5 transition-colors ${
            dohStatus.enabled ? 'text-purple-400' : 'text-gray-500'
          } hover:text-gray-200`}
          title="DNS-over-HTTPS"
        >
          <Shield size={14} />
          <span className="text-xs">DoH</span>
        </motion.button>

        <SymbioticVoiceCompanion />
        
        {/* Model Status */}
        <div className={`flex items-center gap-1.5 ${modelReady ? 'text-green-400' : 'text-yellow-400'}`}>
          <Brain size={14} />
          <span className="text-xs">Model: {modelReady ? 'Ready' : 'Loading...'}</span>
          {modelReady && (
            <motion.div
              className="w-1.5 h-1.5 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Right: AI Prompt Input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && prompt.trim() && activeId) {
              e.preventDefault();
              try {
                const taskId = await ipc.agent.createTask({
                  title: 'User Prompt',
                  role: 'researcher',
                  goal: prompt,
                  budget: { tokens: 4096, seconds: 120, requests: 20 },
                });
                console.log('Created agent task:', taskId);
                setPrompt('');
              } catch (error) {
                console.error('Failed to create agent task:', error);
              }
            }
          }}
          placeholder="Prompt agent (e.g., 'summarize this page')..."
          className="w-72 h-7 px-3 pr-8 bg-gray-700/60 border border-gray-600/50 rounded text-xs text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50"
        />
        <button
          onClick={async () => {
            if (prompt.trim() && activeId) {
              try {
                const taskId = await ipc.agent.createTask({
                  title: 'User Prompt',
                  role: 'researcher',
                  goal: prompt,
                  budget: { tokens: 4096, seconds: 120, requests: 20 },
                });
                console.log('Created agent task:', taskId);
                setPrompt('');
              } catch (error) {
                console.error('Failed to create agent task:', error);
              }
            }
          }}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          title="Send prompt"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
