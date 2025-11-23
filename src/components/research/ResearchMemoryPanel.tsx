/**
 * Research Memory Panel - Redesigned SuperMemory UI
 * Modern, scannable, keyboard-first interface for browsing memories
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Pin,
  PinOff,
  Copy,
  ExternalLink,
  FileText,
  Plus,
  Tag as TagIcon,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import { MemoryEvent } from '../../core/supermemory/tracker';
import { semanticSearchMemories, SemanticMemoryMatch } from '../../core/supermemory/search';
import { useDebounce } from '../../utils/useDebounce';
import { superMemoryDB } from '../../core/supermemory/db';
import { MemoryStoreInstance } from '../../core/supermemory/store';
import { showToast } from '../../state/toastStore';
import { useTokens } from '../../ui/useTokens';
import { SkeletonList } from '../../ui/skeleton';
import { Button } from '../../ui/button';
import { ipc } from '../../lib/ipc-typed';
import { CreateMemoryDialog } from './CreateMemoryDialog';
import { ExportMemoriesDialog } from './ExportMemoriesDialog';

interface ResearchMemoryPanelProps {
  open: boolean;
  onClose: () => void;
  onCreateMemory?: () => void;
}

type ViewMode = 'all' | 'research' | 'trade';
type DisplayMode = 'expanded' | 'compact';
type SortMode = 'newest' | 'oldest' | 'relevance';

interface MemoryCardProps {
  memory: MemoryEvent;
  compact?: boolean;
  onPin: (id: string, pinned: boolean) => void;
  onCopy: (memory: MemoryEvent) => void;
  onOpen: (memory: MemoryEvent) => void;
  onDelete?: (id: string) => void;
}

function MemoryCard({ memory, compact, onPin, onCopy, onOpen, onDelete }: MemoryCardProps) {
  const tokens = useTokens();
  const isPinned = memory.metadata?.pinned ?? false;
  const typeLabel = memory.type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const typeInitial = memory.type.charAt(0).toUpperCase();
  const timeStr = new Date(memory.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = new Date(memory.ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

  const handleCopy = useCallback(() => {
    const text = memory.metadata?.title || memory.value || '';
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast('success', 'Copied to clipboard');
        onCopy(memory);
      })
      .catch(() => {
        showToast('error', 'Failed to copy');
      });
  }, [memory, onCopy]);

  const handleOpen = useCallback(() => {
    if (memory.metadata?.url) {
      window.open(memory.metadata.url, '_blank');
    }
    onOpen(memory);
  }, [memory, onOpen]);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="group relative"
    >
      <div
        className={`
          rounded-lg border transition-all duration-200
          ${
            isPinned
              ? 'bg-[var(--surface-elevated)] border-[var(--color-primary-500)]/40 shadow-md'
              : 'bg-[var(--surface-panel)] border-[var(--surface-border)] hover:border-[var(--color-primary-500)]/30'
          }
          hover:shadow-md
        `}
        style={{ padding: tokens.spacing(3) }}
      >
        <div className="flex items-start gap-3">
          {/* Type indicator */}
          <div
            className="flex-shrink-0 flex flex-col items-center"
            style={{ width: tokens.spacing(10) }}
          >
            <div
              className={`
                rounded-full flex items-center justify-center font-semibold text-xs
                ${
                  isPinned
                    ? 'bg-[var(--color-primary-500)]/20 text-[var(--color-primary-400)]'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                }
              `}
              style={{
                width: tokens.spacing(8),
                height: tokens.spacing(8),
              }}
              aria-label={`Type: ${typeLabel}`}
            >
              {typeInitial}
            </div>
            {!compact && (
              <div
                className="text-[var(--text-muted)] text-xs mt-1"
                style={{ fontSize: tokens.fontSize.xs }}
              >
                {dateStr}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
                  style={{ fontSize: tokens.fontSize.xs }}
                >
                  {typeLabel}
                </span>
                {isPinned && (
                  <Pin
                    size={12}
                    className="text-[var(--color-primary-400)] flex-shrink-0"
                    aria-label="Pinned"
                  />
                )}
              </div>
              <div
                className="text-[var(--text-muted)] text-xs flex-shrink-0"
                style={{ fontSize: tokens.fontSize.xs }}
              >
                {timeStr}
              </div>
            </div>

            <h4
              className="font-semibold text-[var(--text-primary)] mb-1 line-clamp-2"
              style={{ fontSize: tokens.fontSize.sm }}
            >
              {memory.metadata?.title || memory.value}
            </h4>

            {!compact && memory.metadata?.url && (
              <div
                className="text-[var(--text-muted)] text-xs truncate mb-2"
                style={{ fontSize: tokens.fontSize.xs }}
              >
                {memory.metadata.url}
              </div>
            )}

            {!compact && memory.value && memory.value !== memory.metadata?.title && (
              <p
                className="text-[var(--text-secondary)] text-sm line-clamp-2 mb-2"
                style={{ fontSize: tokens.fontSize.sm }}
              >
                {memory.value}
              </p>
            )}

            {/* Tags */}
            {memory.metadata?.tags && memory.metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {memory.metadata.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] text-[var(--color-primary-300)] text-xs"
                    style={{ fontSize: tokens.fontSize.xs }}
                  >
                    <TagIcon size={10} />
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions - always visible but subtle */}
          <div
            className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-2"
            role="group"
            aria-label="Memory actions"
          >
            <button
              onClick={() => onPin(memory.id, !isPinned)}
              className={`
                p-1.5 rounded-md transition-colors
                ${
                  isPinned
                    ? 'text-[var(--color-primary-400)] bg-[var(--color-primary-500)]/10'
                    : 'text-[var(--text-muted)] hover:text-[var(--color-primary-400)] hover:bg-[var(--surface-hover)]'
                }
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
              `}
              aria-label={isPinned ? 'Unpin memory' : 'Pin memory'}
              title={isPinned ? 'Unpin' : 'Pin'}
            >
              {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
            </button>
            {memory.metadata?.url && (
              <button
                onClick={handleOpen}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--color-primary-400)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1"
                aria-label="Open in new tab"
                title="Open"
              >
                <ExternalLink size={14} />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--color-primary-400)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1"
              aria-label="Copy to clipboard"
              title="Copy"
            >
              <Copy size={14} />
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(memory.id)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                aria-label="Delete memory"
                title="Delete"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

export function ResearchMemoryPanel({ open, onClose, onCreateMemory }: ResearchMemoryPanelProps) {
  const tokens = useTokens();
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<ViewMode>('all');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('expanded');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [semanticResults, setSemanticResults] = useState<SemanticMemoryMatch[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  // Reserved for future timeline view
  // const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [_focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search with /
      if (e.key === '/' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Create memory with n
      if ((e.key === 'n' || e.key === 'N') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCreateDialogOpen(true);
        return;
      }

      // Navigate list with j/k (vim-style)
      if (e.key === 'j' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? 0 : Math.min(prev + 1, events.length - 1);
          // Scroll into view
          if (listRef.current) {
            const item = listRef.current.children[next];
            item?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          return next;
        });
        return;
      }

      if (e.key === 'k' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev === null ? events.length - 1 : Math.max(prev - 1, 0);
          if (listRef.current) {
            const item = listRef.current.children[next];
            item?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          return next;
        });
        return;
      }

      // Escape to close
      if (e.key === 'Escape' && !(e.target instanceof HTMLInputElement)) {
        onClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, events.length, onCreateMemory, onClose]);

  // Load events
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await MemoryStoreInstance.getEvents({
        limit: 500,
      });
      setEvents(loaded);
    } catch (error) {
      console.error('[ResearchMemoryPanel] Failed to load events:', error);
      showToast('error', 'Failed to load memories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadEvents();
  }, [open, loadEvents]);

  // Refresh after memory creation
  const handleMemoryCreated = useCallback(() => {
    void loadEvents();
  }, [loadEvents]);

  // Load tags
  useEffect(() => {
    if (!open) return;

    const loadTags = async () => {
      try {
        const tags = await superMemoryDB.getAllTags();
        setAllTags(tags);
      } catch (error) {
        console.error('[ResearchMemoryPanel] Failed to load tags:', error);
      }
    };

    void loadTags();
  }, [open]);

  // Semantic search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 3) {
      setSemanticResults([]);
      return;
    }

    const performSemanticSearch = async () => {
      try {
        const results = await semanticSearchMemories(debouncedQuery, {
          limit: 50,
          minSimilarity: 0.5,
        });
        setSemanticResults(results);
      } catch (error) {
        console.error('[ResearchMemoryPanel] Semantic search failed:', error);
        setSemanticResults([]);
      }
    };

    void performSemanticSearch();
  }, [debouncedQuery]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Mode filter
    if (mode === 'research') {
      filtered = filtered.filter(e =>
        e.metadata?.tags?.some((t: string) => t.includes('research') || t.includes('#research'))
      );
    } else if (mode === 'trade') {
      filtered = filtered.filter(e =>
        e.metadata?.tags?.some((t: string) => t.includes('trade') || t.includes('#trade'))
      );
    }

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(e => selectedTags.some(tag => e.metadata?.tags?.includes(tag)));
    }

    // Search filter
    if (debouncedQuery) {
      if (semanticResults.length > 0) {
        const semanticIds = new Set(semanticResults.map(r => r.event.id));
        filtered = filtered.filter(e => semanticIds.has(e.id));
      } else {
        const queryLower = debouncedQuery.toLowerCase();
        filtered = filtered.filter(
          e =>
            e.value.toLowerCase().includes(queryLower) ||
            e.metadata?.title?.toLowerCase().includes(queryLower) ||
            e.metadata?.tags?.some((t: string) => t.toLowerCase().includes(queryLower))
        );
      }
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortMode === 'newest') return b.ts - a.ts;
      if (sortMode === 'oldest') return a.ts - b.ts;
      if (sortMode === 'relevance' && semanticResults.length > 0) {
        const aMatch = semanticResults.find(r => r.event.id === a.id);
        const bMatch = semanticResults.find(r => r.event.id === b.id);
        if (aMatch && bMatch) return bMatch.similarity - aMatch.similarity;
        if (aMatch) return -1;
        if (bMatch) return 1;
      }
      return b.ts - a.ts;
    });

    return filtered;
  }, [events, mode, selectedTags, debouncedQuery, semanticResults, sortMode]);

  const handleTogglePin = async (id: string, pinned: boolean) => {
    try {
      await superMemoryDB.updateEventMetadata(id, { pinned });
      setEvents(prev =>
        prev.map(e => (e.id === id ? { ...e, metadata: { ...e.metadata, pinned } } : e))
      );
      showToast('success', pinned ? 'Memory pinned' : 'Memory unpinned');
    } catch (error) {
      console.error('[ResearchMemoryPanel] Failed to toggle pin:', error);
      showToast('error', 'Failed to update memory');
    }
  };

  const handleCopy = useCallback((_memory: MemoryEvent) => {
    // Already handled in MemoryCard
  }, []);

  const handleOpen = useCallback(async (memory: MemoryEvent) => {
    if (memory.metadata?.url) {
      try {
        await ipc.tabs.create({ url: memory.metadata.url });
        showToast('success', 'Opened in new tab');
      } catch (error) {
        console.error('[ResearchMemoryPanel] Failed to open tab:', error);
        showToast('error', 'Failed to open in new tab');
      }
    }
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await superMemoryDB.deleteEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      showToast('success', 'Memory deleted');
    } catch (error) {
      console.error('[ResearchMemoryPanel] Failed to delete event:', error);
      showToast('error', 'Failed to delete memory');
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  // Group by date for timeline (reserved for future timeline view)
  // const groupedByDate = useMemo(() => {
  //   const groups = new Map<string, MemoryEvent[]>();
  //   for (const event of filteredEvents) {
  //     const date = new Date(event.ts);
  //     const dateKey = date.toLocaleDateString();
  //     if (!groups.has(dateKey)) {
  //       groups.set(dateKey, []);
  //     }
  //     groups.get(dateKey)!.push(event);
  //   }
  //   return Array.from(groups.entries()).sort(
  //     (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
  //   );
  // }, [filteredEvents]);

  if (!open) return null;

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
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-[var(--surface-root)] backdrop-blur-xl border-l border-[var(--surface-border)] z-50 flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Research Memory Panel"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between border-b border-[var(--surface-border)]"
              style={{ padding: tokens.spacing(4) }}
            >
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-[var(--color-primary-400)]" />
                <h2
                  className="font-semibold text-[var(--text-primary)]"
                  style={{ fontSize: tokens.fontSize.lg }}
                >
                  SuperMemory
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: tokens.spacing(4), paddingBottom: tokens.spacing(3) }}>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search memories... (Press / to focus)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--surface-panel)] border border-[var(--surface-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all"
                  style={{ fontSize: tokens.fontSize.sm }}
                  aria-label="Search memories"
                />
              </div>
            </div>

            {/* Primary Filters */}
            <div
              className="flex items-center gap-2 flex-wrap border-b border-[var(--surface-border)]"
              style={{
                padding: tokens.spacing(4),
                paddingTop: tokens.spacing(2),
                paddingBottom: tokens.spacing(3),
              }}
            >
              {(['all', 'research', 'trade'] as ViewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${
                      mode === m
                        ? 'bg-[var(--color-primary-600)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                  `}
                  style={{ fontSize: tokens.fontSize.sm }}
                  aria-pressed={mode === m}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setDisplayMode(displayMode === 'compact' ? 'expanded' : 'compact')}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                  aria-label={`Switch to ${displayMode === 'compact' ? 'expanded' : 'compact'} view`}
                  title={displayMode === 'compact' ? 'Expanded view' : 'Compact view'}
                >
                  {displayMode === 'compact' ? <List size={16} /> : <LayoutGrid size={16} />}
                </button>
                <div
                  className="text-sm text-[var(--text-muted)]"
                  style={{ fontSize: tokens.fontSize.sm }}
                >
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'item' : 'items'}
                </div>
              </div>
            </div>

            {/* Secondary Controls */}
            <div
              className="flex items-center gap-2 flex-wrap border-b border-[var(--surface-border)]"
              style={{
                padding: tokens.spacing(3),
                paddingTop: tokens.spacing(2),
                paddingBottom: tokens.spacing(2),
              }}
            >
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-[var(--text-muted)]" />
                <span
                  className="text-xs text-[var(--text-muted)]"
                  style={{ fontSize: tokens.fontSize.xs }}
                >
                  Sort:
                </span>
                <select
                  value={sortMode}
                  onChange={e => setSortMode(e.target.value as SortMode)}
                  className="px-2 py-1 rounded-md bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--text-primary)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                  style={{ fontSize: tokens.fontSize.xs }}
                  aria-label="Sort mode"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="relevance">Relevance</option>
                </select>
              </div>

              {/* Tag quick filters */}
              {allTags.slice(0, 5).map(tag => (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`
                    px-2 py-1 rounded-full text-xs font-medium transition-colors
                    ${
                      selectedTags.includes(tag)
                        ? 'bg-[var(--color-primary-600)] text-white'
                        : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                  `}
                  style={{ fontSize: tokens.fontSize.xs }}
                  aria-pressed={selectedTags.includes(tag)}
                >
                  #{tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-2 py-1 rounded-full text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                  style={{ fontSize: tokens.fontSize.xs }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" aria-busy={loading}>
              {loading ? (
                <div style={{ padding: tokens.spacing(4) }}>
                  <SkeletonList items={5} />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center text-center"
                  style={{ padding: tokens.spacing(8), minHeight: '300px' }}
                >
                  <FileText size={48} className="text-[var(--text-muted)] mb-4 opacity-50" />
                  <p className="text-[var(--text-primary)] font-medium mb-2">No memories found</p>
                  <p className="text-[var(--text-muted)]" style={{ fontSize: tokens.fontSize.sm }}>
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Start browsing to create memories'}
                  </p>
                </div>
              ) : (
                <ul
                  ref={listRef}
                  className="flex flex-col gap-3"
                  style={{ padding: tokens.spacing(4) }}
                  role="list"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredEvents.map(event => (
                      <MemoryCard
                        key={event.id}
                        memory={event}
                        compact={displayMode === 'compact'}
                        onPin={handleTogglePin}
                        onCopy={handleCopy}
                        onOpen={handleOpen}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-2 border-t border-[var(--surface-border)]"
              style={{ padding: tokens.spacing(4) }}
            >
              <Button
                tone="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setCreateDialogOpen(true)}
                fullWidth
                className="flex-1"
              >
                Create Memory
              </Button>
              <Button tone="secondary" size="sm" onClick={() => setExportDialogOpen(true)}>
                Export
              </Button>
            </div>
          </motion.div>

          {/* Create Memory Dialog */}
          <CreateMemoryDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onCreated={handleMemoryCreated}
          />

          {/* Export Memories Dialog */}
          <ExportMemoriesDialog
            open={exportDialogOpen}
            onClose={() => setExportDialogOpen(false)}
            events={events}
            availableTags={allTags}
          />
        </>
      )}
    </AnimatePresence>
  );
}
