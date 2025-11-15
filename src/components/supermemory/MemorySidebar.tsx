/**
 * SuperMemory Sidebar
 * Complete UI for browsing and searching memory
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, Tag, X, Sparkles, Trash2, Pin, PinOff, BarChart3, FileText } from 'lucide-react';
import { MemoryEvent } from '../../core/supermemory/tracker';
import type { MemoryEventType } from '../../core/supermemory/event-types';
import { useSuggestions } from '../../core/supermemory/useSuggestions';
import { searchVectors } from '../../core/supermemory/vectorStore';
import { useDebounce } from '../../utils/useDebounce';
import { superMemoryDB } from '../../core/supermemory/db';
import { MemoryStoreInstance } from '../../core/supermemory/store';
import { MemorySummary, getSummaries } from '../../core/supermemory/summarizer';

interface MemorySidebarProps {
  open: boolean;
  onClose: () => void;
}

type ViewMode = 'timeline' | 'search' | 'tags' | 'visualization' | 'summaries';

export function MemorySidebar({ open, onClose }: MemorySidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<MemoryEvent['type'] | 'all'>('all');
  const [semanticResults, setSemanticResults] = useState<Array<{ event: MemoryEvent; similarity: number }>>([]);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [dateRange] = useState<{ start?: number; end?: number }>({}); // Reserved for future date filtering
  const [summaries, setSummaries] = useState<MemorySummary[]>([]);
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  // const keywordSuggestions = useSuggestions(debouncedQuery, { types: ['search', 'visit'], limit: 10 }); // Reserved for future autocomplete

  // Load events
  useEffect(() => {
    if (!open) return;

    const loadEvents = async () => {
      setLoading(true);
      try {
        const loaded = await MemoryStoreInstance.getEvents({
          type: selectedType !== 'all' ? selectedType : undefined,
          limit: 500,
          since: dateRange.start,
          until: dateRange.end,
          pinned: showPinnedOnly ? true : undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
        });
        setEvents(loaded);
      } catch (error) {
        console.error('[MemorySidebar] Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [open, selectedType, showPinnedOnly, selectedTags, dateRange]);

  // Load all tags
  useEffect(() => {
    if (!open) return;

    const loadTags = async () => {
      try {
        const tags = await superMemoryDB.getAllTags();
        setAllTags(tags);
      } catch (error) {
        console.error('[MemorySidebar] Failed to load tags:', error);
      }
    };

    loadTags();
  }, [open]);

  // Load summaries
  useEffect(() => {
    if (!open) return;

    const loadSummaries = async () => {
      try {
        const loadedSummaries = await getSummaries(50);
        setSummaries(loadedSummaries);
      } catch (error) {
        console.error('[MemorySidebar] Failed to load summaries:', error);
      }
    };

    loadSummaries();
  }, [open]);

  // Semantic search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setSemanticResults([]);
      return;
    }

    const performSemanticSearch = async () => {
      try {
        // Use new vector store search
        const results = await searchVectors(debouncedQuery, {
          maxVectors: 10,
          minSimilarity: 0.6,
        });
        
        // Load events for matched embeddings
        const matchedEvents: Array<{ event: MemoryEvent; similarity: number }> = [];
        for (const result of results) {
          try {
            const events = await MemoryStoreInstance.getEvents({ limit: 1000 });
            const found = events.find((e: MemoryEvent) => e.id === result.embedding.eventId);
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
      await superMemoryDB.deleteEvent(eventId);
      setEvents(events.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('[MemorySidebar] Failed to delete event:', error);
    }
  };

  const handleTogglePin = async (eventId: string, pinned: boolean) => {
    try {
      await superMemoryDB.updateEventMetadata(eventId, { pinned });
      setEvents(events.map(e => 
        e.id === eventId 
          ? { ...e, metadata: { ...e.metadata, pinned } }
          : e
      ));
    } catch (error) {
      console.error('[MemorySidebar] Failed to toggle pin:', error);
    }
  };

  const handleAddTag = async (eventId: string, tag: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      
      const currentTags = event.metadata?.tags || [];
      if (currentTags.includes(tag)) return;
      
      const newTags = [...currentTags, tag];
      await superMemoryDB.updateEventMetadata(eventId, { tags: newTags });
      
      setEvents(events.map(e => 
        e.id === eventId 
          ? { ...e, metadata: { ...e.metadata, tags: newTags } }
          : e
      ));
      
      if (!allTags.includes(tag)) {
        setAllTags([...allTags, tag].sort());
      }
    } catch (error) {
      console.error('[MemorySidebar] Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (eventId: string, tag: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      
      const currentTags = event.metadata?.tags || [];
      const newTags = currentTags.filter((t: string) => t !== tag);
      await superMemoryDB.updateEventMetadata(eventId, { tags: newTags });
      
      setEvents(events.map(e => 
        e.id === eventId 
          ? { ...e, metadata: { ...e.metadata, tags: newTags } }
          : e
      ));
    } catch (error) {
      console.error('[MemorySidebar] Failed to remove tag:', error);
    }
  };

  const handleToggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
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
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  <Clock size={12} className="inline mr-1" />
                  Timeline
                </button>
                <button
                  onClick={() => setViewMode('search')}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'search'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  <Search size={12} className="inline mr-1" />
                  Search
                </button>
                <button
                  onClick={() => setViewMode('tags')}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'tags'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  <Tag size={12} className="inline mr-1" />
                  Tags
                </button>
                <button
                  onClick={() => setViewMode('visualization')}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'visualization'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  <BarChart3 size={12} className="inline mr-1" />
                  Stats
                </button>
                <button
                  onClick={() => setViewMode('summaries')}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    viewMode === 'summaries'
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  <FileText size={12} className="inline mr-1" />
                  Summaries
                </button>
              </div>

              {/* Pinned Filter */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    showPinnedOnly
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                      : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                  }`}
                >
                  {showPinnedOnly ? <Pin size={12} /> : <PinOff size={12} />}
                  {showPinnedOnly ? 'Pinned' : 'All'}
                </button>
              </div>

              {/* Tag Filters */}
              {allTags.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-400 mb-2">Filter by tags:</div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.slice(0, 10).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleToggleTagFilter(tag)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
                            : 'bg-gray-800/50 text-gray-400 border border-gray-700'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                ) : viewMode === 'summaries' ? (
                  <div className="p-4 space-y-4">
                    {summaries.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <FileText size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No summaries yet</p>
                        <p className="text-xs mt-1">Summaries are created automatically for old events</p>
                      </div>
                    ) : (
                      summaries.map((summary) => (
                        <motion.div
                          key={summary.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-purple-400 uppercase">
                                {summary.type} Summary
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(summary.periodStart).toLocaleDateString()} - {new Date(summary.periodEnd).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {summary.eventCount} events
                            </div>
                          </div>
                          <div className="text-sm text-white mb-2">
                            {summary.summary}
                          </div>
                          {summary.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {summary.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-200"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2">
                            Created: {new Date(summary.createdAt).toLocaleString()}
                          </div>
                        </motion.div>
                      ))
                    )}
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
                              className={`p-3 rounded-lg border transition-colors ${
                                event.metadata?.pinned
                                  ? 'bg-purple-900/20 border-purple-500/40 hover:border-purple-500/60'
                                  : 'bg-gray-800/50 border-gray-700/50 hover:border-purple-500/40'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="text-xs text-purple-400 uppercase">
                                      {event.type}
                                    </div>
                                    {event.metadata?.pinned && (
                                      <Pin size={12} className="text-purple-400" />
                                    )}
                                  </div>
                                  <div className="text-sm text-white font-medium line-clamp-2">
                                    {event.metadata?.title || event.value}
                                  </div>
                                  {event.metadata?.url && (
                                    <div className="text-xs text-gray-400 mt-1 truncate">
                                      {event.metadata.url}
                                    </div>
                                  )}
                                  {event.metadata?.tags && event.metadata.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {event.metadata.tags.map((tag: string) => (
                                        <span
                                          key={tag}
                                          className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-200"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(event.ts).toLocaleTimeString()}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    onClick={() => handleTogglePin(event.id, !event.metadata?.pinned)}
                                    className="p-1 text-gray-400 hover:text-purple-400 transition-colors"
                                    title={event.metadata?.pinned ? 'Unpin' : 'Pin'}
                                  >
                                    {event.metadata?.pinned ? <Pin size={14} /> : <PinOff size={14} />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
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
                ) : viewMode === 'search' ? (
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
                ) : viewMode === 'tags' ? (
                <div className="p-4 space-y-4">
                  <div className="text-sm font-semibold text-gray-300 mb-3">All Tags</div>
                  {allTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const tagEvents = events.filter(e => e.metadata?.tags?.includes(tag));
                        return (
                          <button
                            key={tag}
                            onClick={() => handleToggleTagFilter(tag)}
                            className={`px-3 py-2 rounded-lg border transition-colors ${
                              selectedTags.includes(tag)
                                ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                                : 'bg-gray-800/50 text-gray-400 border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Tag size={14} />
                              <span>#{tag}</span>
                              <span className="text-xs text-gray-500">({tagEvents.length})</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-12">
                      <Tag size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No tags yet</p>
                    </div>
                  )}
                </div>
              ) : viewMode === 'visualization' ? (
                <div className="p-4 space-y-4">
                  <div className="text-sm font-semibold text-gray-300 mb-3">Statistics</div>
                  
                  {/* Event Type Distribution */}
                  <div className="space-y-2">
                    <div className="text-xs text-gray-400 uppercase">Event Types</div>
                    {(['search', 'visit', 'note', 'bookmark', 'highlight', 'agent'] as const).map((type) => {
                      const count = events.filter(e => e.type === type).length;
                      const percentage = events.length > 0 ? (count / events.length) * 100 : 0;
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-300 capitalize">{type}</span>
                            <span className="text-gray-400">{count} ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Timeline Activity */}
                  <div className="space-y-2 mt-4">
                    <div className="text-xs text-gray-400 uppercase">Activity Over Time</div>
                    <div className="flex items-end gap-1 h-20">
                      {Array.from({ length: 7 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
                        const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();
                        const dayEvents = events.filter(e => e.ts >= dayStart && e.ts <= dayEnd);
                        const maxEvents = Math.max(...Array.from({ length: 7 }, (_, j) => {
                          const d = new Date();
                          d.setDate(d.getDate() - (6 - j));
                          const ds = new Date(d.setHours(0, 0, 0, 0)).getTime();
                          const de = new Date(d.setHours(23, 59, 59, 999)).getTime();
                          return events.filter(e => e.ts >= ds && e.ts <= de).length;
                        }), 1);
                        const height = maxEvents > 0 ? (dayEvents.length / maxEvents) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-gray-800 rounded-t overflow-hidden" style={{ height: '60px' }}>
                              <div
                                className="w-full bg-purple-500 transition-all"
                                style={{ height: `${height}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500">
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Total Events</div>
                      <div className="text-2xl font-bold text-white">{events.length}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Pinned</div>
                      <div className="text-2xl font-bold text-purple-400">
                        {events.filter(e => e.metadata?.pinned).length}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Tagged</div>
                      <div className="text-2xl font-bold text-blue-400">
                        {events.filter(e => e.metadata?.tags && e.metadata.tags.length > 0).length}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Unique Tags</div>
                      <div className="text-2xl font-bold text-green-400">{allTags.length}</div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

