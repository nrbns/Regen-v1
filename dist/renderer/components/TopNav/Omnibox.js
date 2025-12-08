import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Omnibox - URL bar with autocomplete suggestions and search
 * Fully functional search and navigation
 */
// @ts-nocheck
import { forwardRef, useState, useEffect, useRef, useCallback, useMemo, useImperativeHandle, } from 'react';
import { Search, Lock, Shield, AlertCircle, Globe, Calculator, Sparkles, Clock, ArrowLeft, ArrowRight, RotateCcw, } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { ipcEvents } from '../../lib/ipc-events';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { debounce } from 'lodash-es';
import { useContainerStore } from '../../state/containerStore';
import { isElectronRuntime, isDevEnv } from '../../lib/env';
import { useSettingsStore } from '../../state/settingsStore';
import { buildSearchUrl as buildSearchUrlWithLang, normalizeInputToUrlOrSearch, } from '../../lib/search';
const IS_DEV = isDevEnv();
// SEARCH_ENDPOINTS removed - using buildSearchUrlWithLang from search.ts instead
// Use the language-aware buildSearchUrl from search.ts
const buildSearchUrl = (engine, query, language) => {
    // Map SearchEngine to provider type
    const providerMap = {
        google: 'google',
        duckduckgo: 'duckduckgo',
        wiki: 'google', // Wikipedia doesn't support language in URL easily
        youtube: 'google',
        twitter: 'google',
    };
    return buildSearchUrlWithLang(providerMap[engine] || 'google', query, language);
};
const formatCalcResult = (expr, result) => {
    if (result === null || Number.isNaN(result) || !Number.isFinite(result)) {
        return null;
    }
    const formatted = Math.abs(result) > 1_000_000 || Math.abs(result) < 0.0001
        ? result.toExponential(6)
        : Number.isInteger(result)
            ? result.toString()
            : result.toPrecision(8).replace(/\.?0+$/, '');
    return `${expr} = ${formatted}`;
};
const evaluateExpression = (raw) => {
    const expr = raw.replace(/,/g, '').trim();
    if (!expr) {
        return null;
    }
    // Only allow safe characters
    // SECURITY FIX: Validate expression strictly - only allow safe math characters
    if (!/^[0-9+\-*/().%\s^]+$/.test(expr)) {
        return null;
    }
    try {
        // SECURITY FIX: Use Function with strict validation (safer than eval)
        // Replace ^ with ** for exponentiation
        const safeExpr = expr.replace(/\^/g, '**');
        // Additional validation: ensure no function calls or dangerous patterns
        if (/[a-zA-Z_$]/.test(safeExpr)) {
            return null; // Reject any variable names or function calls
        }
        // Use Function constructor with strict mode (still requires validation)
        const value = Function(`"use strict"; return (${safeExpr})`)();
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
    }
    catch {
        return null;
    }
    return null;
};
const resolveQuickAction = (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
        return null;
    }
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('/calc')) {
        const expr = trimmed.slice(5).trim();
        const result = expr ? evaluateExpression(expr) : null;
        return { type: 'calc', expr, result: result ?? undefined };
    }
    if (lower.startsWith('/ai')) {
        const prompt = trimmed.slice(3).trim();
        return { type: 'ai', prompt };
    }
    if (lower.startsWith('/g ')) {
        return { type: 'search', engine: 'google', query: trimmed.slice(3).trim() };
    }
    if (lower.startsWith('/ddg ')) {
        return { type: 'search', engine: 'duckduckgo', query: trimmed.slice(5).trim() };
    }
    if (lower.startsWith('/wiki ')) {
        return { type: 'search', engine: 'wiki', query: trimmed.slice(6).trim() };
    }
    if (lower.startsWith('/yt ')) {
        return { type: 'search', engine: 'youtube', query: trimmed.slice(4).trim() };
    }
    if (lower.startsWith('/t ')) {
        return { type: 'search', engine: 'twitter', query: trimmed.slice(3).trim() };
    }
    if (trimmed.startsWith('?')) {
        return { type: 'agent', prompt: trimmed.slice(1).trim() };
    }
    if (lower.startsWith('ask ')) {
        return { type: 'agent', prompt: trimmed.slice(4).trim() };
    }
    if (trimmed.startsWith('/')) {
        return { type: 'command', command: trimmed.slice(1).trim() };
    }
    return null;
};
const buildSuggestionFromAction = (action, rawInput) => {
    switch (action.type) {
        case 'calc': {
            if (!action.expr) {
                return {
                    type: 'command',
                    title: 'Calculate…',
                    subtitle: 'Enter an expression to evaluate',
                    action,
                };
            }
            const formatted = formatCalcResult(action.expr, action.result ?? null);
            return {
                type: 'command',
                title: `Calculate: ${action.expr}`,
                subtitle: formatted ?? 'Press enter to evaluate',
                action,
            };
        }
        case 'ai':
            return {
                type: 'command',
                title: `Ask AI assistant${action.prompt ? `: ${action.prompt}` : ''}`,
                subtitle: action.prompt ? 'Regen agent' : 'Provide a prompt to continue',
                action,
            };
        case 'agent':
            return {
                type: 'command',
                title: `Ask agent${action.prompt ? `: ${action.prompt}` : ''}`,
                subtitle: 'Query the current page context',
                action,
            };
        case 'search': {
            const engineLabel = action.engine === 'duckduckgo'
                ? 'DuckDuckGo'
                : action.engine === 'wiki'
                    ? 'Wikipedia'
                    : action.engine === 'youtube'
                        ? 'YouTube'
                        : action.engine === 'twitter'
                            ? 'Twitter/X'
                            : 'Google';
            return {
                type: 'search',
                title: `${engineLabel}: ${action.query || rawInput}`,
                subtitle: buildSearchUrl(action.engine, action.query || rawInput, language !== 'auto' ? language : undefined),
                action,
            };
        }
        case 'command':
            return {
                type: 'command',
                title: `Run command: ${action.command || rawInput}`,
                subtitle: 'Press enter to execute via command palette',
                action,
            };
        default:
            return null;
    }
};
const RECENTS_STORAGE_KEY = 'omnibox:recent';
const MAX_RECENTS = 20;
export const Omnibox = forwardRef(({ onCommandPalette, onRedixOpen }, ref) => {
    const { tabs, activeId } = useTabsStore();
    const activeContainerId = useContainerStore(state => state.activeContainerId);
    const language = useSettingsStore(state => state.language || 'auto');
    const isElectron = isElectronRuntime();
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const formatTabsForEvent = (list) => list.map(t => ({
        id: t.id,
        title: t.title || 'New Tab',
        url: t.url || 'about:blank',
        active: Boolean(t.active),
        mode: t.mode,
        containerId: t.containerId,
        containerName: t.containerName,
        containerColor: t.containerColor,
        createdAt: t.createdAt,
        lastActiveAt: t.lastActiveAt,
        sessionId: t.sessionId,
        profileId: t.profileId,
        sleeping: t.sleeping,
    }));
    const [url, setUrl] = useState('');
    const [focused, setFocused] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [siteInfo, setSiteInfo] = useState(null);
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [recentItems, setRecentItems] = useState([]);
    const inputRef = useRef(null);
    const [liveResults, setLiveResults] = useState([]);
    const [liveStatus, setLiveStatus] = useState(null);
    const [shortcutPulse, setShortcutPulse] = useState(false);
    const liveSessionRef = useRef(null);
    const liveUnsubscribeRef = useRef(null);
    const attachIpcListener = useCallback((channel, handler) => {
        const bridge = window?.ipc;
        if (!bridge)
            return;
        if (typeof bridge.on === 'function') {
            bridge.on(channel, handler);
            return;
        }
        if (typeof bridge.addListener === 'function') {
            bridge.addListener(channel, handler);
        }
    }, []);
    const detachIpcListener = useCallback((channel, handler) => {
        const bridge = window?.ipc;
        if (!bridge)
            return;
        if (typeof bridge.removeListener === 'function') {
            bridge.removeListener(channel, handler);
            return;
        }
        if (typeof bridge.off === 'function') {
            bridge.off(channel, handler);
            return;
        }
        if (typeof bridge.removeEventListener === 'function') {
            bridge.removeEventListener(channel, handler);
        }
    }, []);
    useImperativeHandle(ref, () => ({
        focus: (selectAll = true) => {
            const input = inputRef.current;
            if (!input)
                return;
            input.focus();
            if (selectAll) {
                input.select();
            }
            setFocused(true);
            setShortcutPulse(true);
        },
        blur: () => {
            inputRef.current?.blur();
            setFocused(false);
        },
    }), []);
    useEffect(() => {
        if (!shortcutPulse)
            return;
        const timer = setTimeout(() => setShortcutPulse(false), 500);
        return () => clearTimeout(timer);
    }, [shortcutPulse]);
    const activeTab = tabs.find(t => t.id === activeId);
    useEffect(() => {
        try {
            const raw = localStorage.getItem(RECENTS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    setRecentItems(parsed.filter((item) => typeof item?.url === 'string').slice(0, MAX_RECENTS));
                }
            }
        }
        catch (error) {
            console.warn('Failed to restore omnibox recents:', error);
        }
    }, []);
    const rememberRecent = useCallback((title, finalUrl) => {
        if (!finalUrl || finalUrl.startsWith('about:') || finalUrl.startsWith('ob://')) {
            return;
        }
        setRecentItems(prev => {
            const filtered = prev.filter(item => item.url !== finalUrl);
            const next = [
                { title: title || finalUrl, url: finalUrl, timestamp: Date.now() },
                ...filtered,
            ].slice(0, MAX_RECENTS);
            try {
                localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
            }
            catch (error) {
                console.warn('Failed to persist omnibox recents:', error);
            }
            return next;
        });
    }, []);
    const stopLiveSession = useCallback(() => {
        if (liveUnsubscribeRef.current) {
            try {
                liveUnsubscribeRef.current();
            }
            catch {
                // noop
            }
            liveUnsubscribeRef.current = null;
        }
        liveSessionRef.current = null;
    }, []);
    const handleLiveStep = useCallback((step) => {
        if (!step || typeof step !== 'object') {
            return;
        }
        if (step.type === 'status') {
            setLiveStatus(step.value || null);
            return;
        }
        if (step.type === 'result' && step.result) {
            setLiveResults(prev => {
                const existingIndex = prev.findIndex(item => item.url === step.result.url);
                if (existingIndex >= 0) {
                    const updated = prev.slice();
                    updated[existingIndex] = { ...updated[existingIndex], ...step.result };
                    return updated;
                }
                return [...prev, step.result];
            });
            return;
        }
        if (step.type === 'complete') {
            setLiveStatus(current => current ?? 'Live results updated');
            return;
        }
        if (step.type === 'error') {
            setLiveStatus(step.message || 'Live search failed');
            return;
        }
    }, []);
    const startLiveSearch = useCallback(async (query) => {
        const trimmed = query.trim();
        if (!trimmed) {
            return;
        }
        stopLiveSession();
        setLiveResults([]);
        setLiveStatus('Searching…');
        try {
            const session = await ipc.liveSearch.start(trimmed, { maxResults: 10 });
            liveSessionRef.current = session;
            const handler = (_event, step) => {
                handleLiveStep(step);
            };
            attachIpcListener(session.channel, handler);
            liveUnsubscribeRef.current = () => detachIpcListener(session.channel, handler);
        }
        catch (error) {
            console.error('Live search start failed:', error);
            setLiveStatus('Live search failed');
        }
    }, [attachIpcListener, detachIpcListener, handleLiveStep, stopLiveSession]);
    // Phase 1, Day 1: Fix URL bar sync with active tab
    // Listen for tab updates and sync URL bar with active tab
    useIPCEvent('tabs:updated', tabList => {
        const tab = Array.isArray(tabList) ? tabList.find((t) => t.active) : null;
        if (tab && !focused) {
            setUrl(tab.url || '');
            try {
                const urlObj = new URL(tab.url || 'about:blank');
                setSiteInfo({
                    secure: urlObj.protocol === 'https:',
                });
            }
            catch {
                setSiteInfo(null);
            }
        }
    }, [activeId, focused]);
    // Phase 1, Day 1: Also sync when active tab changes or URL updates
    useEffect(() => {
        if (!focused && activeTab) {
            setUrl(activeTab.url || '');
            try {
                if (activeTab.url && !activeTab.url.startsWith('about:')) {
                    const urlObj = new URL(activeTab.url);
                    setSiteInfo({
                        secure: urlObj.protocol === 'https:',
                    });
                }
                else {
                    setSiteInfo(null);
                }
            }
            catch {
                setSiteInfo(null);
            }
        }
    }, [activeTab?.url, activeTab?.id, focused]);
    // Listen for progress updates
    useIPCEvent('tabs:progress', data => {
        if (data.tabId === activeId) {
            setProgress(data.progress);
            setIsLoading(data.progress < 100 && data.progress > 0);
        }
    }, [activeId]);
    // Search suggestions with history and tabs
    const searchSuggestions = useCallback(debounce(async (query) => {
        const normalized = query ?? '';
        const queryLower = normalized.toLowerCase().trim();
        const results = [];
        if (queryLower.startsWith('@live')) {
            setSuggestions([]);
            return;
        }
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        const pushSuggestion = (suggestion, front = false) => {
            if (!suggestion.title)
                return;
            const exists = results.some(item => item.title === suggestion.title &&
                item.subtitle === suggestion.subtitle &&
                item.url === suggestion.url &&
                item.type === suggestion.type);
            if (!exists) {
                if (front) {
                    results.unshift(suggestion);
                }
                else {
                    results.push(suggestion);
                }
            }
        };
        const quickAction = resolveQuickAction(normalized);
        if (quickAction) {
            const quickSuggestion = buildSuggestionFromAction(quickAction, normalized);
            if (quickSuggestion) {
                pushSuggestion(quickSuggestion);
            }
        }
        const trimmed = normalized.trim();
        const shouldSuggestRedix = trimmed.length > 0 && !trimmed.startsWith('@') && !trimmed.startsWith('/');
        if (shouldSuggestRedix &&
            !(quickAction && (quickAction.type === 'agent' || quickAction.type === 'ai'))) {
            pushSuggestion({
                type: 'command',
                title: `Ask @redix: ${trimmed}`,
                subtitle: 'Stream the Redix agent answer inline',
                action: { type: 'agent', prompt: trimmed },
                badge: '@redix',
                icon: 'sparkles',
            }, true);
        }
        else if (!trimmed) {
            const defaultPrompts = [
                activeTab?.title ? `Summarize "${activeTab.title}"` : 'Summarize this tab',
                'Why did regen mode fire?',
                'What related sources am I tracking?',
            ];
            defaultPrompts
                .slice()
                .reverse()
                .forEach((prompt, index) => pushSuggestion({
                type: 'command',
                title: `Ask @redix: ${prompt}`,
                subtitle: index === defaultPrompts.length - 1 ? 'Redix agent' : undefined,
                action: { type: 'agent', prompt },
                badge: '@redix',
                icon: 'sparkles',
            }, true));
        }
        if (queryLower.length > 0 && !queryLower.startsWith('http') && !queryLower.includes('.')) {
            if (!quickAction || quickAction.type !== 'search') {
                pushSuggestion({
                    type: 'search',
                    title: `Search: ${normalized}`,
                    subtitle: buildSearchUrl('google', normalized, language !== 'auto' ? language : undefined),
                    action: { type: 'search', engine: 'google', query: normalized },
                });
            }
            pushSuggestion({
                type: 'search',
                title: `DuckDuckGo: ${normalized}`,
                subtitle: buildSearchUrl('duckduckgo', normalized, language !== 'auto' ? language : undefined),
                action: { type: 'search', engine: 'duckduckgo', query: normalized },
            });
        }
        // Tab matches
        tabs.forEach(tab => {
            const title = tab.title || 'Untitled';
            const tabUrl = tab.url || '';
            if (title.toLowerCase().includes(queryLower) || tabUrl.toLowerCase().includes(queryLower)) {
                pushSuggestion({
                    type: 'tab',
                    title,
                    subtitle: tabUrl || undefined,
                    action: tabUrl ? { type: 'nav', url: tabUrl } : undefined,
                });
            }
        });
        // History search (recent searches when query is empty or short)
        try {
            let history = [];
            if (!offline) {
                if (queryLower.trim().length === 0 || queryLower.length < 2) {
                    try {
                        history = await ipc.history.search('');
                    }
                    catch (error) {
                        if (IS_DEV) {
                            console.warn('History search failed:', error);
                        }
                        history = [];
                    }
                }
                else {
                    try {
                        history = await ipc.history.search(normalized);
                    }
                    catch (error) {
                        if (IS_DEV) {
                            console.warn('History search failed:', error);
                        }
                        history = [];
                    }
                }
            }
            if (Array.isArray(history) && history.length > 0) {
                history.slice(0, 5).forEach((item) => {
                    pushSuggestion({
                        type: 'history',
                        title: item.title || item.url || 'Untitled',
                        subtitle: item.url,
                        action: item.url ? { type: 'nav', url: item.url } : undefined,
                    });
                });
            }
        }
        catch (error) {
            console.warn('History search failed:', error);
        }
        const localRecentMatches = recentItems
            .filter(item => !queryLower ||
            item.title.toLowerCase().includes(queryLower) ||
            item.url.toLowerCase().includes(queryLower))
            .slice(0, 5);
        localRecentMatches.forEach(item => {
            pushSuggestion({
                type: 'history',
                title: item.title,
                subtitle: item.url,
                action: { type: 'nav', url: item.url },
            });
        });
        setSuggestions(results.slice(0, 8));
    }, 150), [tabs, recentItems, activeTab?.id, activeTab?.title]);
    const debouncedLiveSearch = useMemo(() => debounce((searchTerm) => {
        startLiveSearch(searchTerm);
    }, 250), [startLiveSearch]);
    useEffect(() => () => debouncedLiveSearch.cancel(), [debouncedLiveSearch]);
    useEffect(() => () => {
        stopLiveSession();
    }, [stopLiveSession]);
    useEffect(() => {
        const trimmed = url.trim();
        if (trimmed.toLowerCase().startsWith('@live')) {
            const searchTerm = trimmed.replace(/^@live\\s*/i, '').trim();
            if (searchTerm.length < 2) {
                debouncedLiveSearch.cancel();
                setLiveResults([]);
                setLiveStatus('Type at least 2 characters to stream results');
                stopLiveSession();
                return;
            }
            debouncedLiveSearch(searchTerm);
        }
        else {
            debouncedLiveSearch.cancel();
            setLiveResults([]);
            setLiveStatus(null);
            stopLiveSession();
        }
    }, [url, debouncedLiveSearch, stopLiveSession]);
    useEffect(() => {
        const trimmed = url.trim();
        if (!trimmed.toLowerCase().startsWith('@live')) {
            return;
        }
        const searchTerm = trimmed.replace(/^@live\s*/i, '').trim();
        const base = [
            {
                type: 'command',
                title: `Redix Live Search${searchTerm ? ` • ${searchTerm}` : ''}`,
                subtitle: liveStatus ??
                    (searchTerm.length < 2
                        ? 'Type at least 2 characters to begin streaming'
                        : liveResults.length === 0
                            ? 'Streaming results…'
                            : 'Live results ready'),
                interactive: false,
                icon: 'sparkles',
            },
        ];
        liveResults.forEach(result => {
            base.push({
                type: 'search',
                title: result.title || result.url,
                subtitle: result.snippet || result.url,
                url: result.url,
                action: { type: 'nav', url: result.url, title: result.title },
                icon: 'search',
            });
        });
        setSuggestions(base);
    }, [url, liveResults, liveStatus]);
    useEffect(() => {
        if (focused) {
            searchSuggestions(url);
        }
        else {
            setSuggestions([]);
        }
    }, [url, focused, searchSuggestions]);
    useEffect(() => {
        setSelectedIndex(-1);
    }, [suggestions.length]);
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;
            if (modifier && e.key === 'l') {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
            if (modifier && e.key === 'k') {
                e.preventDefault();
                onCommandPalette();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCommandPalette]);
    const navigateToUrl = async (targetUrl, options = {}) => {
        const { background = false, newWindow = false, titleOverride } = options;
        // Normalize URL - use search.ts helper for proper handling
        let finalUrl = targetUrl.trim();
        if (!finalUrl) {
            return;
        }
        // Use normalizeInputToUrlOrSearch for proper URL/search handling
        // This function automatically detects if input is a URL or search query
        // and converts non-URLs to Google search in the user's language
        const normalized = normalizeInputToUrlOrSearch(finalUrl, 'google', language !== 'auto' ? language : undefined);
        if (normalized) {
            finalUrl = normalized;
        }
        const openInBackground = background && !newWindow;
        if (!isElectron) {
            const normalizedTitle = titleOverride || finalUrl;
            const state = useTabsStore.getState();
            const baseTabs = (state.tabs ?? []).map(tab => ({ ...tab }));
            let nextTabs = baseTabs;
            let nextActiveId = state.activeId ?? null;
            if (!state.activeId || baseTabs.length === 0) {
                const newId = `local-${Date.now()}`;
                nextTabs = baseTabs.map(tab => ({ ...tab, active: false }));
                nextTabs.push({
                    id: newId,
                    title: normalizedTitle,
                    url: finalUrl,
                    active: true,
                    mode: 'normal',
                });
                nextActiveId = newId;
            }
            else if (openInBackground) {
                const newId = `local-${Date.now()}`;
                nextTabs = baseTabs.map(tab => ({ ...tab }));
                nextTabs.push({
                    id: newId,
                    title: normalizedTitle,
                    url: finalUrl,
                    active: false,
                    mode: 'normal',
                });
            }
            else {
                nextTabs = baseTabs.map(tab => ({
                    ...tab,
                    title: tab.id === state.activeId ? normalizedTitle : tab.title,
                    url: tab.id === state.activeId ? finalUrl : tab.url,
                    active: tab.id === state.activeId,
                }));
                nextActiveId = state.activeId;
            }
            useTabsStore.setState({ tabs: nextTabs, activeId: nextActiveId });
            ipcEvents.emit('tabs:updated', formatTabsForEvent(nextTabs));
            setFocused(false);
            setSuggestions([]);
            if (!openInBackground) {
                setUrl(finalUrl);
            }
            rememberRecent(normalizedTitle, finalUrl);
            try {
                if (newWindow || openInBackground) {
                    window.open(finalUrl, '_blank', 'noopener,noreferrer');
                }
                else {
                    setUrl(finalUrl);
                }
            }
            catch (error) {
                console.warn('Failed to handle navigation in browser runtime:', error);
            }
            return;
        }
        if (newWindow) {
            try {
                await ipc.private.createWindow({ url: finalUrl });
                setFocused(false);
                setSuggestions([]);
                rememberRecent(titleOverride || finalUrl, finalUrl);
            }
            catch (error) {
                console.error('Failed to open new window for navigation:', error);
            }
            return;
        }
        try {
            if (!window.ipc || typeof window.ipc.invoke !== 'function') {
                console.warn('[Omnibox] IPC not ready for navigation, waiting...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            console.log('[Omnibox] Navigating to:', finalUrl, {
                activeId,
                openInBackground,
                activeContainerId,
            });
            if (!activeId) {
                console.log('[Omnibox] Creating new tab (no active tab)');
                const newTab = await ipc.tabs.create({
                    url: finalUrl,
                    containerId: activeContainerId,
                    activate: !openInBackground,
                });
                console.log('[Omnibox] Tab created:', newTab);
            }
            else if (openInBackground) {
                console.log('[Omnibox] Creating background tab');
                const newTab = await ipc.tabs.create({
                    url: finalUrl,
                    containerId: activeContainerId,
                    activate: false,
                });
                console.log('[Omnibox] Background tab created:', newTab);
            }
            else {
                console.log('[Omnibox] Navigating active tab:', activeId);
                await ipc.tabs.navigate(activeId, finalUrl);
                console.log('[Omnibox] Navigation complete');
            }
            setFocused(false);
            setSuggestions([]);
            if (!openInBackground) {
                setUrl(finalUrl);
            }
            rememberRecent(titleOverride || finalUrl, finalUrl);
        }
        catch (error) {
            console.error('Navigation failed:', error);
            try {
                if (!window.ipc || typeof window.ipc.invoke !== 'function') {
                    console.warn('IPC not ready for tab creation, waiting...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                const newTab = await ipc.tabs.create({
                    url: finalUrl,
                    containerId: activeContainerId,
                    activate: !openInBackground,
                });
                if (newTab && newTab.id) {
                    setFocused(false);
                    setSuggestions([]);
                    if (!openInBackground) {
                        setUrl(finalUrl);
                    }
                    rememberRecent(titleOverride || finalUrl, finalUrl);
                }
                else {
                    console.warn('Tab creation returned invalid result:', newTab);
                }
            }
            catch (createError) {
                console.error('Failed to create new tab:', createError);
            }
        }
    };
    const executeAction = async (action, fallbackInput, options = {}) => {
        if (!action) {
            await navigateToUrl(fallbackInput, options);
            return;
        }
        switch (action.type) {
            case 'nav':
                await navigateToUrl(action.url, {
                    ...options,
                    titleOverride: action.title ?? options.titleOverride,
                });
                return;
            case 'search': {
                const query = action.query || fallbackInput.trim();
                if (!query)
                    return;
                const engineLabel = action.engine === 'duckduckgo'
                    ? 'DuckDuckGo'
                    : action.engine === 'wiki'
                        ? 'Wikipedia'
                        : action.engine === 'youtube'
                            ? 'YouTube'
                            : action.engine === 'twitter'
                                ? 'Twitter/X'
                                : 'Google';
                await navigateToUrl(buildSearchUrl(action.engine, query, language !== 'auto' ? language : undefined), {
                    ...options,
                    titleOverride: `${engineLabel}: ${query}`,
                });
                return;
            }
            case 'ai': {
                const prompt = action.prompt || fallbackInput.trim();
                if (!prompt) {
                    onCommandPalette();
                    return;
                }
                try {
                    const tabUrl = activeTab?.url;
                    await ipc.agent.ask(prompt, tabUrl ? { url: tabUrl } : undefined);
                }
                catch (error) {
                    console.error('AI search error:', error);
                }
                await navigateToUrl(`ob://agent?q=${encodeURIComponent(prompt)}`, {
                    ...options,
                    titleOverride: `AI: ${prompt}`,
                });
                return;
            }
            case 'agent': {
                const prompt = action.prompt || fallbackInput.trim();
                if (!prompt) {
                    onCommandPalette();
                    return;
                }
                // Use Redix streaming instead of old agent system
                try {
                    // Open Redix dialog for streaming response
                    if (onRedixOpen) {
                        onRedixOpen(prompt);
                        setFocused(false);
                        setSuggestions([]);
                        return;
                    }
                    // Fallback: try Redix IPC directly
                    const tabUrl = activeTab?.url;
                    const _context = tabUrl
                        ? await ipc.tabs.getContext(activeTab.id).catch(() => null)
                        : null;
                    // Start Redix stream (will show in status bar or open dialog)
                    await ipc.redix.stream(prompt, { sessionId: `omnibox-${Date.now()}` }, chunk => {
                        // Stream handler - could emit event for UI to display
                        if (chunk.type === 'token' && chunk.text) {
                            // Emit event for Redix response display
                            ipcEvents.emit('redix:response', { prompt, text: chunk.text, done: chunk.done });
                        }
                    });
                }
                catch (error) {
                    console.error('Redix agent error:', error);
                    // Fallback to search
                    await navigateToUrl(buildSearchUrl('google', prompt, language !== 'auto' ? language : undefined), {
                        ...options,
                        titleOverride: `Search: ${prompt}`,
                    });
                    return;
                }
                setFocused(false);
                setSuggestions([]);
                return;
            }
            case 'calc': {
                const expr = action.expr || fallbackInput.trim();
                if (!expr) {
                    setFocused(true);
                    return;
                }
                const resultValue = action.result ?? evaluateExpression(expr);
                const formatted = expr ? formatCalcResult(expr, resultValue ?? null) : null;
                if (formatted) {
                    setUrl(formatted);
                    setFocused(false);
                    setSuggestions([]);
                    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                        try {
                            await navigator.clipboard.writeText(formatted);
                        }
                        catch {
                            // Clipboard might be unavailable; ignore.
                        }
                    }
                }
                else {
                    await navigateToUrl(buildSearchUrl('google', expr, language !== 'auto' ? language : undefined), {
                        ...options,
                        titleOverride: `Calculate: ${expr}`,
                    });
                }
                return;
            }
            case 'command':
                setFocused(false);
                setSuggestions([]);
                onCommandPalette();
                return;
            default:
                await navigateToUrl(fallbackInput, options);
        }
    };
    const handleSuggestionActivate = async (suggestion, options = {}) => {
        if (suggestion.interactive === false) {
            return;
        }
        if (suggestion.action) {
            await executeAction(suggestion.action, suggestion.subtitle || suggestion.url || url, {
                ...options,
                titleOverride: suggestion.title,
            });
            return;
        }
        if (suggestion.url) {
            await navigateToUrl(suggestion.url, { ...options, titleOverride: suggestion.title });
            return;
        }
        await navigateToUrl(url, { ...options, titleOverride: suggestion.title });
    };
    const handleKeyDown = async (e) => {
        if (e.key === 'Enter') {
            console.log('[Omnibox] Enter key pressed, url:', url);
            e.preventDefault();
            const background = e.shiftKey && !e.altKey;
            const newWindow = e.altKey;
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                console.log('[Omnibox] Activating suggestion:', suggestions[selectedIndex]);
                const suggestion = suggestions[selectedIndex];
                await handleSuggestionActivate(suggestion, { background, newWindow });
            }
            else {
                if (url.trim().toLowerCase().startsWith('@live')) {
                    const topResult = liveResults[0];
                    if (topResult?.url) {
                        await navigateToUrl(topResult.url, {
                            background,
                            newWindow,
                            titleOverride: topResult.title,
                        });
                        return;
                    }
                }
                const action = resolveQuickAction(url);
                await executeAction(action, url, { background, newWindow });
            }
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, -1));
        }
        else if (e.key === 'Escape') {
            setFocused(false);
            setSuggestions([]);
            inputRef.current?.blur();
        }
    };
    // Sync URL with active tab when not focused
    useEffect(() => {
        if (!focused && activeTab) {
            setUrl(activeTab.url || '');
        }
    }, [activeTab, focused]);
    // Check navigation availability
    useEffect(() => {
        if (!activeId) {
            setCanGoBack(false);
            setCanGoForward(false);
            return;
        }
        // Check navigation state periodically
        const checkNavigation = async () => {
            try {
                // For now, assume navigation is available if tab exists
                // In the future, we can check actual history state
                setCanGoBack(true);
                setCanGoForward(true);
            }
            catch {
                setCanGoBack(false);
                setCanGoForward(false);
            }
        };
        checkNavigation();
        const interval = setInterval(checkNavigation, 1000);
        return () => clearInterval(interval);
    }, [activeId]);
    return (_jsxs("div", { className: "relative max-w-2xl flex-1", children: [_jsx(motion.div, { className: `relative rounded-2xl transition-shadow duration-200 ${shortcutPulse ? 'shadow-[0_0_0_3px_rgba(59,130,246,0.18)] ring-2 ring-blue-500/40' : ''}`, animate: { scale: focused ? 1.02 : 1 }, transition: { duration: 0.2 }, children: _jsxs("div", { className: "relative flex items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1 flex-shrink-0", children: [_jsx("button", { type: "button", onClick: async () => {
                                        if (!activeId || !canGoBack)
                                            return;
                                        try {
                                            await ipc.tabs.goBack(activeId);
                                        }
                                        catch (error) {
                                            console.error('[Omnibox] Failed to go back:', error);
                                        }
                                    }, disabled: !canGoBack, className: `p-2 rounded-lg transition-all ${canGoBack
                                        ? 'text-gray-300 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20'
                                        : 'text-gray-600 cursor-not-allowed border border-transparent'}`, title: "Go back (Alt+Left Arrow)", "aria-label": "Go back", children: _jsx(ArrowLeft, { size: 16 }) }), _jsx("button", { type: "button", onClick: async () => {
                                        if (!activeId || !canGoForward)
                                            return;
                                        try {
                                            await ipc.tabs.goForward(activeId);
                                        }
                                        catch (error) {
                                            console.error('[Omnibox] Failed to go forward:', error);
                                        }
                                    }, disabled: !canGoForward, className: `p-2 rounded-lg transition-all ${canGoForward
                                        ? 'text-gray-300 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20'
                                        : 'text-gray-600 cursor-not-allowed border border-transparent'}`, title: "Go forward (Alt+Right Arrow)", "aria-label": "Go forward", children: _jsx(ArrowRight, { size: 16 }) }), _jsx("button", { type: "button", onClick: async () => {
                                        if (!activeId)
                                            return;
                                        try {
                                            await ipc.tabs.reload(activeId);
                                        }
                                        catch (error) {
                                            console.error('[Omnibox] Failed to reload:', error);
                                        }
                                    }, className: "p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all", title: "Reload (Ctrl+R / \u2318R)", "aria-label": "Reload page", children: _jsx(RotateCcw, { size: 16 }) })] }), siteInfo && url && !focused && (_jsxs("div", { className: "pointer-events-none absolute left-3 z-10 flex items-center gap-2", "aria-hidden": "true", children: [siteInfo.secure ? (_jsx(Lock, { size: 14, className: "text-green-400", "aria-label": "Secure connection" })) : url.startsWith('http://') ? (_jsx(AlertCircle, { size: 14, className: "text-amber-400", "aria-label": "Insecure connection" })) : (_jsx(Globe, { size: 14, className: "text-gray-400", "aria-label": "Web page" })), siteInfo.shieldCount !== undefined && siteInfo.shieldCount > 0 && (_jsxs("div", { className: "flex items-center gap-1", "aria-label": `${siteInfo.shieldCount} shields active`, children: [_jsx(Shield, { size: 14, className: "text-blue-400" }), _jsx("span", { className: "text-xs text-gray-400", children: siteInfo.shieldCount })] }))] })), _jsx("input", { ref: inputRef, id: "omnibox-input", name: "omnibox-url", type: "text", value: url, onChange: e => setUrl(e.target.value), onFocus: () => setFocused(true), onBlur: () => setTimeout(() => setFocused(false), 200), onKeyDown: handleKeyDown, "aria-label": "Address bar - Search or enter URL", "aria-autocomplete": "list", "aria-expanded": focused && suggestions.length > 0, placeholder: "Search or enter URL", autoComplete: "off", "data-omnibox-input": true, className: `h-10 w-full px-4 ${siteInfo && !focused ? 'pl-20' : 'pl-4'} bg-white/12 border-white/12 hover:bg-white/16 rounded-2xl border pr-14 text-sm font-medium text-white placeholder-white/50 backdrop-blur-md transition-all focus:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40`, style: { color: '#ffffff', WebkitTextFillColor: '#ffffff' } }), isLoading && progress > 0 && (_jsx(motion.div, { className: "absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl bg-blue-500", initial: { scaleX: 0 }, animate: { scaleX: progress / 100 }, transition: { duration: 0.1 } })), _jsxs("div", { className: "absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/40", children: [_jsx("span", { className: "hidden sm:inline", children: typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().includes('MAC')
                                        ? '⌘ K'
                                        : 'CTRL K' }), _jsx(Search, { size: 14, className: "text-white/50" })] })] }) }), _jsx(AnimatePresence, { children: focused && suggestions.length > 0 && (_jsx(motion.div, { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "absolute left-0 right-0 top-full z-50 mt-2 max-h-[500px] overflow-hidden overflow-y-auto rounded-lg border border-gray-700/50 bg-gray-900/95 shadow-2xl backdrop-blur-xl", children: suggestions.map((suggestion, index) => (_jsxs(motion.button, { type: "button", disabled: suggestion.interactive === false, onMouseDown: async (event) => {
                            event.preventDefault();
                            if (suggestion.interactive === false)
                                return;
                            const background = event.shiftKey && !event.altKey;
                            const newWindow = event.altKey;
                            await handleSuggestionActivate(suggestion, { background, newWindow });
                        }, onMouseEnter: () => setSelectedIndex(index), onKeyDown: e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (suggestion.interactive === false)
                                    return;
                                const background = e.shiftKey && !e.altKey;
                                const newWindow = e.altKey;
                                handleSuggestionActivate(suggestion, { background, newWindow });
                            }
                        }, role: "option", "aria-selected": selectedIndex === index, "aria-label": `${suggestion.type} suggestion: ${suggestion.title}`, className: `flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${selectedIndex === index
                            ? 'bg-gray-800/60 text-gray-100'
                            : 'text-gray-300 hover:bg-gray-800/40'} ${suggestion.interactive === false ? 'cursor-default opacity-80' : ''} `, children: [_jsxs("div", { className: "flex h-5 w-5 flex-shrink-0 items-center justify-center", children: [suggestion.icon === 'sparkles' && (_jsx(Sparkles, { size: 14, className: "text-emerald-400" })), suggestion.icon === 'search' && _jsx(Search, { size: 14, className: "text-purple-400" }), suggestion.icon === 'history' && _jsx(Clock, { size: 13, className: "text-gray-400" }), !suggestion.icon && suggestion.action?.type === 'calc' && (_jsx(Calculator, { size: 14, className: "text-amber-400" })), !suggestion.icon && suggestion.action?.type === 'ai' && (_jsx(Sparkles, { size: 14, className: "text-violet-400" })), !suggestion.icon && suggestion.action?.type === 'agent' && (_jsx(Sparkles, { size: 14, className: "text-blue-400" })), !suggestion.icon && suggestion.action?.type === 'search' && (_jsx(Search, { size: 14, className: "text-purple-400" })), !suggestion.icon && suggestion.type === 'tab' && (_jsx("div", { className: "h-3 w-3 rounded-full bg-blue-500" })), !suggestion.icon && suggestion.type === 'history' && (_jsx(Clock, { size: 13, className: "text-gray-400" })), !suggestion.icon && !suggestion.action && suggestion.type === 'command' && (_jsx(Search, { size: 14, className: "text-blue-400" })), !suggestion.icon && !suggestion.action && suggestion.type === 'search' && (_jsx(Search, { size: 14, className: "text-purple-400" }))] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-sm font-medium", children: suggestion.title }), (suggestion.subtitle || suggestion.url) && (_jsx("div", { className: "truncate text-xs text-gray-500", children: suggestion.subtitle || suggestion.url }))] }), suggestion.badge && (_jsx("div", { className: "ml-auto flex-shrink-0 rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-200", children: suggestion.badge }))] }, index))) })) })] }));
});
Omnibox.displayName = 'Omnibox';
