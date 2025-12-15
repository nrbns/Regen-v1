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
    <div className="h-screen bg-gradient-to-br from-purple-950 via-black to-pink-950 text-white flex items-center justify-center overflow-hidden">
      <div className="text-center max-w-3xl w-full px-6">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-semibold text-[#EAEAF0] mb-2"
        >
          Start typing a URL or ask AI anything
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm md:text-base mt-1 text-[#9AA0B4] mb-8"
        >
          Browse · Research · Trade — one focused workspace
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative max-w-xl mx-auto"
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
            className="w-full px-5 py-3 bg-[#11162A] rounded-xl text-base md:text-lg placeholder-[#9AA0B4] focus:outline-none focus:ring-2 focus:ring-[#7C5CFF] transition text-white border border-white/10"
            autoFocus
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSearch(query)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition"
            title="AI Search"
          >
            <Sparkles className="w-7 h-7 md:w-9 md:h-9 text-pink-400 animate-pulse" />
          </motion.button>
        </motion.div>
        
        {/* Empty state quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto"
        >
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleSearch(action.query || action.label)}
              className="p-3 rounded-xl bg-[#11162A] border border-white/10 hover:border-white/20 transition text-center"
            >
              <div className="text-3xl mb-2">{action.icon}</div>
              <div className="text-sm text-[#9AA0B4]">{action.label}</div>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
