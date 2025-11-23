/**
 * QuickAccessIcons - Circular icons for frequently visited websites
 * Shows icons with labels, similar to Chrome's new tab page
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { QuickAccessEditor } from './QuickAccessEditor';

interface QuickAccessSite {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  icon?: string;
  notificationCount?: number;
}

// Default quick access sites
const DEFAULT_SITES: QuickAccessSite[] = [
  {
    id: 'github',
    url: 'https://github.com',
    title: 'github.com',
    icon: '🔷',
  },
  {
    id: 'grok',
    url: 'https://x.ai/grok',
    title: 'Grok',
    icon: '🤖',
  },
  {
    id: 'gmail',
    url: 'https://mail.google.com',
    title: 'Inbox',
    icon: '📧',
  },
  {
    id: 'chatgpt',
    url: 'https://chatgpt.com',
    title: 'chatgpt.com',
    icon: '💬',
  },
  {
    id: 'whatsapp',
    url: 'https://web.whatsapp.com',
    title: 'WhatsApp',
    icon: '💚',
    notificationCount: 3,
  },
  {
    id: 'startupjobs',
    url: 'https://www.startupjobs.com',
    title: 'Startup Jobs',
    icon: '🚀',
  },
  {
    id: 'application',
    url: '#',
    title: 'Application U...',
    icon: '📱',
  },
  {
    id: 'huggingface',
    url: 'https://huggingface.co',
    title: 'Hugging Fac...',
    icon: '🤗',
  },
  {
    id: 'cmmi',
    url: 'https://cmmiinstitute.com',
    title: 'CMMI Instit',
    icon: '🌐',
  },
];

export function QuickAccessIcons() {
  const [sites, setSites] = useState<QuickAccessSite[]>(DEFAULT_SITES);
  const [loading, setLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { tabs, activeId } = useTabsStore();

  useEffect(() => {
    // Load saved custom sites first
    const loadSavedSites = () => {
      try {
        const saved = localStorage.getItem('chrome-quick-access-sites');
        if (saved) {
          const parsed = JSON.parse(saved) as QuickAccessSite[];
          if (parsed.length > 0) {
            setSites(parsed);
            return true;
          }
        }
      } catch (error) {
        console.error('[QuickAccessIcons] Failed to load saved sites:', error);
      }
      return false;
    };

    if (loadSavedSites()) {
      return; // Use saved sites, don't load from history
    }

    // Load frequently visited sites from history
    const loadFrequentSites = async () => {
      try {
        setLoading(true);
        const history = await ipc.history.list().catch(() => null);
        if (history && Array.isArray(history)) {
          // Group by domain and count visits
          const siteMap = new Map<
            string,
            { url: string; title: string; count: number; favicon?: string }
          >();
          history.forEach((entry: any) => {
            if (!entry.url || entry.url.startsWith('about:') || entry.url.startsWith('chrome:')) {
              return;
            }
            try {
              const urlObj = new URL(entry.url);
              const domain = urlObj.hostname.replace('www.', '');
              const existing = siteMap.get(domain);
              if (existing) {
                existing.count += 1;
                // Prefer shorter titles
                if (
                  entry.title &&
                  (!existing.title || entry.title.length < existing.title.length)
                ) {
                  existing.title = entry.title;
                }
              } else {
                siteMap.set(domain, {
                  url: entry.url,
                  title: entry.title || domain,
                  count: 1,
                  favicon: entry.favicon,
                });
              }
            } catch {
              // Invalid URL, skip
            }
          });

          // Get top 8 sites
          const topSites = Array.from(siteMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)
            .map((site, index) => ({
              id: `site-${index}`,
              ...site,
            }));

          if (topSites.length > 0) {
            setSites(topSites as QuickAccessSite[]);
          }
        }
      } catch (error) {
        console.error('[QuickAccessIcons] Failed to load frequent sites:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadFrequentSites();
  }, []);

  const handleUpdateSites = (updatedSites: QuickAccessSite[]) => {
    setSites(updatedSites);
    try {
      localStorage.setItem('chrome-quick-access-sites', JSON.stringify(updatedSites));
    } catch (error) {
      console.error('[QuickAccessIcons] Failed to save sites:', error);
    }
  };

  const handleSiteClick = async (site: QuickAccessSite) => {
    if (!site.url || site.url === '#') return;

    try {
      // Check if active tab is about:blank
      const activeTab = tabs.find(t => t.id === activeId);

      if (activeTab && (activeTab.url === 'about:blank' || !activeTab.url)) {
        await ipc.tabs.navigate(activeTab.id, site.url);
      } else {
        await ipc.tabs.create(site.url);
      }
    } catch (error) {
      console.error('[QuickAccessIcons] Failed to open site:', error);
    }
  };

  if (loading && sites.length === 0) {
    return (
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-center gap-4 flex-wrap max-w-4xl relative">
        {sites.map((site, index) => (
          <motion.button
            key={site.id}
            onClick={() => void handleSiteClick(site)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.1, y: -4 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-2 group relative"
            aria-label={`Open ${site.title}`}
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-2xl group-hover:shadow-lg transition-shadow border-2 border-transparent group-hover:border-gray-200">
                {site.favicon ? (
                  <img
                    src={site.favicon}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                    onError={e => {
                      // Fallback to icon if favicon fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.textContent = site.icon || '🌐';
                      }
                    }}
                  />
                ) : (
                  <span>{site.icon || '🌐'}</span>
                )}
              </div>
              {site.notificationCount && site.notificationCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                  {site.notificationCount}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-700 font-medium max-w-[80px] truncate group-hover:text-gray-900 transition-colors">
              {site.title}
            </span>
          </motion.button>
        ))}

        {/* Edit Button - always visible but subtle */}
        <button
          onClick={() => setIsEditorOpen(true)}
          className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200 z-10 opacity-80 hover:opacity-100"
          aria-label="Customize shortcuts"
          title="Customize shortcuts"
        >
          <Settings size={16} className="text-gray-600" />
        </button>
      </div>

      <QuickAccessEditor
        sites={sites}
        onUpdate={handleUpdateSites}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />
    </>
  );
}
