import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Redix Debug Panel
 * Time-travel debugging UI for Redix event log
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, SkipBack, SkipForward, RotateCcw, RotateCw, Download, Upload, Search, Clock, Activity, } from 'lucide-react';
import { getEventLog, getCurrentState, getStateAtEventIndex, undo, redo, exportEventLog, importEventLog, getEventsByType, } from '../../core/redix/event-log';
export function RedixDebugPanel({ open, onClose }) {
    const [events, setEvents] = useState([]);
    const [currentState, setCurrentState] = useState({});
    const [selectedEventIndex, setSelectedEventIndex] = useState(null);
    const [timeTravelState, setTimeTravelState] = useState(null);
    const [filterType, setFilterType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    // Playback controls (for future enhancement)
    // const [isPlaying, setIsPlaying] = useState(false);
    // const [playbackSpeed, setPlaybackSpeed] = useState(1);
    // Load events and state
    useEffect(() => {
        if (!open)
            return;
        const loadData = () => {
            const allEvents = getEventLog();
            setEvents(allEvents);
            setCurrentState(getCurrentState());
            if (selectedEventIndex === null && allEvents.length > 0) {
                setSelectedEventIndex(allEvents.length - 1);
            }
        };
        loadData();
        const interval = setInterval(loadData, 1000); // Refresh every second
        return () => clearInterval(interval);
    }, [open, selectedEventIndex]);
    // Update time-travel state when selected event changes
    useEffect(() => {
        if (selectedEventIndex !== null && selectedEventIndex >= 0 && selectedEventIndex < events.length) {
            try {
                const state = getStateAtEventIndex(selectedEventIndex);
                setTimeTravelState(state);
            }
            catch (error) {
                console.error('[RedixDebug] Failed to get state at index:', error);
                setTimeTravelState(null);
            }
        }
        else {
            setTimeTravelState(null);
        }
    }, [selectedEventIndex, events.length]);
    // Filtered events
    const filteredEvents = useMemo(() => {
        let filtered = events;
        if (filterType) {
            filtered = getEventsByType(filterType);
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(e => e.type.toLowerCase().includes(query) ||
                JSON.stringify(e.payload).toLowerCase().includes(query));
        }
        return filtered;
    }, [events, filterType, searchQuery]);
    // Unique event types
    const eventTypes = useMemo(() => {
        const types = new Set(events.map(e => e.type));
        return Array.from(types).sort();
    }, [events]);
    const handleUndo = () => {
        const newState = undo();
        if (newState) {
            setCurrentState(newState);
            const allEvents = getEventLog();
            setEvents(allEvents);
            if (allEvents.length > 0) {
                setSelectedEventIndex(allEvents.length - 1);
            }
            else {
                setSelectedEventIndex(null);
            }
        }
    };
    const handleRedo = () => {
        const newState = redo();
        if (newState) {
            setCurrentState(newState);
            const allEvents = getEventLog();
            setEvents(allEvents);
            if (allEvents.length > 0) {
                setSelectedEventIndex(allEvents.length - 1);
            }
        }
    };
    const handleExport = () => {
        try {
            const exported = exportEventLog();
            const blob = new Blob([exported], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `redix-event-log-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (error) {
            console.error('[RedixDebug] Failed to export:', error);
            alert('Failed to export event log');
        }
    };
    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file)
                return;
            try {
                const text = await file.text();
                importEventLog(text);
                const allEvents = getEventLog();
                setEvents(allEvents);
                setCurrentState(getCurrentState());
                if (allEvents.length > 0) {
                    setSelectedEventIndex(allEvents.length - 1);
                }
            }
            catch (error) {
                console.error('[RedixDebug] Failed to import:', error);
                alert('Failed to import event log');
            }
        };
        input.click();
    };
    // Jump to event handler (for future enhancement)
    // const handleJumpToEvent = (index: number) => {
    //   const event = filteredEvents[index];
    //   if (event) {
    //     const globalIndex = events.findIndex(e => e.id === event.id);
    //     if (globalIndex >= 0) {
    //       setSelectedEventIndex(globalIndex);
    //     }
    //   }
    // };
    return (_jsx(AnimatePresence, { children: open && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose, className: "fixed inset-0 bg-black/50 z-50" }), _jsxs(motion.div, { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, className: "fixed right-0 top-0 bottom-0 w-[800px] bg-gray-900 border-l border-gray-800 z-50 flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-800", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Activity, { size: 20, className: "text-purple-400" }), _jsx("h2", { className: "text-lg font-semibold text-white", children: "Redix Debug Panel" })] }), _jsx("button", { onClick: onClose, className: "rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors", children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "p-4 border-b border-gray-800 space-y-3", children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Search events...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50" })] }), _jsxs("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: "px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-purple-500/50", children: [_jsx("option", { value: "", children: "All Types" }), eventTypes.map(type => (_jsx("option", { value: type, children: type }, type)))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setSelectedEventIndex(0), disabled: events.length === 0, className: "px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50", children: _jsx(SkipBack, { size: 14 }) }), _jsx("button", { onClick: () => selectedEventIndex !== null && setSelectedEventIndex(Math.max(0, selectedEventIndex - 1)), disabled: selectedEventIndex === null || selectedEventIndex === 0, className: "px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50", children: _jsx(RotateCcw, { size: 14 }) }), _jsx("div", { className: "flex-1 text-center text-sm text-gray-400", children: selectedEventIndex !== null ? `${selectedEventIndex + 1} / ${events.length}` : 'No events' }), _jsx("button", { onClick: () => selectedEventIndex !== null && setSelectedEventIndex(Math.min(events.length - 1, selectedEventIndex + 1)), disabled: selectedEventIndex === null || selectedEventIndex === events.length - 1, className: "px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50", children: _jsx(RotateCw, { size: 14 }) }), _jsx("button", { onClick: () => setSelectedEventIndex(events.length - 1), disabled: events.length === 0, className: "px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50", children: _jsx(SkipForward, { size: 14 }) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: handleUndo, className: "px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50", children: [_jsx(RotateCcw, { size: 14, className: "inline mr-1" }), "Undo"] }), _jsxs("button", { onClick: handleRedo, className: "px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50", children: [_jsx(RotateCw, { size: 14, className: "inline mr-1" }), "Redo"] }), _jsx("div", { className: "flex-1" }), _jsxs("button", { onClick: handleExport, className: "px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50", children: [_jsx(Download, { size: 14, className: "inline mr-1" }), "Export"] }), _jsxs("button", { onClick: handleImport, className: "px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50", children: [_jsx(Upload, { size: 14, className: "inline mr-1" }), "Import"] })] })] }), _jsxs("div", { className: "flex-1 overflow-hidden flex", children: [_jsx("div", { className: "w-1/2 border-r border-gray-800 overflow-y-auto", children: _jsx("div", { className: "p-4 space-y-2", children: filteredEvents.length === 0 ? (_jsxs("div", { className: "text-center text-gray-500 py-8", children: [_jsx(Clock, { size: 32, className: "mx-auto mb-2 opacity-50" }), _jsx("p", { children: "No events found" })] })) : (filteredEvents.map((event) => {
                                            const globalIndex = events.findIndex(e => e.id === event.id);
                                            const isSelected = globalIndex === selectedEventIndex;
                                            return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, onClick: () => setSelectedEventIndex(globalIndex), className: `p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                                                    ? 'bg-purple-500/20 border-purple-500/40'
                                                    : 'bg-gray-800/50 border-gray-700/50 hover:border-purple-500/40'}`, children: [_jsxs("div", { className: "flex items-start justify-between mb-1", children: [_jsx("div", { className: "text-xs text-purple-400 font-medium", children: event.type }), _jsx("div", { className: "text-xs text-gray-500", children: new Date(event.timestamp).toLocaleTimeString() })] }), _jsx("div", { className: "text-xs text-gray-300 line-clamp-2", children: JSON.stringify(event.payload).substring(0, 100) })] }, event.id));
                                        })) }) }), _jsx("div", { className: "w-1/2 overflow-y-auto", children: _jsxs("div", { className: "p-4", children: [_jsx("div", { className: "text-sm font-semibold text-gray-300 mb-3", children: selectedEventIndex !== null ? `State at Event ${selectedEventIndex + 1}` : 'Current State' }), _jsx("pre", { className: "text-xs text-gray-400 bg-gray-800/50 p-3 rounded-lg border border-gray-700 overflow-auto", children: JSON.stringify(timeTravelState !== null ? timeTravelState : currentState, null, 2) })] }) })] })] })] })) }));
}
