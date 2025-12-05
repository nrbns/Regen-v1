import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlarmPlus, RefreshCw, Trash2, Activity } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { ipcEvents } from '../lib/ipc-events';
const statusColors = {
    idle: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    checking: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
    changed: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    error: 'text-red-300 bg-red-500/10 border-red-500/30',
};
export default function WatchersPage() {
    const [watchers, setWatchers] = useState([]);
    const [form, setForm] = useState({ url: '', intervalMinutes: 15 });
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        const load = async () => {
            try {
                const list = await ipc.watchers.list();
                if (Array.isArray(list)) {
                    setWatchers(list);
                }
            }
            catch (err) {
                console.error('Failed to load watchers:', err);
                setError(err instanceof Error ? err.message : String(err));
            }
            finally {
                setLoading(false);
            }
        };
        load();
        const unsubscribeUpdated = ipcEvents.on('watchers:updated', (payload) => {
            if (Array.isArray(payload)) {
                setWatchers(payload);
            }
        });
        const unsubscribeChanged = ipcEvents.on('watchers:changed', (payload) => {
            if (payload?.id) {
                setWatchers((prev) => prev.map((watcher) => (watcher.id === payload.id ? { ...watcher, ...payload } : watcher)));
            }
        });
        return () => {
            unsubscribeUpdated();
            unsubscribeChanged();
        };
    }, []);
    const sortedWatchers = useMemo(() => [...watchers].sort((a, b) => {
        const aTime = a.lastChangeAt || a.lastCheckedAt || a.createdAt;
        const bTime = b.lastChangeAt || b.lastCheckedAt || b.createdAt;
        return bTime - aTime;
    }), [watchers]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (!form.url.trim()) {
            setError('Enter a valid URL.');
            return;
        }
        setAdding(true);
        try {
            await ipc.watchers.add({ url: form.url.trim(), intervalMinutes: form.intervalMinutes });
            setForm({ url: '', intervalMinutes: form.intervalMinutes });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        }
        finally {
            setAdding(false);
        }
    };
    const handleRemove = async (id) => {
        try {
            await ipc.watchers.remove(id);
        }
        catch (err) {
            console.error('Failed to remove watcher', err);
        }
    };
    const handleTrigger = async (id) => {
        try {
            await ipc.watchers.trigger(id);
        }
        catch (err) {
            console.error('Failed to trigger watcher', err);
        }
    };
    return (_jsxs("div", { className: "h-full w-full bg-[#1A1D28] text-gray-100 flex flex-col", children: [_jsx("header", { className: "p-6 border-b border-gray-800/50 flex items-center justify-between", children: _jsxs("div", { children: [_jsxs("h2", { className: "text-2xl font-bold flex items-center gap-2", children: [_jsx(Activity, { size: 22, className: "text-emerald-400" }), "Page Change Watchers"] }), _jsx("p", { className: "text-sm text-gray-400 mt-1", children: "Receive alerts when tracked pages change. Checks run automatically at the interval you choose." })] }) }), _jsxs("main", { className: "flex-1 overflow-y-auto p-6 space-y-6", children: [_jsxs("section", { className: "bg-gray-900/70 rounded-xl border border-gray-800/60 p-5 shadow-lg shadow-black/20", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-200 flex items-center gap-2", children: [_jsx(AlarmPlus, { size: 18 }), "Add watcher"] }), _jsx("p", { className: "text-sm text-gray-400 mt-1", children: "We\u2019ll keep a hash of the page content and alert you whenever it changes." }), _jsxs("form", { onSubmit: handleSubmit, className: "mt-4 flex flex-col gap-3 md:flex-row md:items-end", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-xs uppercase tracking-wide text-gray-500 mb-2", children: "Page URL" }), _jsx("input", { type: "url", required: true, value: form.url, onChange: (e) => setForm((prev) => ({ ...prev, url: e.target.value })), placeholder: "https://example.com/page", className: "w-full px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700/60 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" })] }), _jsxs("div", { className: "w-full md:w-36", children: [_jsx("label", { className: "block text-xs uppercase tracking-wide text-gray-500 mb-2", children: "Check every (minutes)" }), _jsx("input", { type: "number", min: 1, max: 1440, value: form.intervalMinutes, onChange: (e) => setForm((prev) => ({ ...prev, intervalMinutes: Number.parseInt(e.target.value || '15', 10) })), className: "w-full px-4 py-2.5 rounded-lg bg-gray-800/80 border border-gray-700/60 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" })] }), _jsx("button", { type: "submit", disabled: adding, className: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition disabled:opacity-60 text-sm font-semibold", children: adding ? 'Adding…' : 'Add watcher' })] }), error && _jsx("p", { className: "text-sm text-red-400 mt-3", children: error })] }), _jsxs("section", { children: [_jsx("div", { className: "flex items-center justify-between mb-3", children: _jsxs("h3", { className: "text-lg font-semibold text-gray-200 flex items-center gap-2", children: ["Active watchers", _jsxs("span", { className: "text-xs text-gray-500", children: ["(", watchers.length, ")"] })] }) }), loading ? (_jsx("div", { className: "flex items-center justify-center py-20 text-gray-400 text-sm", children: "Loading watchers\u2026" })) : sortedWatchers.length === 0 ? (_jsx("div", { className: "flex flex-col items-center justify-center py-20 text-center text-gray-500", children: _jsx("p", { className: "text-sm", children: "No watchers yet. Add a page to start monitoring changes." }) })) : (_jsx("div", { className: "space-y-3", children: sortedWatchers.map((watcher) => (_jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, className: "bg-gray-900/60 border border-gray-800/60 rounded-lg p-4 hover:bg-gray-900/80 transition-all", children: _jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start md:justify-between", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: `text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusColors[watcher.status]}`, children: watcher.status }), _jsxs("span", { className: "text-xs text-gray-500", children: ["Every ", watcher.intervalMinutes, " min \u2022 Created", ' ', new Date(watcher.createdAt).toLocaleString()] })] }), _jsx("a", { href: watcher.url, target: "_blank", rel: "noreferrer", className: "text-sm font-medium text-emerald-200 truncate hover:underline", title: watcher.url, children: watcher.url }), _jsxs("div", { className: "text-xs text-gray-500 mt-1 space-x-3", children: [watcher.lastCheckedAt && (_jsxs("span", { children: ["Last check: ", new Date(watcher.lastCheckedAt).toLocaleString()] })), watcher.lastChangeAt && (_jsxs("span", { className: "text-amber-300", children: ["Last change detected: ", new Date(watcher.lastChangeAt).toLocaleString()] }))] }), watcher.error && (_jsxs("div", { className: "mt-2 text-xs text-red-400", children: ["Error: ", watcher.error] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(motion.button, { onClick: () => handleTrigger(watcher.id), whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-gray-300 hover:text-blue-400 transition-colors", title: "Run check now", children: _jsx(RefreshCw, { size: 16 }) }), _jsx(motion.button, { onClick: () => handleRemove(watcher.id), whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, className: "p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/60 text-gray-300 hover:text-red-400 transition-colors", title: "Remove watcher", children: _jsx(Trash2, { size: 16 }) })] })] }) }, watcher.id))) }))] })] })] }));
}
