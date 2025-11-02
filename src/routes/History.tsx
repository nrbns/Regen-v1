import { useEffect, useState, useMemo } from 'react';
import { Search, Trash2, Clock, Globe, X } from 'lucide-react';
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

  // Load history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const list = await ipc.history.list() as HistoryEntry[];
        setItems(list || []);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  // Listen for history updates
  useIPCEvent('history:updated', () => {
    ipc.history.list().then((list: any) => setItems(list || [])).catch(console.error);
  }, []);

  // Filter and group history entries
  const groupedHistory = useMemo<GroupedHistory[]>(() => {
    let filtered = items;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = items.filter(
        entry =>
          entry.title.toLowerCase().includes(query) ||
          entry.url.toLowerCase().includes(query)
      );
    }

    // Group by date (Today, Yesterday, This Week, This Month, Older)
    const groups: { [key: string]: HistoryEntry[] } = {};
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    filtered.forEach(entry => {
      const diff = now - entry.timestamp;
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
        entries: entries.sort((a, b) => b.timestamp - a.timestamp),
      }))
      .sort((a, b) => {
        const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
        return order.indexOf(a.date) - order.indexOf(b.date);
      });
  }, [items, searchQuery]);

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all browsing history?')) {
      await ipc.history.clear();
      setItems([]);
    }
  };

  const handleDeleteEntry = async (url: string) => {
    await ipc.history.deleteUrl?.(url);
    setItems(items.filter(e => e.url !== url));
  };

  const handleNavigate = (url: string) => {
    // Navigate to home first, then create a new tab with the URL
    navigate('/');
    setTimeout(() => {
      ipc.tabs.create(url).catch(console.error);
    }, 100);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFaviconUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
    } catch {
      return undefined;
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#1A1D28]">
        <Clock size={24} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#1A1D28] text-gray-100 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">History</h2>
          <motion.button
            onClick={handleClearHistory}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/60 hover:bg-red-600/20 border border-gray-700/50 text-gray-300 hover:text-red-400 transition-colors"
          >
            <Trash2 size={18} />
            <span>Clear browsing data</span>
          </motion.button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history"
            className="w-full h-10 pl-10 pr-4 bg-gray-900/60 border border-gray-700/50 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 overflow-y-auto p-6">
        {groupedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Globe size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">
              {searchQuery ? 'No results found' : 'No history yet'}
            </h3>
            <p className="text-sm text-gray-500">
              {searchQuery ? 'Try a different search term' : 'Pages you visit will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedHistory.map((group) => (
              <div key={group.date}>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                  {group.date}
                </h3>
                <div className="space-y-1">
                  {group.entries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex items-center gap-3 p-3 rounded-lg bg-gray-900/60 hover:bg-gray-900/80 border border-gray-800/50 hover:border-gray-700/50 transition-all cursor-pointer"
                      onClick={() => handleNavigate(entry.url)}
                    >
                      {/* Favicon */}
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-800/50 rounded border border-gray-700/50">
                        {entry.favicon || getFaviconUrl(entry.url) ? (
                          <img
                            src={entry.favicon || getFaviconUrl(entry.url)}
                            alt=""
                            className="w-6 h-6"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Globe size={16} className="text-gray-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-gray-200 truncate">
                            {entry.title || entry.url}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400 truncate">{entry.url}</span>
                          {entry.visitCount && entry.visitCount > 1 && (
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {entry.visitCount} visits
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(entry.url);
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg hover:bg-red-600/20 text-gray-500 hover:text-red-400 transition-all"
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
    </div>
  );
}


