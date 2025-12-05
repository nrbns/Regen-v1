import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * RightPanel - Enhanced Agent Console with live streams
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Zap, FileText, Shield, ListChecks, Activity, Sparkles, Share2, Leaf, ShieldCheck, KeyRound, Lock, } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { AgentPlanner } from '../AgentPlanner';
import { useConsentOverlayStore } from '../../state/consentOverlayStore';
import { PrivacyDashboard } from '../integrations/PrivacyDashboard';
import { formatDistanceToNow } from 'date-fns';
import { AIDockPanel } from '../ai/AIDockPanel';
import { EnhancedAIPanel } from '../ai/EnhancedAIPanel';
const ACTION_LABELS = {
    download: 'Download file',
    form_submit: 'Submit form',
    login: 'Login',
    scrape: 'Scrape content',
    export_data: 'Export data',
    access_clipboard: 'Clipboard access',
    access_camera: 'Camera access',
    access_microphone: 'Microphone access',
    access_filesystem: 'Filesystem access',
    ai_cloud: 'Cloud AI usage',
};
const statusLabel = (record) => {
    if (record.revokedAt) {
        return { label: 'Revoked', tone: 'text-red-400 bg-red-500/10 border-red-500/40' };
    }
    if (record.approved) {
        return { label: 'Approved', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40' };
    }
    return { label: 'Pending', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/40' };
};
const tabs = [
    { id: 'planner', icon: Sparkles, label: 'Planner' },
    { id: 'plan', icon: ListChecks, label: 'Plan' },
    { id: 'actions', icon: Zap, label: 'Actions' },
    { id: 'privacy', icon: Lock, label: 'Privacy' },
    { id: 'logs', icon: Activity, label: 'Logs' },
    { id: 'memory', icon: FileText, label: 'Memory' },
    { id: 'consent', icon: Shield, label: 'Consent' },
    { id: 'trust', icon: ShieldCheck, label: 'Trust' },
    { id: 'eco', icon: Leaf, label: 'Eco' },
    { id: 'identity', icon: KeyRound, label: 'Identity' },
    { id: 'nexus', icon: Share2, label: 'Nexus' },
];
export function RightPanel({ open, onClose }) {
    const [activeTab, setActiveTab] = useState('planner');
    const [plan, setPlan] = useState(null);
    const [steps, setSteps] = useState([]);
    const [logs, setLogs] = useState([]);
    const [consentRecords, setConsentRecords] = useState([]);
    const [dryRun, setDryRun] = useState(false);
    const logsEndRef = useRef(null);
    const consentRefresh = useConsentOverlayStore(state => state.refresh);
    const consentList = useConsentOverlayStore(state => state.records);
    const openConsentDashboard = useConsentOverlayStore(state => state.open);
    // Listen for agent plan
    useIPCEvent('agent:plan', data => {
        setPlan(data);
    }, []);
    // Listen for agent steps
    useIPCEvent('agent:step', data => {
        setSteps(prev => [...prev, data]);
    }, []);
    // Listen for agent logs
    useIPCEvent('agent:log', data => {
        setLogs(prev => [
            ...prev,
            `${new Date(data.timestamp).toLocaleTimeString()}: ${data.content}`,
        ]);
    }, []);
    // Listen for consent requests
    useIPCEvent('agent:consent:request', () => {
        void consentRefresh();
    }, [consentRefresh]);
    // Auto-scroll logs
    useEffect(() => {
        if (activeTab === 'logs' && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, activeTab]);
    useEffect(() => {
        setConsentRecords(consentList);
    }, [consentList]);
    useEffect(() => {
        if (open && activeTab === 'consent') {
            void consentRefresh();
        }
    }, [open, activeTab, consentRefresh]);
    return (_jsx(AnimatePresence, { children: open && (_jsxs(motion.aside, { initial: { x: 400, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 400, opacity: 0 }, transition: { duration: 0.3, ease: 'easeInOut' }, className: "flex w-96 flex-col border-l border-gray-800/50 bg-gray-900/95 shadow-2xl backdrop-blur-xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-800/50 p-4", children: [_jsxs("h2", { className: "flex items-center gap-2 text-lg font-semibold text-gray-200", children: [_jsx(Brain, { size: 20, className: "text-blue-400" }), "Agent Console"] }), _jsx("button", { onClick: onClose, className: "rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-gray-200", children: _jsx(X, { size: 18 }) })] }), activeTab === 'planner' && (_jsx("div", { className: "border-b border-gray-800/50", children: _jsx(EnhancedAIPanel, {}) })), activeTab !== 'planner' && (_jsx("div", { className: "border-b border-gray-800/50 p-4", children: _jsx(AIDockPanel, {}) })), _jsx("div", { className: "flex overflow-x-auto border-b border-gray-800/50", children: tabs.map(tab => {
                        const Icon = tab.icon;
                        return (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `relative flex min-w-[80px] flex-shrink-0 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'} `, children: [_jsx(Icon, { size: 16 }), _jsx("span", { className: "hidden sm:inline", children: tab.label }), activeTab === tab.id && (_jsx(motion.div, { className: "absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500", layoutId: "activeTab" }))] }, tab.id));
                    }) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4", children: [activeTab === 'planner' && _jsx(AgentPlanner, {}), activeTab === 'plan' && (_jsx("div", { className: "space-y-4", children: plan ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "rounded-lg border border-gray-700/30 bg-gray-800/40 p-4", children: [_jsxs("div", { className: "mb-2 text-xs text-gray-400", children: ["Task: ", plan.taskId] }), _jsx("div", { className: "space-y-2", children: plan.steps.map((step, idx) => (_jsxs("div", { className: "flex items-start gap-2 text-sm", children: [_jsx("div", { className: "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-medium text-blue-400", children: idx + 1 }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-gray-200", children: step.description }), step.tool && (_jsxs("div", { className: "mt-0.5 text-xs text-gray-500", children: ["Tool: ", step.tool] }))] })] }, step.id))) })] }), _jsx("div", { className: "flex items-center justify-between text-xs", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("span", { className: "text-gray-400", children: ["Tokens: ", _jsx("span", { className: "text-gray-200", children: plan.remaining.tokens }), "/", plan.budget.tokens] }), _jsxs("span", { className: "text-gray-400", children: ["Time: ", _jsxs("span", { className: "text-gray-200", children: [plan.remaining.seconds, "s"] }), "/", plan.budget.seconds, "s"] })] }) })] })) : (_jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "No active plan. Create a task to see the agent's reasoning." })) })), activeTab === 'actions' && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "mb-3 text-sm text-gray-400", children: "Tool Calls & Actions" }), steps.length > 0 ? (_jsx("div", { className: "space-y-2", children: steps.map((step, idx) => (_jsxs(motion.div, { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, className: "rounded border border-gray-700/30 bg-gray-800/40 p-3", children: [_jsxs("div", { className: "mb-1 flex items-center justify-between", children: [_jsx("span", { className: "text-xs font-medium text-gray-300", children: step.type }), _jsx("span", { className: "text-xs text-gray-500", children: new Date(step.timestamp).toLocaleTimeString() })] }), _jsx("div", { className: "mt-1 whitespace-pre-wrap text-xs text-gray-400", children: step.content })] }, idx))) })) : (_jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "No actions yet" }))] })), activeTab === 'logs' && (_jsxs("div", { className: "space-y-1 font-mono text-xs", children: [_jsx("div", { className: "mb-2 text-sm text-gray-400", children: "Live Log Stream" }), _jsx("div", { className: "max-h-96 overflow-y-auto rounded bg-gray-950 p-3", children: logs.length > 0 ? (_jsxs(_Fragment, { children: [logs.map((log, idx) => (_jsx("div", { className: "py-0.5 text-gray-400", children: log }, idx))), _jsx("div", { ref: logsEndRef })] })) : (_jsx("div", { className: "py-8 text-center text-gray-600", children: "No logs yet" })) })] })), activeTab === 'memory' && (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "mb-3 text-sm text-gray-400", children: "Session Notes & Data" }), _jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "No session data" })] })), activeTab === 'consent' && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between text-sm text-gray-400", children: [_jsx("span", { children: "Consent Ledger" }), _jsx("button", { onClick: () => void openConsentDashboard(), className: "rounded-lg border border-slate-700/60 bg-slate-900/70 px-2 py-1 text-[11px] text-gray-300 hover:bg-slate-900/90", children: "Open dashboard" })] }), consentRecords.length > 0 ? (_jsx("div", { className: "space-y-2", children: consentRecords.slice(0, 6).map(record => {
                                        const status = statusLabel(record);
                                        return (_jsxs("div", { className: "space-y-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-400", children: [_jsx("span", { className: "font-medium text-gray-300", children: ACTION_LABELS[record.action.type] }), _jsx("span", { className: `rounded-full border px-2 py-0.5 ${status.tone}`, children: status.label })] }), _jsx("div", { className: "text-[11px] text-gray-500", children: record.action.description }), _jsxs("div", { className: "flex items-center gap-2 text-[10px] text-gray-600", children: [_jsx("span", { children: formatDistanceToNow(new Date(record.timestamp), { addSuffix: true }) }), record.action.target && _jsxs("span", { children: ["\u2022 ", record.action.target] })] })] }, record.id));
                                    }) })) : (_jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "No consent records yet" }))] })), activeTab === 'privacy' && _jsx(PrivacyDashboard, {}), activeTab === 'trust' && (_jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "Trust panel is not available in this build" })), activeTab === 'eco' && (_jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "Eco impact panel is not available in this build" })), activeTab === 'identity' && (_jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "Identity vault panel is not available in this build" })), activeTab === 'nexus' && (_jsx("div", { className: "py-8 text-center text-xs text-gray-500", children: "Extension nexus panel is not available in this build" }))] }), _jsxs("div", { className: "space-y-2 border-t border-gray-800/50 p-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: [_jsx("input", { type: "checkbox", id: "dry-run", checked: dryRun, onChange: e => setDryRun(e.target.checked), className: "rounded" }), _jsx("label", { htmlFor: "dry-run", className: "cursor-pointer", children: "Dry-Run Mode" })] }), plan && (_jsxs("div", { className: "flex flex-wrap items-center gap-2 text-xs", children: [_jsxs("span", { className: "rounded bg-blue-500/20 px-2 py-1 text-blue-400", children: [plan.remaining.tokens, " tokens"] }), _jsxs("span", { className: "rounded bg-green-500/20 px-2 py-1 text-green-400", children: [plan.remaining.seconds, "s"] }), _jsxs("span", { className: "rounded bg-purple-500/20 px-2 py-1 text-purple-400", children: [plan.remaining.requests, " requests"] })] }))] })] })) }));
}
