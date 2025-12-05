import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * NetworkButton - Proxy/Tor/VPN/DoH status with controls
 */
import { useState, useEffect } from 'react';
import { Network, ChevronDown, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { ipc } from '../../lib/ipc-typed';
export function NetworkButton() {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState({
        doh: { enabled: false, provider: 'cloudflare' },
    });
    // Listen for network status updates
    useIPCEvent('net:status', (data) => {
        setStatus(data);
    }, []);
    // Load initial status (wait for IPC)
    useEffect(() => {
        const loadStatus = async () => {
            // Wait for IPC to be ready
            if (!window.ipc || typeof window.ipc.invoke !== 'function') {
                // Retry after a delay
                setTimeout(loadStatus, 500);
                return;
            }
            try {
                const s = await ipc.dns.status();
                setStatus(prev => ({ ...prev, doh: s }));
            }
            catch {
                // Silently handle - will retry if needed
            }
        };
        // Delay initial load to allow IPC to initialize
        setTimeout(loadStatus, 300);
    }, []);
    const handleNewTorIdentity = async () => {
        try {
            await ipc.tor.newIdentity();
        }
        catch (error) {
            console.error('Failed to get new Tor identity:', error);
        }
    };
    const hasActiveConnection = status.tor?.circuitEstablished || status.vpn?.connected || status.proxy?.enabled;
    return (_jsxs("div", { className: "relative", children: [_jsxs(motion.button, { "data-network-button": true, onClick: () => setOpen(!open), whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: `
          relative flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50
          text-gray-300 hover:text-gray-100 transition-colors
        `, children: [_jsx(Network, { size: 16, className: hasActiveConnection ? 'text-green-400' : 'text-gray-500' }), hasActiveConnection && (_jsx(motion.div, { className: "w-2 h-2 bg-green-400 rounded-full", animate: { scale: [1, 1.2, 1] }, transition: { duration: 2, repeat: Infinity } })), _jsx(ChevronDown, { size: 14, className: `transition-transform ${open ? 'rotate-180' : ''}` })] }), _jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-40", onClick: () => setOpen(false) }), _jsx(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "absolute top-full right-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl z-50", children: _jsxs("div", { className: "p-4 space-y-4", children: [status.tor && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Network, { size: 16, className: "text-purple-400" }), _jsx("span", { className: "text-sm font-medium text-gray-200", children: "Tor" })] }), status.tor.circuitEstablished ? (_jsx(CheckCircle, { size: 16, className: "text-green-400" })) : (_jsx(XCircle, { size: 16, className: "text-red-400" }))] }), status.tor.enabled && status.tor.circuitEstablished && (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "text-xs text-gray-400", children: ["Identity: ", status.tor.identity.slice(0, 8), "..."] }), _jsxs("button", { onClick: handleNewTorIdentity, className: "w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-xs text-purple-300 transition-colors", children: [_jsx(RefreshCw, { size: 14 }), "New Identity"] })] }))] })), status.vpn && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Network, { size: 16, className: "text-blue-400" }), _jsx("span", { className: "text-sm font-medium text-gray-200", children: "VPN" })] }), status.vpn.connected ? (_jsx(CheckCircle, { size: 16, className: "text-green-400" })) : (_jsx(XCircle, { size: 16, className: "text-gray-500" }))] }), status.vpn.provider && (_jsxs("div", { className: "text-xs text-gray-400", children: ["Provider: ", status.vpn.provider] }))] })), status.proxy && status.proxy.enabled && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Network, { size: 16, className: "text-cyan-400" }), _jsx("span", { className: "text-sm font-medium text-gray-200", children: "Proxy" })] }), _jsx(CheckCircle, { size: 16, className: "text-green-400" })] }), status.proxy.host && (_jsxs("div", { className: "text-xs text-gray-400", children: [status.proxy.type.toUpperCase(), ": ", status.proxy.host] }))] })), status.doh && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Network, { size: 16, className: "text-green-400" }), _jsx("span", { className: "text-sm font-medium text-gray-200", children: "DNS-over-HTTPS" })] }), status.doh.enabled ? (_jsx(CheckCircle, { size: 16, className: "text-green-400" })) : (_jsx(XCircle, { size: 16, className: "text-gray-500" }))] }), status.doh.enabled && (_jsxs("div", { className: "text-xs text-gray-400", children: ["Provider: ", status.doh.provider] }))] }))] }) })] })) })] }));
}
