import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * BottomStatusBar Component
 * System status tokens: CPU, RAM, Battery, Model
 */
import { useState, useEffect } from 'react';
import { useTokens } from '../useTokens';
/**
 * BottomStatusBar - System status display
 *
 * Features:
 * - Real-time system metrics
 * - Compact display
 * - Keyboard accessible
 * - Tooltips on hover
 */
export function BottomStatusBar({ status, className = '', showCpu = true, showRam = true, showBattery = true, showModel = true, showNetwork = true, }) {
    const tokens = useTokens();
    const [localStatus, setLocalStatus] = useState(status || {});
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
                model: 'Regen v0.1.0-alpha',
                network: {
                    connected: true,
                    speed: '1.2 Gbps',
                },
            });
        }, 2000);
        return () => clearInterval(interval);
    }, [status]);
    const formatBytes = (bytes) => {
        if (bytes < 1024)
            return `${bytes.toFixed(0)} MB`;
        return `${(bytes / 1024).toFixed(1)} GB`;
    };
    return (_jsxs("div", { className: `
        flex items-center justify-between gap-4
        border-t border-[var(--surface-border)]
        bg-[var(--surface-panel)]
        ${className}
      `, role: "status", "aria-label": "System status", style: {
            height: '32px',
            padding: `0 ${tokens.spacing(3)}`,
            fontSize: tokens.fontSize.xs,
        }, children: [_jsxs("div", { className: "flex items-center gap-4", children: [showCpu && localStatus.cpu && (_jsxs("div", { className: "flex items-center gap-1.5 text-[var(--text-muted)]", title: `CPU: ${localStatus.cpu.usage.toFixed(1)}% (${localStatus.cpu.cores || 'N/A'} cores)`, children: [_jsx("span", { className: "font-medium", children: "CPU" }), _jsx("div", { className: "w-12 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-[var(--color-primary-500)] transition-all duration-300", style: {
                                        width: `${localStatus.cpu.usage}%`,
                                    } }) }), _jsxs("span", { children: [localStatus.cpu.usage.toFixed(0), "%"] })] })), showRam && localStatus.ram && (_jsxs("div", { className: "flex items-center gap-1.5 text-[var(--text-muted)]", title: `RAM: ${formatBytes(localStatus.ram.used)} / ${formatBytes(localStatus.ram.total)}`, children: [_jsx("span", { className: "font-medium", children: "RAM" }), _jsx("div", { className: "w-12 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-[var(--color-primary-500)] transition-all duration-300", style: {
                                        width: `${localStatus.ram.percentage}%`,
                                    } }) }), _jsxs("span", { children: [localStatus.ram.percentage.toFixed(0), "%"] })] })), showBattery && localStatus.battery && (_jsxs("div", { className: "flex items-center gap-1.5 text-[var(--text-muted)]", title: `Battery: ${localStatus.battery.level.toFixed(0)}% ${localStatus.battery.charging ? '(Charging)' : ''}`, children: [_jsx("span", { className: "font-medium", children: "Battery" }), _jsx("div", { className: "w-12 h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden", children: _jsx("div", { className: `h-full transition-all duration-300 ${localStatus.battery.level > 20
                                        ? 'bg-[var(--color-success)]'
                                        : 'bg-[var(--color-error)]'}`, style: {
                                        width: `${localStatus.battery.level}%`,
                                    } }) }), _jsxs("span", { children: [localStatus.battery.level.toFixed(0), "%"] }), localStatus.battery.charging && (_jsx("span", { className: "text-[var(--color-success)]", children: "\u26A1" }))] })), showNetwork && localStatus.network && (_jsxs("div", { className: "flex items-center gap-1.5 text-[var(--text-muted)]", title: `Network: ${localStatus.network.connected ? 'Connected' : 'Disconnected'} ${localStatus.network.speed ? `(${localStatus.network.speed})` : ''}`, children: [_jsx("div", { className: `w-2 h-2 rounded-full ${localStatus.network.connected
                                    ? 'bg-[var(--color-success)]'
                                    : 'bg-[var(--color-error)]'}` }), _jsx("span", { children: localStatus.network.connected ? 'Online' : 'Offline' })] }))] }), showModel && localStatus.model && (_jsx("div", { className: "text-[var(--text-muted)]", title: localStatus.model, children: localStatus.model }))] }));
}
