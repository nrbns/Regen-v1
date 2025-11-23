/**
 * ChromeNewTabPage - Google Chrome-style new tab page
 * Features: Google logo, search bar, AI Mode buttons, quick access icons, custom backgrounds
 */

import { useState, useCallback } from 'react';
import { Search, Mic, Camera } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { useTabsStore } from '../state/tabsStore';
import { useAppStore } from '../state/appStore';
import { motion } from 'framer-motion';
import { AIModeButton } from './ChromeNewTab/AIModeButton';
import { QuickAccessIcons } from './ChromeNewTab/QuickAccessIcons';
import { ChromeMenu } from './ChromeNewTab/ChromeMenu';
import { ThemeSelector } from './ChromeNewTab/ThemeSelector';
import { useChromeTheme } from './ChromeNewTab/useChromeTheme';
import { useSettingsStore } from '../state/settingsStore';

export function ChromeNewTabPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const { activeId } = useTabsStore();
  const { setMode } = useAppStore();
  const { backgroundImage } = useChromeTheme();
  const account = useSettingsStore(state => state.account);

  const handleSearch = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || isSearching) return;

      setIsSearching(true);
      try {
        // Check if it's a URL or search query
        const isUrl =
          /^https?:\/\//i.test(trimmedQuery) || /^[a-z0-9]+(\.[a-z0-9]+)+/i.test(trimmedQuery);

        const targetUrl = isUrl
          ? trimmedQuery.startsWith('http')
            ? trimmedQuery
            : `https://${trimmedQuery}`
          : `https://www.google.com/search?q=${encodeURIComponent(trimmedQuery)}`;

        // Navigate active tab or create new one
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
        console.error('[ChromeNewTab] Search failed:', error);
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

  const handleVoiceSearch = async () => {
    try {
      // Check if speech recognition is available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          try {
            const results = Array.isArray(event.results) ? Array.from(event.results) : [];
            if (
              results.length > 0 &&
              results[0] &&
              Array.isArray(results[0]) &&
              results[0].length > 0
            ) {
              const transcript = results[0][0]?.transcript;
              if (transcript && typeof transcript === 'string') {
                setSearchQuery(transcript);
                void handleSearch(transcript);
              }
            }
          } catch (error) {
            console.error('[ChromeNewTab] Error processing speech result:', error);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Fallback: open search with empty query
          void handleSearch('');
        };

        recognition.start();
      } else {
        // Fallback: open search
        void handleSearch('');
      }
    } catch (error) {
      console.error('[ChromeNewTab] Voice search failed:', error);
      void handleSearch('');
    }
  };

  const handleLensSearch = () => {
    // Open Google Lens search
    void handleSearch('https://lens.google.com');
  };

  const handleAIMode = () => {
    setMode('Research');
    // Could also open AI panel or activate AI features
  };

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center min-h-screen w-full overflow-hidden"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundColor: backgroundImage ? undefined : '#ffffff',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay for better text readability on images */}
      {backgroundImage && <div className="absolute inset-0 bg-black/10 pointer-events-none" />}
      {/* Top Bar with AI Mode Button and Chrome Menu */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 z-20">
        <div className="flex-1" />
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Profile Avatar - only show if not overlapping with menu */}
          {account.displayName && (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs sm:text-sm font-medium shadow-md border-2 border-white/50">
              {account.avatarUrl ? (
                <img
                  src={account.avatarUrl}
                  alt={account.displayName}
                  className="w-full h-full rounded-full"
                />
              ) : (
                account.displayName.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <AIModeButton onClick={handleAIMode} className="hidden sm:flex" />
          <ChromeMenu />
        </div>
      </div>

      {/* Main Content - Centered */}
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-3xl px-6 py-12 relative z-10">
        {/* Google Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <svg
            width="272"
            height="92"
            viewBox="0 0 272 92"
            className="w-auto h-auto max-w-[272px]"
            style={{
              filter: backgroundImage
                ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
            }}
          >
            <g fill="#4285F4">
              <path d="M115.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18C71.25 34.32 81.24 25 93.5 25s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44S80.99 39.2 80.99 47.18c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" />
              <path d="M163.75 47.18c0 12.77-9.99 22.18-22.25 22.18s-22.25-9.41-22.25-22.18c0-12.85 9.99-22.18 22.25-22.18s22.25 9.32 22.25 22.18zm-9.74 0c0-7.98-5.79-13.44-12.51-13.44s-12.51 5.46-12.51 13.44c0 7.9 5.79 13.44 12.51 13.44s12.51-5.55 12.51-13.44z" />
              <path d="M209.75 26.34v39.82c0 16.38-9.66 23.07-21.08 23.07-10.75 0-17.22-7.19-19.66-13.07l8.48-3.53c1.51 3.61 5.21 7.87 11.17 7.87 7.31 0 11.84-4.51 11.84-13v-3.19h-.34c-2.18 2.69-6.38 5.04-11.68 5.04-11.09 0-21.25-9.66-21.25-22.09 0-12.52 10.16-22.26 21.25-22.26 5.29 0 9.49 2.35 11.68 4.96h.34v-3.61h9.25zm-8.56 20.92c0-7.81-5.21-13.52-11.84-13.52-6.94 0-12.35 5.71-12.35 13.52 0 7.73 5.41 13.36 12.35 13.36 6.63 0 11.84-5.63 11.84-13.36z" />
              <path d="M225 3v65h-9.5V3h9.5z" />
              <path d="m262.02 54.48 7.56 5.04c-2.44 3.61-8.32 9.83-18.48 9.83-12.6 0-22.01-9.74-22.01-22.18 0-13.19 9.49-22.18 20.92-22.18 11.51 0 17.14 9.16 18.98 14.11l1.01 2.52-29.65 12.28c2.27 4.45 5.8 6.72 10.75 6.72 4.96 0 8.4-2.44 10.92-6.14zm-23.27-7.98 19.82-8.23c-1.09-2.77-4.37-4.7-8.23-4.7-4.95 0-11.84 4.37-11.59 12.93z" />
            </g>
          </svg>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full mb-8"
        >
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center gap-2 sm:gap-3 w-full max-w-2xl mx-auto">
              <div className="flex-1 relative min-w-0">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search Google or type a URL"
                  className="w-full pl-12 pr-20 sm:pr-24 py-3 sm:py-4 rounded-full border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:shadow-lg focus:shadow-gray-200/50 transition-all text-sm sm:text-base"
                  autoFocus
                  aria-label="Search Google or type a URL"
                />
                <div className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleVoiceSearch}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Search by voice"
                    title="Search by voice"
                  >
                    <Mic size={18} className="sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={handleLensSearch}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Search with Google Lens"
                    title="Search with Google Lens"
                  >
                    <Camera size={18} className="sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <AIModeButton
                onClick={handleAIMode}
                variant="search"
                className="hidden lg:flex flex-shrink-0"
              />
            </div>
          </form>
        </motion.div>

        {/* Quick Access Icons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <QuickAccessIcons />
        </motion.div>
      </div>

      {/* Theme Watermark & Customize Button */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
        {backgroundImage && (
          <div className="text-xs text-white/90 font-medium drop-shadow-lg px-2 py-1 rounded bg-black/30 backdrop-blur-sm">
            Theme created by sundavi
          </div>
        )}
        <button
          onClick={() => setIsThemeSelectorOpen(true)}
          className="px-3 py-1.5 text-xs font-medium text-white/90 hover:text-white bg-black/30 hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm drop-shadow-lg border border-white/20"
        >
          Customize
        </button>
      </div>

      {/* Theme Selector Modal */}
      <ThemeSelector isOpen={isThemeSelectorOpen} onClose={() => setIsThemeSelectorOpen(false)} />
    </div>
  );
}
