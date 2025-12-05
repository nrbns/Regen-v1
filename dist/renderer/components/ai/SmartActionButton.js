import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * SmartActionButton - AI-generated action button with visual feedback
 * Based on Figma UI/UX Prototype Flow redesign
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigation, ExternalLink, Copy, FileText, Search, Loader2, CheckCircle2, XCircle, } from 'lucide-react';
const actionIcons = {
    navigate: _jsx(Navigation, { size: 16 }),
    openTab: _jsx(ExternalLink, { size: 16 }),
    duplicateTab: _jsx(ExternalLink, { size: 16 }),
    notes: _jsx(FileText, { size: 16 }),
    research: _jsx(Search, { size: 16 }),
    copy: _jsx(Copy, { size: 16 }),
    search: _jsx(Search, { size: 16 }),
};
const actionColors = {
    navigate: 'blue',
    openTab: 'green',
    duplicateTab: 'purple',
    notes: 'amber',
    research: 'indigo',
    copy: 'gray',
    search: 'blue',
};
export function SmartActionButton({ action, compact = false }) {
    const [status, setStatus] = useState('idle');
    const color = actionColors[action.type];
    const icon = action.icon || actionIcons[action.type];
    const handleClick = async () => {
        setStatus('loading');
        try {
            await action.onClick();
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        }
        catch (error) {
            console.error('[SmartActionButton] Action failed:', error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 2000);
        }
    };
    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return _jsx(Loader2, { size: 14, className: "animate-spin" });
            case 'success':
                return _jsx(CheckCircle2, { size: 14, className: "text-green-400" });
            case 'error':
                return _jsx(XCircle, { size: 14, className: "text-red-400" });
            default:
                return icon;
        }
    };
    const getColorClasses = () => {
        const base = `border-${color}-500/40 bg-${color}-500/15 hover:bg-${color}-500/25 text-${color}-200`;
        if (status === 'success') {
            return `border-green-500/40 bg-green-500/15 text-green-200`;
        }
        if (status === 'error') {
            return `border-red-500/40 bg-red-500/15 text-red-200`;
        }
        return base;
    };
    return (_jsxs(motion.button, { onClick: handleClick, disabled: status === 'loading', whileHover: { scale: status === 'idle' ? 1.02 : 1 }, whileTap: { scale: 0.98 }, className: `
        flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
        ${getColorClasses()}
        ${compact ? 'text-xs' : 'text-sm'}
        ${status === 'loading' ? 'cursor-wait opacity-75' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-${color}-500/40
      `, title: action.description || action.label, children: [getStatusIcon(), !compact && _jsx("span", { className: "font-medium", children: action.label }), action.description && !compact && (_jsx("span", { className: "text-xs opacity-75 truncate max-w-[200px]", children: action.description }))] }));
}
export function SmartActionGroup({ actions, compact = false, className = '', }) {
    if (actions.length === 0)
        return null;
    return (_jsx("div", { className: `flex flex-wrap gap-2 ${className}`, children: actions.map(action => (_jsx(SmartActionButton, { action: action, compact: compact }, action.id))) }));
}
