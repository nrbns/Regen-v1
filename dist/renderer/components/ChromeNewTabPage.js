import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * NewTabPage - Premium new tab experience for RegenBrowser
 * Combines clean design with rich content: search, news, markets, weather, shortcuts
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Sparkles, TrendingUp, Globe, Zap, Clock, Cloud, Sun, ArrowUp, ArrowDown, ExternalLink, BookOpen, Briefcase, Gamepad2, } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { motion } from 'framer-motion';
import { isWebMode } from '../lib/env';
export function ChromeNewTabPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Discover');
    const [marketData, setMarketData] = useState([]);
    const [newsItems, setNewsItems] = useState([]);
    const [weatherData, setWeatherData] = useState(null);
    const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
    const [isLoadingNews, setIsLoadingNews] = useState(true);
    const { activeId, tabs } = useTabsStore();
    const { setMode } = useAppStore();
    const inputRef = useRef(null);
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
                    // Skip backend calls in web mode
                    if (isWebMode()) {
                        // Return fallback data immediately in web mode
                        const fallbacks = {
                            NIFTY: { symbol: 'NIFTY', value: 26202.95, change: -13.1, changePercent: -0.05 },
                            SENSEX: { symbol: 'SENSEX', value: 85706.67, change: -17.14, changePercent: -0.02 },
                            Gold: { symbol: 'Gold', value: 4254.9, change: 52.5, changePercent: 1.25 },
                            Silver: { symbol: 'Silver', value: 57.16, change: 3.55, changePercent: 6.63 },
                            'USD/INR': { symbol: 'USD/INR', value: 89.352, change: 0.009, changePercent: 0.01 },
                        };
                        return fallbacks[symbol] || null;
                    }
                    // Try Tauri IPC first
                    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
                        try {
                            const result = await ipc.trade.getQuote(yahooSymbol);
                            if (result && result.last) {
                                // Use last price, calculate change from bid/ask if available
                                const price = result.last;
                                const change = result.ask && result.bid ? (result.ask - result.bid) / 2 : 0;
                                const changePercent = result.ask && result.bid && result.last
                                    ? ((result.ask - result.bid) / result.last) * 100
                                    : 0;
                                return {
                                    symbol,
                                    value: price,
                                    change,
                                    changePercent,
                                };
                            }
                        }
                        catch {
                            // IPC failed, try HTTP fallback
                        }
                    }
                    // Fallback to HTTP API
                    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';
                    const response = await fetch(`${API_BASE_URL}/api/trade/quote?symbol=${encodeURIComponent(yahooSymbol)}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        },
                    });
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
                }
                catch (error) {
                    // Suppress errors in web mode - they're expected
                    if (!isWebMode()) {
                        console.error(`[NewTab] Failed to fetch ${symbol}:`, error);
                    }
                }
                // Fallback to mock data if API fails
                const fallbacks = {
                    NIFTY: { symbol: 'NIFTY', value: 26202.95, change: -13.1, changePercent: -0.05 },
                    SENSEX: { symbol: 'SENSEX', value: 85706.67, change: -17.14, changePercent: -0.02 },
                    Gold: { symbol: 'Gold', value: 4254.9, change: 52.5, changePercent: 1.25 },
                    Silver: { symbol: 'Silver', value: 57.16, change: 3.55, changePercent: 6.63 },
                    'USD/INR': { symbol: 'USD/INR', value: 89.352, change: 0.009, changePercent: 0.01 },
                };
                return fallbacks[symbol] || null;
            });
            const results = await Promise.all(marketPromises);
            const validResults = results.filter((r) => r !== null);
            setMarketData(validResults);
        }
        catch (error) {
            console.error('[NewTab] Market data fetch failed:', error);
            // Set fallback data
            setMarketData([
                { symbol: 'NIFTY', value: 26202.95, change: -13.1, changePercent: -0.05 },
                { symbol: 'SENSEX', value: 85706.67, change: -17.14, changePercent: -0.02 },
                { symbol: 'Gold', value: 4254.9, change: 52.5, changePercent: 1.25 },
                { symbol: 'Silver', value: 57.16, change: 3.55, changePercent: 6.63 },
                { symbol: 'USD/INR', value: 89.352, change: 0.009, changePercent: 0.01 },
            ]);
        }
        finally {
            setIsLoadingMarkets(false);
        }
    }, []);
    // Fetch news data
    const fetchNews = useCallback(async () => {
        try {
            setIsLoadingNews(true);
            // Skip backend calls in web mode
            if (!isWebMode()) {
                // Try research API for news
                if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
                    try {
                        // Use research queryEnhanced if available, otherwise skip
                        const result = await ipc.research
                            .queryEnhanced({
                            query: 'trending news India',
                            maxSources: 5,
                        })
                            .catch(() => null);
                        if (result && result.sources && result.sources.length > 0) {
                            const news = result.sources.slice(0, 5).map((item, index) => ({
                                id: `news-${index}`,
                                title: item.title || 'News article',
                                source: item.url ? new URL(item.url).hostname : 'News',
                                time: `${Math.floor(Math.random() * 24)}h`,
                                trending: index < 2,
                            }));
                            setNewsItems(news);
                            setIsLoadingNews(false);
                            return;
                        }
                    }
                    catch {
                        // Suppress errors - fallback to mock data
                    }
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
        }
        catch (error) {
            console.error('[NewTab] News fetch failed:', error);
        }
        finally {
            setIsLoadingNews(false);
        }
    }, []);
    // Fetch weather data
    const fetchWeather = useCallback(async () => {
        try {
            // Use a weather API (OpenWeatherMap, WeatherAPI, etc.)
            // For now, set mock data
            setWeatherData({
                temp: 18,
                condition: 'Partly Cloudy',
                location: 'Medchal',
                airQuality: 'Satisfactory',
            });
        }
        catch (error) {
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
    const handleSearch = useCallback(async (query) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || isSearching)
            return;
        setIsSearching(true);
        try {
            const isUrl = /^https?:\/\//i.test(trimmedQuery) || /^[a-z0-9]+(\.[a-z0-9]+)+/i.test(trimmedQuery);
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
            }
            else {
                await ipc.tabs.create(targetUrl);
            }
            setSearchQuery('');
        }
        catch (error) {
            console.error('[NewTab] Search failed:', error);
        }
        finally {
            setIsSearching(false);
        }
    }, [activeId, isSearching]);
    const handleSubmit = (e) => {
        e.preventDefault();
        void handleSearch(searchQuery);
    };
    const recentTabs = tabs
        .filter(t => t.url && t.url !== 'about:blank' && t.id !== activeId)
        .slice(-6)
        .reverse();
    const quickAccess = [
        {
            id: 'research',
            label: 'Research',
            icon: Sparkles,
            color: 'from-purple-500 to-pink-500',
            action: () => setMode('Research'),
            description: 'AI-powered research with citations',
        },
        {
            id: 'trade',
            label: 'Trade',
            icon: TrendingUp,
            color: 'from-green-500 to-emerald-500',
            action: () => setMode('Trade'),
            description: 'Real-time market analysis',
        },
        {
            id: 'browse',
            label: 'Browse',
            icon: Globe,
            color: 'from-blue-500 to-cyan-500',
            action: () => setMode('Browse'),
            description: 'Standard web browsing',
        },
        {
            id: 'docs',
            label: 'Docs',
            icon: BookOpen,
            color: 'from-orange-500 to-red-500',
            action: () => setMode('Docs'),
            description: 'Open document processing mode',
        },
        {
            id: 'work',
            label: 'Work',
            icon: Briefcase,
            color: 'from-indigo-500 to-purple-500',
            action: async () => {
                await ipc.tabs.create('about:blank');
            },
            description: 'Start a new work session',
        },
        {
            id: 'games',
            label: 'Games',
            icon: Gamepad2,
            color: 'from-pink-500 to-rose-500',
            action: async () => {
                await ipc.tabs.create('https://www.google.com/search?q=online+games');
            },
            description: 'Browse online games',
        },
    ];
    const categories = ['Discover', 'News', 'Markets', 'Research', 'Trade'];
    return (_jsxs("div", { className: "absolute inset-0 flex min-h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950", children: [_jsx("div", { className: "sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80", children: _jsx("div", { className: "mx-auto max-w-7xl px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg", children: _jsx(Zap, { size: 20, className: "text-white" }) }), _jsx("span", { className: "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent", children: "Regen" })] }), _jsx("div", { className: "hidden items-center gap-1 md:flex", children: categories.map(category => (_jsx("button", { onClick: () => setActiveCategory(category), className: `rounded-lg px-4 py-2 text-sm font-medium transition-all ${activeCategory === category
                                        ? 'bg-blue-500 text-white shadow-md'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`, children: category }, category))) }), _jsx("div", { className: "flex items-center gap-3", children: _jsx("button", { className: "rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800", children: _jsx("span", { className: "text-sm text-slate-600 dark:text-slate-400", children: "Personalize" }) }) })] }) }) }), _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsxs("div", { className: "mx-auto max-w-7xl px-6 py-8", children: [_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 }, className: "mb-12", children: _jsx("div", { className: "mx-auto max-w-3xl", children: _jsx("form", { onSubmit: handleSubmit, className: "relative", children: _jsxs("div", { className: "group relative", children: [_jsx(Search, { size: 24, className: "absolute left-6 top-1/2 z-10 -translate-y-1/2 text-slate-400 dark:text-slate-500" }), _jsx("input", { id: "newtab-search-input", name: "newtab-search-query", ref: inputRef, type: "text", value: searchQuery, onChange: e => setSearchQuery(e.target.value), onKeyDown: e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        void handleSearch(searchQuery);
                                                    }
                                                    else if (e.key === 'Escape') {
                                                        setSearchQuery('');
                                                        inputRef.current?.blur();
                                                    }
                                                }, placeholder: "Search the web or type a URL", className: "w-full rounded-2xl border-2 border-slate-200 bg-white py-5 pl-16 pr-32 text-lg text-slate-900 shadow-lg transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/10", autoFocus: true, "aria-label": "Search the web or type a URL", "aria-describedby": "search-hint", role: "searchbox" }), _jsx("span", { id: "search-hint", className: "sr-only", children: "Press Enter to search, Escape to clear" }), _jsx("div", { className: "absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2", children: _jsxs("button", { type: "button", onClick: () => setMode('Research'), className: "flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg", children: [_jsx(Sparkles, { size: 16 }), "AI Mode"] }) })] }) }) }) }), _jsxs("div", { className: "grid grid-cols-1 gap-8 lg:grid-cols-3", children: [_jsxs("div", { className: "space-y-6 lg:col-span-2", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.1 }, children: [_jsx("h2", { className: "mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300", children: "Quick Access" }), _jsx("div", { className: "grid grid-cols-3 gap-4 sm:grid-cols-6", children: quickAccess.map((item, index) => {
                                                        const Icon = item.icon;
                                                        return (_jsxs(motion.button, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.3, delay: 0.2 + index * 0.05 }, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, onClick: item.action, className: "group relative flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-500 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-400", title: item.description || item.label, "aria-label": item.description ? `${item.label}: ${item.description}` : item.label, children: [_jsx("div", { className: `h-12 w-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md transition-shadow group-hover:shadow-lg`, children: _jsx(Icon, { size: 24, className: "text-white" }) }), _jsx("span", { className: "text-xs font-medium text-slate-700 dark:text-slate-300", children: item.label })] }, item.id));
                                                    }) })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.3 }, children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h2", { className: "text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300", children: "Trending News" }), _jsx("button", { className: "text-xs text-blue-600 hover:underline dark:text-blue-400", children: "See all" })] }), _jsx("div", { className: "space-y-4", children: newsItems.length > 0 ? (newsItems.map((item, index) => (_jsx(motion.article, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.4, delay: 0.4 + index * 0.1 }, onClick: async () => {
                                                            // Open article in new tab
                                                            try {
                                                                const articleUrl = `https://www.google.com/search?q=${encodeURIComponent(item.title)}`;
                                                                await ipc.tabs.create(articleUrl);
                                                            }
                                                            catch (error) {
                                                                console.error('[NewTab] Failed to open article:', error);
                                                            }
                                                        }, onKeyDown: async (e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                try {
                                                                    const articleUrl = `https://www.google.com/search?q=${encodeURIComponent(item.title)}`;
                                                                    await ipc.tabs.create(articleUrl);
                                                                }
                                                                catch (error) {
                                                                    console.error('[NewTab] Failed to open article:', error);
                                                                }
                                                            }
                                                        }, className: "group relative cursor-pointer rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-blue-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-400", tabIndex: 0, role: "button", "aria-label": `Open article: ${item.title}`, children: _jsx("div", { className: "flex items-start gap-4", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [item.trending && (_jsx("span", { className: "rounded-full bg-red-500 px-2 py-1 text-xs font-semibold text-white", children: "Trending" })), _jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: [item.source, " \u00B7 ", item.time] })] }), _jsx("h3", { className: "mb-2 text-lg font-semibold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400", children: item.title }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400", children: [_jsxs("button", { className: "flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400", children: [_jsx("span", { children: "12" }), _jsx("span", { children: "\uD83D\uDC4D" })] }), _jsx("button", { className: "flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400", children: _jsx("span", { children: "Comment" }) }), _jsx("button", { className: "flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400", children: _jsx("span", { children: "Share" }) })] })] }) }) }, item.id)))) : isLoadingNews ? (
                                                    // Skeleton loaders for news
                                                    Array.from({ length: 3 }).map((_, idx) => (_jsx("div", { className: "animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800", children: _jsx("div", { className: "flex items-start gap-4", children: _jsxs("div", { className: "flex-1 space-y-3", children: [_jsx("div", { className: "h-4 w-1/4 rounded bg-slate-200 dark:bg-slate-700" }), _jsx("div", { className: "h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" }), _jsx("div", { className: "h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" })] }) }) }, `news-skeleton-${idx}`)))) : (_jsx("div", { className: "py-8 text-center text-sm text-slate-500 dark:text-slate-400", children: "No news available" })) })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.2 }, className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-slate-100", children: "Markets" }), _jsxs("div", { className: "flex items-center gap-2", children: [isLoadingMarkets && (_jsx("div", { className: "h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" })), _jsxs("button", { onClick: () => {
                                                                        setMode('Trade');
                                                                    }, className: "flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400", children: ["See market", _jsx(ExternalLink, { size: 12 })] })] })] }), _jsx("div", { className: "space-y-3", children: marketData.length > 0 ? (marketData.map(market => {
                                                        const isPositive = market.changePercent >= 0;
                                                        return (_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-700", children: [_jsx("div", { className: "flex-1", children: _jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-slate-100", children: market.symbol }) }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-slate-100", children: market.value.toLocaleString('en-IN', {
                                                                                minimumFractionDigits: 2,
                                                                                maximumFractionDigits: 2,
                                                                            }) }), _jsxs("div", { className: `flex items-center justify-end gap-1 text-xs ${isPositive
                                                                                ? 'text-green-600 dark:text-green-400'
                                                                                : 'text-red-600 dark:text-red-400'}`, children: [isPositive ? _jsx(ArrowUp, { size: 12 }) : _jsx(ArrowDown, { size: 12 }), _jsxs("span", { children: [Math.abs(market.changePercent).toFixed(2), "% (", isPositive ? '+' : '', market.change.toFixed(2), ")"] })] })] })] }, market.symbol));
                                                    })) : isLoadingMarkets ? (
                                                    // Skeleton loaders for markets
                                                    Array.from({ length: 5 }).map((_, idx) => (_jsxs("div", { className: "flex animate-pulse items-center justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-700", children: [_jsx("div", { className: "h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" }), _jsx("div", { className: "h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" })] }, `market-skeleton-${idx}`)))) : (_jsx("div", { className: "py-8 text-center text-sm text-slate-500 dark:text-slate-400", children: "No market data available" })) })] }), weatherData && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.3 }, className: "rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 p-6 text-white shadow-xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "mb-1 text-lg font-semibold", children: weatherData.location }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Cloud, { size: 20 }), _jsxs("span", { className: "text-3xl font-bold", children: [weatherData.temp, "\u00B0C"] })] })] }), _jsx(Sun, { size: 32, className: "text-yellow-200" })] }), _jsxs("div", { className: "border-t border-white/20 pt-4", children: [_jsxs("p", { className: "mb-3 text-sm text-white/90", children: [weatherData.airQuality, " air quality tomorrow"] }), _jsx("div", { className: "flex gap-2", children: ['Hourly', 'Daily', 'Air quality'].map((tab, index) => (_jsx("button", { className: `rounded-lg px-3 py-1 text-xs font-medium transition-all ${index === 1
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'text-white/70 hover:bg-white/10 hover:text-white'}`, children: tab }, tab))) })] })] })), recentTabs.length > 0 && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.4 }, className: "rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx(Clock, { size: 16, className: "text-slate-500 dark:text-slate-400" }), _jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-slate-100", children: "Recent" })] }), _jsx("div", { className: "space-y-2", children: recentTabs.map(tab => (_jsxs("button", { onClick: async () => {
                                                            await ipc.tabs.activate({ id: tab.id });
                                                        }, className: "group w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700", children: [_jsx("div", { className: "truncate text-sm font-medium text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400", children: tab.title || new URL(tab.url || '').hostname }), _jsx("div", { className: "truncate text-xs text-slate-500 dark:text-slate-400", children: new URL(tab.url || '').hostname })] }, tab.id))) })] }))] })] })] }) }), _jsx("div", { className: "sticky bottom-6 left-0 right-0 z-20 flex justify-end px-6", children: _jsx(motion.button, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.5 }, className: "flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-600 hover:shadow-xl", children: _jsx("span", { children: "Customize Chrome" }) }) })] }));
}
