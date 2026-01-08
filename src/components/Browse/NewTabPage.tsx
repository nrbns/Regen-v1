// Custom New Tab Page - Beautiful & Dark
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';

export default function NewTabPage() {
  const [query, setQuery] = useState('');
  const activeId = useTabsStore(state => state.activeId);
  const tabs = useTabsStore(state => state.tabs);
  const activeTabData = activeId ? tabs.find(t => t.id === activeId) : null;

  const quickActions = [
    { label: 'Search Web', icon: '🔍', query: '' },
    { label: 'Ask AI', icon: '🧠', query: 'What can you help me with?' },
    { label: 'Markets', icon: '📊', query: 'Show crypto prices' },
    { label: 'News', icon: '📰', query: 'Latest news' },
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    // Check if it's a URL
    const isUrl =
      /^https?:\/\//i.test(searchQuery) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(searchQuery);

    if (isUrl) {
      const urlToNavigate = searchQuery.startsWith('http') ? searchQuery : `https://${searchQuery}`;
      if (activeTabData) {
        await ipc.tabs.navigate(activeTabData.id, urlToNavigate);
      } else {
        await ipc.tabs.create(urlToNavigate);
      }
    } else {
      // Search query - use Google or DuckDuckGo
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
      if (activeTabData) {
        await ipc.tabs.navigate(activeTabData.id, searchUrl);
      } else {
        await ipc.tabs.create(searchUrl);
      }
    }
    setQuery('');
  };

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-purple-950 via-black to-pink-950 text-white">
      <div className="w-full max-w-3xl px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 text-3xl font-semibold text-[#EAEAF0] md:text-4xl"
        >
          Start typing a URL or ask AI anything
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 mt-1 text-sm text-[#9AA0B4] md:text-base"
        >
          Browse · Research · Trade — one focused workspace
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative mx-auto max-w-xl"
        >
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSearch(query);
              }
            }}
            placeholder="Search or ask AI anything..."
            className="w-full rounded-xl border border-white/10 bg-[#11162A] px-5 py-3 text-base text-white placeholder-[#9AA0B4] transition focus:outline-none focus:ring-2 focus:ring-[#7C5CFF] md:text-lg"
            autoFocus
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSearch(query)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 transition hover:bg-white/10"
            title="AI Search"
          >
            <Sparkles className="h-7 w-7 animate-pulse text-pink-400 md:h-9 md:w-9" />
          </motion.button>
        </motion.div>

        {/* Empty state quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 md:grid-cols-4"
        >
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleSearch(action.query || action.label)}
              className="rounded-xl border border-white/10 bg-[#11162A] p-3 text-center transition hover:border-white/20"
            >
              <div className="mb-2 text-3xl">{action.icon}</div>
              <div className="text-sm text-[#9AA0B4]">{action.label}</div>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
