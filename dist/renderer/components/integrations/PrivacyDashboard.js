import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Privacy Dashboard Component
 * Shows trust levels and privacy controls
 */
import { useState, useEffect } from 'react';
import { trustControls } from '../../core/privacy/trustControls';
import { Shield, ShieldCheck, ShieldAlert, ShieldOff, Search, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
const TRUST_LEVEL_COLORS = {
    trusted: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
    neutral: 'text-blue-400 bg-blue-500/20 border-blue-500/40',
    untrusted: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40',
    blocked: 'text-red-400 bg-red-500/20 border-red-500/40',
};
const TRUST_LEVEL_ICONS = {
    trusted: ShieldCheck,
    neutral: Shield,
    untrusted: ShieldAlert,
    blocked: ShieldOff,
};
export function PrivacyDashboard() {
    const [records, setRecords] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    useEffect(() => {
        // Load records
        trustControls.loadFromStorage();
        setRecords(trustControls.getAllRecords());
    }, []);
    const handleSetTrust = (domain, level) => {
        trustControls.setTrustLevel(domain, level);
        setRecords(trustControls.getAllRecords());
    };
    const handleAudit = async (domain) => {
        const audit = await trustControls.auditPrivacy(domain);
        console.log('[PrivacyDashboard] Audit result:', audit);
        // Could show audit results in a modal or toast
    };
    const filteredRecords = records.filter(record => record.domain.toLowerCase().includes(searchQuery.toLowerCase()));
    return (_jsxs("div", { className: "flex flex-col gap-4 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold text-gray-100", children: "Privacy Dashboard" }), _jsx("p", { className: "text-sm text-gray-400", children: "Manage domain trust levels and privacy settings" })] }), _jsxs("button", { onClick: () => {
                            trustControls.clearRecords();
                            setRecords([]);
                        }, className: "flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-red-400 transition hover:bg-red-500/20", children: [_jsx(Trash2, { size: 16 }), "Clear All"] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: e => setSearchQuery(e.target.value), placeholder: "Search domains...", className: "w-full rounded-lg border border-neutral-700 bg-neutral-800 py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none" })] }), _jsx("div", { className: "space-y-2", children: filteredRecords.length === 0 ? (_jsx("div", { className: "py-8 text-center text-gray-400", children: searchQuery ? 'No domains found' : 'No trust records yet' })) : (filteredRecords.map(record => {
                    const Icon = TRUST_LEVEL_ICONS[record.trustLevel];
                    return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800/50 p-4", children: [_jsxs("div", { className: "flex flex-1 items-center gap-3", children: [_jsx("div", { className: `rounded-lg border p-2 ${TRUST_LEVEL_COLORS[record.trustLevel]}`, children: _jsx(Icon, { size: 20 }) }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-medium text-gray-200", children: record.domain }), _jsxs("div", { className: "text-xs text-gray-400", children: ["Score: ", record.privacyScore, "/100 \u2022 Visits: ", record.visitCount] }), record.violations.length > 0 && (_jsxs("div", { className: "mt-1 text-xs text-red-400", children: [record.violations.length, " violation(s)"] }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => handleAudit(record.domain), className: "rounded border border-neutral-600 bg-neutral-700 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-neutral-600", children: "Audit" }), _jsxs("select", { value: record.trustLevel, onChange: e => handleSetTrust(record.domain, e.target.value), className: "rounded border border-neutral-600 bg-neutral-700 px-3 py-1.5 text-xs text-gray-300 focus:border-emerald-500 focus:outline-none", children: [_jsx("option", { value: "trusted", children: "Trusted" }), _jsx("option", { value: "neutral", children: "Neutral" }), _jsx("option", { value: "untrusted", children: "Untrusted" }), _jsx("option", { value: "blocked", children: "Blocked" })] })] })] }, record.domain));
                })) })] }));
}
