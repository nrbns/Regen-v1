import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const handleSearch = async (searchQuery) => {
        if (!searchQuery.trim())
            return;
        // Check if it's a URL
        const isUrl = /^https?:\/\//i.test(searchQuery) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(searchQuery);
        if (isUrl) {
            const urlToNavigate = searchQuery.startsWith('http') ? searchQuery : `https://${searchQuery}`;
            if (activeTabData) {
                await ipc.tabs.navigate(activeTabData.id, urlToNavigate);
            }
            else {
                await ipc.tabs.create(urlToNavigate);
            }
        }
        else {
            // Search query - use Google or DuckDuckGo
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
            if (activeTabData) {
                await ipc.tabs.navigate(activeTabData.id, searchUrl);
            }
            else {
                await ipc.tabs.create(searchUrl);
            }
        }
        setQuery('');
    };
    return (_jsx("div", { className: "h-screen bg-gradient-to-br from-purple-950 via-black to-pink-950 text-white flex items-center justify-center overflow-hidden", children: _jsxs("div", { className: "text-center max-w-4xl w-full px-10", children: [_jsx(motion.h1, { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, className: "text-8xl md:text-9xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-8", children: "REGEN" }), _jsx(motion.p, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2 }, className: "text-3xl md:text-4xl mt-8 text-purple-300 mb-16", children: "The Future of Browsing" }), _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.4 }, className: "relative max-w-2xl mx-auto", children: [_jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), onKeyDown: e => {
                                if (e.key === 'Enter') {
                                    handleSearch(query);
                                }
                            }, placeholder: "Search or ask AI anything...", className: "w-full px-8 py-6 bg-white/10 backdrop-blur-xl rounded-full text-xl md:text-2xl placeholder-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transition-all text-white", autoFocus: true }), _jsx(motion.button, { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 }, onClick: () => handleSearch(query), className: "absolute right-8 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition", title: "AI Search", children: _jsx(Sparkles, { className: "w-7 h-7 md:w-9 md:h-9 text-pink-400 animate-pulse" }) })] })] }) }));
}
