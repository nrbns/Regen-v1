import React from 'react';
import { Cpu, Database, BatteryCharging, Clock } from 'lucide-react';
import { useSystemStatus } from '../../hooks/useSystemStatus';

export function SystemBar() {
  const { data: status } = useSystemStatus();

  const memoryMB = status?.memoryUsage ? (status.memoryUsage.heapUsed / 1024 / 1024).toFixed(0) : '--';
  const uptime = status ? Math.floor(status.uptime / 1000 / 60) + 'm' : '--';
  const redix = status?.redixAvailable ? 'ok' : 'unavailable';
  const batteryLevel = typeof status?.battery?.level === 'number' ? Math.round(status!.battery!.level * 100) : null;
  const charging = !!status?.battery?.charging;
  const cpu = typeof status?.cpuPercent === 'number' ? `${status.cpuPercent}%` : status?.cpu?.percent ? `${status.cpu.percent}%` : '--';
  const modeLabel = status?.mode ?? '--';
  const agent = status?.agentStatus ?? status?.workerState ?? '--';
  const health = status?.health ?? 'Stable';
  const lastRepair = status?.lastRepair ?? 'None';

  return (
    <div className="hidden md:flex items-center gap-3 text-xs text-gray-300 ml-3">
      <div className="flex items-center gap-1 rounded px-2 py-1 bg-[var(--surface-elevated)] text-[var(--text-muted)]">
        <Cpu className="h-4 w-4 text-gray-300" />
        <span className="font-medium">{memoryMB}MB</span>
      <div className="flex items-center gap-2 mr-2 text-[var(--text-muted)]">
        <span className="font-medium">MODE: {modeLabel}</span>
        <span className="opacity-50">|</span>
        <span>AGENT: {agent}</span>
        <span className="opacity-50">|</span>
        <span>HEALTH: {health}</span>
      </div>
      </div>

      <div className="flex items-center gap-1 rounded px-2 py-1 bg-[var(--surface-elevated)] text-[var(--text-muted)]">
        <Database className={`h-4 w-4 ${redix === 'ok' ? 'text-green-400' : 'text-red-400'}`} />
        <span>{status?.redixAvailable ? 'Redix' : 'Redix✕'}</span>
      </div>

      <div className="flex items-center gap-1 rounded px-2 py-1 bg-[var(--surface-elevated)] text-[var(--text-muted)]">
        <BatteryCharging className={`h-4 w-4 ${charging ? 'text-yellow-300' : 'text-gray-300'}`} />
        <span>{batteryLevel !== null ? `Battery: ${batteryLevel}%` : 'Battery: --'}</span>
      </div>

      <div className="flex items-center gap-1 rounded px-2 py-1 bg-[var(--surface-elevated)] text-[var(--text-muted)]">
        <span className="font-medium">CPU: {cpu}</span>
      </div>
      <div className="flex items-center gap-1 rounded px-2 py-1 bg-[var(--surface-elevated)] text-[var(--text-muted)]">
        <span>Repair: {lastRepair}</span>
      </div>
      <div className="flex items-center gap-1 rounded px-2 py-1 bg-[var(--surface-elevated)] text-[var(--text-muted)]">
        <Clock className="h-4 w-4 text-gray-300" />
        <span>{uptime}</span>
      </div>
    </div>
  );
}

export default SystemBar;