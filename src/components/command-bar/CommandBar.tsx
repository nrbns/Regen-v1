/**
 * Global Command Bar - Tier 3
 * Spotlight-style command palette (⌘K / Ctrl+K)
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  FileText,
  TrendingUp,
  Shield,
  Settings,
  BookOpen,
  FolderOpen,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { useTabsStore } from '../../state/tabsStore';
import { useBookmarksStore } from '../../state/bookmarksStore';
import { ipc } from '../../lib/ipc-typed';
import { track } from '../../services/analytics';
import { useSystemStatus } from '../../hooks/useSystemStatus';

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<any>;
  keywords: string[];
  action: () => void | Promise<void>;
  category: 'modes' | 'actions' | 'navigation' | 'settings';
};

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const mode = useAppStore(state => state.mode);
  const setMode = useAppStore(state => state.setMode);
  const bookmarks = useBookmarksStore(state => state.bookmarks);
  const { data: systemStatus } = useSystemStatus();

  // Build command list
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Modes
      {
        id: 'mode-research',
        label: 'Switch to Research Mode',
        description: 'AI-powered research and analysis',
        icon: Search,
        keywords: ['research', 'mode', 'switch'],
        category: 'modes',
        action: () => setMode('Research'),
      },
      {
        id: 'mode-browse',
        label: 'Switch to Browse Mode',
        description: 'Standard web browsing',
        icon: FileText,
        keywords: ['browse', 'mode', 'switch'],
        category: 'modes',
        action: () => setMode('Browse'),
      },
      {
        id: 'mode-trade',
        label: 'Switch to Trade Mode',
        description: 'Trading and market analysis',
        icon: TrendingUp,
        keywords: ['trade', 'mode', 'switch'],
        category: 'modes',
        action: () => setMode('Trade'),
      },
      {
        id: 'mode-threats',
        label: 'Switch to Threats Mode',
        description: 'Security and threat analysis',
        icon: Shield,
        keywords: ['threats', 'security', 'mode'],
        category: 'modes',
        action: () => setMode('Threats'),
      },
      // Actions
      {
        id: 'new-tab',
        label: 'New Tab',
        description: 'Open a new tab',
        icon: FileText,
        keywords: ['new', 'tab', 'open'],
        category: 'actions',
        action: async () => {
          const newTab = await ipc.tabs.create('about:blank');
          if (newTab) {
            const tabId =
              typeof newTab === 'object' && 'id' in newTab
                ? newTab.id
                : typeof newTab === 'string'
                  ? newTab
                  : null;
            if (tabId && typeof tabId === 'string') {
              useTabsStore.getState().setActive(tabId);
            }
          }
        },
      },
      {
        id: 'open-omniagent',
        label: 'Open OmniAgent',
        description: 'Ask OmniAgent a question',
        icon: Sparkles,
        keywords: ['agent', 'omniagent', 'ai', 'ask'],
        category: 'actions',
        action: async () => {
          await setMode('Research');
          // Focus on OmniAgent input
          const event = new CustomEvent('omniagent:focus');
          window.dispatchEvent(event);
        },
      },
      // Navigation
      {
        id: 'open-settings',
        label: 'Open Settings',
        description: 'Configure OmniBrowser',
        icon: Settings,
        keywords: ['settings', 'preferences', 'config'],
        category: 'navigation',
        action: () => {
          window.location.href = '/settings';
        },
      },
      {
        id: 'open-bookmarks',
        label: 'Open Bookmarks',
        description: 'View saved bookmarks',
        icon: BookOpen,
        keywords: ['bookmarks', 'saved', 'favorites'],
        category: 'navigation',
        action: () => {
          const event = new CustomEvent('sidepanel:open', { detail: { tab: 'bookmarks' } });
          window.dispatchEvent(event);
        },
      },
      {
        id: 'open-workspaces',
        label: 'Open Workspaces',
        description: 'View saved workspaces',
        icon: FolderOpen,
        keywords: ['workspaces', 'sessions', 'saved'],
        category: 'navigation',
        action: () => {
          const event = new CustomEvent('sidepanel:open', { detail: { tab: 'workspaces' } });
          window.dispatchEvent(event);
        },
      },
      {
        id: 'system-status',
        label: 'System Status',
        description: 'View system health and service status',
        icon: Activity,
        keywords: ['system', 'status', 'health', 'redis', 'redix', 'worker'],
        category: 'settings',
        action: () => {
          // Trigger system status panel to open
          const event = new CustomEvent('system-status:open');
          window.dispatchEvent(event);
        },
      },
    ];

    // Add bookmarks as commands
    bookmarks.slice(0, 5).forEach(bookmark => {
      items.push({
        id: `bookmark-${bookmark.id}`,
        label: bookmark.title,
        description: bookmark.url,
        icon: BookOpen,
        keywords: [bookmark.title, bookmark.url, 'bookmark'],
        category: 'navigation',
        action: async () => {
          const newTab = await ipc.tabs.create(bookmark.url);
          if (newTab) {
            const tabId =
              typeof newTab === 'object' && 'id' in newTab
                ? newTab.id
                : typeof newTab === 'string'
                  ? newTab
                  : null;
            if (tabId && typeof tabId === 'string') {
              useTabsStore.getState().setActive(tabId);
            }
          }
        },
      });
    });

    return items;
  }, [mode, bookmarks, setMode, systemStatus]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(
      cmd =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))
    );
  }, [commands, query]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        track('command_bar_opened');
      }

      if (open) {
        if (e.key === 'Escape') {
          setOpen(false);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const command = filteredCommands[selectedIndex];
          if (command) {
            command.action();
            setOpen(false);
            setQuery('');
            track('command_bar_executed', { command: command.id });
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredCommands, selectedIndex]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleCommandClick = (command: CommandItem) => {
    command.action();
    setOpen(false);
    setQuery('');
    track('command_bar_executed', { command: command.id });
  };

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const categoryLabels: Record<string, string> = {
    modes: 'Modes',
    actions: 'Actions',
    navigation: 'Navigation',
    settings: 'Settings',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1080]"
          />

          {/* Command bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl mx-4 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl z-[1080]"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-800">
              <Search size={20} className="text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-lg"
                autoFocus
              />
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                </kbd>
                <span>+</span>
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700">K</kbd>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>No commands found</p>
                  <p className="text-sm mt-2">Try a different search term</p>
                </div>
              ) : (
                Object.entries(groupedCommands).map(([category, items]) => (
                  <div key={category} className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {categoryLabels[category] || category}
                    </div>
                    {items.map((cmd, _idx) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const isSelected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => handleCommandClick(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/40'
                              : 'hover:bg-slate-800'
                          }`}
                        >
                          <cmd.icon
                            size={18}
                            className={isSelected ? 'text-purple-300' : 'text-slate-400'}
                          />
                          <div className="flex-1 text-left">
                            <div
                              className={`font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}
                            >
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div className="text-xs text-slate-500 mt-0.5">{cmd.description}</div>
                            )}
                          </div>
                          {isSelected && <ArrowRight size={16} className="text-purple-300" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
