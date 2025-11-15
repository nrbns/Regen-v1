/**
 * Redix Debug Panel
 * Time-travel debugging UI for Redix event log
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw,
  Download,
  Upload,
  Search,
  Clock,
  Activity,
} from 'lucide-react';
import {
  getEventLog,
  getCurrentState,
  getStateAtEventIndex,
  undo,
  redo,
  exportEventLog,
  importEventLog,
  getEventsByType,
  RedixEvent,
  RedixState,
} from '../../core/redix/event-log';

interface RedixDebugPanelProps {
  open: boolean;
  onClose: () => void;
}

export function RedixDebugPanel({ open, onClose }: RedixDebugPanelProps) {
  const [events, setEvents] = useState<RedixEvent[]>([]);
  const [currentState, setCurrentState] = useState<RedixState>({});
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [timeTravelState, setTimeTravelState] = useState<RedixState | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  // Playback controls (for future enhancement)
  // const [isPlaying, setIsPlaying] = useState(false);
  // const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Load events and state
  useEffect(() => {
    if (!open) return;

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
      } catch (error) {
        console.error('[RedixDebug] Failed to get state at index:', error);
        setTimeTravelState(null);
      }
    } else {
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
      filtered = filtered.filter(e => 
        e.type.toLowerCase().includes(query) ||
        JSON.stringify(e.payload).toLowerCase().includes(query)
      );
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
      } else {
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
    } catch (error) {
      console.error('[RedixDebug] Failed to export:', error);
      alert('Failed to export event log');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        importEventLog(text);
        const allEvents = getEventLog();
        setEvents(allEvents);
        setCurrentState(getCurrentState());
        if (allEvents.length > 0) {
          setSelectedEventIndex(allEvents.length - 1);
        }
      } catch (error) {
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

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-[800px] bg-gray-900 border-l border-gray-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Redix Debug Panel</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Controls */}
            <div className="p-4 border-b border-gray-800 space-y-3">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">All Types</option>
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Time Travel Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEventIndex(0)}
                  disabled={events.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={() => selectedEventIndex !== null && setSelectedEventIndex(Math.max(0, selectedEventIndex - 1))}
                  disabled={selectedEventIndex === null || selectedEventIndex === 0}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50"
                >
                  <RotateCcw size={14} />
                </button>
                <div className="flex-1 text-center text-sm text-gray-400">
                  {selectedEventIndex !== null ? `${selectedEventIndex + 1} / ${events.length}` : 'No events'}
                </div>
                <button
                  onClick={() => selectedEventIndex !== null && setSelectedEventIndex(Math.min(events.length - 1, selectedEventIndex + 1))}
                  disabled={selectedEventIndex === null || selectedEventIndex === events.length - 1}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50"
                >
                  <RotateCw size={14} />
                </button>
                <button
                  onClick={() => setSelectedEventIndex(events.length - 1)}
                  disabled={events.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50"
                >
                  <SkipForward size={14} />
                </button>
              </div>

              {/* Undo/Redo and Export/Import */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50"
                >
                  <RotateCcw size={14} className="inline mr-1" />
                  Undo
                </button>
                <button
                  onClick={handleRedo}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50"
                >
                  <RotateCw size={14} className="inline mr-1" />
                  Redo
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50"
                >
                  <Download size={14} className="inline mr-1" />
                  Export
                </button>
                <button
                  onClick={handleImport}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50"
                >
                  <Upload size={14} className="inline mr-1" />
                  Import
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Event List */}
              <div className="w-1/2 border-r border-gray-800 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Clock size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No events found</p>
                    </div>
                  ) : (
                    filteredEvents.map((event) => {
                      const globalIndex = events.findIndex(e => e.id === event.id);
                      const isSelected = globalIndex === selectedEventIndex;
                      
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => setSelectedEventIndex(globalIndex)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-500/20 border-purple-500/40'
                              : 'bg-gray-800/50 border-gray-700/50 hover:border-purple-500/40'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="text-xs text-purple-400 font-medium">
                              {event.type}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="text-xs text-gray-300 line-clamp-2">
                            {JSON.stringify(event.payload).substring(0, 100)}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* State View */}
              <div className="w-1/2 overflow-y-auto">
                <div className="p-4">
                  <div className="text-sm font-semibold text-gray-300 mb-3">
                    {selectedEventIndex !== null ? `State at Event ${selectedEventIndex + 1}` : 'Current State'}
                  </div>
                  <pre className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded-lg border border-gray-700 overflow-auto">
                    {JSON.stringify(
                      timeTravelState !== null ? timeTravelState : currentState,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

