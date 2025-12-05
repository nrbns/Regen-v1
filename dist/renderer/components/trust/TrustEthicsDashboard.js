import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Activity, RefreshCw, X, CheckCircle2, Clock, Ban, ArrowUpRight, AlertTriangle, Fingerprint, Radar, } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTrustDashboardStore } from '../../state/trustDashboardStore';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
const ACTION_LABELS = {
    download: 'Download file',
    form_submit: 'Submit form',
    login: 'Login request',
    scrape: 'Scrape content',
    export_data: 'Export data',
    access_clipboard: 'Clipboard access',
    access_camera: 'Camera access',
    access_microphone: 'Microphone access',
    access_filesystem: 'Filesystem access',
    ai_cloud: 'Cloud AI call',
};
export function TrustEthicsDashboard() {
    const { visible, loading, error, consentTimeline, trustSignals, shieldsStatus, privacyAudit, consentStats, blockedSummary, lastUpdated, refresh, close, } = useTrustDashboardStore();
    const openConsent = useConsentOverlayStore((state) => state.open);
    useEffect(() => {
        if (!visible)
            return;
        void refresh();
        const interval = window.setInterval(() => {
            void refresh();
        }, 30000);
        return () => window.clearInterval(interval);
    }, [visible, refresh]);
    const timelineItems = useMemo(() => consentTimeline.slice(0, 8), [consentTimeline]);
    const highRiskSignals = useMemo(() => trustSignals.filter((record) => record.verdict !== 'trusted').slice(0, 6), [trustSignals]);
    const trustedSignals = useMemo(() => trustSignals.filter((record) => record.verdict === 'trusted').slice(0, 6), [trustSignals]);
    if (!visible) {
        return null;
    }
    const lastUpdatedLabel = lastUpdated ? formatDistanceToNow(lastUpdated, { addSuffix: true }) : 'just now';
    const auditSeverityVariant = privacyAudit?.grade === 'high' ? 'danger' : privacyAudit?.grade === 'moderate' ? 'warning' : 'info';
    return (_jsx("div", { className: "fixed inset-0 z-[1125] flex items-center justify-center bg-black/70 backdrop-blur-sm", children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: 12 }, transition: { duration: 0.18, ease: 'easeOut' }, className: "relative flex h-[90vh] w-[min(1100px,94vw)] flex-col overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-950/95 text-gray-100 shadow-[0_20px_80px_rgba(0,0,0,0.55)]", children: [_jsxs("header", { className: "flex items-start justify-between border-b border-slate-800/60 px-6 py-5", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-300/80", children: [_jsx(Shield, { size: 14 }), " Trust & Ethics"] }), _jsx("h1", { className: "mt-1 text-lg font-semibold text-white", children: "Real-time consent ledger & threat summary" }), _jsxs("div", { className: "mt-1 text-[11px] text-slate-500", children: [loading ? 'Refreshing…' : `Last updated ${lastUpdatedLabel}`, error && _jsxs("span", { className: "ml-2 text-red-300", children: ["\u00B7 ", error] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => void refresh(), disabled: loading, className: "inline-flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 hover:bg-slate-900/90 disabled:opacity-50", children: [_jsx(RefreshCw, { size: 14, className: loading ? 'animate-spin text-emerald-300' : '' }), "Refresh"] }), _jsxs("button", { type: "button", onClick: () => void openConsent(), className: "inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-500/20", children: [_jsx(CheckCircle2, { size: 14 }), "Open consent ledger"] }), _jsx("button", { type: "button", onClick: () => close(), className: "inline-flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-900/90", "aria-label": "Close trust dashboard", children: _jsx(X, { size: 16 }) })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-6 py-5", children: _jsxs("div", { className: "grid gap-5 lg:grid-cols-[1.1fr,0.9fr]", children: [_jsxs("section", { className: "space-y-5", children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(SummaryCard, { title: "Consent posture", icon: ShieldCheck, tone: "emerald", stats: [
                                                    { label: 'Pending', value: consentStats.pending },
                                                    { label: 'Approved', value: consentStats.approved },
                                                    { label: 'Revoked', value: consentStats.revoked },
                                                ] }), _jsx(SummaryCard, { title: "Shields blocked", icon: ShieldAlert, tone: "sky", stats: [
                                                    { label: 'Trackers', value: blockedSummary.trackers },
                                                    { label: 'Ads', value: blockedSummary.ads },
                                                    { label: 'HTTPS upgrades', value: blockedSummary.upgrades },
                                                ], footer: shieldsStatus
                                                    ? `${shieldsStatus.cookies3p === 'block' ? '3p cookies blocked' : '3p cookies allowed'} · ${shieldsStatus.webrtcBlocked ? 'WebRTC protected' : 'WebRTC open'}`
                                                    : 'No shield data yet' })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/60 bg-slate-900/70", children: [_jsx(HeaderRow, { icon: Clock, title: "Consent timeline", description: "Live ledger of ethical approvals" }), _jsx("div", { className: "divide-y divide-slate-800/60", children: timelineItems.length === 0 ? (_jsx(EmptyState, { message: "No consent activity recorded yet." })) : (timelineItems.map((record) => {
                                                    const status = record.revokedAt
                                                        ? { label: 'Revoked', tone: 'text-red-300 border-red-400/40 bg-red-500/10' }
                                                        : record.approved
                                                            ? { label: 'Approved', tone: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' }
                                                            : { label: 'Pending', tone: 'text-amber-300 border-amber-400/40 bg-amber-500/10' };
                                                    const riskIcon = record.action.risk === 'high'
                                                        ? AlertTriangle
                                                        : record.action.risk === 'medium'
                                                            ? ShieldAlert
                                                            : CheckCircle2;
                                                    const RiskIcon = riskIcon;
                                                    return (_jsxs("div", { className: "flex items-center gap-4 px-4 py-3 text-sm text-gray-200", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800/70 bg-slate-900/80", children: _jsx(RiskIcon, { size: 16, className: "text-emerald-300" }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium", children: ACTION_LABELS[record.action.type] ?? record.action.type }), _jsx("span", { className: "text-xs text-slate-500", children: formatDistanceToNow(record.timestamp, { addSuffix: true }) })] }), _jsx("div", { className: "text-xs text-slate-400", children: record.action.description })] }), _jsx("span", { className: `rounded-full border px-2 py-0.5 text-xs ${status.tone}`, children: status.label })] }, record.id));
                                                })) })] })] }), _jsxs("section", { className: "space-y-5", children: [_jsxs("div", { className: "rounded-2xl border border-slate-800/60 bg-slate-900/70", children: [_jsx(HeaderRow, { icon: Radar, title: "Privacy Sentinel", description: "Latest AI risk sweep" }), _jsx("div", { className: "space-y-3 px-4 py-4", children: privacyAudit ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: `inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${auditSeverityVariant === 'danger'
                                                                ? 'border-red-500/40 bg-red-500/10 text-red-200'
                                                                : auditSeverityVariant === 'warning'
                                                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                                                                    : 'border-sky-500/40 bg-sky-500/10 text-sky-200'}`, children: [_jsx(Activity, { size: 12 }), privacyAudit.grade === 'high'
                                                                    ? 'High risk detected'
                                                                    : privacyAudit.grade === 'moderate'
                                                                        ? 'Watch this tab'
                                                                        : 'Clean'] }), _jsx("p", { className: "text-sm text-slate-300", children: privacyAudit.message }), privacyAudit.trackers.length > 0 && (_jsxs("div", { className: "rounded-xl border border-slate-800/60 bg-slate-900/70 p-3", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: "Trackers" }), _jsx("div", { className: "mt-2 flex flex-wrap gap-2 text-xs text-slate-300", children: privacyAudit.trackers.slice(0, 6).map((tracker) => (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-950/80 px-3 py-1", children: [_jsx(Fingerprint, { size: 11, className: "text-slate-400" }), tracker.host, _jsxs("span", { className: "text-[10px] text-slate-500", children: ["\u00D7", tracker.count] })] }, `${tracker.host}-${tracker.count}`))) })] })), privacyAudit.suggestions.length > 0 && (_jsxs("div", { className: "space-y-2 rounded-xl border border-slate-800/60 bg-slate-900/70 p-3", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400", children: "Suggested fixes" }), _jsx("ul", { className: "space-y-1 text-xs text-slate-300", children: privacyAudit.suggestions.slice(0, 4).map((suggestion) => (_jsxs("li", { className: "flex items-start gap-2", children: [_jsx(ArrowUpRight, { size: 11, className: "mt-0.5 text-emerald-300" }), _jsx("span", { children: suggestion })] }, suggestion))) })] }))] })) : (_jsx(EmptyState, { message: "No privacy audit data yet. Trigger an audit from the Shield icon in the top bar." })) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/60 bg-slate-900/70", children: [_jsx(HeaderRow, { icon: Ban, title: "Trust alerts", description: "Domains flagged by the mesh" }), _jsx("div", { className: "divide-y divide-slate-800/60", children: highRiskSignals.length === 0 ? (_jsx(EmptyState, { message: "No high-risk domains flagged." })) : (highRiskSignals.map((record) => (_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 text-sm text-gray-200", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-200", children: _jsx(ShieldAlert, { size: 16 }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium", children: record.domain }), _jsx("span", { className: "rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200", children: record.verdict.toUpperCase() })] }), _jsxs("div", { className: "text-xs text-slate-500", children: ["Score ", Math.round(record.score), " \u00B7 ", record.signals, " signals \u00B7", ' ', formatDistanceToNow(record.lastUpdated, { addSuffix: true })] })] })] }, record.domain)))) })] }), _jsxs("div", { className: "rounded-2xl border border-slate-800/60 bg-slate-900/70", children: [_jsx(HeaderRow, { icon: ShieldCheck, title: "Trusted mesh", description: "Domains with positive consensus" }), _jsx("div", { className: "flex flex-col gap-3 px-4 py-4", children: trustedSignals.length === 0 ? (_jsx(EmptyState, { message: "No trusted domains recorded yet." })) : (trustedSignals.map((record) => (_jsxs("div", { className: "rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-semibold", children: record.domain }), _jsxs("span", { className: "text-xs uppercase tracking-wide text-emerald-300/80", children: ["Score ", Math.round(record.score)] })] }), _jsxs("div", { className: "mt-1 text-xs text-emerald-200/80", children: ["Confidence ", Math.round(record.confidence * 100), "% \u00B7 ", record.signals, " peer signals"] }), record.tags.length > 0 && (_jsx("div", { className: "mt-2 flex flex-wrap gap-2 text-[11px] text-emerald-200/80", children: record.tags.slice(0, 4).map((tag) => (_jsxs("span", { className: "rounded-full border border-emerald-400/40 px-2 py-0.5", children: ["#", tag] }, `${record.domain}-${tag}`))) }))] }, `trusted-${record.domain}`)))) })] })] })] }) })] }) }));
}
function SummaryCard({ title, icon: Icon, stats, footer, tone, }) {
    const toneClasses = tone === 'emerald'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
        : 'border-sky-500/30 bg-sky-500/10 text-sky-100';
    const accent = tone === 'emerald' ? 'text-emerald-200' : 'text-sky-200';
    return (_jsxs("div", { className: `rounded-2xl border ${toneClasses} px-4 py-4`, children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(Icon, { size: 16, className: accent }), title] }), _jsx("div", { className: "mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300", children: stats.map((stat) => (_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center", children: [_jsx("div", { className: "text-lg font-semibold text-white", children: stat.value }), _jsx("div", { className: "text-[11px] uppercase tracking-wide text-slate-300", children: stat.label })] }, stat.label))) }), footer && _jsx("div", { className: "mt-3 text-[11px] text-slate-200/80", children: footer })] }));
}
function HeaderRow({ icon: Icon, title, description, }) {
    return (_jsxs("div", { className: "flex items-center justify-between border-b border-slate-800/60 px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-gray-200", children: [_jsx(Icon, { size: 14, className: "text-emerald-300" }), title] }), _jsx("div", { className: "text-[11px] uppercase tracking-wide text-slate-500", children: description })] }));
}
function EmptyState({ message }) {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center gap-2 px-4 py-6 text-center text-xs text-slate-500", children: [_jsx(Shield, { size: 18, className: "text-slate-600" }), _jsx("span", { children: message })] }));
}
