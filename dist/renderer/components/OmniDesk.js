import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * OmniDesk - Central dashboard for empty state (no tabs open)
 * Think: ChatGPT home + Arc Spaces + Obsidian Quick Launch
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Sparkles, Search, FileText, Workflow, Clock, Pin, RefreshCw, Leaf, Compass, Bot, GaugeCircle, BatteryCharging, Cloud, CheckCircle2, TrendingUp, TrendingDown, ClipboardCopy, FileSearch, Sparkle, Loader2, } from 'lucide-react';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { ipc } from '../lib/ipc-typed';
import { useNavigate } from 'react-router-dom';
import { ipcEvents } from '../lib/ipc-events';
import { AIResponsePane } from './AIResponsePane';
import { useEfficiencyStore } from '../state/efficiencyStore';
import { useWorkspaceEventsStore } from '../state/workspaceEventsStore';
import { useAgentStreamStore } from '../state/agentStreamStore';
import { createFallbackTab } from '../lib/tabFallback';
import { ChromeNewTabPage } from './ChromeNewTabPage';
import { useSettingsStore } from '../state/settingsStore';
// SEARCH_ENDPOINT removed - using buildSearchUrlWithLang from search.ts instead
const suggestedPrompts = [
    '@live explain quantum computing basics',
    'graph the AI ethics landscape',
    "summarize today's markets",
    'compare battery life of M-series laptops',
    'find regenerative design principles',
];
// Use language-aware search from search.ts
import { buildSearchUrl as buildSearchUrlWithLang } from '../lib/search';
function buildSearchUrl(query, language) {
    return buildSearchUrlWithLang('duckduckgo', query, language);
}
function useDashboardData() {
    const [recentWorkspaces, setRecentWorkspaces] = useState([]);
    const [continueSessions, setContinueSessions] = useState([]);
    const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const pushWorkspaceEvent = useWorkspaceEventsStore(state => state.pushEvent);
    const loadData = useCallback(async () => {
        if (!window.ipc || typeof window.ipc.invoke !== 'function') {
            return false;
        }
        setLoadingWorkspaces(true);
        setLoadingSessions(true);
        try {
            const workspaceResult = await ipc.workspaceV2.list();
            const workspaces = workspaceResult?.workspaces || [];
            setRecentWorkspaces(workspaces.slice(0, 4));
            setLoadingWorkspaces(false);
        }
        catch {
            setRecentWorkspaces([]);
            setLoadingWorkspaces(false);
        }
        try {
            const sessionsResult = await ipc.sessions.list();
            const sessions = Array.isArray(sessionsResult) ? sessionsResult : [];
            const continueItems = sessions.slice(0, 3).map((session) => ({
                id: session.id,
                type: session.name?.includes('Research') ? 'Research' : 'Browse',
                title: session.name || 'Untitled Session',
                url: session.lastUrl || 'about:blank',
                timestamp: session.updatedAt || session.createdAt || Date.now() - 3600000,
                sessionId: session.id,
            }));
            const researchSessions = continueItems.filter(item => item.type === 'Research');
            if (researchSessions.length > 0) {
                setContinueSessions(researchSessions);
            }
            else {
                setContinueSessions([
                    {
                        type: 'Research',
                        title: 'Quantum Computing Research',
                        url: 'about:blank',
                        timestamp: Date.now() - 3600000,
                    },
                ]);
            }
            setLoadingSessions(false);
        }
        catch {
            setContinueSessions([
                {
                    type: 'Research',
                    title: 'Quantum Computing Research',
                    url: 'about:blank',
                    timestamp: Date.now() - 3600000,
                },
            ]);
            setLoadingSessions(false);
        }
        return true;
    }, []);
    useEffect(() => {
        let cancelled = false;
        const kickOff = () => {
            if (cancelled)
                return;
            loadData().then(ready => {
                if (!ready && !cancelled) {
                    setTimeout(kickOff, 500);
                }
            });
        };
        const initial = setTimeout(kickOff, 350);
        const unsubscribeWorkspace = ipcEvents.on('workspace:updated', () => {
            pushWorkspaceEvent({
                type: 'workspace:updated',
                message: 'Workspace metadata refreshed',
            });
            if (!cancelled) {
                void loadData();
            }
        });
        return () => {
            cancelled = true;
            clearTimeout(initial);
            unsubscribeWorkspace();
        };
    }, [loadData]);
    return {
        recentWorkspaces,
        continueSessions,
        reload: loadData,
        loadingWorkspaces,
        loadingSessions,
    };
}
export function OmniDesk({ variant = 'overlay', forceShow = false, useChromeStyle: _useChromeStyle = false, }) {
    const { tabs, activeId } = useTabsStore();
    const { setMode } = useAppStore();
    const navigate = useNavigate();
    const { recentWorkspaces, continueSessions, reload, loadingWorkspaces, loadingSessions } = useDashboardData();
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [aiResponseOpen, setAiResponseOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const efficiencyLabel = useEfficiencyStore(state => state.label);
    const efficiencyBadge = useEfficiencyStore(state => state.badge);
    const efficiencySnapshot = useEfficiencyStore(state => state.snapshot);
    const efficiencyUpdated = useEfficiencyStore(state => state.lastUpdated);
    const efficiencyHistory = useEfficiencyStore(state => state.history);
    const pushWorkspaceEvent = useWorkspaceEventsStore(state => state.pushEvent);
    const agentStatus = useAgentStreamStore(state => state.status);
    const agentLastGoal = useAgentStreamStore(state => state.lastGoal);
    const agentEvents = useAgentStreamStore(state => state.events);
    const agentTranscript = useAgentStreamStore(state => state.transcript);
    // Check if Chrome-style new tab page is enabled (default to true)
    const chromeStyleEnabled = useSettingsStore(state => state.appearance.chromeNewTabPage ?? true);
    const language = useSettingsStore(state => state.language || 'auto');
    const agentPreview = useMemo(() => {
        const latestEvents = agentEvents.slice(-3).reverse();
        const lastUpdated = latestEvents.length > 0 ? latestEvents[0].timestamp : null;
        const transcriptLines = agentTranscript
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
        const statusPalette = {
            idle: { label: 'Idle', tone: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
            connecting: { label: 'Connecting', tone: 'border-blue-500/40 bg-blue-500/15 text-blue-100' },
            live: {
                label: 'Streaming',
                tone: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100',
            },
            complete: {
                label: 'Complete',
                tone: 'border-purple-500/40 bg-purple-500/15 text-purple-100',
            },
            error: { label: 'Error', tone: 'border-rose-500/40 bg-rose-500/15 text-rose-100' },
        };
        const statusTone = statusPalette[agentStatus] ?? statusPalette.idle;
        const timeline = latestEvents.map(event => {
            switch (event.type) {
                case 'start':
                    return {
                        ...event,
                        label: 'Run started',
                        detail: event.content ?? 'Agent boot sequence initiated.',
                        variant: 'border-blue-400/40 bg-blue-500/10 text-blue-100',
                    };
                case 'step':
                    return {
                        ...event,
                        label: `Step ${event.step ?? ''}`.trim(),
                        detail: event.content ?? event.status ?? 'Executing tool call…',
                        variant: 'border-purple-400/40 bg-purple-500/10 text-purple-100',
                    };
                case 'log':
                    return {
                        ...event,
                        label: 'Log update',
                        detail: event.content ?? 'Log appended.',
                        variant: 'border-slate-400/40 bg-slate-500/10 text-slate-100',
                    };
                case 'consent':
                    return {
                        ...event,
                        label: event.approved ? 'Consent granted' : 'Consent requested',
                        detail: event.content ??
                            `Risk ${event.risk ?? 'medium'} · ${event.approved ? 'approved' : 'pending'}`,
                        variant: event.approved
                            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                            : 'border-amber-400/40 bg-amber-500/10 text-amber-100',
                    };
                case 'done':
                    return {
                        ...event,
                        label: 'Run complete',
                        detail: event.content ?? 'Outputs finalised.',
                        variant: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
                    };
                case 'error':
                    return {
                        ...event,
                        label: 'Run error',
                        detail: event.content ?? 'Check diagnostics for details.',
                        variant: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
                    };
                default:
                    return {
                        ...event,
                        label: event.type,
                        detail: event.content ?? 'Event received.',
                        variant: 'border-slate-400/40 bg-slate-500/10 text-slate-100',
                    };
            }
        });
        const snippetSource = timeline
            .map(entry => entry.detail)
            .filter(Boolean)
            .slice(0, 2);
        const snippet = snippetSource.length > 0 ? snippetSource : transcriptLines.slice(-2);
        return {
            latestEvents,
            timeline,
            snippet,
            lastUpdated,
            statusTone,
        };
    }, [agentEvents, agentTranscript, agentStatus]);
    const hasTranscript = useMemo(() => agentTranscript.trim().length > 0, [agentTranscript]);
    const [copyStatus, setCopyStatus] = useState('idle');
    const handleCopyTranscript = useCallback(async () => {
        if (!hasTranscript || typeof navigator === 'undefined' || !navigator.clipboard) {
            setCopyStatus('error');
            return;
        }
        try {
            setCopyStatus('copying');
            await navigator.clipboard.writeText(agentTranscript.trim());
            setCopyStatus('copied');
        }
        catch (error) {
            console.warn('[OmniDesk] Failed to copy transcript', error);
            setCopyStatus('error');
        }
    }, [agentTranscript, hasTranscript]);
    useEffect(() => {
        if (copyStatus !== 'copied')
            return;
        const timeout = window.setTimeout(() => setCopyStatus('idle'), 2000);
        return () => window.clearTimeout(timeout);
    }, [copyStatus]);
    const ecoMetrics = useMemo(() => {
        const batteryPctValue = typeof efficiencySnapshot.batteryPct === 'number'
            ? Math.max(0, Math.min(100, Math.round(efficiencySnapshot.batteryPct)))
            : null;
        const carbonIntensityValue = typeof efficiencySnapshot.carbonIntensity === 'number'
            ? Math.max(0, Math.round(efficiencySnapshot.carbonIntensity))
            : null;
        const cpuLoad = Number.isFinite(efficiencySnapshot.cpuLoad1)
            ? Math.max(0, Math.min(100, Math.round(efficiencySnapshot.cpuLoad1)))
            : 0;
        const activeTabs = efficiencySnapshot.activeTabs ?? 0;
        const ecoScore = (() => {
            const batteryComponent = batteryPctValue !== null ? batteryPctValue * 0.4 : 35;
            const cpuComponent = 100 - cpuLoad;
            const carbonComponent = carbonIntensityValue !== null ? (Math.max(0, 220 - carbonIntensityValue) / 220) * 100 : 50;
            const tabComponent = (Math.max(0, 12 - activeTabs) / 12) * 100;
            const raw = 0.35 * batteryComponent +
                0.25 * cpuComponent +
                0.25 * carbonComponent +
                0.15 * tabComponent;
            return Math.round(Math.max(5, Math.min(98, raw)));
        })();
        const achievements = [
            {
                id: 'battery',
                label: batteryPctValue !== null
                    ? `${batteryPctValue}% battery reserve`
                    : 'Gathering battery telemetry',
                description: batteryPctValue !== null && batteryPctValue >= 60
                    ? 'Great reserve for deep work.'
                    : 'Stay plugged in to build reserve.',
                achieved: batteryPctValue !== null && batteryPctValue >= 60,
                icon: BatteryCharging,
            },
            {
                id: 'carbon',
                label: carbonIntensityValue !== null
                    ? `${carbonIntensityValue} gCO₂/kWh grid intensity`
                    : 'Estimating regional carbon mix',
                description: carbonIntensityValue !== null && carbonIntensityValue <= 180
                    ? 'Low-carbon window — ideal for heavy tasks.'
                    : 'Carbon intensity elevated. Schedule net-heavy work later.',
                achieved: carbonIntensityValue !== null && carbonIntensityValue <= 180,
                icon: Cloud,
            },
            {
                id: 'tabs',
                label: `${activeTabs} active tabs`,
                description: activeTabs <= 6
                    ? 'Lean session profile — memory savings unlocked.'
                    : 'Consider Hibernate to free resources.',
                achieved: activeTabs <= 6,
                icon: Sparkles,
            },
        ];
        return {
            batteryPctValue,
            carbonIntensityValue,
            cpuLoad,
            activeTabs,
            ecoScore,
            achievements,
        };
    }, [efficiencySnapshot]);
    const ecoHistoryInsights = useMemo(() => {
        const recent = efficiencyHistory.slice(-24);
        const batterySeries = recent
            .map(sample => (typeof sample.batteryPct === 'number' ? sample.batteryPct : null))
            .filter((value) => value !== null);
        const carbonSeries = recent
            .map(sample => (typeof sample.carbonIntensity === 'number' ? sample.carbonIntensity : null))
            .filter((value) => value !== null);
        const computeTrend = (series) => {
            if (series.length < 2)
                return { delta: 0, direction: 'flat' };
            const last = series[series.length - 1];
            const baseIndex = Math.max(0, series.length - 6);
            const previous = series[baseIndex];
            const delta = last - previous;
            return {
                delta,
                direction: delta > 1 ? 'up' : delta < -1 ? 'down' : 'flat',
            };
        };
        const computeSparkline = (series) => {
            if (series.length < 2)
                return '';
            const min = Math.min(...series);
            const max = Math.max(...series);
            const range = max - min || 1;
            return series
                .map((value, index) => {
                const x = (index / Math.max(series.length - 1, 1)) * 100;
                const normalized = 100 - ((value - min) / range) * 80 - 10;
                return `${x.toFixed(2)},${normalized.toFixed(2)}`;
            })
                .join(' ');
        };
        return {
            battery: {
                series: batterySeries,
                path: computeSparkline(batterySeries),
                trend: computeTrend(batterySeries),
            },
            carbon: {
                series: carbonSeries,
                path: computeSparkline(carbonSeries),
                trend: computeTrend(carbonSeries),
            },
        };
    }, [efficiencyHistory]);
    const agentStatusLabels = {
        idle: 'Agent idle',
        connecting: 'Connecting to Redix…',
        live: 'Streaming answer in real time',
        complete: 'Last run completed',
        error: 'Run encountered an issue',
    };
    const ecoGauge = useMemo(() => {
        const radius = 46;
        const circumference = 2 * Math.PI * radius;
        const clampedScore = Math.max(0, Math.min(100, ecoMetrics.ecoScore));
        const offset = circumference - (clampedScore / 100) * circumference;
        return { radius, circumference, offset, clampedScore };
    }, [ecoMetrics.ecoScore]);
    const quickActions = [
        {
            icon: Sparkles,
            label: 'Ask Agent',
            action: async () => {
                navigate('/agent');
            },
            color: 'from-blue-500 to-cyan-500',
            description: 'Open the agent console to start a guided workflow.',
        },
        {
            icon: Search,
            label: 'Search Topic',
            action: async () => {
                // Switch to research mode and open search
                setMode('Research');
                await ipc.tabs.create('about:blank');
            },
            color: 'from-purple-500 to-pink-500',
            description: 'Launch AI-powered research with citations-first results.',
        },
        {
            icon: FileText,
            label: 'Research Notes',
            action: async () => {
                setMode('Research');
                await ipc.tabs.create('about:blank');
            },
            color: 'from-green-500 to-emerald-500',
            description: 'Capture structured notes that sync with your highlights.',
        },
        {
            icon: Workflow,
            label: 'Run Playbook',
            action: () => {
                navigate('/playbooks');
            },
            color: 'from-orange-500 to-red-500',
            description: 'Automate multi-step workflows with reusable recipes.',
        },
    ];
    const ecoStats = useMemo(() => {
        const batteryPct = ecoMetrics.batteryPctValue !== null ? `${ecoMetrics.batteryPctValue}%` : '—';
        const carbonIntensity = ecoMetrics.carbonIntensityValue !== null
            ? `${ecoMetrics.carbonIntensityValue} gCO₂/kWh`
            : 'Syncing…';
        const activeTabs = `${ecoMetrics.activeTabs}`;
        return { batteryPct, carbonIntensity, activeTabs };
    }, [ecoMetrics]);
    const handleContinueSession = async (session) => {
        try {
            let urlToLoad = session.url || 'about:blank';
            // Switch to the session first if it has a sessionId
            if (session.sessionId) {
                try {
                    await ipc.sessions.setActive({ sessionId: session.sessionId });
                    // Wait a bit for session to switch
                    await new Promise(resolve => setTimeout(resolve, 200));
                    // Check if session has tabs already
                    const tabs = await ipc.tabs.list();
                    if (tabs.length > 0) {
                        // Session has tabs, they should be visible now
                        // Activate the first tab if none is active
                        const activeTab = tabs.find(t => t.active);
                        if (!activeTab && tabs[0]) {
                            await ipc.tabs.activate({ id: tabs[0].id });
                        }
                        return; // Tabs exist, don't create new one
                    }
                    // No tabs in session, create one with the session URL or default
                    if (!urlToLoad || urlToLoad === 'about:blank') {
                        // Try to get last visited URL from session or use default
                        urlToLoad = 'about:blank';
                    }
                }
                catch (error) {
                    console.warn('Failed to set active session:', error);
                    // Continue with creating a tab
                }
            }
            // Research-only alpha: always ensure Research mode is active
            setMode('Research');
            // Create tab with the URL
            const result = await ipc.tabs.create(urlToLoad);
            if (!result) {
                throw new Error('Failed to create tab');
            }
            // Wait a bit for tab to be created and activated
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        catch (error) {
            console.error('Failed to continue session:', error);
            // Last resort: create a blank tab
            try {
                await ipc.tabs.create('about:blank');
                pushWorkspaceEvent({
                    type: 'workspace:resume-session',
                    workspaceId: session.sessionId ?? null,
                    message: `Started fallback tab for session "${session.title}"`,
                });
            }
            catch (e) {
                console.error('Failed to create fallback tab:', e);
            }
        }
    };
    const handleSearchLaunch = useCallback(async (value) => {
        const query = value.trim();
        if (!query) {
            console.warn('[OmniDesk] Empty search query, ignoring');
            return;
        }
        if (searchLoading) {
            console.warn('[OmniDesk] Search already in progress, ignoring');
            return;
        }
        setSearchLoading(true);
        console.log('[OmniDesk] Launching search:', query);
        // Check if query starts with @live, @ask, or @redix for AI streaming
        const isAIQuery = query.trim().startsWith('@live') ||
            query.trim().startsWith('@ask') ||
            query.trim().startsWith('@redix');
        if (isAIQuery) {
            // Show AI response pane for streaming queries
            // Remove the @ prefix for the actual query
            const cleanQuery = query.trim().replace(/^@(live|ask|redix)\s*/i, '');
            setAiQuery(cleanQuery || query);
            setAiResponseOpen(true);
            setSearchLoading(false);
            return;
        }
        // Also check if query is a general question (starts with question words)
        const isQuestion = /^(what|why|how|when|where|who|explain|summarize|compare|find)/i.test(query.trim());
        if (isQuestion && query.trim().length > 10) {
            // Show AI response pane for question-like queries
            setAiQuery(query);
            setAiResponseOpen(true);
            // Don't return - also open search results
        }
        // Use the active tab if it's about:blank, otherwise create a new tab
        const activeTab = tabs.find(tab => tab.id === activeId);
        const isAboutBlank = activeTab?.url === 'about:blank' || !activeTab?.url || activeTab?.url?.startsWith('about:');
        const targetUrl = buildSearchUrl(query, language !== 'auto' ? language : undefined);
        setMode('Research');
        try {
            if (isAboutBlank && activeTab) {
                // Navigate the existing tab instead of creating a new one
                try {
                    console.log('[OmniDesk] Navigating existing tab:', activeTab.id, 'to:', targetUrl);
                    await ipc.tabs.navigate(activeTab.id, targetUrl);
                    setSearchQuery('');
                    console.log('[OmniDesk] Navigation successful');
                    return;
                }
                catch (navError) {
                    // If navigation fails, fall through to create new tab
                    console.warn('[OmniDesk] Failed to navigate existing tab, creating new one:', navError);
                }
            }
            // Create a new tab with the search URL
            console.log('[OmniDesk] Creating new tab with URL:', targetUrl);
            const result = await ipc.tabs.create(targetUrl);
            const success = result && typeof result === 'object' && 'success' in result
                ? result.success !== false
                : Boolean(result);
            if (!success) {
                console.warn('[OmniDesk] Tab creation failed, using fallback');
                createFallbackTab({ url: targetUrl, title: `Search: ${query}` });
                pushWorkspaceEvent({
                    type: 'workspace:launch-fallback',
                    message: 'IPC unavailable, opened search in fallback tab.',
                });
                if (typeof window !== 'undefined') {
                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                }
            }
            else {
                console.log('[OmniDesk] Tab created successfully:', result);
            }
            setSearchQuery('');
        }
        catch (error) {
            console.error('[OmniDesk] Search launch error:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Try fallback tab creation
            try {
                createFallbackTab({ url: targetUrl, title: `Search: ${query}` });
            }
            catch (fallbackError) {
                console.error('[OmniDesk] Fallback tab creation failed:', fallbackError);
                // Last resort: open in external browser
                if (typeof window !== 'undefined') {
                    window.open(targetUrl, '_blank', 'noopener,noreferrer');
                }
            }
            pushWorkspaceEvent({
                type: 'workspace:launch-error',
                message: 'Encountered an error launching the flow. Using fallback tab.',
                payload: { error: errorMessage },
            });
        }
        finally {
            setSearchLoading(false);
        }
    }, [pushWorkspaceEvent, setMode, tabs, activeId, searchLoading]);
    // Show dashboard if forced, no tabs, or active tab is about:blank (search page)
    const activeTabForDisplay = tabs.find(tab => tab.id === activeId);
    const isAboutBlankDisplay = activeTabForDisplay?.url === 'about:blank' ||
        !activeTabForDisplay?.url ||
        activeTabForDisplay?.url?.startsWith('about:') ||
        activeTabForDisplay?.url?.startsWith('ob://newtab') ||
        activeTabForDisplay?.url?.startsWith('ob://home');
    const shouldShowDashboard = forceShow || tabs.length === 0 || !activeTabForDisplay || isAboutBlankDisplay;
    if (!shouldShowDashboard)
        return null;
    // Show Chrome-style new tab page by default (replacing OmniDesk)
    // Only show OmniDesk if explicitly disabled
    if (chromeStyleEnabled !== false) {
        return _jsx(ChromeNewTabPage, {});
    }
    const containerClass = variant === 'overlay'
        ? 'absolute inset-0 z-20 flex h-full w-full overflow-auto bg-gradient-to-br from-[#131722] via-[#171B2A] to-[#10131C] px-6 py-8'
        : variant === 'split'
            ? 'flex h-full w-full overflow-auto bg-gradient-to-br from-[#131722] via-[#171B2A] to-[#10131C] px-6 py-8'
            : 'flex h-full w-full overflow-auto bg-gradient-to-br from-[#0F121C] via-[#131827] to-[#0F121C] px-6 py-8';
    // Ensure container is properly sized and visible
    // Note: z-index 20 is below TabStrip (z-50) to ensure tabs are always clickable
    const containerStyle = {
        minHeight: '100%',
        width: '100%',
        position: variant === 'overlay' ? 'absolute' : 'relative',
        zIndex: variant === 'overlay' ? 20 : 1,
        pointerEvents: shouldShowDashboard ? 'auto' : 'none', // Only allow pointer events when visible
    };
    const handleManualRefresh = async () => {
        setRefreshing(true);
        try {
            await reload();
            pushWorkspaceEvent({ type: 'workspace:manual-refresh', message: 'Dashboard refreshed' });
        }
        finally {
            setRefreshing(false);
        }
    };
    const sessionSkeletons = useMemo(() => Array.from({ length: 2 }), []);
    const workspaceSkeletons = useMemo(() => Array.from({ length: 3 }), []);
    // Debug: Log when dashboard should show (only in dev)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.IS_DEV !== undefined) {
            console.log('[OmniDesk] Rendering dashboard:', {
                shouldShowDashboard,
                forceShow,
                tabsLength: tabs.length,
                activeTab: activeTabForDisplay,
                isAboutBlank: isAboutBlankDisplay,
                variant,
            });
        }
    }, [
        shouldShowDashboard,
        forceShow,
        tabs.length,
        activeTabForDisplay,
        isAboutBlankDisplay,
        variant,
    ]);
    return (_jsxs("div", { className: containerClass, "data-onboarding": "dashboard", style: containerStyle, children: [_jsxs("div", { className: "mx-auto flex h-full w-full max-w-6xl flex-col gap-6 xl:flex-row", style: { minHeight: '100%' }, children: [_jsxs("div", { className: "flex-1 space-y-6", children: [_jsxs(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 }, className: "rounded-3xl border border-slate-800/70 bg-slate-900/70 px-6 py-7 shadow-2xl shadow-black/30", children: [_jsx("p", { className: "text-xs font-medium uppercase tracking-[0.32em] text-slate-400", children: "Regenerative Command Center" }), _jsx("h1", { className: "mt-3 text-3xl font-bold leading-tight text-slate-50 sm:text-4xl lg:text-5xl", children: "Guide your next deep work session with Regen & Redix" }), _jsx("p", { className: "mt-3 max-w-2xl text-base leading-relaxed text-slate-300", children: "Spin up an agent, resume an exploration, or launch a new search. Your flow state starts here." }), _jsxs("form", { className: "mt-6 space-y-3", onSubmit: event => {
                                            event.preventDefault();
                                            void handleSearchLaunch(searchQuery);
                                        }, children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row", children: [_jsxs("div", { className: "flex min-h-[52px] flex-1 items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/70 px-4 py-3 text-slate-200 focus-within:border-blue-500/60", children: [_jsx(Search, { size: 18, className: "text-blue-400" }), _jsx("input", { value: searchQuery, onChange: event => setSearchQuery(event.target.value), onKeyDown: e => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        void handleSearchLaunch(searchQuery);
                                                                    }
                                                                }, onClick: e => {
                                                                    e.stopPropagation();
                                                                }, placeholder: "Search the open web, knowledge base, or ask Redix\u2026", className: "flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500", style: { pointerEvents: 'auto', zIndex: 10 }, autoFocus: false, tabIndex: 0, "aria-label": "Search the open web, knowledge base, or ask Redix", "aria-describedby": "search-hint", role: "searchbox" }), _jsx("span", { id: "search-hint", className: "sr-only", children: "Press Enter to search or launch flow. Use @live or @ask prefix for AI queries." })] }), _jsx("button", { type: "submit", onClick: e => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            void handleSearchLaunch(searchQuery);
                                                        }, disabled: searchLoading || !searchQuery.trim(), className: "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-500/60 bg-blue-500/20 px-5 py-3 text-sm font-semibold text-blue-100 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.8)] transition hover:border-blue-400 hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60", style: { pointerEvents: 'auto', zIndex: 10 }, "aria-label": searchLoading ? 'Launching search' : 'Launch search flow', "aria-busy": searchLoading, children: searchLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 16, className: "animate-spin" }), _jsx("span", { children: "Launching..." })] })) : ('Launch Flow') })] }), _jsx("div", { className: "flex flex-wrap gap-2 text-xs text-slate-400", children: suggestedPrompts.map(prompt => (_jsx("button", { type: "button", onClick: e => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (searchLoading)
                                                            return;
                                                        setSearchQuery(prompt);
                                                        void handleSearchLaunch(prompt);
                                                    }, disabled: searchLoading, onKeyDown: e => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSearchQuery(prompt);
                                                            void handleSearchLaunch(prompt);
                                                        }
                                                    }, className: "cursor-pointer rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 transition hover:border-blue-500/50 hover:bg-slate-800/80 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50", style: { pointerEvents: 'auto', zIndex: 10 }, "aria-label": `Suggested search: ${prompt}`, tabIndex: 0, children: prompt }, prompt))) })] })] }), _jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1, duration: 0.4 }, className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3", children: quickActions.map(action => {
                                    const Icon = action.icon;
                                    return (_jsxs(motion.button, { onClick: e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (searchLoading)
                                                return;
                                            void action.action();
                                        }, onKeyDown: e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (searchLoading)
                                                    return;
                                                void action.action();
                                            }
                                        }, disabled: searchLoading, whileHover: searchLoading ? {} : { y: -4, scale: 1.02 }, whileTap: searchLoading ? {} : { scale: 0.96 }, transition: { type: 'spring', stiffness: 400, damping: 17 }, className: `group flex h-full cursor-pointer flex-col justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 px-5 py-6 text-left shadow-[0_12px_40px_-24px_rgba(15,23,42,0.9)] transition hover:border-slate-700/70 hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${searchLoading ? 'cursor-not-allowed opacity-60' : ''}`, style: { pointerEvents: 'auto', zIndex: 10 }, "aria-label": action.description ? `${action.label}: ${action.description}` : action.label, tabIndex: 0, children: [_jsx("span", { className: `inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-[0_15px_30px_-20px_currentColor]`, children: _jsx(Icon, { className: "h-5 w-5" }) }), _jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "text-sm font-semibold text-slate-100 group-hover:text-white", children: action.label }), action.description ? (_jsx("p", { className: "text-xs leading-snug text-slate-400 group-hover:text-slate-300", children: action.description })) : null] })] }, action.label));
                                }) }), _jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.16, duration: 0.4 }, className: "rounded-3xl border border-violet-500/30 bg-violet-500/10 px-6 py-5 text-violet-100 shadow-[0_45px_120px_-60px_rgba(139,92,246,0.6)]", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/40 bg-violet-500/20", children: _jsx(Bot, { size: 16 }) }), "Live Redix Pulse"] }), _jsxs("span", { className: `inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] ${agentPreview.statusTone.tone}`, children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-current" }), agentStatusLabels[agentStatus]] })] }), _jsxs("div", { className: "mt-4 space-y-3 text-sm text-purple-100/90", children: [agentLastGoal ? (_jsxs("div", { className: "rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-xs text-purple-100/80", children: [_jsx("span", { className: "text-[11px] uppercase tracking-[0.28em] text-purple-200/70", children: "Last goal" }), _jsx("p", { className: "mt-2 text-sm text-purple-100", children: agentLastGoal })] })) : null, _jsxs("div", { className: "rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-4", children: [_jsx("span", { className: "text-[11px] uppercase tracking-[0.3em] text-purple-200/70", children: "Preview" }), _jsx("div", { className: "mt-2 text-xs text-purple-100/80", children: _jsx(AnimatePresence, { mode: "popLayout", children: agentPreview.snippet.length > 0 ? (agentPreview.snippet.map((line, index) => (_jsx(motion.p, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.25 }, className: "leading-relaxed", children: line }, `${line}-${index}`)))) : (_jsx(motion.p, { initial: { opacity: 0.6 }, animate: { opacity: 1 }, className: "text-purple-200/70", children: "No live transcript yet. Kick off a prompt to watch the agent stream." })) }) })] }), _jsxs("div", { className: "flex flex-wrap gap-2 text-[11px]", children: [_jsxs("button", { type: "button", onClick: handleCopyTranscript, disabled: !hasTranscript || copyStatus === 'copying', className: "inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-medium text-purple-100 transition hover:border-violet-300/60 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60", children: [_jsx(ClipboardCopy, { size: 12 }), copyStatus === 'copied'
                                                                ? 'Copied!'
                                                                : copyStatus === 'copying'
                                                                    ? 'Copying…'
                                                                    : 'Copy transcript'] }), _jsxs("button", { type: "button", onClick: () => navigate('/agent'), className: "inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-medium text-purple-100 transition hover:border-violet-300/60 hover:bg-violet-500/25", children: [_jsx(FileSearch, { size: 12 }), "View run log"] }), _jsxs("button", { type: "button", onClick: () => navigate('/agent'), className: "inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-medium text-purple-100 transition hover:border-violet-300/60 hover:bg-violet-500/25", children: [_jsx(Sparkle, { size: 12 }), "Launch prompt"] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[11px] uppercase tracking-[0.28em] text-purple-200/70", children: "Timeline" }), _jsx("div", { className: "mt-2 space-y-2", children: _jsx(AnimatePresence, { initial: false, children: agentPreview.timeline.length > 0 ? (agentPreview.timeline.map(event => (_jsxs(motion.div, { initial: { opacity: 0, x: 8 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -8 }, transition: { duration: 0.2 }, className: `flex items-center justify-between rounded-xl px-3 py-2 text-[11px] ${event.variant}`, children: [_jsx("span", { className: "capitalize", children: event.label }), _jsx("span", { className: "text-purple-300/70", children: formatDistanceToNow(event.timestamp, { addSuffix: true }) })] }, event.id)))) : (_jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, className: "rounded-xl border border-dashed border-violet-400/30 px-4 py-3 text-[11px] text-purple-200/70", children: "No agent events yet \u2014 run a plan or quick prompt to populate this stream." })) }) })] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap justify-between gap-2 text-xs", children: [_jsx("div", { className: "text-purple-200/60", children: agentPreview.lastUpdated
                                                    ? `Updated ${formatDistanceToNow(agentPreview.lastUpdated, { addSuffix: true })}`
                                                    : 'Awaiting first signal' }), _jsx("button", { type: "button", onClick: () => navigate('/agent'), className: "inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-purple-100 hover:border-violet-300/60 hover:bg-violet-500/30", children: "Open agent console" })] })] }), _jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2, duration: 0.4 }, className: "rounded-3xl border border-slate-800/60 bg-slate-900/60 px-6 py-5 shadow-lg", children: _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-sm text-slate-400", children: [_jsx(Compass, { size: 16, className: "text-slate-300" }), _jsx("span", { children: "Pro tip:" }), _jsx("span", { className: "text-slate-300", children: "Drag any research tab into Redix MindMap to instantly connect ideas." })] }) })] }), _jsxs("aside", { className: "w-full flex-shrink-0 space-y-4 xl:w-[360px]", children: [_jsxs(motion.div, { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.4 }, className: "rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 shadow-lg", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between text-sm font-semibold text-slate-300", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Clock, { size: 16 }), "Continue Session"] }), _jsx("button", { onClick: handleManualRefresh, className: "rounded-full border border-slate-700/60 p-1.5 text-slate-400 transition hover:border-slate-500/60 hover:text-slate-200", title: "Refresh", children: _jsx(RefreshCw, { size: 14, className: refreshing ? 'animate-spin' : '' }) })] }), _jsx("div", { className: "space-y-3", children: loadingSessions ? (sessionSkeletons.map((_, idx) => (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: idx * 0.1, duration: 0.3 }, className: "h-[86px] w-full rounded-xl border border-slate-800/60 bg-slate-900/40 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [_jsx("div", { className: "h-5 w-16 animate-pulse rounded-full bg-slate-800/60" }), _jsx("div", { className: "h-4 w-20 animate-pulse rounded-full bg-slate-800/60" })] }), _jsx("div", { className: "h-5 w-3/4 animate-pulse rounded bg-slate-800/60" })] }, `session-skeleton-${idx}`)))) : continueSessions.length > 0 ? (continueSessions.map((session, idx) => (_jsxs("button", { onClick: e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                void handleContinueSession(session);
                                            }, onKeyDown: e => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    void handleContinueSession(session);
                                                }
                                            }, className: "group w-full cursor-pointer rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-left transition hover:border-slate-600/60 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50", style: { pointerEvents: 'auto', zIndex: 10 }, children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-400", children: [_jsx("span", { className: `rounded-full px-2 py-0.5 text-[11px] ${session.type === 'Research'
                                                                ? 'bg-purple-500/20 text-purple-300'
                                                                : session.type === 'Trade'
                                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                                    : 'bg-blue-500/20 text-blue-200'}`, children: session.type }), _jsx("span", { children: formatDistanceToNow(session.timestamp, { addSuffix: true }) })] }), _jsx("div", { className: "mt-2 text-sm font-medium text-slate-100 group-hover:text-white", children: session.title })] }, idx)))) : (_jsx("div", { className: "rounded-xl border border-dashed border-slate-700/60 px-4 py-6 text-center text-xs text-slate-500", children: "We\u2019ll keep your auto-snapshots here for quick handoffs." })) })] }), _jsxs(motion.div, { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.1, duration: 0.4 }, className: "rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 shadow-lg", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300", children: [_jsx(Pin, { size: 16 }), "Recent Workspaces"] }), _jsx("div", { className: "space-y-2", children: loadingWorkspaces ? (workspaceSkeletons.map((_, idx) => (_jsx(motion.div, { initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 }, transition: { delay: idx * 0.08, duration: 0.3 }, className: "flex h-14 w-full items-center rounded-xl border border-slate-800/60 bg-slate-900/40 p-3", children: _jsx("div", { className: "h-4 w-2/3 animate-pulse rounded bg-slate-800/60" }) }, `workspace-skeleton-${idx}`)))) : recentWorkspaces.length > 0 ? (recentWorkspaces.map(workspace => (_jsxs("button", { onClick: e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                navigate(`/w/${workspace.id}`);
                                            }, onKeyDown: e => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    navigate(`/w/${workspace.id}`);
                                                }
                                            }, className: "flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-slate-600/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50", style: { pointerEvents: 'auto', zIndex: 10 }, children: [_jsx("span", { className: "truncate", children: workspace.name }), _jsx("span", { className: "text-xs text-slate-500", children: "Open" })] }, workspace.id)))) : (_jsx("div", { className: "rounded-xl border border-dashed border-slate-700/60 px-4 py-6 text-center text-xs text-slate-500", children: "Create a workspace to keep your Redix graph evolving." })) })] }), _jsxs(motion.div, { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.2, duration: 0.4 }, className: "overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 via-emerald-900/70 to-emerald-950/90 p-5 text-emerald-100 shadow-lg shadow-emerald-900/50", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx("span", { className: "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10", children: _jsx(Leaf, { size: 16 }) }), "Eco Scoreboard"] }), _jsxs("div", { className: "text-right text-xs text-emerald-200/70", children: [_jsx("div", { className: "uppercase tracking-[0.3em] text-emerald-300/60", children: "Eco score" }), _jsx("div", { className: "text-xl font-semibold text-emerald-100", children: ecoGauge.clampedScore })] })] }), _jsxs("div", { className: "mt-5 grid gap-5 md:grid-cols-[150px,1fr]", children: [_jsxs("div", { className: "relative mx-auto flex h-36 w-36 items-center justify-center", children: [_jsxs("svg", { width: "150", height: "150", viewBox: "0 0 150 150", className: "absolute inset-0 text-emerald-500/40", children: [_jsx("circle", { cx: "75", cy: "75", r: ecoGauge.radius, stroke: "currentColor", strokeWidth: "10", fill: "none", className: "opacity-30" }), _jsx(motion.circle, { cx: "75", cy: "75", r: ecoGauge.radius, stroke: "url(#ecoGradient)", strokeWidth: "10", strokeLinecap: "round", fill: "none", strokeDasharray: ecoGauge.circumference, strokeDashoffset: ecoGauge.offset, initial: { strokeDashoffset: ecoGauge.circumference }, animate: { strokeDashoffset: ecoGauge.offset }, transition: { duration: 0.8, ease: 'easeOut' }, transform: "rotate(-90 75 75)" }), _jsx("defs", { children: _jsxs("linearGradient", { id: "ecoGradient", x1: "0%", y1: "0%", x2: "100%", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "#34d399" }), _jsx("stop", { offset: "100%", stopColor: "#22d3ee" })] }) })] }), _jsxs("div", { className: "relative z-10 text-center", children: [_jsx(GaugeCircle, { size: 28, className: "mx-auto text-emerald-300" }), _jsx("div", { className: "mt-2 text-3xl font-semibold text-emerald-50", children: ecoGauge.clampedScore }), _jsx("div", { className: "text-[11px] uppercase tracking-[0.28em] text-emerald-200/70", children: "Regenerative" })] })] }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "grid grid-cols-3 gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4 text-xs text-emerald-100/80", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.28em] text-emerald-200/70", children: "Battery" }), _jsx("p", { className: "mt-2 text-lg font-semibold text-emerald-50", children: ecoStats.batteryPct })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.28em] text-emerald-200/70", children: "Carbon" }), _jsx("p", { className: "mt-2 text-sm font-semibold leading-tight text-emerald-50", children: ecoStats.carbonIntensity })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[11px] uppercase tracking-[0.28em] text-emerald-200/70", children: "Active Tabs" }), _jsx("p", { className: "mt-2 text-lg font-semibold text-emerald-50", children: ecoStats.activeTabs })] })] }), _jsx("div", { className: "space-y-2", children: ecoMetrics.achievements.map(achievement => {
                                                            const Icon = achievement.icon;
                                                            return (_jsxs("div", { className: "flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100/80", children: [_jsx("span", { className: `mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl border ${achievement.achieved
                                                                            ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                                                            : 'border-emerald-400/20 bg-emerald-500/5 text-emerald-200/60'}`, children: achievement.achieved ? _jsx(CheckCircle2, { size: 14 }) : _jsx(Icon, { size: 14 }) }), _jsxs("div", { children: [_jsx("div", { className: "font-semibold text-emerald-100", children: achievement.label }), _jsx("div", { className: "mt-1 text-[11px] text-emerald-200/70", children: achievement.description })] })] }, achievement.id));
                                                        }) }), _jsxs("div", { className: "rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-xs text-emerald-100/80", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "font-semibold text-emerald-100", children: "Trends" }), _jsxs("span", { className: "text-[11px] uppercase tracking-[0.28em] text-emerald-200/70", children: ["Last ", Math.min(efficiencyHistory.length, 24), " samples"] })] }), _jsxs("div", { className: "mt-3 grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-emerald-100", children: ["Battery", ecoHistoryInsights.battery.trend.direction === 'up' ? (_jsx(TrendingUp, { size: 12, className: "text-emerald-300" })) : ecoHistoryInsights.battery.trend.direction === 'down' ? (_jsx(TrendingDown, { size: 12, className: "text-amber-300" })) : null, _jsxs("span", { className: "text-[11px] text-emerald-200/70", children: [ecoHistoryInsights.battery.trend.delta > 0
                                                                                                ? `+${ecoHistoryInsights.battery.trend.delta.toFixed(1)}`
                                                                                                : ecoHistoryInsights.battery.trend.delta.toFixed(1), "%"] })] }), _jsx("div", { className: "relative h-16 overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-500/10", children: ecoHistoryInsights.battery.path ? (_jsx("svg", { viewBox: "0 0 100 100", className: "absolute inset-0 h-full w-full text-emerald-300", children: _jsx("polyline", { fill: "none", stroke: "currentColor", strokeWidth: "3", points: ecoHistoryInsights.battery.path }) })) : (_jsx("div", { className: "flex h-full items-center justify-center text-[11px] text-emerald-200/60", children: "Not enough data" })) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-emerald-100", children: ["Carbon", ecoHistoryInsights.carbon.trend.direction === 'down' ? (_jsx(TrendingDown, { size: 12, className: "text-emerald-300" })) : ecoHistoryInsights.carbon.trend.direction === 'up' ? (_jsx(TrendingUp, { size: 12, className: "text-amber-300" })) : null, _jsxs("span", { className: "text-[11px] text-emerald-200/70", children: [ecoHistoryInsights.carbon.trend.delta > 0
                                                                                                ? `+${ecoHistoryInsights.carbon.trend.delta.toFixed(0)}`
                                                                                                : ecoHistoryInsights.carbon.trend.delta.toFixed(0), ' ', "g"] })] }), _jsx("div", { className: "relative h-16 overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-500/10", children: ecoHistoryInsights.carbon.path ? (_jsx("svg", { viewBox: "0 0 100 100", className: "absolute inset-0 h-full w-full text-emerald-200", children: _jsx("polyline", { fill: "none", stroke: "currentColor", strokeWidth: "3", points: ecoHistoryInsights.carbon.path }) })) : (_jsx("div", { className: "flex h-full items-center justify-center text-[11px] text-emerald-200/60", children: "Awaiting carbon samples" })) })] })] })] })] })] }), efficiencyUpdated && (_jsxs("p", { className: "mt-5 text-[11px] text-emerald-100/60", children: ["Updated ", formatDistanceToNow(efficiencyUpdated, { addSuffix: true })] })), _jsxs("p", { className: "mt-1 text-[11px] text-emerald-100/70", children: [efficiencyLabel, efficiencyBadge ? ` • ${efficiencyBadge}` : ''] })] })] })] }), _jsx(AIResponsePane, { query: aiQuery, isOpen: aiResponseOpen, onClose: () => {
                    setAiResponseOpen(false);
                    setAiQuery('');
                } })] }));
}
