/**
 * NewTabPage - Premium new tab experience for RegenBrowser
 * Combines clean design with rich content: search, news, markets, weather, shortcuts
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  TrendingUp,
  Globe,
  Zap,
  Clock,
  TrendingDown,
  Cloud,
  Sun,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  BookOpen,
  Briefcase,
  Gamepad2,
} from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../state/settingsStore';

interface MarketData {
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  image?: string;
  trending?: boolean;
}

export function ChromeNewTabPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Discover');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [weatherData, setWeatherData] = useState<{ temp: number; condition: string; location: string; airQuality: string } | null>(null);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const { activeId, tabs } = useTabsStore();
  const { setMode, mode } = useAppStore();
  const settings = useSettingsStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time market data fetching
  const fetchMarketData = useCallback(async () => {
    try {
      setIsLoadingMarkets(true);
      const symbols = [
        { symbol: 'NIFTY', yahooSymbol: '^NSEI' },
        { symbol: 'SENSEX', yahooSymbol: '^BSESN' },
        { symbol: 'Gold', yahooSymbol: 'GC=F' },
        { symbol: 'Silver', yahooSymbol: 'SI=F' },
        { symbol: 'USD/INR', yahooSymbol: 'INR=X' },
      ];

      const marketPromises = symbols.map(async ({ symbol, yahooSymbol }) => {
        try {
          // Try Tauri IPC first
          if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
            const result = await ipc.trade.getQuote(yahooSymbol);
            if (result && result.price) {
              const change = result.change || 0;
              const changePercent = result.changePercent || 0;
              return {
                symbol,
                value: result.price,
                change,
                changePercent,
              };
            }
          }

          // Fallback to HTTP API
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
          const response = await fetch(
            `${API_BASE_URL}/api/trade/quote?symbol=${encodeURIComponent(yahooSymbol)}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data.price) {
              const change = data.change || 0;
              const changePercent = data.changePercent || 0;
              return {
                symbol,
                value: data.price,
                change,
                changePercent,
              };
            }
          }
        } catch (error) {
          console.error(`[NewTab] Failed to fetch ${symbol}:`, error);
        }

        // Fallback to mock data if API fails
        const fallbacks: Record<string, MarketData> = {
          NIFTY: { symbol: 'NIFTY', value: 26202.95, change: -13.1, changePercent: -0.05 },
          SENSEX: { symbol: 'SENSEX', value: 85706.67, change: -17.14, changePercent: -0.02 },
          Gold: { symbol: 'Gold', value: 4254.9, change: 52.5, changePercent: 1.25 },
          Silver: { symbol: 'Silver', value: 57.16, change: 3.55, changePercent: 6.63 },
          'USD/INR': { symbol: 'USD/INR', value: 89.352, change: 0.009, changePercent: 0.01 },
        };
        return fallbacks[symbol] || null;
      });

      const results = await Promise.all(marketPromises);
      const validResults = results.filter((r): r is MarketData => r !== null);
      setMarketData(validResults);
    } catch (error) {
      console.error('[NewTab] Market data fetch failed:', error);
      // Set fallback data
      setMarketData([
        { symbol: 'NIFTY', value: 26202.95, change: -13.1, changePercent: -0.05 },
        { symbol: 'SENSEX', value: 85706.67, change: -17.14, changePercent: -0.02 },
        { symbol: 'Gold', value: 4254.9, change: 52.5, changePercent: 1.25 },
        { symbol: 'Silver', value: 57.16, change: 3.55, changePercent: 6.63 },
        { symbol: 'USD/INR', value: 89.352, change: 0.009, changePercent: 0.01 },
      ]);
    } finally {
      setIsLoadingMarkets(false);
    }
  }, []);

  // Fetch news data
  const fetchNews = useCallback(async () => {
    try {
      setIsLoadingNews(true);
      // Try to fetch from DuckDuckGo or news API
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
      
      // Try research API for news
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const result = await ipc.invoke('search_proxy', { query: 'trending news India' });
          if (result && result.RelatedTopics) {
            const news = result.RelatedTopics.slice(0, 5).map((item: any, index: number) => ({
              id: `news-${index}`,
              title: item.Text || 'News article',
              source: 'News',
              time: `${Math.floor(Math.random() * 24)}h`,
              trending: index < 2,
            }));
            setNewsItems(news);
            setIsLoadingNews(false);
            return;
          }
        } catch (error) {
          console.error('[NewTab] News fetch via IPC failed:', error);
        }
      }

      // Fallback to mock data
      setNewsItems([
        {
          id: '1',
          title: 'E-Passports Launched In India: What Are Digital Passports?',
          source: 'The Daily Jagran',
          time: '5h',
          trending: true,
        },
        {
          id: '2',
          title: "India's Updated Quake Map Warns Entire Himalayan Arc",
          source: 'TOI The Times of India',
          time: '22h',
        },
        {
          id: '3',
          title: 'AI-Powered Research Tools Transform Education',
          source: 'Tech News',
          time: '3h',
          trending: true,
        },
      ]);
    } catch (error) {
      console.error('[NewTab] News fetch failed:', error);
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  // Fetch weather data
  const fetchWeather = useCallback(async () => {
    try {
      // Try to get location from settings or use default
      const location = 'Medchal'; // Could be from settings
      
      // Use a weather API (OpenWeatherMap, WeatherAPI, etc.)
      // For now, set mock data
      setWeatherData({
        temp: 18,
        condition: 'Partly Cloudy',
        location: 'Medchal',
        airQuality: 'Satisfactory',
      });
    } catch (error) {
      console.error('[NewTab] Weather fetch failed:', error);
      setWeatherData({
        temp: 18,
        condition: 'Partly Cloudy',
        location: 'Medchal',
        airQuality: 'Satisfactory',
      });
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    inputRef.current?.focus();
    void fetchMarketData();
    void fetchNews();
    void fetchWeather();
  }, [fetchMarketData, fetchNews, fetchWeather]);

  // Real-time updates: Poll market data every 30 seconds
  useEffect(() => {
    const marketInterval = setInterval(() => {
      void fetchMarketData();
    }, 30000); // 30 seconds

    const newsInterval = setInterval(() => {
      void fetchNews();
    }, 300000); // 5 minutes

    return () => {
      clearInterval(marketInterval);
      clearInterval(newsInterval);
    };
  }, [fetchMarketData, fetchNews]);

  const handleSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || isSearching) return;

      setIsSearching(true);
      try {
        const isUrl =
          /^https?:\/\//i.test(trimmedQuery) || /^[a-z0-9]+(\.[a-z0-9]+)+/i.test(trimmedQuery);

        const targetUrl = isUrl
          ? trimmedQuery.startsWith('http')
            ? trimmedQuery
            : `https://${trimmedQuery}`
          : `https://www.google.com/search?q=${encodeURIComponent(trimmedQuery)}`;

        const activeTab = activeId
          ? (await ipc.tabs.list().catch(() => [])).find(t => t.id === activeId) || null
          : null;

        if (activeTab && (activeTab.url === 'about:blank' || !activeTab.url)) {
          await ipc.tabs.navigate(activeTab.id, targetUrl);
        } else {
          await ipc.tabs.create(targetUrl);
        }
        setSearchQuery('');
      } catch (error) {
        console.error('[NewTab] Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [activeId, isSearching]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSearch(searchQuery);
  };

  const recentTabs = tabs
    .filter(t => t.url && t.url !== 'about:blank' && t.id !== activeId)
    .slice(-6)
    .reverse();

  const quickAccess = [
    { id: 'research', label: 'Research', icon: Sparkles, color: 'from-purple-500 to-pink-500', action: () => setMode('Research') },
    { id: 'trade', label: 'Trade', icon: TrendingUp, color: 'from-green-500 to-emerald-500', action: () => setMode('Trade') },
    { id: 'browse', label: 'Browse', icon: Globe, color: 'from-blue-500 to-cyan-500', action: () => setMode('Browse') },
    { id: 'docs', label: 'Docs', icon: BookOpen, color: 'from-orange-500 to-red-500', action: () => {} },
    { id: 'work', label: 'Work', icon: Briefcase, color: 'from-indigo-500 to-purple-500', action: () => {} },
    { id: 'games', label: 'Games', icon: Gamepad2, color: 'from-pink-500 to-rose-500', action: () => {} },
  ];

  const categories = ['Discover', 'News', 'Markets', 'Research', 'Trade'];

  return (
    <div className="absolute inset-0 flex flex-col min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Zap size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Regen
              </span>
            </div>

            {/* Category Tabs */}
            <div className="hidden md:flex items-center gap-1">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeCategory === category
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <span className="text-sm text-slate-600 dark:text-slate-400">Personalize</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Search Bar Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="relative">
                <div className="relative group">
                  <Search
                    size={24}
                    className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search the web or type a URL"
                    className="w-full pl-16 pr-32 py-5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10 transition-all text-lg shadow-lg"
                    autoFocus
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('Research')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <Sparkles size={16} />
                      AI Mode
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Access Shortcuts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">
                  Quick Access
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {quickAccess.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={item.action}
                        className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all"
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                          <Icon size={24} className="text-white" />
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {item.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* News Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Trending News
                  </h2>
                  <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    See all
                  </button>
                </div>
                <div className="space-y-4">
                  {newsItems.length > 0 ? (
                    newsItems.map((item, index) => (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                      className="group relative p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {item.trending && (
                              <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                                Trending
                              </span>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {item.source} · {item.time}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <button className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                              <span>12</span>
                              <span>👍</span>
                            </button>
                            <button className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                              <span>Comment</span>
                            </button>
                            <button className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.article>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                      {isLoadingNews ? 'Loading news...' : 'No news available'}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Right Column - Widgets */}
            <div className="space-y-6">
              {/* Market Data Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Markets
                  </h3>
                  <div className="flex items-center gap-2">
                    {isLoadingMarkets && (
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <button
                      onClick={() => {
                        setMode('Trade');
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      See market
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {marketData.length > 0 ? (
                    marketData.map((market, index) => {
                    const isPositive = market.changePercent >= 0;
                    return (
                      <div
                        key={market.symbol}
                        className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {market.symbol}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {market.value.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div
                            className={`text-xs flex items-center gap-1 justify-end ${
                              isPositive
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {isPositive ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            )}
                            <span>
                              {Math.abs(market.changePercent).toFixed(2)}% (
                              {isPositive ? '+' : ''}
                              {market.change.toFixed(2)})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                      {isLoadingMarkets ? 'Loading market data...' : 'No market data available'}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Weather Widget */}
              {weatherData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="p-6 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{weatherData.location}</h3>
                      <div className="flex items-center gap-2">
                        <Cloud size={20} />
                        <span className="text-3xl font-bold">{weatherData.temp}°C</span>
                      </div>
                    </div>
                    <Sun size={32} className="text-yellow-200" />
                  </div>
                  <div className="pt-4 border-t border-white/20">
                    <p className="text-sm text-white/90 mb-3">
                      {weatherData.airQuality} air quality tomorrow
                    </p>
                    <div className="flex gap-2">
                      {['Hourly', 'Daily', 'Air quality'].map((tab, index) => (
                        <button
                          key={tab}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            index === 1
                              ? 'bg-white/20 text-white'
                              : 'text-white/70 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Recent Tabs */}
              {recentTabs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={16} className="text-slate-500 dark:text-slate-400" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Recent
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {recentTabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={async () => {
                          await ipc.tabs.activate(tab.id);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                      >
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {tab.title || new URL(tab.url || '').hostname}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {new URL(tab.url || '').hostname}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Customize Button */}
      <div className="sticky bottom-6 left-0 right-0 z-20 flex justify-end px-6">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <span>Customize Chrome</span>
        </motion.button>
      </div>
    </div>
  );
}
