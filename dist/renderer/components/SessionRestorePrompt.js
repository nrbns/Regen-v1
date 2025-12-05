import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * SessionRestorePrompt Component
 * Prompts user to restore previous session after crash or restart
 */
import { useState, useEffect } from 'react';
import { ipc } from '../lib/ipc-typed';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { isElectronRuntime, isTauriRuntime } from '../lib/env';
import { X, RotateCcw, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
export function SessionRestorePrompt() {
    const [snapshot, setSnapshot] = useState(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const { setActive } = useTabsStore();
    const { setMode } = useAppStore();
    useEffect(() => {
        // Skip session restore in web mode - no backend available
        const isWebMode = !isElectronRuntime() && !isTauriRuntime();
        if (isWebMode) {
            return; // Skip session restore in web mode
        }
        // Check for restore availability
        const checkRestore = async () => {
            try {
                const result = await ipc.session.checkRestore();
                if (result?.available && result?.snapshot) {
                    // Get full snapshot
                    const fullSnapshot = await ipc.session.getSnapshot();
                    if (fullSnapshot && fullSnapshot.tabs && Array.isArray(fullSnapshot.tabs)) {
                        setSnapshot(fullSnapshot);
                    }
                }
            }
            catch (error) {
                // Silently fail - session restore is optional
                if (process.env.NODE_ENV === 'development') {
                    console.debug('[SessionRestorePrompt] No restore available:', error);
                }
            }
        };
        checkRestore();
        // Also listen for IPC event from main process
        if (window.ipc?.on) {
            const handleRestoreAvailable = (_event, _data) => {
                checkRestore();
            };
            window.ipc.on?.('session:restore-available', handleRestoreAvailable);
            return () => {
                if (window.ipc?.removeListener) {
                    window.ipc.removeListener('session:restore-available', handleRestoreAvailable);
                }
            };
        }
    }, []);
    const handleRestore = async () => {
        if (!snapshot)
            return;
        setIsRestoring(true);
        try {
            // Restore tabs
            for (const tab of snapshot.tabs) {
                const newTab = await ipc.tabs.create({
                    url: tab.url,
                    mode: tab.mode || 'normal',
                    containerId: tab.containerId,
                    fromSessionRestore: true,
                });
                if (newTab && typeof newTab === 'object' && 'id' in newTab) {
                    const tabId = typeof newTab.id === 'string' ? newTab.id : null;
                    if (tabId && (tab.active || tab.id === snapshot.activeTabId)) {
                        setActive(tabId);
                    }
                }
            }
            // Restore mode
            if (snapshot.mode) {
                setMode(snapshot.mode);
            }
            // Dismiss restore
            await ipc.session.dismissRestore();
            setSnapshot(null);
        }
        catch (error) {
            console.error('[SessionRestorePrompt] Failed to restore:', error);
        }
        finally {
            setIsRestoring(false);
        }
    };
    const handleDismiss = async () => {
        try {
            await ipc.session.dismissRestore();
            setSnapshot(null);
        }
        catch (error) {
            console.error('[SessionRestorePrompt] Failed to dismiss:', error);
        }
    };
    if (!snapshot)
        return null;
    const tabCount = snapshot.tabs.length;
    const lastSaved = new Date(snapshot.timestamp);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: e => {
            // Don't interfere with button clicks
            const target = e.target;
            if (target.closest('button')) {
                return; // Let button handle it
            }
        }, children: _jsxs("div", { className: "mx-4 w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl", onClick: e => {
                // Don't interfere with button clicks
                const target = e.target;
                if (target.closest('button')) {
                    return; // Let button handle it
                }
                // Prevent clicks on modal from bubbling to backdrop
                e.stopPropagation();
            }, children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(RotateCcw, { className: "h-5 w-5 text-blue-500" }), _jsx("h2", { className: "text-xl font-bold text-gray-200", children: "Restore Previous Session?" })] }), _jsx("button", { type: "button", onClick: e => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                setTimeout(() => {
                                    handleDismiss();
                                }, 0);
                            }, className: "text-gray-400 transition-colors hover:text-gray-300", "aria-label": "Close", style: { pointerEvents: 'auto', zIndex: 10001 }, children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsx("p", { className: "mb-4 text-sm text-gray-400", children: "We found a session snapshot from your last session. Would you like to restore it?" }), _jsxs("div", { className: "mb-4 space-y-2 rounded bg-gray-800 p-3 text-sm", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Tabs" }), _jsx("span", { className: "font-medium text-gray-200", children: tabCount })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Mode" }), _jsx("span", { className: "font-medium capitalize text-gray-200", children: snapshot.mode })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-gray-400", children: "Last saved" }), _jsx("span", { className: "font-medium text-gray-200", children: formatDistanceToNow(lastSaved, { addSuffix: true }) })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: e => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                setTimeout(() => {
                                    handleRestore();
                                }, 0);
                            }, disabled: isRestoring, className: "flex flex-1 items-center justify-center gap-2 rounded bg-blue-500 px-4 py-2 transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50", style: { pointerEvents: isRestoring ? 'none' : 'auto', zIndex: 10001 }, children: isRestoring ? (_jsxs(_Fragment, { children: [_jsx(Sparkles, { className: "h-4 w-4 animate-spin" }), "Restoring..."] })) : (_jsxs(_Fragment, { children: [_jsx(RotateCcw, { className: "h-4 w-4" }), "Restore"] })) }), _jsx("button", { type: "button", onClick: e => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.stopImmediatePropagation();
                                setTimeout(() => {
                                    handleDismiss();
                                }, 0);
                            }, disabled: isRestoring, className: "flex-1 rounded bg-gray-700 px-4 py-2 transition-colors hover:bg-gray-600 disabled:opacity-50", style: { pointerEvents: isRestoring ? 'none' : 'auto', zIndex: 10001 }, children: "Start Fresh" })] })] }) }));
}
