import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Search Status Indicator Component
 * Shows the health status of the search system
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, WifiOff, Loader2 } from 'lucide-react';
import { getSearchHealth, checkSearchHealth } from '../../services/searchHealth';
export function SearchStatusIndicator() {
    const [health, setHealth] = useState(getSearchHealth());
    const [isChecking, setIsChecking] = useState(false);
    useEffect(() => {
        // Check health on mount
        if (!health) {
            setIsChecking(true);
            checkSearchHealth()
                .then(setHealth)
                .catch(console.error)
                .finally(() => setIsChecking(false));
        }
        // Listen for health updates
        const interval = setInterval(() => {
            const currentHealth = getSearchHealth();
            if (currentHealth) {
                setHealth(currentHealth);
            }
        }, 5000); // Update every 5 seconds
        return () => clearInterval(interval);
    }, [health]);
    if (!health && !isChecking) {
        return null; // Don't show if no health data
    }
    const getStatusIcon = (status) => {
        switch (status) {
            case 'healthy':
                return _jsx(CheckCircle2, { className: "w-4 h-4 text-green-400" });
            case 'degraded':
                return _jsx(AlertCircle, { className: "w-4 h-4 text-yellow-400" });
            case 'offline':
                return _jsx(WifiOff, { className: "w-4 h-4 text-red-400" });
            case 'checking':
                return _jsx(Loader2, { className: "w-4 h-4 text-gray-400 animate-spin" });
        }
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'healthy':
                return 'Search Ready';
            case 'degraded':
                return 'Local Search Only';
            case 'offline':
                return 'Search Offline';
            case 'checking':
                return 'Checking...';
        }
    };
    const status = isChecking ? 'checking' : health?.status || 'checking';
    return (_jsxs("div", { className: "flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700 text-xs", title: health?.error || getStatusText(status), children: [getStatusIcon(status), _jsx("span", { className: "text-slate-300", children: getStatusText(status) }), health?.meiliSearch && (_jsx("span", { className: "text-green-400 text-[10px]", children: "\u2022 Meili" })), health?.localSearch && (_jsx("span", { className: "text-blue-400 text-[10px]", children: "\u2022 Local" }))] }));
}
