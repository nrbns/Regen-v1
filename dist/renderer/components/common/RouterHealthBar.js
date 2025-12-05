import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * RouterHealthBar - Shows the health status of AI providers (Ollama + Hugging Face)
 * Displays in the UI to inform users about provider availability
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { checkRouterHealth, startHealthPolling, stopHealthPolling, } from '../../services/routerHealth';
import { motion } from 'framer-motion';
import { toast } from '../../utils/toast';
export function RouterHealthBar({ className = '', showDetails = false, position = 'top', }) {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [_lastError, setLastError] = useState(null);
    useEffect(() => {
        // Initial check
        checkRouterHealth()
            .then(setHealth)
            .catch((err) => {
            console.error('[RouterHealthBar] Initial health check failed', err);
            setLastError(err.message);
        })
            .finally(() => setLoading(false));
        // Start polling
        startHealthPolling((newHealth) => {
            const wasOk = health?.ok;
            setHealth(newHealth);
            // Show toast on status change
            if (wasOk !== undefined && wasOk !== newHealth.ok) {
                if (newHealth.ok) {
                    toast.success('AI engine online');
                }
                else {
                    toast.warning('AI engine offline — using static search');
                }
            }
            // Show toast on provider fallback
            if (newHealth.metrics?.requests.fallbacks && newHealth.metrics.requests.fallbacks > 0) {
                toast.info('Switched to cloud model');
            }
        });
        return () => {
            stopHealthPolling();
        };
    }, []);
    if (loading && !health) {
        return (_jsxs("div", { className: `flex items-center gap-2 text-xs ${className}`, children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin text-gray-400" }), _jsx("span", { className: "text-gray-400", children: "Checking AI engine..." })] }));
    }
    if (!health) {
        return null;
    }
    const ollamaStatus = health.ollama.available;
    const hfStatus = health.hf.available;
    const overallOk = health.ok;
    const StatusIcon = overallOk ? CheckCircle2 : XCircle;
    const statusColor = overallOk ? 'text-emerald-400' : 'text-red-400';
    if (position === 'inline') {
        // Compact inline version for status bars
        return (_jsxs("div", { className: `flex items-center gap-1.5 ${className}`, children: [overallOk ? (_jsx(CheckCircle2, { className: "w-3 h-3 text-emerald-400" })) : (_jsx(XCircle, { className: "w-3 h-3 text-red-400" })), ollamaStatus && _jsx(Wifi, { className: "w-3 h-3 text-emerald-400" }), hfStatus && _jsx(Wifi, { className: "w-3 h-3 text-blue-400" })] }));
    }
    if (!showDetails && position === 'top') {
        // Compact top bar
        return (_jsx(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, className: `fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 ${className}`, children: _jsxs("div", { className: "flex items-center justify-between px-4 py-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(StatusIcon, { className: `w-4 h-4 ${statusColor}` }), _jsx("span", { className: "text-xs text-gray-300", children: overallOk ? 'AI Engine Online' : 'AI Engine Offline' }), health.ollama.avgLatencyMs && (_jsxs("span", { className: "text-xs text-gray-500", children: ["Ollama: ", health.ollama.avgLatencyMs, "ms"] })), health.hf.avgLatencyMs && (_jsxs("span", { className: "text-xs text-gray-500", children: ["HF: ", health.hf.avgLatencyMs, "ms"] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [ollamaStatus ? (_jsx(Wifi, { className: "w-3 h-3 text-emerald-400" })) : (_jsx(WifiOff, { className: "w-3 h-3 text-gray-500" })), hfStatus ? (_jsx(Wifi, { className: "w-3 h-3 text-blue-400" })) : (_jsx(WifiOff, { className: "w-3 h-3 text-gray-500" }))] })] }) }));
    }
    // Detailed view
    return (_jsxs("div", { className: `rounded-lg border border-slate-800 bg-slate-900/50 p-4 ${className}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(StatusIcon, { className: `w-5 h-5 ${statusColor}` }), _jsx("h3", { className: "text-sm font-semibold text-white", children: "AI Engine Status" })] }), loading && _jsx(Loader2, { className: "w-4 h-4 animate-spin text-gray-400" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [ollamaStatus ? (_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-400" })) : (_jsx(XCircle, { className: "w-4 h-4 text-red-400" })), _jsx("span", { className: "text-xs text-gray-300", children: "Ollama (Local)" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [health.ollama.avgLatencyMs !== null && (_jsxs("span", { className: "text-xs text-gray-500", children: [health.ollama.avgLatencyMs, "ms"] })), _jsx("span", { className: `text-xs ${ollamaStatus ? 'text-emerald-400' : 'text-red-400'}`, children: ollamaStatus ? 'Online' : 'Offline' })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [hfStatus ? (_jsx(CheckCircle2, { className: "w-4 h-4 text-blue-400" })) : (_jsx(XCircle, { className: "w-4 h-4 text-red-400" })), _jsx("span", { className: "text-xs text-gray-300", children: "Hugging Face (Cloud)" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [health.hf.avgLatencyMs !== null && (_jsxs("span", { className: "text-xs text-gray-500", children: [health.hf.avgLatencyMs, "ms"] })), _jsx("span", { className: `text-xs ${hfStatus ? 'text-blue-400' : 'text-red-400'}`, children: hfStatus ? 'Online' : 'Offline' })] })] }), health.metrics && (_jsx("div", { className: "mt-3 pt-3 border-t border-slate-800", children: _jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Total Requests:" }), _jsx("span", { className: "ml-2 text-gray-300", children: health.metrics.requests.total })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Fallbacks:" }), _jsx("span", { className: "ml-2 text-yellow-400", children: health.metrics.requests.fallbacks })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Ollama:" }), _jsx("span", { className: "ml-2 text-emerald-400", children: health.metrics.requests.ollama })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-500", children: "Hugging Face:" }), _jsx("span", { className: "ml-2 text-blue-400", children: health.metrics.requests.hf })] })] }) })), health.redis && (_jsx("div", { className: "mt-2 pt-2 border-t border-slate-800", children: _jsxs("div", { className: "flex items-center gap-2", children: [health.redis === 'connected' ? (_jsx(CheckCircle2, { className: "w-3 h-3 text-emerald-400" })) : (_jsx(AlertCircle, { className: "w-3 h-3 text-yellow-400" })), _jsxs("span", { className: "text-xs text-gray-500", children: ["Cache: ", health.redis] })] }) }))] })] }));
}
