// God Tier Browse Mode - Arc + SigmaOS Killer
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Sparkles, Globe, Bookmark, Split, X, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';

const quickLinks = [
  { name: 'NSE India', url: 'https://nseindia.com', icon: '₹' },
  { name: 'TradingView', url: 'https://tradingview.com', icon: '📈' },
  { name: 'Zerodha', url: 'https://kite.zerodha.com', icon: '🚀' },
  { name: 'Twitter', url: 'https://x.com', icon: '𝕏' },
  { name: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
  { name: 'GitHub', url: 'https://github.com', icon: '💻' },
];

export default function BrowseMode() {
  const [url, setUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('Namaste');
  const setMode = useAppStore(state => state.setMode);
  const activeId = useTabsStore(state => state.activeId);
  const tabs = useTabsStore(state => state.tabs);
  const activeTabData = activeId ? tabs.find(t => t.id === activeId) : null;
  const isNewTab = !activeTabData || activeTabData.url === 'about:blank' || !activeTabData.url;

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 17) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    // Check if it's a URL
    const isUrl = /^https?:\/\//i.test(query) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(query);

    if (isUrl) {
      const urlToNavigate = query.startsWith('http') ? query : `https://${query}`;
      if (activeTabData) {
        await ipc.tabs.navigate(activeTabData.id, urlToNavigate);
      } else {
        await ipc.tabs.create(urlToNavigate);
      }
    } else {
      // Search query - use Google or DuckDuckGo
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      if (activeTabData) {
        await ipc.tabs.navigate(activeTabData.id, searchUrl);
      } else {
        await ipc.tabs.create(searchUrl);
      }
    }
    setUrl('');
  };

  const handleQuickLink = async (linkUrl: string) => {
    if (activeTabData) {
      await ipc.tabs.navigate(activeTabData.id, linkUrl);
    } else {
      await ipc.tabs.create(linkUrl);
    }
  };

  // Show new tab page only when it's a new tab or about:blank
  if (!isNewTab) {
    // If there's an active tab with a real URL, let AppShell handle the webview
    return null;
  }

  return (
    <div className="h-full bg-gradient-to-br from-purple-950 via-black to-pink-950 text-white flex overflow-hidden">
      {/* LEFT SIDEBAR - Arc Style */}
      <motion.div
        initial={{ x: -100 }}
        animate={{ x: 0 }}
        className="w-20 bg-black/40 backdrop-blur-xl border-r border-purple-800 flex flex-col items-center py-8 gap-8 flex-shrink-0"
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl font-bold cursor-pointer"
        >
          R
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="p-2 rounded-lg hover:bg-white/10 transition"
          title="Browse"
        >
          <Globe className="w-6 h-6 text-purple-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="p-2 rounded-lg hover:bg-white/10 transition"
          title="Bookmarks"
        >
          <Bookmark className="w-6 h-6 text-gray-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="p-2 rounded-lg hover:bg-white/10 transition"
          title="Split View"
        >
          <Split className="w-6 h-6 text-gray-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() => setMode('Research')}
          className="p-2 rounded-lg hover:bg-white/10 transition"
          title="AI Research"
        >
          <Sparkles className="w-6 h-6 text-pink-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() => setMode('Trade')}
          className="p-2 rounded-lg hover:bg-white/10 transition"
          title="Trade"
        >
          <TrendingUp className="w-6 h-6 text-emerald-400" />
        </motion.button>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Glowing Tab Bar */}
        <div className="bg-black/50 backdrop-blur-xl border-b border-purple-800 px-6 py-3 flex items-center gap-4 flex-shrink-0">
          <div className="flex gap-3 flex-1 overflow-x-auto scrollbar-hide">
            {tabs.slice(0, 5).map(tab => (
              <motion.div
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                onClick={async () => {
                  await ipc.tabs.activate({ id: tab.id });
                }}
                className={`px-6 py-2 rounded-xl font-semibold flex items-center gap-3 shadow-lg transition-all cursor-pointer ${
                  tab.id === activeId
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="w-3 h-3 bg-white/30 rounded-full" />
                <span className="text-sm whitespace-nowrap">{tab.title || 'New Tab'}</span>
                <button
                  onClick={async e => {
                    e.stopPropagation();
                    await ipc.tabs.close({ id: tab.id });
                  }}
                  className="w-4 h-4 hover:bg-white/20 rounded-full flex items-center justify-center transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={async () => {
              await ipc.tabs.create('about:blank');
            }}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center font-bold text-xl transition"
          >
            +
          </motion.button>
        </div>

        {/* BEAUTIFUL NEW TAB PAGE */}
        <div className="flex-1 flex items-center justify-center px-10 overflow-y-auto">
          <div className="max-w-4xl w-full">
            {/* Clock + Greeting */}
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <motion.h1
                key={currentTime.toLocaleTimeString()}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="text-7xl md:text-8xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
              >
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </motion.h1>
              <p className="text-2xl md:text-3xl mt-4 text-purple-300">{greeting}, Trader</p>
            </motion.div>

            {/* AI Search Bar */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative max-w-3xl mx-auto mb-16"
            >
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSearch(url);
                  }
                }}
                placeholder="Ask AI or search anything... (हिंदी में भी)"
                className="w-full px-8 py-6 bg-white/10 backdrop-blur-xl rounded-full text-xl md:text-2xl placeholder-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/50 text-white"
                autoFocus
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-20 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition"
                title="Voice Search"
              >
                <Mic className="w-6 h-6 md:w-8 md:h-8 text-purple-400 hover:text-pink-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSearch(url)}
                className="absolute right-8 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition"
                title="AI Search"
              >
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-pink-400 animate-pulse" />
              </motion.button>
            </motion.div>

            {/* Quick Links */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {quickLinks.map(link => (
                <motion.a
                  key={link.name}
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    handleQuickLink(link.url);
                  }}
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 text-center hover:bg-white/20 transition-all cursor-pointer"
                >
                  <div className="text-4xl md:text-5xl mb-3 md:mb-4">{link.icon}</div>
                  <p className="text-sm md:text-lg font-semibold">{link.name}</p>
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
