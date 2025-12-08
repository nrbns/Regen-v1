import { useEffect, useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import {
  Search,
  Trash2,
  Clock,
  Globe,
  X,
  ShieldCheck,
  AlertTriangle,
  BarChart2,
  Filter,
  ExternalLink,
  Copy,
  HardDrive,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ipc } from '../lib/ipc-typed';
import { useIPCEvent } from '../lib/use-ipc-event';

type HistoryEntry = {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  visitCount?: number;
  favicon?: string;
  lastVisitTime?: number;
};

type GroupedHistory = {
  date: string;
  entries: HistoryEntry[];
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'search' | 'secure' | 'insecure'>('all');
  const [searchResults, setSearchResults] = useState<HistoryEntry[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percent: number;
    updatedAt: number;
  } | null>(null);
  const [storageStatus, setStorageStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const list = (await ipc.history.list()) as HistoryEntry[];
        // Ensure we have an array
        if (Array.isArray(list)) {
          setItems(list);
        } else {
          setItems([]);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
        setItems([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  // Listen for history updates
  useIPCEvent(
    'history:updated',
    () => {
      ipc.history
        .list()
        .then((list: any) => setItems(list || []))
        .catch(console.error);
    },
    []
  );

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    ipc.history
      .search(query)
      .then((results: any) => {
        if (cancelled) return;
        setSearchResults(Array.isArray(results) ? results : []);
      })
      .catch((error: any) => {
        if (cancelled) return;
        console.error('History search failed:', error);
        setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) {
          setSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const updateStorageEstimate = useCallback(async () => {
    if (!navigator?.storage?.estimate) {
      if (mountedRef.current) {
        setStorageStatus('error');
      }
      return;
    }

    if (mountedRef.current) {
      setStorageStatus('loading');
    }

    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      if (!mountedRef.current) return;
      const percent = quota > 0 ? (usage / quota) * 100 : 0;
      setStorageInfo({ usage, quota, percent, updatedAt: Date.now() });
      setStorageStatus('idle');
    } catch (error) {
      console.error('Failed to estimate storage:', error);
      if (mountedRef.current) {
        setStorageStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    updateStorageEstimate();
    const interval = window.setInterval(updateStorageEstimate, 45000);
    return () => window.clearInterval(interval);
  }, [updateStorageEstimate]);

  const handleRefreshStorage = useCallback(() => {
    void updateStorageEstimate();
  }, [updateStorageEstimate]);

  const derivedStats = useMemo(() => {
    const uniqueDomains = new Set<string>();
    let secureCount = 0;
    let insecureCount = 0;
    let searchCount = 0;

    items.forEach(entry => {
      try {
        const urlObj = new URL(entry.url);
        uniqueDomains.add(urlObj.hostname);
        if (urlObj.protocol === 'https:') {
          secureCount += 1;
        } else {
          insecureCount += 1;
        }
        if (detectSearchQuery(entry.url)) {
          searchCount += 1;
        }
      } catch {
        /* ignore */
      }
    });

    return {
      total: items.length,
      uniqueDomains: uniqueDomains.size,
      secureCount,
      insecureCount,
      searchCount,
    };
  }, [items]);

  // Filter and group history entries
  const groupedHistory = useMemo<GroupedHistory[]>(() => {
    const sourceItems = searchResults ?? items;
    let filtered = sourceItems;

    // Apply search filter
    if (!searchResults && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = sourceItems.filter(
        entry =>
          entry.title.toLowerCase().includes(query) || entry.url.toLowerCase().includes(query)
      );
    }

    if (activeFilter !== 'all') {
      filtered = filtered.filter(entry => {
        switch (activeFilter) {
          case 'search':
            return Boolean(detectSearchQuery(entry.url));
          case 'secure':
            try {
              return new URL(entry.url).protocol === 'https:';
            } catch {
              return false;
            }
          case 'insecure':
            try {
              return new URL(entry.url).protocol !== 'https:';
            } catch {
              return false;
            }
          default:
            return true;
        }
      });
    }

    // Group by date (Today, Yesterday, This Week, This Month, Older)
    const groups: { [key: string]: HistoryEntry[] } = {};
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    filtered.forEach(entry => {
      const baseTime = entry.lastVisitTime ?? entry.timestamp;
      const diff = now - baseTime;
      let groupKey: string;

      if (diff < oneDay) {
        groupKey = 'Today';
      } else if (diff < oneDay * 2) {
        groupKey = 'Yesterday';
      } else if (diff < oneWeek) {
        groupKey = 'This Week';
      } else if (diff < oneMonth) {
        groupKey = 'This Month';
      } else {
        groupKey = 'Older';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
    });

    // Convert to array and sort
    return Object.entries(groups)
      .map(([date, entries]) => ({
        date,
        entries: entries.sort(
          (a, b) => (b.lastVisitTime ?? b.timestamp) - (a.lastVisitTime ?? a.timestamp)
        ),
      }))
      .sort((a, b) => {
        const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
        return order.indexOf(a.date) - order.indexOf(b.date);
      });
  }, [items, searchResults, searchQuery, activeFilter]);

  const totalResultCount = useMemo(
    () => groupedHistory.reduce((sum, group) => sum + group.entries.length, 0),
    [groupedHistory]
  );

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all browsing history?')) {
      await ipc.history.clear();
      setItems([]);
    }
  };

  const handleDeleteEntry = async (url: string) => {
    await ipc.history.deleteUrl?.(url);
    setItems(items.filter(e => e.url !== url));
    setSelectedEntry(prev => (prev?.url === url ? null : prev));
  };

  const handleNavigate = async (url: string) => {
    try {
      // Create tab with the URL directly - it will be activated automatically
      const result = await ipc.tabs.create(url);
      if (result) {
        // Navigate to home to show the tab in MainView
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to open history URL:', error);
      // Fallback: navigate to home and create blank tab
      navigate('/');
      setTimeout(() => {
        ipc.tabs.create('about:blank').catch(console.error);
      }, 100);
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 1000 * 60 * 60 * 24) {
      return formatRelativeTimeFromNow(timestamp);
    }
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  const getFaviconUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return undefined;
    }
  };

  const detectSearchQuery = (url: string) => {
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      const params = urlObj.searchParams;

      if (host.includes('google')) {
        return params.get('q') || params.get('query');
      }
      if (host.includes('duckduckgo')) {
        return params.get('q');
      }
      if (host.includes('bing.com')) {
        return params.get('q');
      }
      if (host.includes('search.yahoo.com')) {
        return params.get('p');
      }
      if (host.includes('youtube.com') || host.includes('youtu.be')) {
        return params.get('search_query');
      }
      if (host.includes('reddit.com')) {
        return params.get('q');
      }
      return null;
    } catch {
      return null;
    }
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegExp(query)})`, 'ig');
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="rounded-sm bg-blue-500/30 px-0.5 text-blue-100">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1A1D28]">
        <Clock size={24} className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#1A1D28] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">History</h2>
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-gray-500">
              <BarChart2 size={14} />
              {derivedStats.total} visits · {derivedStats.uniqueDomains} domains
            </span>
          </div>
          <motion.button
            onClick={handleClearHistory}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-900/60 px-4 py-2 text-gray-300 transition-colors hover:bg-red-600/20 hover:text-red-400"
          >
            <Trash2 size={18} />
            <span>Clear browsing data</span>
          </motion.button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <HistoryStatCard
            label="Secure"
            value={derivedStats.secureCount}
            accent="text-emerald-300"
            helper="HTTPS pages"
            icon={<ShieldCheck size={16} className="text-emerald-300" />}
          />
          <HistoryStatCard
            label="Insecure"
            value={derivedStats.insecureCount}
            accent="text-amber-300"
            helper="HTTP pages"
            icon={<AlertTriangle size={16} className="text-amber-300" />}
          />
          <HistoryStatCard
            label="Searches"
            value={derivedStats.searchCount}
            accent="text-blue-300"
            helper="Recognised search queries"
            icon={<Search size={16} className="text-blue-300" />}
          />
          <StorageUsageCard
            usage={storageInfo?.usage ?? 0}
            quota={storageInfo?.quota ?? 0}
            percent={storageInfo?.percent ?? 0}
            updatedAt={storageInfo?.updatedAt ?? 0}
            status={storageStatus}
            onRefresh={handleRefreshStorage}
          />
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search history"
            className="h-10 w-full rounded-lg border border-gray-700/50 bg-gray-900/60 pl-10 pr-4 text-gray-200 placeholder-gray-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          {searching && (
            <Loader2
              size={16}
              className={`absolute top-1/2 -translate-y-1/2 animate-spin text-blue-400 ${
                searchQuery ? 'right-9' : 'right-3'
              }`}
            />
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <Filter size={14} />
          <FilterChip
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
            label="All"
          />
          <FilterChip
            active={activeFilter === 'search'}
            onClick={() => setActiveFilter('search')}
            label="Search"
          />
          <FilterChip
            active={activeFilter === 'secure'}
            onClick={() => setActiveFilter('secure')}
            label="Secure"
          />
          <FilterChip
            active={activeFilter === 'insecure'}
            onClick={() => setActiveFilter('insecure')}
            label="Insecure"
          />
        </div>
      </div>

      {/* History list */}
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 xl:grid-cols-[2fr_minmax(280px,1fr)]">
        <div>
          {searchResults && (
            <div className="mb-4 flex items-center gap-2 text-xs text-blue-300">
              <Search size={14} />
              <span>
                Showing {totalResultCount} high-relevance result{totalResultCount === 1 ? '' : 's'}{' '}
                for “{searchQuery.trim()}”
              </span>
            </div>
          )}
          {groupedHistory.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Globe size={48} className="mb-4 text-gray-600" />
              <h3 className="mb-2 text-lg font-semibold text-gray-300">
                {searchQuery ? 'No results found' : 'No history yet'}
              </h3>
              <p className="text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : 'Pages you visit will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedHistory.map(group => (
                <div key={group.date}>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    {group.date}
                  </h3>
                  <div className="space-y-1">
                    {group.entries.map(entry => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group flex cursor-pointer items-center gap-3 rounded-lg border bg-gray-900/60 p-3 transition-all hover:bg-gray-900/80 ${
                          selectedEntry?.id === entry.id
                            ? 'border-blue-500/40 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                            : 'border-gray-800/50 hover:border-gray-700/50'
                        }`}
                        onClick={() => setSelectedEntry(entry)}
                      >
                        {/* Favicon */}
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-gray-700/50 bg-gray-800/50">
                          {entry.favicon || getFaviconUrl(entry.url) ? (
                            <img
                              src={entry.favicon || getFaviconUrl(entry.url)}
                              alt=""
                              className="h-6 w-6"
                              onError={e => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Globe size={16} className="text-gray-500" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-gray-200">
                              {searchQuery
                                ? highlightQuery(entry.title || entry.url, searchQuery)
                                : entry.title || entry.url}
                            </span>
                            <span className="flex-shrink-0 text-xs text-gray-500">
                              {formatTime(entry.lastVisitTime ?? entry.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs text-gray-400">
                              {searchQuery ? highlightQuery(entry.url, searchQuery) : entry.url}
                            </span>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              {entry.visitCount && entry.visitCount > 1 && (
                                <span className="text-xs text-gray-500">
                                  {entry.visitCount} visits
                                </span>
                              )}
                              {detectSearchQuery(entry.url) && (
                                <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-blue-300">
                                  Search
                                </span>
                              )}
                              {(() => {
                                try {
                                  const protocol = new URL(entry.url).protocol;
                                  return (
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                                        protocol === 'https:'
                                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                          : 'border-amber-500/30 bg-amber-500/15 text-amber-200'
                                      }`}
                                    >
                                      {protocol === 'https:' ? 'Secure' : 'Insecure'}
                                    </span>
                                  );
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Delete button */}
                        <motion.button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteEntry(entry.url);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="flex-shrink-0 rounded-lg p-1.5 text-gray-500 opacity-0 transition-all hover:bg-red-600/20 hover:text-red-400 group-hover:opacity-100"
                          title="Remove from history"
                        >
                          <X size={16} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="hidden xl:block">
          {selectedEntry ? (
            <HistoryDetailsPanel
              entry={selectedEntry}
              detectSearchQuery={detectSearchQuery}
              formatRelative={formatRelativeTimeFromNow}
              onOpen={() => handleNavigate(selectedEntry.url)}
              onCopy={() => {
                if (navigator?.clipboard?.writeText) {
                  navigator.clipboard.writeText(selectedEntry.url).catch(console.error);
                }
              }}
              onRemove={() => handleDeleteEntry(selectedEntry.url)}
            />
          ) : (
            <div className="sticky top-6 flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-gray-800/60 bg-gray-900/40 p-4 text-sm text-gray-500">
              <Globe size={28} className="mb-3 text-gray-600" />
              <p>Select a history item to see details, cached parameters, and quick actions.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? 'border-blue-500/40 bg-blue-500/15 text-blue-200'
          : 'border-gray-700/60 bg-gray-900/40 text-gray-400 hover:border-gray-600 hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function HistoryStatCard({
  label,
  value,
  helper,
  icon,
  accent,
}: {
  label: string;
  value: number;
  helper: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800/60 bg-gray-900/40 px-3 py-2 text-xs text-gray-400">
      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-700/50 bg-gray-800/60">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.24em] text-gray-500">{label}</span>
        <span className={`text-base font-semibold ${accent}`}>{value}</span>
        <span className="text-[10px] text-gray-500">{helper}</span>
      </div>
    </div>
  );
}

function StorageUsageCard({
  usage,
  quota,
  percent,
  status,
  updatedAt,
  onRefresh,
}: {
  usage: number;
  quota: number;
  percent: number;
  status: 'idle' | 'loading' | 'error';
  updatedAt: number;
  onRefresh: () => void;
}) {
  const percentClamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const usageLabel = formatBytesReadable(usage);
  const quotaLabel = quota > 0 ? formatBytesReadable(quota) : '—';
  const percentLabel = `${percentClamped >= 10 ? Math.round(percentClamped) : percentClamped.toFixed(1)}%`;
  const updatedLabel = updatedAt ? formatRelativeTimeFromNow(updatedAt) : 'moments ago';

  return (
    <div className="flex min-w-[200px] flex-col gap-2 rounded-lg border border-gray-800/60 bg-gray-900/40 px-3 py-2 text-xs text-gray-400">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-700/50 bg-gray-800/60">
            <HardDrive size={16} className="text-indigo-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.24em] text-gray-500">
              Cache usage
            </span>
            <span className="text-base font-semibold text-indigo-200">{usageLabel}</span>
            <span className="text-[10px] text-gray-500">
              of {quotaLabel} ({percentLabel})
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={status === 'loading'}
          className="rounded-md border border-gray-700/60 p-1.5 text-gray-400 transition-colors hover:border-indigo-400/40 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
          title="Refresh storage estimate"
        >
          <RefreshCw
            size={14}
            className={status === 'loading' ? 'animate-spin text-indigo-200' : 'text-current'}
          />
        </button>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 transition-[width] duration-300"
          style={{ width: `${percentClamped}%` }}
          aria-valuenow={percentClamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="text-[10px] text-gray-500">
        Updated {status === 'loading' ? '…' : updatedLabel}
      </div>
      {status === 'error' && (
        <div className="text-[10px] text-amber-300">
          Storage estimate unavailable in this environment.
        </div>
      )}
    </div>
  );
}

function HistoryDetailsPanel({
  entry,
  detectSearchQuery,
  formatRelative,
  onOpen,
  onCopy,
  onRemove,
}: {
  entry: HistoryEntry;
  detectSearchQuery: (url: string) => string | null;
  formatRelative: (timestamp: number) => string;
  onOpen: () => void;
  onCopy: () => void;
  onRemove: () => void;
}) {
  let parsed: URL | null = null;
  try {
    parsed = new URL(entry.url);
  } catch {
    parsed = null;
  }

  const query = parsed ? detectSearchQuery(entry.url) : null;
  const params = parsed ? Array.from(parsed.searchParams.entries()) : [];
  const cacheWindowMs =
    entry.lastVisitTime && entry.lastVisitTime > entry.timestamp
      ? entry.lastVisitTime - entry.timestamp
      : 0;

  return (
    <div className="sticky top-6 space-y-4 rounded-xl border border-gray-800/60 bg-gray-900/50 p-4 text-sm text-gray-300 shadow-[0_18px_45px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-gray-100">
            {entry.title || 'Untitled page'}
          </h4>
          <p className="break-all text-xs text-gray-500">{entry.url}</p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onOpen}
            className="rounded-md border border-blue-500/30 bg-blue-500/15 p-1.5 text-blue-200 transition-colors hover:bg-blue-500/25"
            title="Open in a new tab"
          >
            <ExternalLink size={14} />
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="rounded-md border border-gray-700/60 bg-gray-800/60 p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
            title="Copy URL"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md border border-red-500/40 bg-red-500/15 p-1.5 text-red-200 transition-colors hover:bg-red-500/25"
            title="Remove from history"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">First visit</span>
          <span className="text-gray-300">{new Date(entry.timestamp).toLocaleString()}</span>
          <span className="text-gray-500">{formatRelative(entry.timestamp)}</span>
        </div>
        {entry.lastVisitTime && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Last visit</span>
            <span className="text-gray-300">{new Date(entry.lastVisitTime).toLocaleString()}</span>
            <span className="text-gray-500">{formatRelative(entry.lastVisitTime)}</span>
          </div>
        )}
        {entry.visitCount && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Visits</span>
            <span className="text-gray-300">{entry.visitCount}</span>
          </div>
        )}
        {cacheWindowMs > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Cache span</span>
            <span className="text-gray-300">{formatDurationFromMs(cacheWindowMs)}</span>
          </div>
        )}
        {parsed && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Domain</span>
              <span className="text-gray-300">{parsed.hostname}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Protocol</span>
              <span
                className={`rounded-full border px-2 py-0.5 ${
                  parsed.protocol === 'https:'
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200'
                    : 'border-amber-500/30 bg-amber-500/15 text-amber-200'
                }`}
              >
                {parsed.protocol.replace(':', '').toUpperCase()}
              </span>
            </div>
          </>
        )}
      </div>

      {query && (
        <div className="space-y-1 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-100">
          <div className="flex items-center gap-2 font-semibold text-blue-200">
            <Search size={14} />
            Recognised search query
          </div>
          <p className="text-sm text-blue-100">{query}</p>
        </div>
      )}

      {params.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs uppercase tracking-[0.24em] text-gray-500">Query Parameters</h5>
          <div className="space-y-1">
            {params.map(([key, value]) => (
              <div
                key={key}
                className="flex items-start gap-2 rounded-md border border-gray-800/50 bg-gray-900/50 px-2 py-1 text-xs text-gray-400"
              >
                <span className="min-w-[80px] font-medium text-gray-300">{key}</span>
                <span className="break-all text-gray-400">{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
  { unit: 'second', ms: 1000 },
];

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function formatRelativeTimeFromNow(timestamp: number): string {
  const diff = timestamp - Date.now();
  const absDiff = Math.abs(diff);

  for (const { unit, ms } of RELATIVE_UNITS) {
    if (absDiff >= ms || unit === 'second') {
      const value = Math.round(diff / ms);
      return RELATIVE_TIME_FORMATTER.format(value, unit);
    }
  }

  return '';
}

function formatBytesReadable(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, exponent);
  return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${units[exponent]}`;
}

function formatDurationFromMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  let remaining = Math.floor(ms / 1000);
  const units = [
    { label: 'd', value: 86400 },
    { label: 'h', value: 3600 },
    { label: 'm', value: 60 },
  ];
  const parts: string[] = [];

  for (const { label, value } of units) {
    if (remaining >= value) {
      const amount = Math.floor(remaining / value);
      remaining -= amount * value;
      parts.push(`${amount}${label}`);
    }
  }

  if (parts.length === 0) {
    parts.push(`${Math.max(1, remaining)}s`);
  }

  return parts.join(' ');
}
