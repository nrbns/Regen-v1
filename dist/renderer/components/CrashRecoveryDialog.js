import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Crash Recovery Dialog
 * Shows when a tab crashes and offers recovery options
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RotateCcw, X, RefreshCw } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { ipcEvents } from '../lib/ipc-events';
export function CrashRecoveryDialog({ tabId: _tabId, reason, exitCode, onClose, onReload, }) {
    const [snapshots] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        // Load available snapshots
        const loadSnapshots = async () => {
            try {
                // Note: This would need to be added to IPC schema
                // const result = await ipc.performance.snapshotList();
                // setSnapshots(result.snapshots || []);
            }
            catch (error) {
                console.error('Failed to load snapshots:', error);
            }
        };
        loadSnapshots();
    }, []);
    const handleReload = () => {
        onReload();
        onClose();
    };
    const handleRestoreSnapshot = async (_snapshotId) => {
        setLoading(true);
        try {
            // Note: This would need to be added to IPC schema
            // await ipc.performance.snapshotRestore({ snapshotId });
            // Then restore tabs from snapshot
            onClose();
        }
        catch (error) {
            console.error('Failed to restore snapshot:', error);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AnimatePresence, { children: _jsx("div", { className: "fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm", onClick: e => {
                // Close on backdrop click
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }, children: _jsx(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 }, className: "rounded-2xl border border-red-500/40 bg-gray-900/95 backdrop-blur-xl shadow-2xl p-6 max-w-md w-full mx-4", children: _jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: "rounded-full bg-red-500/20 p-3", children: _jsx(AlertTriangle, { size: 24, className: "text-red-400" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-lg font-semibold text-white mb-1", children: "Tab Crashed" }), _jsxs("p", { className: "text-sm text-gray-400 mb-4", children: ["This tab encountered an error and stopped responding.", reason && (_jsxs("span", { className: "block mt-1 text-xs", children: ["Reason: ", reason, exitCode !== undefined && ` (Exit code: ${exitCode})`] }))] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("button", { onClick: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                handleReload();
                                            }, onMouseDown: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, disabled: loading, className: "flex items-center justify-center gap-2 rounded-lg border border-blue-500/60 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed", style: { zIndex: 10011, isolation: 'isolate' }, children: [_jsx(RefreshCw, { size: 16 }), "Reload Tab"] }), snapshots.length > 0 && (_jsxs("div", { className: "mt-2", children: [_jsx("p", { className: "text-xs text-gray-500 mb-2", children: "Or restore from snapshot:" }), _jsx("div", { className: "space-y-1 max-h-32 overflow-y-auto", children: snapshots.slice(0, 3).map(snapshot => (_jsx("button", { onClick: e => {
                                                            e.stopImmediatePropagation();
                                                            e.stopPropagation();
                                                            handleRestoreSnapshot(snapshot.id);
                                                        }, onMouseDown: e => {
                                                            e.stopImmediatePropagation();
                                                            e.stopPropagation();
                                                        }, disabled: loading, className: "w-full flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-800/60 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-700/60 disabled:opacity-50", style: { zIndex: 10011, isolation: 'isolate' }, children: _jsxs("span", { className: "flex items-center gap-2", children: [_jsx(RotateCcw, { size: 12 }), new Date(snapshot.timestamp).toLocaleString()] }) }, snapshot.id))) })] })), _jsx("button", { onClick: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                onClose();
                                            }, onMouseDown: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, className: "mt-2 rounded-lg border border-gray-700/60 bg-gray-800/60 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700/60", style: { zIndex: 10011, isolation: 'isolate' }, children: "Close" })] })] }), _jsx("button", { onClick: e => {
                                e.stopImmediatePropagation();
                                e.stopPropagation();
                                onClose();
                            }, onMouseDown: e => {
                                e.stopImmediatePropagation();
                                e.stopPropagation();
                            }, className: "rounded-lg p-1 text-gray-400 hover:text-gray-200 transition-colors", style: { zIndex: 10011, isolation: 'isolate' }, children: _jsx(X, { size: 18 }) })] }) }) }) }));
}
/**
 * Hook to manage crash recovery dialog state
 */
export function useCrashRecovery() {
    const [crashedTab, setCrashedTab] = useState(null);
    useEffect(() => {
        const handleCrash = (data) => {
            setCrashedTab(data);
        };
        const unsubscribe = ipcEvents.on('tabs:crash-detected', handleCrash);
        return unsubscribe;
    }, []);
    const handleReload = async () => {
        if (!crashedTab)
            return;
        try {
            const tab = await ipc.tabs.list();
            const crashedTabData = tab.find((t) => t.id === crashedTab.tabId);
            if (crashedTabData) {
                await ipc.tabs.reload(crashedTab.tabId);
            }
            else {
                // Tab was removed, create new one
                await ipc.tabs.create('about:blank');
            }
        }
        catch (error) {
            console.error('Failed to reload crashed tab:', error);
        }
    };
    return {
        crashedTab,
        setCrashedTab,
        handleReload,
    };
}
