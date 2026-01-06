/**
 * useSystemStatus Hook
 * Hook for fetching system status with auto-refresh
 */

import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc-typed';
import { isElectronRuntime, isTauriRuntime } from '../lib/env';

export interface SystemStatus {
  redisConnected: boolean;
  redixAvailable: boolean;
  workerState: 'running' | 'stopped' | 'error';
  vpn: {
    connected: boolean;
    profile?: string;
    type?: string;
  };
  tor: {
    running: boolean;
    bootstrapped: boolean;
  };
  mode: string;
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  battery?: {
    charging: boolean;
    level: number; // 0..1
  };
  cpuPercent?: number | null;
  agentStatus?: 'idle' | 'running' | 'stuck' | 'repaired' | string;
  health?: 'Stable' | 'Throttled' | 'Repairing' | string;
  lastRepair?: string | null;
}

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      try {
        const data = await ipc.system.getStatus();
        setStatus(data);
        setError(null);
        return;
      } catch (ipcErr) {
        // If IPC call failed (e.g., no backend available), fall back to a native collector
        try {
          const native = await import('../lib/system/getNativeSystemStatus').then(m => m.getNativeSystemStatus());
          setStatus(native as SystemStatus);
          setError(null);
          return;
        } catch (nativeErr) {
          // Fall through to outer handler
          console.error('[useSystemStatus] Native collector failed:', nativeErr);
          throw ipcErr;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch system status'));
      console.error('[useSystemStatus] Failed to fetch status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const isWebMode = !isElectronRuntime() && !isTauriRuntime();

    // In web mode, provide a best-effort local collector so the SystemBar can still show metrics
    if (isWebMode) {
      let mounted = true;
      const fetchBrowser = async () => {
        try {
          setIsLoading(true);
          const data = await import('../lib/system/getBrowserSystemStatus').then(m => m.getBrowserSystemStatus());
          if (!mounted) return;
          setStatus(data as SystemStatus);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to fetch browser system status'));
        } finally {
          setIsLoading(false);
        }
      };

      // Initial fetch and periodic refresh (faster for realtime feel)
      fetchBrowser();
      const interval = setInterval(fetchBrowser, 1000);

      // Attach battery event listeners if supported so UI updates immediately
      let batteryObj: any | null = null;
      (async () => {
        try {
          if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
            batteryObj = await (navigator as any).getBattery();
            const updateBattery = () => {
              setStatus(prev => {
                if (!prev) return prev;
                return { ...prev, battery: { charging: !!batteryObj.charging, level: Number(batteryObj.level) } } as SystemStatus;
              });
            };
            batteryObj.addEventListener('chargingchange', updateBattery);
            batteryObj.addEventListener('levelchange', updateBattery);
          }
        } catch (e) {
          // ignore battery listener failures
        }
      })();

      return () => {
        mounted = false;
        clearInterval(interval);
        try {
          if (batteryObj) {
            batteryObj.removeEventListener('chargingchange', () => {});
            batteryObj.removeEventListener('levelchange', () => {});
          }
        } catch (e) {}
      };
    }

    // Fetch immediately (native runtimes)
    fetchStatus();

    // Then refresh every 1 second for a realtime feel
    const interval = setInterval(fetchStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    data: status,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
