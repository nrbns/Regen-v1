import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Session Restore Modal - Tier 1
 * Shows prompt to restore last session on app load
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { loadSession, clearSession, getSessionSummary } from '../services/session';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { ipc } from '../lib/ipc-typed';
import { formatDistanceToNow } from 'date-fns';
import { log } from '../utils/logger';
import { track } from '../services/analytics';
export default function SessionRestoreModal() {
    const [show, setShow] = useState(false);
    const [sessionSummary, setSessionSummary] = useState(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const tabsStore = useTabsStore();
    const appStore = useAppStore();
    useEffect(() => {
        // Check for session on mount
        const summary = getSessionSummary();
        if (summary && summary.tabCount > 0) {
            setSessionSummary(summary);
            setShow(true);
            log.info('Session restore modal: session found', summary);
        }
    }, []);
    const handleRestore = async () => {
        setIsRestoring(true);
        try {
            const session = loadSession();
            if (!session) {
                log.error('Session restore: no session data found');
                return;
            }
            log.info('Restoring session', { tabCount: session.tabs.length, mode: session.mode });
            // Restore mode
            if (session.mode) {
                await appStore.setMode(session.mode);
            }
            // Restore tabs
            if (session.tabs.length > 0) {
                // Clear existing tabs first
                const currentTabs = tabsStore.tabs;
                for (const tab of currentTabs) {
                    try {
                        await ipc.tabs.close({ id: tab.id });
                    }
                    catch (err) {
                        log.warn('Failed to close tab during restore', err);
                    }
                }
                // Create restored tabs
                for (const tab of session.tabs) {
                    try {
                        const url = tab.url || 'about:blank';
                        const newTab = await ipc.tabs.create(url);
                        const tabId = typeof newTab === 'object' && newTab && 'id' in newTab
                            ? newTab.id
                            : typeof newTab === 'string'
                                ? newTab
                                : null;
                        // Update tab with restored data
                        if (tabId && typeof tabId === 'string') {
                            tabsStore.updateTab(tabId, {
                                title: tab.title,
                                appMode: tab.appMode,
                                url: tab.url,
                            });
                        }
                    }
                    catch (err) {
                        log.warn('Failed to restore tab', err);
                    }
                }
                // Set active tab - handle gracefully if tab doesn't exist
                if (session.activeTabId) {
                    const restoredTab = tabsStore.tabs.find(t => t.id === session.activeTabId);
                    if (restoredTab) {
                        try {
                            tabsStore.setActive(session.activeTabId);
                            await ipc.tabs.activate({ id: session.activeTabId }).catch(() => {
                                // Suppress errors for internal/system tabs or if IPC fails
                            });
                        }
                        catch {
                            // Suppress errors - tab might not exist anymore
                        }
                    }
                }
            }
            log.info('Session restored successfully');
            // Tier 1: Track session restore
            track('auth_session_restored', {
                tabCount: session.tabs.length,
                mode: session.mode,
            });
            setShow(false);
        }
        catch (error) {
            log.error('Failed to restore session', error);
        }
        finally {
            setIsRestoring(false);
        }
    };
    const handleDismiss = () => {
        clearSession();
        setShow(false);
        log.info('Session restore dismissed');
        // Tier 1: Track dismissal
        track('auth_session_restored', {
            action: 'dismissed',
            tabCount: sessionSummary?.tabCount || 0,
        });
    };
    if (!show || !sessionSummary)
        return null;
    const savedAgo = sessionSummary.savedAt
        ? formatDistanceToNow(new Date(sessionSummary.savedAt), { addSuffix: true })
        : 'recently';
    return (_jsx(AnimatePresence, { children: show && (_jsx("div", { className: "fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: e => {
                if (e.target === e.currentTarget) {
                    handleDismiss();
                }
            }, children: _jsx(motion.div, { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, className: "mx-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 shadow-2xl", onClick: e => e.stopPropagation(), children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-4 flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-1 text-lg font-semibold text-gray-100", children: "Restore your last browsing session?" }), _jsxs("p", { className: "text-sm text-gray-400", children: ["Last saved ", savedAgo, " \u2022 ", sessionSummary.tabCount, " tab", sessionSummary.tabCount === 1 ? '' : 's'] })] }), _jsx("button", { type: "button", onClick: e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        e.stopImmediatePropagation();
                                        setTimeout(() => {
                                            handleDismiss();
                                        }, 0);
                                    }, className: "text-gray-400 transition-colors hover:text-gray-200", "aria-label": "Dismiss", style: { pointerEvents: 'auto', zIndex: 10001 }, children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "mt-6 flex gap-3", children: [_jsx("button", { type: "button", onClick: () => {
                                        if (isRestoring)
                                            return;
                                        handleRestore();
                                    }, disabled: isRestoring, className: "flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-500/60 bg-blue-600/20 px-4 py-2.5 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50", children: isRestoring ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" }), "Restoring..."] })) : (_jsxs(_Fragment, { children: [_jsx(RotateCcw, { size: 16 }), "Restore"] })) }), _jsx("button", { type: "button", onClick: () => {
                                        if (isRestoring)
                                            return;
                                        handleDismiss();
                                    }, disabled: isRestoring, className: "flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700/80 disabled:opacity-50", children: "Start Fresh" })] })] }) }) })) }));
}
