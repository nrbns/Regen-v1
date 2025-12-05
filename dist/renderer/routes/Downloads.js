import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Download as DownloadIcon, FolderOpen, CheckCircle, XCircle, Clock, Loader, Pause, Play, X, PlayCircle, RotateCw, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { ipc } from '../lib/ipc-typed';
import { ipcEvents } from '../lib/ipc-events';
import { MediaPlayer, getMediaKind } from '../components/MediaPlayer';
export default function DownloadsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewItem, setPreviewItem] = useState(null);
    const [queueStatus, setQueueStatus] = useState(null);
    useEffect(() => {
        const loadDownloads = async () => {
            try {
                const list = (await ipc.downloads.list());
                if (Array.isArray(list)) {
                    setItems(list.sort((a, b) => b.createdAt - a.createdAt));
                }
            }
            catch (error) {
                console.error('Failed to load downloads:', error);
            }
            finally {
                setLoading(false);
            }
        };
        loadDownloads();
        // Load queue status
        const loadQueueStatus = async () => {
            try {
                const status = await ipc.downloads.getQueue?.();
                if (status) {
                    setQueueStatus(status);
                }
            }
            catch (error) {
                console.error('Failed to load queue status:', error);
            }
        };
        loadQueueStatus();
        const queueInterval = setInterval(loadQueueStatus, 2000); // Update every 2 seconds
        const updateItem = (update) => {
            if (!update?.id)
                return;
            setItems(prev => {
                const existingIndex = prev.findIndex(item => item.id === update.id);
                const updatedItem = {
                    id: update.id,
                    url: update.url,
                    filename: update.filename,
                    status: update.status || 'downloading',
                    path: update.path,
                    checksum: update.checksum,
                    createdAt: update.createdAt || Date.now(),
                    progress: update.progress,
                    receivedBytes: update.receivedBytes,
                    totalBytes: update.totalBytes,
                    safety: update.safety,
                    speedBytesPerSec: update.speedBytesPerSec,
                    etaSeconds: update.etaSeconds,
                };
                if (existingIndex >= 0) {
                    const next = [...prev];
                    next[existingIndex] = {
                        ...next[existingIndex],
                        ...updatedItem,
                        createdAt: next[existingIndex].createdAt || updatedItem.createdAt,
                    };
                    return next.sort((a, b) => b.createdAt - a.createdAt);
                }
                return [updatedItem, ...prev].sort((a, b) => b.createdAt - a.createdAt);
            });
        };
        const progressUnsub = ipcEvents.on('downloads:progress', updateItem);
        const doneUnsub = ipcEvents.on('downloads:done', updateItem);
        return () => {
            progressUnsub();
            doneUnsub();
            clearInterval(queueInterval);
        };
    }, []);
    const formatBytes = (bytes) => {
        if (!bytes)
            return 'Unknown';
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };
    const calcPercent = (item) => {
        if (typeof item.progress === 'number') {
            return Math.min(100, Math.max(0, Math.round(item.progress * 100)));
        }
        if (item.totalBytes && item.totalBytes > 0) {
            return Math.min(100, Math.round(((item.receivedBytes || 0) / item.totalBytes) * 100));
        }
        if (item.status === 'completed' || item.status === 'verifying')
            return 100;
        return 0;
    };
    const formatSpeed = (bps) => {
        if (!bps || !Number.isFinite(bps) || bps <= 0)
            return '—';
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const idx = Math.min(units.length - 1, Math.floor(Math.log(bps) / Math.log(1024)));
        const value = bps / Math.pow(1024, idx);
        return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${units[idx]}`;
    };
    const formatEta = (seconds) => {
        if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0)
            return '—';
        const rounded = Math.max(0, Math.round(seconds));
        const hours = Math.floor(rounded / 3600);
        const minutes = Math.floor((rounded % 3600) / 60);
        const secs = rounded % 60;
        const parts = [];
        if (hours > 0)
            parts.push(`${hours}h`);
        if (minutes > 0 || hours > 0)
            parts.push(`${minutes}m`);
        parts.push(`${secs}s`);
        return parts.join(' ');
    };
    const isPreviewable = (item) => {
        if (!item?.path || item.status !== 'completed')
            return false;
        return Boolean(getMediaKind(item.filename || item.path));
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return _jsx(CheckCircle, { size: 16, className: "text-green-400" });
            case 'failed':
            case 'blocked':
                return _jsx(XCircle, { size: 16, className: "text-red-400" });
            case 'downloading':
            case 'paused':
            case 'verifying':
                return _jsx(Loader, { size: 16, className: "text-blue-400 animate-spin" });
            case 'cancelled':
                return _jsx(XCircle, { size: 16, className: "text-gray-500" });
            default:
                return _jsx(Clock, { size: 16, className: "text-gray-400" });
        }
    };
    const handleOpenFile = (path) => {
        if (path) {
            // Use IPC to open file in system default application
            ipc.downloads.openFile?.(path).catch(console.error);
        }
    };
    const handleOpenFolder = (path) => {
        if (path) {
            // Use IPC to open folder in file explorer
            ipc.downloads.showInFolder?.(path).catch(console.error);
        }
    };
    const renderSafetyBadge = (safety) => {
        if (!safety)
            return null;
        const base = 'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border';
        switch (safety.status) {
            case 'clean':
                return _jsx("span", { className: `${base} bg-emerald-500/15 border-emerald-500/30 text-emerald-200`, children: "Scanned Clean" });
            case 'warning':
                return _jsx("span", { className: `${base} bg-amber-500/15 border-amber-500/30 text-amber-200`, children: "Review Recommended" });
            case 'blocked':
                return _jsx("span", { className: `${base} bg-red-500/15 border-red-500/40 text-red-200`, children: "Quarantined" });
            case 'pending':
                return _jsx("span", { className: `${base} bg-blue-500/15 border-blue-500/30 text-blue-200`, children: "Scanning\u2026" });
            default:
                return _jsx("span", { className: `${base} bg-gray-500/15 border-gray-600/40 text-gray-300`, children: "Scan Unavailable" });
        }
    };
    const renderSafetyDetails = (safety) => {
        if (!safety)
            return null;
        return (_jsxs("div", { className: "text-xs text-gray-500 space-y-1 mt-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [renderSafetyBadge(safety), safety.threatLevel && (_jsxs("span", { className: "text-[10px] uppercase text-gray-400", children: ["Threat level: ", safety.threatLevel] }))] }), safety.details && _jsx("div", { children: safety.details }), safety.recommendations && safety.recommendations.length > 0 && (_jsx("ul", { className: "list-disc list-inside text-[11px] space-y-0.5", children: safety.recommendations.slice(0, 3).map((rec, idx) => (_jsx("li", { children: rec }, `${safety.scannedAt}-${idx}`))) })), safety.status === 'blocked' && safety.quarantinePath && (_jsxs("div", { className: "text-[11px] text-red-300", children: ["File moved to quarantine: ", _jsx("span", { className: "font-mono", children: safety.quarantinePath })] }))] }));
    };
    if (loading) {
        return (_jsx("div", { className: "h-full w-full flex items-center justify-center bg-[#1A1D28]", children: _jsx(Loader, { size: 24, className: "text-blue-400 animate-spin" }) }));
    }
    return (_jsxs("div", { className: "h-full w-full bg-[#1A1D28] text-gray-100 flex flex-col", children: [_jsx("div", { className: "p-6 border-b border-gray-800/50", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-bold", children: "Downloads" }), _jsxs("p", { className: "text-sm text-gray-400 mt-1", children: [items.length, " ", items.length === 1 ? 'download' : 'downloads'] })] }), queueStatus && (_jsxs("div", { className: "flex items-center gap-4 text-sm", children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30", children: [_jsx(Loader, { size: 14, className: "text-blue-400 animate-spin" }), _jsx("span", { className: "text-blue-300", children: "Active:" }), _jsxs("span", { className: "text-blue-200 font-semibold", children: [queueStatus.active, "/", queueStatus.maxConcurrent] })] }), queueStatus.queued > 0 && (_jsxs("div", { className: "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30", children: [_jsx(List, { size: 14, className: "text-amber-400" }), _jsx("span", { className: "text-amber-300", children: "Queued:" }), _jsx("span", { className: "text-amber-200 font-semibold", children: queueStatus.queued })] }))] }))] }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: items.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center", children: [_jsx(DownloadIcon, { size: 48, className: "text-gray-600 mb-4" }), _jsx("h3", { className: "text-lg font-semibold text-gray-300 mb-2", children: "No downloads yet" }), _jsx("p", { className: "text-sm text-gray-500", children: "Files you download will appear here" })] })) : (_jsx("div", { className: "space-y-3", children: items.map((d) => (_jsx(motion.div, { "data-testid": "download-card", "data-download-id": d.id, "data-filename": d.filename || '', initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4 hover:bg-gray-900/80 transition-all", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [getStatusIcon(d.status), _jsx("span", { className: "font-medium text-gray-200 truncate", children: d.filename || d.url.split('/').pop() || 'Download' }), renderSafetyBadge(d.safety)] }), d.status === 'downloading' || d.status === 'paused' ? (_jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-300 mb-1.5", children: [_jsxs("span", { className: "font-medium", children: [formatBytes(d.receivedBytes), " / ", formatBytes(d.totalBytes)] }), _jsxs("span", { className: "font-semibold text-blue-400", children: [calcPercent(d), "%"] })] }), _jsx("div", { className: "w-full bg-gray-800 rounded-full h-2.5 overflow-hidden mb-2", children: _jsx(motion.div, { className: "h-full bg-gradient-to-r from-blue-500 to-cyan-500", initial: { width: 0 }, animate: { width: `${calcPercent(d)}%` }, transition: { duration: 0.3 } }) }), _jsxs("div", { className: "flex items-center gap-4 text-xs font-medium", children: [_jsxs("div", { className: "flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30", children: [_jsx("span", { className: "text-blue-300", children: "Speed:" }), _jsx("span", { className: "text-blue-200 font-semibold", children: formatSpeed(d.speedBytesPerSec) })] }), _jsxs("div", { className: "flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30", children: [_jsx(Clock, { size: 12, className: "text-purple-300" }), _jsx("span", { className: "text-purple-300", children: "ETA:" }), _jsx("span", { className: "text-purple-200 font-semibold", children: formatEta(d.etaSeconds) })] })] })] })) : null, d.status === 'verifying' && (_jsxs("div", { className: "mb-2 text-xs text-blue-300 flex items-center gap-2", children: [_jsx(Loader, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: "Verifying download integrity\u2026" })] })), _jsxs("div", { className: "text-xs text-gray-400 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "truncate", children: d.url }), d.totalBytes && d.totalBytes > 1024 * 1024 * 1024 && (_jsxs("span", { className: "px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-[10px] font-semibold", children: ["Large File (", formatBytes(d.totalBytes), ")"] }))] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { children: new Date(d.createdAt).toLocaleString() }), _jsx("span", { className: "capitalize", children: d.status }), d.path && (_jsx("span", { className: "truncate max-w-xs", title: d.path, children: d.path.replace(/^.*[\\\/]/, '') }))] }), d.checksum && (_jsxs("div", { className: "text-xs text-gray-500 truncate", title: `SHA-256: ${d.checksum}`, children: ["SHA-256: ", d.checksum.slice(0, 12), "\u2026"] })), renderSafetyDetails(d.safety)] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [d.status === 'downloading' && (_jsxs(_Fragment, { children: [_jsxs(motion.button, { onClick: async () => {
                                                        try {
                                                            await ipc.downloads.pause(d.id);
                                                            setItems(prev => prev.map(item => item.id === d.id ? { ...item, status: 'paused' } : item));
                                                        }
                                                        catch (error) {
                                                            console.error('Failed to pause download:', error);
                                                        }
                                                    }, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-medium text-xs transition-colors", title: "Pause download", children: [_jsx(Pause, { size: 16 }), _jsx("span", { children: "Pause" })] }), _jsxs(motion.button, { onClick: async () => {
                                                        try {
                                                            await ipc.downloads.cancel(d.id);
                                                            setItems(prev => prev.map(item => item.id === d.id ? { ...item, status: 'cancelled' } : item));
                                                        }
                                                        catch (error) {
                                                            console.error('Failed to stop download:', error);
                                                        }
                                                    }, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-medium text-xs transition-colors", title: "Stop download", children: [_jsx(X, { size: 16 }), _jsx("span", { children: "Stop" })] })] })), d.status === 'paused' && (_jsxs(_Fragment, { children: [_jsxs(motion.button, { onClick: async () => {
                                                        try {
                                                            await ipc.downloads.resume(d.id);
                                                            setItems(prev => prev.map(item => item.id === d.id ? { ...item, status: 'downloading' } : item));
                                                        }
                                                        catch (error) {
                                                            console.error('Failed to resume download:', error);
                                                        }
                                                    }, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-200 font-medium text-xs transition-colors", title: "Resume download", children: [_jsx(Play, { size: 16 }), _jsx("span", { children: "Resume" })] }), _jsxs(motion.button, { onClick: async () => {
                                                        try {
                                                            await ipc.downloads.cancel(d.id);
                                                            setItems(prev => prev.map(item => item.id === d.id ? { ...item, status: 'cancelled' } : item));
                                                        }
                                                        catch (error) {
                                                            console.error('Failed to stop download:', error);
                                                        }
                                                    }, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-medium text-xs transition-colors", title: "Stop download", children: [_jsx(X, { size: 16 }), _jsx("span", { children: "Stop" })] })] })), (d.status === 'failed' || d.status === 'cancelled') && (_jsxs(motion.button, { onClick: async () => {
                                                try {
                                                    await ipc.downloads.retry?.(d.id);
                                                    setItems(prev => prev.map(item => item.id === d.id ? { ...item, status: 'pending' } : item));
                                                    // Reload queue status
                                                    const status = await ipc.downloads.getQueue?.();
                                                    if (status)
                                                        setQueueStatus(status);
                                                }
                                                catch (error) {
                                                    console.error('Failed to retry download:', error);
                                                }
                                            }, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-200 font-medium text-xs transition-colors", title: "Retry download", children: [_jsx(RotateCw, { size: 16 }), _jsx("span", { children: "Retry" })] })), (d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled' || d.status === 'blocked') && d.path && (_jsxs(_Fragment, { children: [d.status !== 'blocked' && d.status === 'completed' && (_jsx(motion.button, { onClick: () => handleOpenFile(d.path), whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, className: "p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-blue-400 transition-colors", title: "Open file", children: _jsx(DownloadIcon, { size: 18 }) })), d.status === 'completed' && d.path && isPreviewable(d) && (_jsx(motion.button, { onClick: () => setPreviewItem(d), whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, className: "p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-purple-400 transition-colors", title: "Preview media", children: _jsx(PlayCircle, { size: 18 }) })), _jsx(motion.button, { onClick: () => handleOpenFolder(d.path), whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, className: "p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-blue-400 transition-colors", title: "Show in folder", children: _jsx(FolderOpen, { size: 18 }) })] }))] })] }) }, d.id))) })) }), previewItem && previewItem.path && (_jsx(MediaPlayer, { filePath: previewItem.path, fileName: previewItem.filename, onClose: () => setPreviewItem(null) }))] }));
}
