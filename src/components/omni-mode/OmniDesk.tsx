/**
 * OmniDesk - Central dashboard for empty state (no tabs open)
 * Think: ChatGPT home + Arc Spaces + Obsidian Quick Launch
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Sparkles,
  Search,
  FileText,
  Workflow,
  Clock,
  Pin,
  RefreshCw,
  Leaf,
  Compass,
  Bot,
  GaugeCircle,
  BatteryCharging,
  Cloud,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ClipboardCopy,
  FileSearch,
  Sparkle,
  Loader2,
} from 'lucide-react';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { ipc } from '../lib/ipc-typed';
import { useNavigate } from 'react-router-dom';
import { ipcEvents } from '../lib/ipc-events';
import { AIResponsePane } from '../ai/AIResponsePane';
import { useEfficiencyStore } from '../state/efficiencyStore';
import { useWorkspaceEventsStore } from '../state/workspaceEventsStore';
import { useAgentStreamStore, type StreamStatus } from '../state/agentStreamStore';
import { createFallbackTab } from '../lib/tabFallback';
import { ChromeNewTabPage } from '../ChromeNewTab/ChromeNewTabPage';
import { useSettingsStore } from '../state/settingsStore';
// import { CardSkeleton, ListSkeleton } from './common/Skeleton'; // Reserved for future use

type OmniDeskVariant = 'overlay' | 'split';

interface OmniDeskProps {
  variant?: OmniDeskVariant;
  forceShow?: boolean;
  useChromeStyle?: boolean;
}

type ContinueSession = {
  id?: string;
  type: string;
  title: string;
  url?: string;
  timestamp: number;
  sessionId?: string;
};

type Workspace = {
  id: string;
  name: string;
};

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

function buildSearchUrl(query: string, language?: string) {
  // Use Startpage by default (iframe-friendly and privacy-focused)
  return buildSearchUrlWithLang('startpage', query, language, true);
}

function useDashboardData() {
  const [recentWorkspaces, setRecentWorkspaces] = useState<Workspace[]>([]);
  const [continueSessions, setContinueSessions] = useState<ContinueSession[]>([]);
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
      const workspaces = (workspaceResult as any)?.workspaces || [];
      setRecentWorkspaces(workspaces.slice(0, 4));
      setLoadingWorkspaces(false);
    } catch {
      setRecentWorkspaces([]);
      setLoadingWorkspaces(false);
    }

    try {
      const sessionsResult = await ipc.sessions.list();
      const sessions = Array.isArray(sessionsResult) ? (sessionsResult as any[]) : [];
      const continueItems: ContinueSession[] = sessions.slice(0, 3).map((session: any) => ({
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
      } else {
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
    } catch {
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
      if (cancelled) return;
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

export function OmniDesk({
  variant = 'overlay',
  forceShow = false,
  useChromeStyle: _useChromeStyle = false,
}: OmniDeskProps) {
  const { tabs, activeId } = useTabsStore();
  const { setMode } = useAppStore();
  const navigate = useNavigate();
  const { recentWorkspaces, continueSessions, reload, loadingWorkspaces, loadingSessions } =
    useDashboardData();
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
    const statusPalette: Record<string, { label: string; tone: string }> = {
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

    const timeline = latestEvents.map((event: any) => {
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
            detail:
              event.content ??
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
      .map((entry: any) => entry.detail)
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
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  const handleCopyTranscript = useCallback(async () => {
    if (!hasTranscript || typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyStatus('error');
      return;
    }
    try {
      setCopyStatus('copying');
      await navigator.clipboard.writeText(agentTranscript.trim());
      setCopyStatus('copied');
    } catch (error) {
      console.warn('[OmniDesk] Failed to copy transcript', error);
      setCopyStatus('error');
    }
  }, [agentTranscript, hasTranscript]);

  useEffect(() => {
    if (copyStatus !== 'copied') return;
    const timeout = window.setTimeout(() => setCopyStatus('idle'), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  const ecoMetrics = useMemo(() => {
    const batteryPctValue =
      typeof efficiencySnapshot.batteryPct === 'number'
        ? Math.max(0, Math.min(100, Math.round(efficiencySnapshot.batteryPct)))
        : null;
    const carbonIntensityValue =
      typeof efficiencySnapshot.carbonIntensity === 'number'
        ? Math.max(0, Math.round(efficiencySnapshot.carbonIntensity))
        : null;
    const cpuLoad = Number.isFinite(efficiencySnapshot.cpuLoad1)
      ? Math.max(0, Math.min(100, Math.round(efficiencySnapshot.cpuLoad1)))
      : 0;
    const activeTabs = efficiencySnapshot.activeTabs ?? 0;
    const ecoScore = (() => {
      const batteryComponent = batteryPctValue !== null ? batteryPctValue * 0.4 : 35;
      const cpuComponent = 100 - cpuLoad;
      const carbonComponent =
        carbonIntensityValue !== null ? (Math.max(0, 220 - carbonIntensityValue) / 220) * 100 : 50;
      const tabComponent = (Math.max(0, 12 - activeTabs) / 12) * 100;
      const raw =
        0.35 * batteryComponent +
        0.25 * cpuComponent +
        0.25 * carbonComponent +
        0.15 * tabComponent;
      return Math.round(Math.max(5, Math.min(98, raw)));
    })();

    const achievements = [
      {
        id: 'battery',
        label:
          batteryPctValue !== null
            ? `${batteryPctValue}% battery reserve`
            : 'Gathering battery telemetry',
        description:
          batteryPctValue !== null && batteryPctValue >= 60
            ? 'Great reserve for deep work.'
            : 'Stay plugged in to build reserve.',
        achieved: batteryPctValue !== null && batteryPctValue >= 60,
        icon: BatteryCharging,
      },
      {
        id: 'carbon',
        label:
          carbonIntensityValue !== null
            ? `${carbonIntensityValue} gCO₂/kWh grid intensity`
            : 'Estimating regional carbon mix',
        description:
          carbonIntensityValue !== null && carbonIntensityValue <= 180
            ? 'Low-carbon window — ideal for heavy tasks.'
            : 'Carbon intensity elevated. Schedule net-heavy work later.',
        achieved: carbonIntensityValue !== null && carbonIntensityValue <= 180,
        icon: Cloud,
      },
      {
        id: 'tabs',
        label: `${activeTabs} active tabs`,
        description:
          activeTabs <= 6
            ? 'Lean session profile — memory savings unlocked.'
            : 'Consider Hibernate to free resources.',
        achieved: activeTabs <= 6,
        icon: Sparkles,
      },
    ] as const;

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
      .filter((value): value is number => value !== null);
    const carbonSeries = recent
      .map(sample => (typeof sample.carbonIntensity === 'number' ? sample.carbonIntensity : null))
      .filter((value): value is number => value !== null);

    const computeTrend = (series: number[]) => {
      if (series.length < 2) return { delta: 0, direction: 'flat' as const };
      const last = series[series.length - 1];
      const baseIndex = Math.max(0, series.length - 6);
      const previous = series[baseIndex];
      const delta = last - previous;
      return {
        delta,
        direction: delta > 1 ? ('up' as const) : delta < -1 ? ('down' as const) : ('flat' as const),
      };
    };

    const computeSparkline = (series: number[]) => {
      if (series.length < 2) return '';
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

  const agentStatusLabels: Record<StreamStatus, string> = {
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
    const carbonIntensity =
      ecoMetrics.carbonIntensityValue !== null
        ? `${ecoMetrics.carbonIntensityValue} gCO₂/kWh`
        : 'Syncing…';
    const activeTabs = `${ecoMetrics.activeTabs}`;
    return { batteryPct, carbonIntensity, activeTabs };
  }, [ecoMetrics]);

  const handleContinueSession = async (session: any) => {
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
            const activeTab = tabs.find((t: any) => t.active);
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
        } catch (error) {
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
    } catch (error) {
      console.error('Failed to continue session:', error);
      // Last resort: create a blank tab
      try {
        await ipc.tabs.create('about:blank');
        pushWorkspaceEvent({
          type: 'workspace:resume-session',
          workspaceId: session.sessionId ?? null,
          message: `Started fallback tab for session "${session.title}"`,
        });
      } catch (e) {
        console.error('Failed to create fallback tab:', e);
      }
    }
  };

  const handleSearchLaunch = useCallback(
    async (value: string) => {
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
      const isAIQuery =
        query.trim().startsWith('@live') ||
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
      const isQuestion = /^(what|why|how|when|where|who|explain|summarize|compare|find)/i.test(
        query.trim()
      );
      if (isQuestion && query.trim().length > 10) {
        // Show AI response pane for question-like queries
        setAiQuery(query);
        setAiResponseOpen(true);
        // Don't return - also open search results
      }

      // Use the active tab if it's about:blank, otherwise create a new tab
      const activeTab = tabs.find(tab => tab.id === activeId);
      const isAboutBlank =
        activeTab?.url === 'about:blank' || !activeTab?.url || activeTab?.url?.startsWith('about:');

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
          } catch (navError) {
            // If navigation fails, fall through to create new tab
            console.warn('[OmniDesk] Failed to navigate existing tab, creating new one:', navError);
          }
        }

        // Create a new tab with the search URL
        console.log('[OmniDesk] Creating new tab with URL:', targetUrl);
        const result = await ipc.tabs.create(targetUrl);
        const success =
          result && typeof result === 'object' && 'success' in result
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
        } else {
          console.log('[OmniDesk] Tab created successfully:', result);
        }
        setSearchQuery('');
      } catch (error) {
        console.error('[OmniDesk] Search launch error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Try fallback tab creation
        try {
          createFallbackTab({ url: targetUrl, title: `Search: ${query}` });
        } catch (fallbackError) {
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
      } finally {
        setSearchLoading(false);
      }
    },
    [pushWorkspaceEvent, setMode, tabs, activeId, searchLoading]
  );

  // Show dashboard if forced, no tabs, or active tab is about:blank (search page)
  const activeTabForDisplay = tabs.find(tab => tab.id === activeId);
  const isAboutBlankDisplay =
    activeTabForDisplay?.url === 'about:blank' ||
    !activeTabForDisplay?.url ||
    activeTabForDisplay?.url?.startsWith('about:') ||
    activeTabForDisplay?.url?.startsWith('ob://newtab') ||
    activeTabForDisplay?.url?.startsWith('ob://home');
  const shouldShowDashboard =
    forceShow || tabs.length === 0 || !activeTabForDisplay || isAboutBlankDisplay;

  if (!shouldShowDashboard) return null;

  // Show Chrome-style new tab page by default (replacing OmniDesk)
  // Only show OmniDesk if explicitly disabled
  if (chromeStyleEnabled !== false) {
    return <ChromeNewTabPage />;
  }

  const containerClass =
    variant === 'overlay'
      ? 'absolute inset-0 z-20 flex h-full w-full overflow-auto bg-gradient-to-br from-[#131722] via-[#171B2A] to-[#10131C] px-6 py-8'
      : variant === 'split'
        ? 'flex h-full w-full overflow-auto bg-gradient-to-br from-[#131722] via-[#171B2A] to-[#10131C] px-6 py-8'
        : 'flex h-full w-full overflow-auto bg-gradient-to-br from-[#0F121C] via-[#131827] to-[#0F121C] px-6 py-8';

  // Ensure container is properly sized and visible
  // Note: z-index 20 is below TabStrip (z-50) to ensure tabs are always clickable
  const containerStyle = {
    minHeight: '100%',
    width: '100%',
    position: variant === 'overlay' ? ('absolute' as const) : ('relative' as const),
    zIndex: variant === 'overlay' ? 20 : 1,
    pointerEvents: shouldShowDashboard ? ('auto' as const) : ('none' as const), // Only allow pointer events when visible
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
      pushWorkspaceEvent({ type: 'workspace:manual-refresh', message: 'Dashboard refreshed' });
    } finally {
      setRefreshing(false);
    }
  };

  const sessionSkeletons = useMemo(() => Array.from({ length: 2 }), []);
  const workspaceSkeletons = useMemo(() => Array.from({ length: 3 }), []);

  // Debug: Log when dashboard should show (only in dev)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).IS_DEV !== undefined) {
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

  return (
    <div className={containerClass} data-onboarding="dashboard" style={containerStyle}>
      <div
        className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 xl:flex-row"
        style={{ minHeight: '100%' }}
      >
        <div className="flex-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-slate-800/70 bg-slate-900/70 px-6 py-7 shadow-2xl shadow-black/30"
          >
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-slate-400">
              Regenerative Command Center
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-50 sm:text-4xl lg:text-5xl">
              Guide your next deep work session with Regen & Redix
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-300">
              Spin up an agent, resume an exploration, or launch a new search. Your flow state
              starts here.
            </p>

            <form
              className="mt-6 space-y-3"
              onSubmit={event => {
                event.preventDefault();
                void handleSearchLaunch(searchQuery);
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex min-h-[52px] flex-1 items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/70 px-4 py-3 text-slate-200 focus-within:border-blue-500/60">
                  <Search size={18} className="text-blue-400" />
                  <input
                    id="omnidesk-search"
                    name="omnidesk-search"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSearchLaunch(searchQuery);
                      }
                    }}
                    onClick={e => {
                      e.stopPropagation();
                    }}
                    placeholder="Search the open web, knowledge base, or ask Redix…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                    autoFocus={false}
                    tabIndex={0}
                    aria-label="Search the open web, knowledge base, or ask Redix"
                    aria-describedby="search-hint"
                    role="searchbox"
                  />
                  <span id="search-hint" className="sr-only">
                    Press Enter to search or launch flow. Use @live or @ask prefix for AI queries.
                  </span>
                </div>
                <button
                  type="submit"
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleSearchLaunch(searchQuery);
                  }}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-500/60 bg-blue-500/20 px-5 py-3 text-sm font-semibold text-blue-100 shadow-[0_10px_40px_-20px_rgba(59,130,246,0.8)] transition hover:border-blue-400 hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ pointerEvents: 'auto', zIndex: 10 }}
                  aria-label={searchLoading ? 'Launching search' : 'Launch search flow'}
                  aria-busy={searchLoading}
                >
                  {searchLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Launching...</span>
                    </>
                  ) : (
                    'Launch Flow'
                  )}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                {suggestedPrompts.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (searchLoading) return;
                      setSearchQuery(prompt);
                      void handleSearchLaunch(prompt);
                    }}
                    disabled={searchLoading}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setSearchQuery(prompt);
                        void handleSearchLaunch(prompt);
                      }
                    }}
                    className="cursor-pointer rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 transition hover:border-blue-500/50 hover:bg-slate-800/80 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                    aria-label={`Suggested search: ${prompt}`}
                    tabIndex={0}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {quickActions.map(action => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (searchLoading) return;
                    void action.action();
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (searchLoading) return;
                      void action.action();
                    }
                  }}
                  disabled={searchLoading}
                  whileHover={searchLoading ? {} : { y: -4, scale: 1.02 }}
                  whileTap={searchLoading ? {} : { scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className={`group flex h-full cursor-pointer flex-col justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 px-5 py-6 text-left shadow-[0_12px_40px_-24px_rgba(15,23,42,0.9)] transition hover:border-slate-700/70 hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${searchLoading ? 'cursor-not-allowed opacity-60' : ''}`}
                  style={{ pointerEvents: 'auto', zIndex: 10 }}
                  aria-label={
                    action.description ? `${action.label}: ${action.description}` : action.label
                  }
                  tabIndex={0}
                >
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-[0_15px_30px_-20px_currentColor]`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-100 group-hover:text-white">
                      {action.label}
                    </div>
                    {action.description ? (
                      <p className="text-xs leading-snug text-slate-400 group-hover:text-slate-300">
                        {action.description}
                      </p>
                    ) : null}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.4 }}
            className="rounded-3xl border border-violet-500/30 bg-violet-500/10 px-6 py-5 text-violet-100 shadow-[0_45px_120px_-60px_rgba(139,92,246,0.6)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/40 bg-violet-500/20">
                  <Bot size={16} />
                </span>
                Live Redix Pulse
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] ${agentPreview.statusTone.tone}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {agentStatusLabels[agentStatus]}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm text-purple-100/90">
              {agentLastGoal ? (
                <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-xs text-purple-100/80">
                  <span className="text-[11px] uppercase tracking-[0.28em] text-purple-200/70">
                    Last goal
                  </span>
                  <p className="mt-2 text-sm text-purple-100">{agentLastGoal}</p>
                </div>
              ) : null}

              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-4">
                <span className="text-[11px] uppercase tracking-[0.3em] text-purple-200/70">
                  Preview
                </span>
                <div className="mt-2 text-xs text-purple-100/80">
                  <AnimatePresence mode="popLayout">
                    {agentPreview.snippet.length > 0 ? (
                      agentPreview.snippet.map((line: any, index: number) => (
                        <motion.p
                          key={`${line}-${index}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                          className="leading-relaxed"
                        >
                          {line}
                        </motion.p>
                      ))
                    ) : (
                      <motion.p
                        initial={{ opacity: 0.6 }}
                        animate={{ opacity: 1 }}
                        className="text-purple-200/70"
                      >
                        No live transcript yet. Kick off a prompt to watch the agent stream.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleCopyTranscript}
                  disabled={!hasTranscript || copyStatus === 'copying'}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-medium text-purple-100 transition hover:border-violet-300/60 hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ClipboardCopy size={12} />
                  {copyStatus === 'copied'
                    ? 'Copied!'
                    : copyStatus === 'copying'
                      ? 'Copying…'
                      : 'Copy transcript'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/agent')}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-medium text-purple-100 transition hover:border-violet-300/60 hover:bg-violet-500/25"
                >
                  <FileSearch size={12} />
                  View run log
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/agent')}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 font-medium text-purple-100 transition hover:border-violet-300/60 hover:bg-violet-500/25"
                >
                  <Sparkle size={12} />
                  Launch prompt
                </button>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-[0.28em] text-purple-200/70">
                  Timeline
                </span>
                <div className="mt-2 space-y-2">
                  <AnimatePresence initial={false}>
                    {agentPreview.timeline.length > 0 ? (
                      agentPreview.timeline.map((event: any) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-[11px] ${event.variant}`}
                        >
                          <span className="capitalize">{event.label}</span>
                          <span className="text-purple-300/70">
                            {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                          </span>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-xl border border-dashed border-violet-400/30 px-4 py-3 text-[11px] text-purple-200/70"
                      >
                        No agent events yet — run a plan or quick prompt to populate this stream.
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs">
              <div className="text-purple-200/60">
                {agentPreview.lastUpdated
                  ? `Updated ${formatDistanceToNow(agentPreview.lastUpdated, { addSuffix: true })}`
                  : 'Awaiting first signal'}
              </div>
              <button
                type="button"
                onClick={() => navigate('/agent')}
                className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-purple-100 hover:border-violet-300/60 hover:bg-violet-500/30"
              >
                Open agent console
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-3xl border border-slate-800/60 bg-slate-900/60 px-6 py-5 shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <Compass size={16} className="text-slate-300" />
              <span>Pro tip:</span>
              <span className="text-slate-300">
                Drag any research tab into Redix MindMap to instantly connect ideas.
              </span>
            </div>
          </motion.div>
        </div>

        <aside className="w-full flex-shrink-0 space-y-4 xl:w-[360px]">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-300">
              <div className="flex items-center gap-2">
                <Clock size={16} />
                Continue Session
              </div>
              <button
                onClick={handleManualRefresh}
                className="rounded-full border border-slate-700/60 p-1.5 text-slate-400 transition hover:border-slate-500/60 hover:text-slate-200"
                title="Refresh"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="space-y-3">
              {loadingSessions ? (
                sessionSkeletons.map((_, idx) => (
                  <motion.div
                    key={`session-skeleton-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                    className="h-[86px] w-full rounded-xl border border-slate-800/60 bg-slate-900/40 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-5 w-16 animate-pulse rounded-full bg-slate-800/60" />
                      <div className="h-4 w-20 animate-pulse rounded-full bg-slate-800/60" />
                    </div>
                    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-800/60" />
                  </motion.div>
                ))
              ) : continueSessions.length > 0 ? (
                continueSessions.map((session, idx) => (
                  <button
                    key={idx}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleContinueSession(session);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleContinueSession(session);
                      }
                    }}
                    className="group w-full cursor-pointer rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-left transition hover:border-slate-600/60 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                  >
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] ${
                          session.type === 'Research'
                            ? 'bg-purple-500/20 text-purple-300'
                            : session.type === 'Trade'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-blue-500/20 text-blue-200'
                        }`}
                      >
                        {session.type}
                      </span>
                      <span>{formatDistanceToNow(session.timestamp, { addSuffix: true })}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-100 group-hover:text-white">
                      {session.title}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700/60 px-4 py-6 text-center text-xs text-slate-500">
                  We’ll keep your auto-snapshots here for quick handoffs.
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 shadow-lg"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Pin size={16} />
              Recent Workspaces
            </div>
            <div className="space-y-2">
              {loadingWorkspaces ? (
                workspaceSkeletons.map((_, idx) => (
                  <motion.div
                    key={`workspace-skeleton-${idx}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.3 }}
                    className="flex h-14 w-full items-center rounded-xl border border-slate-800/60 bg-slate-900/40 p-3"
                  >
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800/60" />
                  </motion.div>
                ))
              ) : recentWorkspaces.length > 0 ? (
                recentWorkspaces.map(workspace => (
                  <button
                    key={workspace.id}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/w/${workspace.id}`);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/w/${workspace.id}`);
                      }
                    }}
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-slate-600/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                  >
                    <span className="truncate">{workspace.name}</span>
                    <span className="text-xs text-slate-500">Open</span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700/60 px-4 py-6 text-center text-xs text-slate-500">
                  Create a workspace to keep your Redix graph evolving.
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 via-emerald-900/70 to-emerald-950/90 p-5 text-emerald-100 shadow-lg shadow-emerald-900/50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-500/10">
                  <Leaf size={16} />
                </span>
                Eco Scoreboard
              </div>
              <div className="text-right text-xs text-emerald-200/70">
                <div className="uppercase tracking-[0.3em] text-emerald-300/60">Eco score</div>
                <div className="text-xl font-semibold text-emerald-100">
                  {ecoGauge.clampedScore}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[150px,1fr]">
              <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
                <svg
                  width="150"
                  height="150"
                  viewBox="0 0 150 150"
                  className="absolute inset-0 text-emerald-500/40"
                >
                  <circle
                    cx="75"
                    cy="75"
                    r={ecoGauge.radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="none"
                    className="opacity-30"
                  />
                  <motion.circle
                    cx="75"
                    cy="75"
                    r={ecoGauge.radius}
                    stroke="url(#ecoGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={ecoGauge.circumference}
                    strokeDashoffset={ecoGauge.offset}
                    initial={{ strokeDashoffset: ecoGauge.circumference }}
                    animate={{ strokeDashoffset: ecoGauge.offset }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    transform="rotate(-90 75 75)"
                  />
                  <defs>
                    <linearGradient id="ecoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="relative z-10 text-center">
                  <GaugeCircle size={28} className="mx-auto text-emerald-300" />
                  <div className="mt-2 text-3xl font-semibold text-emerald-50">
                    {ecoGauge.clampedScore}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">
                    Regenerative
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4 text-xs text-emerald-100/80">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">
                      Battery
                    </p>
                    <p className="mt-2 text-lg font-semibold text-emerald-50">
                      {ecoStats.batteryPct}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">
                      Carbon
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-tight text-emerald-50">
                      {ecoStats.carbonIntensity}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">
                      Active Tabs
                    </p>
                    <p className="mt-2 text-lg font-semibold text-emerald-50">
                      {ecoStats.activeTabs}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {ecoMetrics.achievements.map(achievement => {
                    const Icon = achievement.icon;
                    return (
                      <div
                        key={achievement.id}
                        className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100/80"
                      >
                        <span
                          className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl border ${
                            achievement.achieved
                              ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                              : 'border-emerald-400/20 bg-emerald-500/5 text-emerald-200/60'
                          }`}
                        >
                          {achievement.achieved ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                        </span>
                        <div>
                          <div className="font-semibold text-emerald-100">{achievement.label}</div>
                          <div className="mt-1 text-[11px] text-emerald-200/70">
                            {achievement.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-xs text-emerald-100/80">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-emerald-100">Trends</div>
                    <span className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">
                      Last {Math.min(efficiencyHistory.length, 24)} samples
                    </span>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-100">
                        Battery
                        {ecoHistoryInsights.battery.trend.direction === 'up' ? (
                          <TrendingUp size={12} className="text-emerald-300" />
                        ) : ecoHistoryInsights.battery.trend.direction === 'down' ? (
                          <TrendingDown size={12} className="text-amber-300" />
                        ) : null}
                        <span className="text-[11px] text-emerald-200/70">
                          {ecoHistoryInsights.battery.trend.delta > 0
                            ? `+${ecoHistoryInsights.battery.trend.delta.toFixed(1)}`
                            : ecoHistoryInsights.battery.trend.delta.toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="relative h-16 overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-500/10">
                        {ecoHistoryInsights.battery.path ? (
                          <svg
                            viewBox="0 0 100 100"
                            className="absolute inset-0 h-full w-full text-emerald-300"
                          >
                            <polyline
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              points={ecoHistoryInsights.battery.path}
                            />
                          </svg>
                        ) : (
                          <div className="flex h-full items-center justify-center text-[11px] text-emerald-200/60">
                            Not enough data
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-100">
                        Carbon
                        {ecoHistoryInsights.carbon.trend.direction === 'down' ? (
                          <TrendingDown size={12} className="text-emerald-300" />
                        ) : ecoHistoryInsights.carbon.trend.direction === 'up' ? (
                          <TrendingUp size={12} className="text-amber-300" />
                        ) : null}
                        <span className="text-[11px] text-emerald-200/70">
                          {ecoHistoryInsights.carbon.trend.delta > 0
                            ? `+${ecoHistoryInsights.carbon.trend.delta.toFixed(0)}`
                            : ecoHistoryInsights.carbon.trend.delta.toFixed(0)}{' '}
                          g
                        </span>
                      </div>
                      <div className="relative h-16 overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-500/10">
                        {ecoHistoryInsights.carbon.path ? (
                          <svg
                            viewBox="0 0 100 100"
                            className="absolute inset-0 h-full w-full text-emerald-200"
                          >
                            <polyline
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              points={ecoHistoryInsights.carbon.path}
                            />
                          </svg>
                        ) : (
                          <div className="flex h-full items-center justify-center text-[11px] text-emerald-200/60">
                            Awaiting carbon samples
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {efficiencyUpdated && (
              <p className="mt-5 text-[11px] text-emerald-100/60">
                Updated {formatDistanceToNow(efficiencyUpdated, { addSuffix: true })}
              </p>
            )}
            <p className="mt-1 text-[11px] text-emerald-100/70">
              {efficiencyLabel}
              {efficiencyBadge ? ` • ${efficiencyBadge}` : ''}
            </p>
          </motion.div>
        </aside>
      </div>

      {/* AI Response Pane */}
      <AIResponsePane
        query={aiQuery}
        isOpen={aiResponseOpen}
        onClose={() => {
          setAiResponseOpen(false);
          setAiQuery('');
        }}
      />
    </div>
  );
}
