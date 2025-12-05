import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * AgentOverlay - Enhanced floating right panel with full tabs
 * Tabs: Plan, Actions, Logs, Memory, Ledger
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Square, Clock, Zap, FileText, Shield, Brain, ScrollText, CheckCircle2, XCircle, Sparkles, MessageSquareText, ShieldAlert, } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useIPCEvent } from '../lib/use-ipc-event';
import { ipc } from '../lib/ipc-typed';
import { getEnvVar, isElectronRuntime } from '../lib/env';
import { useAgentStreamStore } from '../state/agentStreamStore';
const STATUS_LABELS = {
    idle: 'Idle',
    connecting: 'Connecting',
    live: 'Streaming',
    complete: 'Complete',
    error: 'Error',
};
const STATUS_STYLES = {
    idle: 'bg-slate-800/60 text-slate-300',
    connecting: 'border border-blue-500/40 bg-blue-500/20 text-blue-100',
    live: 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-100',
    complete: 'border border-purple-500/40 bg-purple-500/20 text-purple-100',
    error: 'border border-rose-500/40 bg-rose-500/20 text-rose-100',
};
const SparkleTrail = () => (_jsx("span", { className: "flex items-center gap-1 text-purple-300/80", children: _jsx(Sparkles, { size: 14 }) }));
const LoaderDots = () => (_jsx("span", { className: "flex items-center gap-1", children: [0, 0.2, 0.4].map((delay) => (_jsx(motion.span, { className: "h-1.5 w-1.5 rounded-full bg-blue-200/80", animate: { opacity: [0.2, 1, 0.2], y: [0, -3, 0] }, transition: { duration: 1.2, repeat: Infinity, delay } }, delay))) }));
export function AgentOverlay() {
    const [isActive, setIsActive] = useState(false);
    const [activeTab, setActiveTab] = useState('responses');
    const [plan, setPlan] = useState(null);
    const [actions, setActions] = useState([]);
    const [logs, setLogs] = useState([]);
    const [consentLedger, setConsentLedger] = useState([]);
    const [memory, setMemory] = useState([]);
    const [currentStep, setCurrentStep] = useState(null);
    const [tokens, setTokens] = useState(0);
    const [requests, setRequests] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [dryRun, setDryRun] = useState(false);
    const isElectron = useMemo(() => isElectronRuntime(), []);
    const apiBaseUrl = useMemo(() => getEnvVar('API_BASE_URL') ?? getEnvVar('OMNIBROWSER_API_URL') ?? getEnvVar('OB_API_BASE_URL') ?? null, []);
    const eventSourceRef = useRef(null);
    const runId = useAgentStreamStore((state) => state.runId);
    const streamStatus = useAgentStreamStore((state) => state.status);
    const streamError = useAgentStreamStore((state) => state.error);
    const streamTranscript = useAgentStreamStore((state) => state.transcript);
    const streamEvents = useAgentStreamStore((state) => state.events);
    const lastGoal = useAgentStreamStore((state) => state.lastGoal);
    const setRun = useAgentStreamStore((state) => state.setRun);
    const setStreamStatus = useAgentStreamStore((state) => state.setStatus);
    const setStreamError = useAgentStreamStore((state) => state.setError);
    const appendStreamEvent = useAgentStreamStore((state) => state.appendEvent);
    const appendTranscript = useAgentStreamStore((state) => state.appendTranscript);
    const resetAgentStream = useAgentStreamStore((state) => state.reset);
    const appendMessage = useCallback((text) => {
        const current = useAgentStreamStore.getState().transcript;
        appendTranscript(current ? `\n${text}` : text);
    }, [appendTranscript]);
    const pushStreamEvent = useCallback((event) => {
        const timestamp = event.timestamp ?? Date.now();
        const id = event.id ?? `${event.type}-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
        appendStreamEvent({ id, timestamp, ...event });
    }, [appendStreamEvent]);
    const stopStream = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, []);
    const resetStream = useCallback(() => {
        stopStream();
        resetAgentStream();
    }, [stopStream, resetAgentStream]);
    const startStream = useCallback(async (goal, planId) => {
        if (!apiBaseUrl) {
            setStreamStatus('error');
            setStreamError('API_BASE_URL environment variable is not configured.');
            return;
        }
        stopStream();
        resetAgentStream();
        try {
            const response = await fetch(`${apiBaseUrl}/agent/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ goal, plan_id: planId }),
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`Agent API responded with status ${response.status}`);
            }
            const payload = await response.json();
            const newRunId = payload?.id || payload?.run_id || payload?.runId;
            if (!newRunId) {
                throw new Error('Agent API did not return a run identifier.');
            }
            setRun(newRunId, goal ?? null);
            setStreamStatus('live');
            const source = new EventSource(`${apiBaseUrl}/agent/runs/${newRunId}`);
            eventSourceRef.current = source;
            source.onmessage = (event) => {
                if (!event.data)
                    return;
                try {
                    const data = JSON.parse(event.data);
                    const timestamp = Date.now();
                    if (typeof data.delta === 'string' && data.delta.length > 0) {
                        appendTranscript(data.delta);
                    }
                    if (typeof data.message === 'string' && data.message.length > 0) {
                        appendMessage(data.message);
                        pushStreamEvent({ type: 'log', content: data.message, timestamp });
                    }
                    if (data.type === 'start') {
                        pushStreamEvent({ type: 'start', timestamp });
                    }
                    if (data.type === 'step') {
                        pushStreamEvent({
                            type: 'step',
                            step: data.step,
                            status: data.status,
                            content: data.log || data.message,
                            timestamp,
                        });
                    }
                    if (data.type === 'consent') {
                        pushStreamEvent({
                            type: 'consent',
                            content: data.description,
                            risk: data.risk,
                            approved: data.approved,
                            timestamp,
                        });
                    }
                    if (data.type === 'done') {
                        pushStreamEvent({ type: 'done', timestamp });
                        setStreamStatus('complete');
                        source.close();
                        eventSourceRef.current = null;
                    }
                    if (typeof data.tokens === 'number') {
                        setTokens((prev) => prev + data.tokens);
                    }
                    if (data.type === 'step') {
                        setRequests((prev) => prev + 1);
                    }
                }
                catch (error) {
                    console.warn('[agent] Unable to parse stream payload', error);
                }
            };
            source.onerror = () => {
                setStreamStatus('error');
                setStreamError('Agent stream disconnected.');
                pushStreamEvent({ type: 'error', content: 'Stream disconnected', timestamp: Date.now() });
                source.close();
                eventSourceRef.current = null;
            };
        }
        catch (error) {
            console.error('[agent] Failed to start agent stream', error);
            setStreamStatus('error');
            setStreamError(error instanceof Error ? error.message : 'Failed to start agent run');
        }
    }, [apiBaseUrl, appendTranscript, appendMessage, pushStreamEvent, setRun, setStreamError, setStreamStatus, stopStream]);
    // Listen for agent events
    useIPCEvent('agent:plan', (data) => {
        resetStream();
        setIsActive(true);
        setActiveTab('responses');
        setPlan(data);
        setStartTime(Date.now());
        setTokens(0);
        setRequests(0);
        setLogs([]);
        setActions([]);
        setConsentLedger([]);
        setMemory([]);
        pushStreamEvent({ type: 'start', timestamp: Date.now() });
        if (isElectron) {
            setStreamStatus('live');
        }
    }, [resetStream, pushStreamEvent, isElectron, setStreamStatus]);
    useIPCEvent('agent:step', (data) => {
        const stepId = data.stepId || data.id;
        setCurrentStep(stepId);
        if (data.tool) {
            const step = {
                id: stepId || crypto.randomUUID(),
                tool: data.tool,
                args: data.args || {},
                result: data.result,
                status: data.status || 'running',
                timestamp: data.timestamp || Date.now(),
            };
            setActions(prev => {
                const existing = prev.findIndex(s => s.id === step.id);
                if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = step;
                    return updated;
                }
                return [...prev, step];
            });
        }
        if (data.log) {
            const message = `[${new Date().toLocaleTimeString()}] ${data.log}`;
            setLogs(prev => [...prev, message]);
            appendMessage(data.log);
            pushStreamEvent({
                type: 'log',
                content: data.log,
                timestamp: data.timestamp || Date.now(),
            });
        }
        if (data.tokens) {
            setTokens(prev => prev + data.tokens);
        }
        setRequests(prev => prev + 1);
        if (data.status) {
            pushStreamEvent({
                type: 'step',
                step: data.sequence ?? data.step ?? undefined,
                status: data.status,
                content: data.log || data.tool || data.status,
                timestamp: data.timestamp || Date.now(),
            });
            if (streamStatus === 'idle') {
                setStreamStatus('live');
            }
        }
    }, [streamStatus, pushStreamEvent, appendMessage]);
    useIPCEvent('agent:log', (data) => {
        if (data.message) {
            const message = `[${new Date().toLocaleTimeString()}] ${data.message}`;
            setLogs(prev => [...prev, message]);
            appendMessage(data.message);
            pushStreamEvent({ type: 'log', content: data.message, timestamp: data.timestamp || Date.now() });
        }
    }, [appendMessage, pushStreamEvent]);
    useIPCEvent('agent:consent:request', (data) => {
        if (data.entry) {
            setConsentLedger(prev => [...prev, data.entry]);
            pushStreamEvent({
                type: 'consent',
                content: data.entry.action?.description,
                risk: data.entry.action?.risk,
                approved: data.entry.approved !== false,
                timestamp: data.entry.timestamp || Date.now(),
            });
        }
    }, [pushStreamEvent]);
    useIPCEvent('agent:memory', (data) => {
        if (data.memory) {
            setMemory(prev => [...prev, data.memory]);
        }
    }, []);
    useIPCEvent('agent:complete', () => {
        setStreamStatus('complete');
        stopStream();
        setCurrentStep(null);
    }, [setStreamStatus, stopStream]);
    useEffect(() => {
        if (!isActive) {
            stopStream();
        }
    }, [isActive, stopStream]);
    useEffect(() => () => stopStream(), [stopStream]);
    useEffect(() => {
        if (!isActive)
            return;
        if (!plan?.goal)
            return;
        if (isElectron)
            return;
        if (!apiBaseUrl) {
            setStreamStatus('error');
            setStreamError('API_BASE_URL environment variable is not configured.');
            return;
        }
        if (lastGoal === plan.goal && streamStatus !== 'error')
            return;
        void startStream(plan.goal, plan.taskId);
    }, [isActive, plan?.goal, plan?.taskId, isElectron, apiBaseUrl, startStream, setStreamError, setStreamStatus, lastGoal, streamStatus]);
    useEffect(() => {
        // Load consent ledger from consent API
        const loadLedger = async () => {
            try {
                const ledger = await ipc.consent.list();
                if (Array.isArray(ledger)) {
                    setConsentLedger(ledger.map((entry) => ({
                        id: entry.id?.toString() || crypto.randomUUID(),
                        timestamp: entry.timestamp || Date.now(),
                        action: {
                            type: entry.action?.type || 'unknown',
                            description: entry.action?.description || 'Unknown action',
                            risk: entry.action?.risk || 'medium',
                        },
                        approved: entry.approved !== false,
                        origin: entry.origin || 'agent',
                    })));
                }
            }
            catch (error) {
                console.error('Failed to load ledger:', error);
            }
        };
        if (isActive && activeTab === 'ledger') {
            loadLedger();
        }
    }, [isActive, activeTab]);
    const elapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    if (!isActive)
        return null;
    const tabs = [
        { id: 'responses', label: 'Responses', icon: MessageSquareText },
        { id: 'plan', label: 'Plan', icon: FileText },
        { id: 'actions', label: 'Actions', icon: Zap },
        { id: 'logs', label: 'Logs', icon: ScrollText },
        { id: 'memory', label: 'Memory', icon: Brain },
        { id: 'ledger', label: 'Ledger', icon: Shield },
    ];
    return (_jsxs(motion.div, { initial: { x: 400, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 400, opacity: 0 }, className: "fixed right-0 top-0 bottom-0 w-96 bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl z-50 flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-gray-700/50", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Bot, { className: "text-blue-400", size: 20 }), _jsx("h3", { className: "font-semibold text-gray-200", children: "Agent Console" })] }), _jsx("button", { onClick: () => {
                                    stopStream();
                                    setIsActive(false);
                                }, className: "p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200", children: _jsx(Square, { size: 16 }) })] }), _jsxs("div", { className: "grid grid-cols-3 gap-2 text-xs", children: [_jsxs("div", { className: "bg-gray-800/50 rounded p-2", children: [_jsxs("div", { className: "flex items-center gap-1 text-gray-400 mb-1", children: [_jsx(Zap, { size: 12 }), _jsx("span", { children: "Tokens" })] }), _jsx("div", { className: "text-gray-200 font-mono", children: tokens.toLocaleString() }), plan?.remaining && (_jsxs("div", { className: "text-gray-500 text-xs", children: ["/ ", plan.remaining.tokens] }))] }), _jsxs("div", { className: "bg-gray-800/50 rounded p-2", children: [_jsxs("div", { className: "flex items-center gap-1 text-gray-400 mb-1", children: [_jsx(Clock, { size: 12 }), _jsx("span", { children: "Time" })] }), _jsxs("div", { className: "text-gray-200 font-mono", children: [elapsedTime, "s"] }), plan?.budget && (_jsxs("div", { className: "text-gray-500 text-xs", children: ["/ ", plan.budget.seconds, "s"] }))] }), _jsxs("div", { className: "bg-gray-800/50 rounded p-2", children: [_jsxs("div", { className: "flex items-center gap-1 text-gray-400 mb-1", children: [_jsx(FileText, { size: 12 }), _jsx("span", { children: "Requests" })] }), _jsx("div", { className: "text-gray-200 font-mono", children: requests }), plan?.remaining && (_jsxs("div", { className: "text-gray-500 text-xs", children: ["/ ", plan.remaining.requests] }))] })] }), _jsxs("div", { className: "mt-3 flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "dryrun", checked: dryRun, onChange: (e) => setDryRun(e.target.checked), className: "rounded" }), _jsx("label", { htmlFor: "dryrun", className: "text-xs text-gray-400", children: "Dry-run mode" })] })] }), _jsx("div", { className: "flex border-b border-gray-700/50 overflow-x-auto", children: tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'text-blue-400 border-b-2 border-blue-400'
                            : 'text-gray-400 hover:text-gray-200'}`, children: [_jsx(Icon, { size: 14 }), _jsx("span", { children: tab.label })] }, tab.id));
                }) }), _jsx("div", { className: "flex-1 overflow-auto p-4", children: _jsxs(AnimatePresence, { mode: "wait", children: [activeTab === 'responses' && (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3 text-xs", children: [_jsxs("span", { className: `inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${STATUS_STYLES[streamStatus]}`, children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-current" }), STATUS_LABELS[streamStatus]] }), runId && (_jsxs("span", { className: "font-mono text-[11px] text-gray-500", children: ["Run #", runId.slice(-6)] })), !isElectron && !apiBaseUrl && (_jsx("span", { className: "text-[11px] text-amber-300", children: "Set API_BASE_URL to enable live streaming outside Electron." }))] }), streamTranscript && (_jsx("div", { className: "rounded-lg border border-slate-700/60 bg-slate-900/70 p-3 text-sm text-slate-200 whitespace-pre-wrap", children: streamTranscript })), streamError && (_jsx("div", { className: "rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100", children: streamError })), _jsxs("div", { className: "space-y-3", children: [streamEvents.map((event) => (_jsxs("div", { className: "rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 text-sm text-slate-200", children: [_jsxs("div", { className: "flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500", children: [_jsx("span", { children: event.type }), _jsx("span", { children: formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) })] }), event.content && (_jsx("div", { className: "mt-2 whitespace-pre-wrap text-slate-200", children: event.content })), event.type === 'consent' && (_jsxs("div", { className: "mt-2 flex items-center gap-2 text-xs text-slate-300", children: [_jsx(ShieldAlert, { size: 14, className: event.risk === 'high'
                                                                ? 'text-rose-400'
                                                                : event.risk === 'medium'
                                                                    ? 'text-amber-400'
                                                                    : 'text-emerald-400' }), _jsxs("span", { children: [event.approved ? 'Approved' : 'Denied', event.risk ? ` • ${event.risk.toUpperCase()}` : ''] })] }))] }, event.id))), streamEvents.length === 0 && (_jsxs("div", { className: "rounded-lg border border-dashed border-slate-700/60 bg-slate-900/50 p-4 text-xs text-slate-400", children: [streamStatus === 'connecting' && 'Connecting to Redix agent…', streamStatus === 'live' && 'Awaiting first tokens from the agent…', streamStatus === 'complete' && 'Run complete. Review the transcript above.', streamStatus === 'idle' && 'Trigger an agent action to see responses in real time.', streamStatus === 'error' && (streamError || 'Agent stream unavailable.')] }))] }), consentLedger.length > 0 && (_jsxs("div", { className: "pt-2", children: [_jsx("h4", { className: "text-sm font-semibold text-gray-300 mb-2", children: "Recent consent checks" }), _jsx("div", { className: "space-y-2 text-xs text-slate-300", children: consentLedger.slice(-5).map((entry) => (_jsxs("div", { className: "rounded-lg border border-slate-700/60 bg-slate-900/60 p-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-slate-200", children: entry.action.description }), _jsx("span", { className: `font-medium ${entry.approved ? 'text-emerald-300' : 'text-rose-300'}`, children: entry.approved ? 'Approved' : 'Denied' })] }), _jsxs("div", { className: "mt-1 flex items-center justify-between text-[11px] text-slate-500", children: [_jsx("span", { children: entry.action.type }), _jsx("span", { children: new Date(entry.timestamp).toLocaleTimeString() })] })] }, entry.id))) })] }))] }, "responses")), activeTab === 'plan' && plan && (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-300 mb-2", children: "Goal" }), _jsx("p", { className: "text-sm text-gray-400", children: plan.goal })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-300 mb-2", children: "Budget" }), _jsxs("div", { className: "bg-gray-800/50 rounded p-3 text-xs space-y-1", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Tokens:" }), _jsxs("span", { className: "text-gray-200", children: [plan.remaining.tokens, " / ", plan.budget.tokens] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Time:" }), _jsxs("span", { className: "text-gray-200", children: [plan.remaining.seconds, "s / ", plan.budget.seconds, "s"] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Requests:" }), _jsxs("span", { className: "text-gray-200", children: [plan.remaining.requests, " / ", plan.budget.requests] })] })] })] }), plan.steps.length > 0 && (_jsxs("div", { className: "mb-4", children: [_jsxs("h4", { className: "text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2", children: [_jsx(SparkleTrail, {}), "Redix thinking"] }), _jsx("div", { className: "flex flex-wrap gap-3", children: plan.steps.map((step, idx) => {
                                                const action = actions.find((a) => a.id === step.id);
                                                let status = 'pending';
                                                if (action?.status === 'completed')
                                                    status = 'completed';
                                                else if (action?.status === 'error')
                                                    status = 'error';
                                                else if (action?.status === 'running' || currentStep === step.id)
                                                    status = 'running';
                                                return (_jsxs(motion.div, { className: "flex flex-col items-center gap-1", initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { delay: idx * 0.05 }, children: [_jsxs("div", { className: `relative flex h-12 w-12 items-center justify-center rounded-full border transition-all ${status === 'completed'
                                                                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                                                                : status === 'error'
                                                                    ? 'border-rose-400/60 bg-rose-500/15 text-rose-200'
                                                                    : status === 'running'
                                                                        ? 'border-blue-400/70 bg-blue-500/15 text-blue-100'
                                                                        : 'border-slate-600/70 bg-slate-800/60 text-slate-300'} ${status === 'pending' ? 'opacity-70' : ''}`, children: [status === 'running' && (_jsx(motion.div, { className: "absolute inset-[3px] rounded-full bg-gradient-to-r from-blue-400/40 via-purple-400/40 to-blue-400/40", animate: { rotate: 360 }, transition: { duration: 3, repeat: Infinity, ease: 'linear' } })), _jsx("span", { className: "relative z-10 text-xs font-semibold text-white/90", children: idx + 1 })] }), _jsx("span", { className: "w-20 text-center text-[10px] text-gray-400 line-clamp-2", children: step.tool || step.description })] }, `bubble-${step.id}`));
                                            }) })] })), _jsxs("div", { children: [_jsxs("h4", { className: "text-sm font-semibold text-gray-300 mb-2", children: ["Steps (", plan.steps.length, ")"] }), _jsx("div", { className: "space-y-2", children: plan.steps.map((step, idx) => {
                                                const isCurrent = step.id === currentStep;
                                                const action = actions.find(a => a.id === step.id);
                                                return (_jsxs(motion.div, { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, className: `p-3 rounded-lg border ${isCurrent
                                                        ? 'border-blue-500/50 bg-blue-500/10'
                                                        : action?.status === 'completed'
                                                            ? 'border-green-500/30 bg-green-500/5'
                                                            : action?.status === 'error'
                                                                ? 'border-red-500/30 bg-red-500/5'
                                                                : 'border-gray-700/50 bg-gray-800/30'}`, children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsxs("span", { className: "text-xs font-mono text-gray-500", children: ["#", idx + 1] }), _jsx("span", { className: "text-sm font-medium text-gray-200", children: step.tool || step.description }), isCurrent && (_jsx(motion.div, { animate: { opacity: [1, 0.5, 1] }, transition: { repeat: Infinity, duration: 1.5 }, className: "w-2 h-2 bg-blue-400 rounded-full" })), action?.status === 'completed' && (_jsx(CheckCircle2, { size: 14, className: "text-green-400" })), action?.status === 'error' && (_jsx(XCircle, { size: 14, className: "text-red-400" }))] }), step.description && (_jsx("div", { className: "text-xs text-gray-400 mt-1", children: step.description })), action?.result && (_jsxs("div", { className: "text-xs text-gray-500 font-mono mt-2 truncate", children: [JSON.stringify(action.result).slice(0, 100), "..."] }))] }, step.id));
                                            }) })] })] }, "plan")), activeTab === 'actions' && (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "space-y-2", children: actions.length === 0 ? (_jsxs("div", { className: "space-y-2", children: [plan?.steps.slice(0, 3).map((step) => (_jsxs("div", { className: "overflow-hidden rounded-lg border border-blue-500/30 bg-blue-500/5 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm text-blue-200/80", children: [_jsx("div", { className: "h-2 w-2 animate-ping rounded-full bg-blue-400/80" }), _jsx("span", { children: step.tool || step.description })] }), _jsxs("div", { className: "flex flex-col gap-2 text-xs text-blue-100/70", children: [_jsx("div", { className: "h-1.5 w-full animate-pulse rounded bg-blue-300/30" }), _jsx("div", { className: "h-1.5 w-3/4 animate-pulse rounded bg-blue-300/20" })] })] }, `skeleton-${step.id}`))), _jsxs("div", { className: "flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 py-3 text-xs text-blue-200/80", children: [_jsx(LoaderDots, {}), "Waiting for Redix to execute actions\u2026"] })] })) : (actions.map((action) => (_jsxs("div", { className: `p-3 rounded-lg border ${action.status === 'completed'
                                    ? 'border-green-500/30 bg-green-500/5'
                                    : action.status === 'error'
                                        ? 'border-red-500/30 bg-red-500/5'
                                        : action.status === 'running'
                                            ? 'border-blue-500/50 bg-blue-500/10'
                                            : 'border-gray-700/50 bg-gray-800/30'}`, children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-200", children: action.tool }), action.status === 'completed' && _jsx(CheckCircle2, { size: 14, className: "text-green-400" }), action.status === 'error' && _jsx(XCircle, { size: 14, className: "text-red-400" })] }), _jsxs("div", { className: "text-xs text-gray-400 font-mono mb-2", children: ["Args: ", JSON.stringify(action.args).slice(0, 100)] }), action.result && (_jsxs("div", { className: "text-xs text-gray-500 font-mono", children: ["Result: ", JSON.stringify(action.result).slice(0, 200)] }))] }, action.id)))) }, "actions")), activeTab === 'logs' && (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "space-y-1", children: logs.length === 0 ? (_jsxs("div", { className: "text-center text-gray-500 py-8", children: [_jsx(ScrollText, { size: 32, className: "mx-auto mb-2 opacity-50" }), _jsx("p", { className: "text-sm", children: "No logs yet" })] })) : (_jsx("div", { className: "font-mono text-xs text-gray-400 space-y-1 max-h-[500px] overflow-y-auto", children: logs.map((log, idx) => (_jsx("div", { className: "hover:bg-gray-800/30 rounded px-2 py-1", children: log }, idx))) })) }, "logs")), activeTab === 'memory' && (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "space-y-2", children: memory.length === 0 ? (_jsxs("div", { className: "text-center text-gray-500 py-8", children: [_jsx(Brain, { size: 32, className: "mx-auto mb-2 opacity-50" }), _jsx("p", { className: "text-sm", children: "No memory entries yet" })] })) : (memory.map((entry, idx) => (_jsx("div", { className: "p-3 rounded-lg border border-gray-700/50 bg-gray-800/30", children: _jsx("div", { className: "text-xs text-gray-400 font-mono", children: JSON.stringify(entry, null, 2) }) }, idx)))) }, "memory")), activeTab === 'ledger' && (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "space-y-2", children: consentLedger.length === 0 ? (_jsxs("div", { className: "text-center text-gray-500 py-8", children: [_jsx(Shield, { size: 32, className: "mx-auto mb-2 opacity-50" }), _jsx("p", { className: "text-sm", children: "No consent entries yet" })] })) : (consentLedger.map((entry) => (_jsxs("div", { className: `p-3 rounded-lg border ${entry.approved
                                    ? 'border-green-500/30 bg-green-500/5'
                                    : 'border-red-500/30 bg-red-500/5'}`, children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [entry.approved ? (_jsx(CheckCircle2, { size: 14, className: "text-green-400" })) : (_jsx(XCircle, { size: 14, className: "text-red-400" })), _jsx("span", { className: "text-sm font-medium text-gray-200", children: entry.action.type }), _jsx("span", { className: `text-xs px-1.5 py-0.5 rounded ${entry.action.risk === 'high'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : entry.action.risk === 'medium'
                                                        ? 'bg-yellow-500/20 text-yellow-400'
                                                        : 'bg-green-500/20 text-green-400'}`, children: entry.action.risk })] }), _jsx("div", { className: "text-xs text-gray-400 mb-1", children: entry.action.description }), _jsxs("div", { className: "text-xs text-gray-500", children: [new Date(entry.timestamp).toLocaleString(), " \u2022 ", entry.origin] })] }, entry.id)))) }, "ledger"))] }) })] }));
}
