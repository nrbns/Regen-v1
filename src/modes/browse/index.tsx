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
    <div className="flex h-full overflow-hidden bg-gradient-to-br from-purple-950 via-black to-pink-950 text-white">
      {/* LEFT SIDEBAR - Arc Style */}
      <motion.div
        initial={{ x: -100 }}
        animate={{ x: 0 }}
        className="flex w-20 flex-shrink-0 flex-col items-center gap-8 border-r border-purple-800 bg-black/40 py-8 backdrop-blur-xl"
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-2xl font-bold"
        >
          R
        </motion.div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="rounded-lg p-2 transition hover:bg-white/10"
          title="Browse"
        >
          <Globe className="h-6 w-6 text-purple-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="rounded-lg p-2 transition hover:bg-white/10"
          title="Bookmarks"
        >
          <Bookmark className="h-6 w-6 text-gray-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="rounded-lg p-2 transition hover:bg-white/10"
          title="Split View"
        >
          <Split className="h-6 w-6 text-gray-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() => setMode('Research')}
          className="rounded-lg p-2 transition hover:bg-white/10"
          title="AI Research"
        >
          <Sparkles className="h-6 w-6 text-pink-400" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() => setMode('Trade')}
          className="rounded-lg p-2 transition hover:bg-white/10"
          title="Trade"
        >
          <TrendingUp className="h-6 w-6 text-emerald-400" />
        </motion.button>
      </motion.div>

      {/* MAIN CONTENT */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Glowing Tab Bar */}
        <div className="flex flex-shrink-0 items-center gap-4 border-b border-purple-800 bg-black/50 px-6 py-3 backdrop-blur-xl">
          <div className="scrollbar-hide flex flex-1 gap-3 overflow-x-auto">
            {tabs.slice(0, 5).map(tab => (
              <motion.div
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                onClick={async () => {
                  await ipc.tabs.activate({ id: tab.id });
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-6 py-2 font-semibold shadow-lg transition-all ${
                  tab.id === activeId
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="h-3 w-3 rounded-full bg-white/30" />
                <span className="whitespace-nowrap text-sm">{tab.title || 'New Tab'}</span>
                <button
                  onClick={async e => {
                    e.stopPropagation();
                    await ipc.tabs.close({ id: tab.id });
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-white/20"
                >
                  <X className="h-3 w-3" />
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl font-bold transition hover:bg-white/20"
          >
            +
          </motion.button>
        </div>

        {/* BEAUTIFUL NEW TAB PAGE */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-10">
          <div className="w-full max-w-4xl">
            {/* Clock + Greeting */}
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-16 text-center"
            >
              <motion.h1
                key={currentTime.toLocaleTimeString()}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-7xl font-black text-transparent md:text-8xl"
              >
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </motion.h1>
              <p className="mt-4 text-2xl text-purple-300 md:text-3xl">{greeting}, Trader</p>
            </motion.div>

            {/* AI Search Bar */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="relative mx-auto mb-16 max-w-3xl"
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
                className="w-full rounded-full bg-white/10 px-8 py-6 text-xl text-white placeholder-purple-300 backdrop-blur-xl focus:outline-none focus:ring-4 focus:ring-purple-500/50 md:text-2xl"
                autoFocus
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="absolute right-20 top-1/2 -translate-y-1/2 rounded-full p-2 transition hover:bg-white/10"
                title="Voice Search"
              >
                <Mic className="h-6 w-6 text-purple-400 hover:text-pink-400 md:h-8 md:w-8" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleSearch(url)}
                className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-2 transition hover:bg-white/10"
                title="AI Search"
              >
                <Sparkles className="h-6 w-6 animate-pulse text-pink-400 md:h-8 md:w-8" />
              </motion.button>
            </motion.div>

            {/* Quick Links */}
            <div className="grid grid-cols-3 gap-4 md:grid-cols-4 md:gap-6 lg:grid-cols-6">
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
                  className="cursor-pointer rounded-3xl bg-white/10 p-6 text-center backdrop-blur-xl transition-all hover:bg-white/20 md:p-8"
                >
                  <div className="mb-3 text-4xl md:mb-4 md:text-5xl">{link.icon}</div>
                  <p className="text-sm font-semibold md:text-lg">{link.name}</p>
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
