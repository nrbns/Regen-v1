/**
 * BottomStatusBar Component
 * System status tokens: CPU, RAM, Battery, Model
 */

import React, { useState, useEffect } from 'react';
import { useTokens } from '../useTokens';

export interface SystemStatus {
  cpu?: {
    usage: number; // 0-100
    cores?: number;
  };
  ram?: {
    used: number; // MB
    total: number; // MB
    percentage: number; // 0-100
  };
  battery?: {
    level: number; // 0-100
    charging: boolean;
  };
  model?: string;
  network?: {
    connected: boolean;
    speed?: string;
  };
}

export interface BottomStatusBarProps {
  status?: SystemStatus;
  className?: string;
  showCpu?: boolean;
  showRam?: boolean;
  showBattery?: boolean;
  showModel?: boolean;
  showNetwork?: boolean;
}

/**
 * BottomStatusBar - System status display
 *
 * Features:
 * - Real-time system metrics
 * - Compact display
 * - Keyboard accessible
 * - Tooltips on hover
 */
export function BottomStatusBar({
  status,
  className = '',
  showCpu = true,
  showRam = true,
  showBattery = true,
  showModel = true,
  showNetwork = true,
}: BottomStatusBarProps) {
  const tokens = useTokens();
  const [localStatus, setLocalStatus] = useState<SystemStatus>(status || {});

  // Mock system status updates (in production, this would come from IPC)
  useEffect(() => {
    if (status) {
      setLocalStatus(status);
      return;
    }

    // Mock data for development
    const interval = setInterval(() => {
      setLocalStatus({
        cpu: {
          usage: Math.random() * 30 + 10,
          cores: 8,
        },
        ram: {
          used: 4096 + Math.random() * 1024,
          total: 16384,
          percentage: ((4096 + Math.random() * 1024) / 16384) * 100,
        },
        battery: {
          level: 85 + Math.random() * 10,
          charging: false,
        },
        model: 'OmniBrowser v0.1.0-alpha',
        network: {
          connected: true,
          speed: '1.2 Gbps',
        },
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [status]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes.toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(1)} GB`;
  };

  return (
    <div
      className={`
        flex items-center justify-between gap-4
        border-t border-[var(--surface-border)]
        bg-[var(--surface-panel)]
        ${className}
      `}
      role="status"
      aria-label="System status"
      style={{
        height: '32px',
        padding: `0 ${tokens.spacing(3)}`,
        fontSize: tokens.fontSize.xs,
      }}
    >
      {/* Left: System metrics */}
      <div className="flex items-center gap-4">
        {/* CPU */}
        {showCpu && localStatus.cpu && (
          <div
            className="flex items-center gap-1.5 text-[var(--text-muted)]"
            title={`CPU: ${localStatus.cpu.usage.toFixed(1)}% (${localStatus.cpu.cores || 'N/A'} cores)`}
          >
            <span className="font-medium">CPU</span>
            <div className="w-12 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary-500)] transition-all duration-300"
                style={{
                  width: `${localStatus.cpu.usage}%`,
                }}
              />
            </div>
            <span>{localStatus.cpu.usage.toFixed(0)}%</span>
          </div>
        )}

        {/* RAM */}
        {showRam && localStatus.ram && (
          <div
            className="flex items-center gap-1.5 text-[var(--text-muted)]"
            title={`RAM: ${formatBytes(localStatus.ram.used)} / ${formatBytes(localStatus.ram.total)}`}
          >
            <span className="font-medium">RAM</span>
            <div className="w-12 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary-500)] transition-all duration-300"
                style={{
                  width: `${localStatus.ram.percentage}%`,
                }}
              />
            </div>
            <span>{localStatus.ram.percentage.toFixed(0)}%</span>
          </div>
        )}

        {/* Battery */}
        {showBattery && localStatus.battery && (
          <div
            className="flex items-center gap-1.5 text-[var(--text-muted)]"
            title={`Battery: ${localStatus.battery.level.toFixed(0)}% ${localStatus.battery.charging ? '(Charging)' : ''}`}
          >
            <span className="font-medium">Battery</span>
            <div className="w-12 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  localStatus.battery.level > 20
                    ? 'bg-[var(--color-success)]'
                    : 'bg-[var(--color-error)]'
                }`}
                style={{
                  width: `${localStatus.battery.level}%`,
                }}
              />
            </div>
            <span>{localStatus.battery.level.toFixed(0)}%</span>
            {localStatus.battery.charging && (
              <span className="text-[var(--color-success)]">⚡</span>
            )}
          </div>
        )}

        {/* Network */}
        {showNetwork && localStatus.network && (
          <div
            className="flex items-center gap-1.5 text-[var(--text-muted)]"
            title={`Network: ${localStatus.network.connected ? 'Connected' : 'Disconnected'} ${localStatus.network.speed ? `(${localStatus.network.speed})` : ''}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                localStatus.network.connected
                  ? 'bg-[var(--color-success)]'
                  : 'bg-[var(--color-error)]'
              }`}
            />
            <span>{localStatus.network.connected ? 'Online' : 'Offline'}</span>
          </div>
        )}
      </div>

      {/* Right: Model/Version */}
      {showModel && localStatus.model && (
        <div className="text-[var(--text-muted)]" title={localStatus.model}>
          {localStatus.model}
        </div>
      )}
    </div>
  );
}
