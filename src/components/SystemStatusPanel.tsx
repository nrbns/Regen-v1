/**
 * SystemStatusPanel Component
 * Displays real-time system health status
 */

import { useState, useEffect, useRef } from 'react';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { CheckCircle, AlertCircle, XCircle, Loader, X } from 'lucide-react';
import { showToast } from '../state/toastStore';

function StatusRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'error' | 'neutral';
}) {
  const colorMap = {
    ok: 'text-green-500',
    warn: 'text-yellow-500',
    error: 'text-red-500',
    neutral: 'text-gray-400',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`${colorMap[status]} text-xs font-medium`}>{value}</span>
    </div>
  );
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function SystemStatusPanel() {
  const { data: status, isLoading } = useSystemStatus();
  const [isOpen, setIsOpen] = useState(false);

  // Listen for command bar trigger
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('system-status:open', handleOpen);
    return () => window.removeEventListener('system-status:open', handleOpen);
  }, []);

  // Show toast warnings for degraded services (only once per status change)
  const prevStatusRef = useRef<typeof status | null>(null);
  useEffect(() => {
    if (!status) return;

    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    // Only show toasts when status changes (not on every render)
    if (!prev) return; // Skip first render

    // Redis offline warning
    if (!status.redisConnected && prev.redisConnected) {
      showToast('warning', 'Redis is offline. Some features may be unavailable.');
    }

    // Redix unreachable warning
    if (!status.redixAvailable && prev.redixAvailable) {
      showToast('error', 'Redix service is unavailable. Automation features are disabled.');
    }

    // Worker overloaded/error warning
    if (status.workerState === 'error' && prev.workerState !== 'error') {
      showToast('error', 'Worker service has encountered an error. Background tasks may fail.');
    } else if (status.workerState === 'stopped' && prev.workerState !== 'stopped') {
      showToast('warning', 'Worker service is stopped. Background processing is disabled.');
    }
  }, [status]);

  if (isLoading || !status) {
    return (
      <div className="p-2">
        <Loader className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  // Determine overall status
  const allServicesOnline =
    status.redisConnected && status.redixAvailable && status.workerState === 'running';

  const someServicesDegraded = !status.redisConnected || status.workerState !== 'running';

  const StatusIcon = allServicesOnline ? CheckCircle : someServicesDegraded ? AlertCircle : XCircle;

  const statusColor = allServicesOnline
    ? 'text-green-500'
    : someServicesDegraded
      ? 'text-yellow-500'
      : 'text-red-500';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-800 rounded transition-colors"
        title="System Status"
        aria-label="System Status"
      >
        <StatusIcon className={`w-5 h-5 ${statusColor}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-200">System Status</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <StatusRow
                  label="Redis"
                  value={status.redisConnected ? 'Connected' : 'Offline'}
                  status={status.redisConnected ? 'ok' : 'error'}
                />
                <StatusRow
                  label="Redix"
                  value={status.redixAvailable ? 'Available' : 'Unavailable'}
                  status={status.redixAvailable ? 'ok' : 'error'}
                />
                <StatusRow
                  label="Worker"
                  value={status.workerState}
                  status={
                    status.workerState === 'running'
                      ? 'ok'
                      : status.workerState === 'stopped'
                        ? 'warn'
                        : 'error'
                  }
                />
                <StatusRow
                  label="VPN"
                  value={status.vpn.connected ? 'Connected' : 'Disconnected'}
                  status={status.vpn.connected ? 'ok' : 'neutral'}
                />
                <StatusRow
                  label="Tor"
                  value={status.tor.running ? 'Running' : 'Stopped'}
                  status={status.tor.running ? 'ok' : 'neutral'}
                />
                <StatusRow label="Mode" value={status.mode} status="neutral" />

                <div className="pt-2 border-t border-gray-700 mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Memory</span>
                    <span>{(status.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Uptime</span>
                    <span>{formatUptime(status.uptime)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
