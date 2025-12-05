import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, RefreshCw, Filter, Download, ShieldAlert, ShieldCheck, AlertTriangle, } from 'lucide-react';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { ipc } from '../../lib/ipc-typed';
import { formatDistanceToNow } from 'date-fns';
import { ConsentVaultPanel } from './ConsentVaultPanel';
import { CONSENT_ACTION_LABELS, CONSENT_ACTION_OPTIONS, CONSENT_STATUS_OPTIONS, } from './consentLabels';
import { ConsentFlowGraph } from './ConsentFlowGraph';
const statusLabel = (record) => {
    if (record.revokedAt) {
        return { label: 'Revoked', tone: 'text-red-400 bg-red-500/10 border-red-500/40' };
    }
    if (record.approved) {
        return { label: 'Approved', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40' };
    }
    return { label: 'Pending', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/40' };
};
const riskIcon = (risk) => {
    if (risk === 'high')
        return _jsx(AlertTriangle, { size: 14, className: "text-red-400" });
    if (risk === 'medium')
        return _jsx(ShieldAlert, { size: 14, className: "text-amber-400" });
    return _jsx(ShieldCheck, { size: 14, className: "text-emerald-400" });
};
export function ConsentDashboard() {
    const { visible, records, loading, error, filter, close, refresh, setFilter, approve, revoke } = useConsentOverlayStore();
    const [exporting, setExporting] = useState(false);
    useEffect(() => {
        if (!visible)
            return;
        const interval = setInterval(() => {
            void refresh();
        }, 20000);
        return () => clearInterval(interval);
    }, [visible, refresh]);
    const pendingCount = useMemo(() => records.filter(record => !record.approved).length, [records]);
    const revokedCount = useMemo(() => records.filter(record => Boolean(record.revokedAt)).length, [records]);
    const approvedCount = useMemo(() => records.filter(record => record.approved && !record.revokedAt).length, [records]);
    const handleExport = async () => {
        try {
            setExporting(true);
            const json = await ipc.consent.export();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `regen-consent-ledger-${new Date().toISOString()}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        }
        catch (err) {
            console.error('Failed to export consent ledger', err);
        }
        finally {
            setExporting(false);
        }
    };
    const renderRecord = (record) => {
        const status = statusLabel(record);
        const distance = formatDistanceToNow(new Date(record.timestamp), { addSuffix: true });
        return (_jsxs("div", { className: "rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-200", children: [riskIcon(record.action.risk), _jsx("span", { children: CONSENT_ACTION_LABELS[record.action.type] })] }), _jsx("span", { className: `rounded-full border px-2 py-0.5 text-[11px] ${status.tone}`, children: status.label })] }), _jsx("div", { className: "text-xs text-gray-400 leading-relaxed whitespace-pre-wrap", children: record.action.description }), _jsxs("div", { className: "grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-gray-500", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-400", children: "Target:" }), ' ', _jsx("span", { className: "text-gray-200", children: record.action.target ?? '—' })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-400", children: "Risk:" }), ' ', _jsx("span", { className: "text-gray-200 capitalize", children: record.action.risk })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-400", children: "Requested:" }), ' ', _jsx("span", { className: "text-gray-200", children: distance })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-400", children: "Ledger ID:" }), ' ', _jsxs("span", { className: "text-gray-500 font-mono text-[10px]", children: [record.id.slice(0, 8), "\u2026"] })] })] }), _jsxs("div", { className: "flex items-center gap-2 text-[11px] text-gray-500", children: [_jsx("span", { children: "Signature:" }), _jsxs("span", { className: "font-mono truncate text-gray-600", children: [record.signature.slice(0, 24), "\u2026"] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "text-[11px] text-gray-500", children: ["User: ", _jsx("span", { className: "text-gray-300", children: record.userId })] }), _jsxs("div", { className: "flex items-center gap-2", children: [!record.approved && !record.revokedAt && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => approve(record.id), className: "rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20", children: "Approve" }), _jsx("button", { onClick: () => revoke(record.id), className: "rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20", children: "Reject" })] })), record.approved && !record.revokedAt && (_jsx("button", { onClick: () => revoke(record.id), className: "rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/20", children: "Revoke" }))] })] })] }, record.id));
    };
    if (!visible) {
        return null;
    }
    return (_jsxs("div", { className: "fixed inset-0 z-[1100] flex items-center justify-center bg-black/75 backdrop-blur-sm", children: [_jsxs(motion.div, { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, transition: { duration: 0.2 }, className: "relative w-[min(900px,92vw)] max-h-[90vh] overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/95 text-gray-100 shadow-2xl", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-slate-800/60 px-6 py-4", children: [_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-300/80", children: [_jsx(ShieldAlert, { size: 14 }), " Consent Playground"] }), _jsx("div", { className: "text-lg font-semibold text-white", children: "Review & control ethical AI memory" }), _jsxs("div", { className: "text-[11px] text-gray-500", children: ["Pending ", pendingCount, " \u00B7 Approved ", approvedCount, " \u00B7 Revoked ", revokedCount] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: handleExport, disabled: exporting, className: "flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs text-gray-200 hover:bg-slate-900/90 disabled:opacity-50", children: [_jsx(Download, { size: 14, className: exporting ? 'animate-pulse' : '' }), " Export Ledger"] }), _jsx("button", { onClick: () => refresh(), disabled: loading, className: "rounded-xl border border-slate-700/60 bg-slate-900/70 p-2 text-gray-300 hover:bg-slate-900/90 disabled:opacity-50", "aria-label": "Refresh consent ledger", children: _jsx(RefreshCw, { size: 15, className: loading ? 'animate-spin' : '' }) }), _jsx("button", { onClick: () => close(), className: "rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-gray-300 hover:bg-slate-900/90", "aria-label": "Close consent dashboard", children: _jsx(X, { size: 16 }) })] })] }), _jsxs("div", { className: "flex flex-col gap-4 p-6 overflow-y-auto max-h-[75vh]", children: [_jsx(ConsentFlowGraph, { records: records, onApprove: approve, onRevoke: revoke, loading: loading }), _jsx("div", { className: "grid gap-3 sm:grid-cols-[minmax(0,1fr),auto]", children: _jsxs("div", { className: "flex flex-wrap items-center gap-2 text-xs text-gray-400", children: [_jsx(Filter, { size: 14 }), _jsx("select", { value: filter.type ?? 'all', onChange: event => void setFilter({ type: event.target.value }), className: "rounded-lg border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-gray-200", children: CONSENT_ACTION_OPTIONS.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), _jsx("select", { value: filter.status ?? 'all', onChange: event => void setFilter({
                                                status: event.target.value,
                                            }), className: "rounded-lg border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-gray-200", children: CONSENT_STATUS_OPTIONS.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }) }), error && (_jsx("div", { className: "rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs text-red-200", children: error })), loading ? (_jsx("div", { className: "flex items-center justify-center py-12 text-sm text-gray-400", children: "Loading consent ledger\u2026" })) : records.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-gray-500", children: [_jsx(ShieldCheck, { size: 32, className: "text-emerald-400" }), _jsx("div", { children: "No consent records yet. Run agent actions to populate the ledger." })] })) : (_jsx("div", { className: "grid gap-3", children: records.map(renderRecord) }))] })] }), _jsx(ConsentVaultPanel, {})] }));
}
