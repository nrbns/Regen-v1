/**
 * SuperMemory Sidebar
 * Complete UI for browsing and searching memory
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, Tag, X, Sparkles, Filter, Calendar, Trash2 } from 'lucide-react';
import { MemoryStore } from '../../core/supermemory/store';
import { MemoryEvent } from '../../core/supermemory/tracker';
import { useSuggestions } from '../../core/supermemory/useSuggestions';
import { searchEmbeddings } from '../../core/supermemory/embedding';
import { useDebounce } from '../../utils/useDebounce';

interface MemorySidebarProps {
  open: boolean;
  onClose: () => void;
}

type ViewMode = 'timeline' | 'search' | 'tags';

export function MemorySidebar({ open, onClose }: MemorySidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<MemoryEvent['type'] | 'all'>('all');
  const [semanticResults, setSemanticResults] = useState<Array<{ event: MemoryEvent; similarity: number }>>([]);
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  const keywordSuggestions = useSuggestions(debouncedQuery, { types: ['search', 'visit'], limit: 10 });

  // Load events
  useEffect(() => {
    if (!open) return;

    const loadEvents = async () => {
      setLoading(true);
      try {
        const loaded = await MemoryStoreInstance.getEvents({
          type: selectedType !== 'all' ? selectedType : undefined,
          limit: 100,
        });
        setEvents(loaded);
      } catch (error) {
        console.error('[MemorySidebar] Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [open, selectedType]);

  // Semantic search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setSemanticResults([]);
      return;
    }

    const performSemanticSearch = async () => {
      try {
        const results = await searchEmbeddings(debouncedQuery, 10);
        const eventIds = new Set(results.map(r => r.embedding.eventId));
        
        // Load events for matched embeddings
        const matchedEvents: Array<{ event: MemoryEvent; similarity: number }> = [];
        for (const result of results) {
          try {
            const events = await MemoryStoreInstance.getEvents({ limit: 1000 });
            const found = events.find(e => e.id === result.embedding.eventId);
            if (found) {
              matchedEvents.push({ event: found, similarity: result.similarity });
            }
          } catch {
            // Skip if event not found
          }
        }
        
        setSemanticResults(matchedEvents);
      } catch (error) {
        console.error('[MemorySidebar] Semantic search failed:', error);
        setSemanticResults([]);
      }
    };

    performSemanticSearch();
  }, [debouncedQuery]);

  const displayedEvents = useMemo(() => {
    if (viewMode === 'search' && debouncedQuery) {
      if (semanticResults.length > 0) {
        return semanticResults.map(r => r.event);
      }
      // Fallback to keyword search
      const queryLower = debouncedQuery.toLowerCase();
      return events.filter(e => 
        e.value.toLowerCase().includes(queryLower) ||
        e.metadata?.title?.toLowerCase().includes(queryLower)
      );
    }
    return events;
  }, [events, debouncedQuery, semanticResults, viewMode]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, MemoryEvent[]>();
    for (const event of displayedEvents) {
      const date = new Date(event.ts);
      const dateKey = date.toLocaleDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    }
    return Array.from(groups.entries()).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [displayedEvents]);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Note: In production, add deleteEvent method to MemoryStore
      // For now, reload events (deletion would require store enhancement)
      const loaded = await MemoryStoreInstance.getEvents({ limit: 100 });
      setEvents(loaded.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('[MemorySidebar] Failed to delete event:', error);
    }
  };

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-gray-900/95 backdrop-blur-xl border-l border-gray-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-400" />
                <h2 className="text-lg font-semibold text-white">SuperMemory</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-800">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search memories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              {/* View Mode Tabs */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  <Clock size={14} className="inline mr-1.5" />
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode('search')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'search'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  <Search size={14} className="inline mr-1.5" />
                  Search
                </button>
              </div>

              {/* Type Filter */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {(['all', 'search', 'visit', 'note', 'bookmark'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-purple-500/20 text-purple-200'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Loading memories...</div>
                </div>
              ) : viewMode === 'timeline' ? (
                <div className="p-4 space-y-4">
                  {groupedByDate.map(([date, dateEvents]) => (
                    <div key={date}>
                      <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                        {date}
                      </div>
                      <div className="space-y-2">
                        {dateEvents.map((event) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/40 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-purple-400 mb-1 uppercase">
                                  {event.type}
                                </div>
                                <div className="text-sm text-white font-medium line-clamp-2">
                                  {event.metadata?.title || event.value}
                                </div>
                                {event.metadata?.url && (
                                  <div className="text-xs text-gray-400 mt-1 truncate">
                                    {event.metadata.url}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(event.ts).toLocaleTimeString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="ml-2 p-1 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {groupedByDate.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                      <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No memories yet</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {semanticResults.length > 0 && (
                    <div className="text-xs text-purple-400 mb-2">Semantic matches</div>
                  )}
                  {displayedEvents.map((event) => {
                    const similarity = semanticResults.find(r => r.event.id === event.id)?.similarity;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {similarity !== undefined && (
                              <div className="text-xs text-purple-400 mb-1">
                                {Math.round(similarity * 100)}% match
                              </div>
                            )}
                            <div className="text-sm text-white font-medium line-clamp-2">
                              {event.metadata?.title || event.value}
                            </div>
                            {event.metadata?.url && (
                              <div className="text-xs text-gray-400 mt-1 truncate">
                                {event.metadata.url}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {displayedEvents.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                      <Search size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No results found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

