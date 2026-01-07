/**
 * CommandPalette - ⌘K command overlay
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Box, Clock, Sparkles, History } from 'lucide-react';
import type { CommandDescriptor } from '../../lib/commands/types';
import { getAllCommands, onCommandsChanged } from '../../lib/commands/registry';
import { initializeBuiltinCommands, builtinsInitialized } from '../../lib/commands/builtin';
import { commandHistory } from '../../lib/commands/history';
import { ipc } from '../../lib/ipc-typed';
import { useContainerStore } from '../../state/containerStore';
import { ipcEvents } from '../../lib/ipc-events';
import type { ContainerInfo } from '../../lib/ipc-events';

interface CommandPaletteProps {
  onClose: () => void;
}

type HistoryEntry = {
  id: string;
  url: string;
  title: string;
  timestamp?: number;
  visitCount?: number;
  lastVisitTime?: number;
};

type TabSnapshot = {
  id: string;
  title?: string;
  url?: string;
  active?: boolean;
  containerId?: string;
  containerName?: string;
  containerColor?: string;
  mode?: 'normal' | 'ghost' | 'private';
};

type PaletteItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  type: 'command' | 'history' | 'container' | 'tab' | 'action';
  keywords?: string[];
  shortcut?: string[];
  badge?: string;
  run: () => Promise<void> | void;
  icon?: ReactNode;
  meta?: Record<string, unknown>;
};

const DEFAULT_SEARCH_ENGINE = 'https://duckduckgo.com/?q=';

const TYPE_PRIORITY: Record<PaletteItem['type'], number> = {
  action: 0,
  command: 1,
  container: 2,
  tab: 3,
  history: 4,
};

const PROTOCOL_REGEX = /^(https?:\/\/|chrome:\/\/|edge:\/\/|about:|file:\/\/)/i;
const DOMAIN_REGEX = /^[\w.-]+\.[a-z]{2,}(?:[\/?#].*)?$/i;

const withAlpha = (hex?: string, alpha = '33'): string | undefined => {
  if (!hex || !hex.startsWith('#')) return undefined;
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }
  if (hex.length === 7) {
    return `${hex}${alpha}`;
  }
  return hex;
};

const capitalize = (value?: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

const buildNavigationTarget = (input: string): { url: string; description: string; isDirect: boolean } => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { url: 'about:blank', description: 'Open a blank tab', isDirect: true };
  }

  if (PROTOCOL_REGEX.test(trimmed)) {
    return { url: trimmed, description: trimmed, isDirect: true };
  }

  if (!/\s/.test(trimmed) && DOMAIN_REGEX.test(trimmed)) {
    const url = trimmed.startsWith('www.') ? `https://${trimmed}` : `https://${trimmed}`;
    return { url, description: url, isDirect: true };
  }

  return {
    url: `${DEFAULT_SEARCH_ENGINE}${encodeURIComponent(trimmed)}`,
    description: `Search the web for “${trimmed}”`,
    isDirect: false,
  };
};

/**
 * Enhanced fuzzy search algorithm
 */
function fuzzyScore(query: string, value?: string): number {
  if (!value) return 0;
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedValue = value.toLowerCase();

  // Exact match gets highest score
  if (normalizedValue === normalizedQuery) {
    return 1000;
  }

  // Prefix match gets high score
  if (normalizedValue.startsWith(normalizedQuery)) {
    return 500;
  }

  // Word boundary match
  const words = normalizedValue.split(/\s+/);
  const queryWords = normalizedQuery.split(/\s+/);
  let wordBoundaryScore = 0;
  for (const qWord of queryWords) {
    for (const word of words) {
      if (word.startsWith(qWord)) {
        wordBoundaryScore += 100;
        break;
      }
    }
  }
  if (wordBoundaryScore > 0) {
    return wordBoundaryScore;
  }

  // Character sequence match
  let score = 0;
  let queryIndex = 0;
  let lastMatchIndex = -1;
  let consecutiveMatches = 0;

  for (let i = 0; i < normalizedValue.length && queryIndex < normalizedQuery.length; i++) {
    if (normalizedValue[i] === normalizedQuery[queryIndex]) {
      score += 5;
      if (lastMatchIndex === i - 1) {
        consecutiveMatches++;
        score += 3 * consecutiveMatches; // Consecutive bonus (increasing)
      } else {
        consecutiveMatches = 1;
      }
      if (i === 0) {
        score += 10; // Prefix bonus
      }
      lastMatchIndex = i;
      queryIndex++;
    }
  }

  if (queryIndex === normalizedQuery.length) {
    score += 10; // Matched all characters
  }

  // Penalty for unmatched characters
  const unmatchedRatio = (normalizedValue.length - queryIndex) / normalizedValue.length;
  score = Math.max(0, score - (unmatchedRatio * 5));

  return score;
}

function scorePaletteItem(query: string, item: PaletteItem, usageCount: number = 0): number {
  const fields = [
    item.title,
    item.subtitle,
    item.category,
    item.badge,
    ...(item.keywords ?? []),
  ];
  let best = 0;
  for (const field of fields) {
    const current = fuzzyScore(query, field);
    if (current > best) {
      best = current;
    }
  }
  
  // Boost score based on usage history
  if (usageCount > 0) {
    best += Math.min(usageCount * 2, 20); // Max 20 point boost
  }
  
  return best;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commands, setCommands] = useState<CommandDescriptor[]>([]);
  const [loading, setLoading] = useState(!builtinsInitialized());
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>([]);
  const [historySearchResults, setHistorySearchResults] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openTabs, setOpenTabs] = useState<TabSnapshot[]>([]);
  const [showRecentCommands, setShowRecentCommands] = useState(false);
  const { containers, activeContainerId, setContainers, setActiveContainer } = useContainerStore((state) => ({
    containers: state.containers,
    activeContainerId: state.activeContainerId,
    setContainers: state.setContainers,
    setActiveContainer: state.setActiveContainer,
  }));
  const containersRef = useRef<ContainerInfo[]>(containers);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    containersRef.current = containers;
  }, [containers]);

  useEffect(() => {
    if (!builtinsInitialized()) {
      initializeBuiltinCommands();
    }
    let mounted = true;

    const loadCommands = async () => {
      const list = await getAllCommands();
      if (!mounted) return;
      setCommands(list);
      setLoading(false);
      setSelectedIndex(0);
    };

    void loadCommands();
    const unsubscribe = onCommandsChanged(() => {
      void loadCommands();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadRecent = async () => {
      try {
        const list = await ipc.history.list();
        if (mounted) {
          setRecentHistory(Array.isArray(list) ? list.slice(0, 20) : []);
        }
      } catch (error) {
        console.warn('[CommandPalette] Failed to load history list:', error);
      }
    };
    void loadRecent();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (containers.length === 0) {
      ipc.containers
        .list()
        .then((list: any) => {
          if (!cancelled && Array.isArray(list)) {
            setContainers(list as ContainerInfo[]);
          }
        })
        .catch((error: any) => {
          console.warn('[CommandPalette] Failed to load containers:', error);
        });
    }

    const unsubscribeList = ipcEvents.on<ContainerInfo[]>('containers:list', (payload) => {
      if (Array.isArray(payload)) {
        setContainers(payload as ContainerInfo[]);
      }
    });

    const unsubscribeActive = ipcEvents.on<{ containerId: string; container?: ContainerInfo }>(
      'containers:active',
      (payload) => {
        if (!payload) return;
        const next = payload.container ?? containersRef.current.find((c) => c.id === payload.containerId);
        if (next) {
          setActiveContainer(next);
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribeList();
      unsubscribeActive();
    };
  }, [containers.length, setContainers, setActiveContainer]);

  useEffect(() => {
    let cancelled = false;
    const loadTabs = async () => {
      try {
        const list = await ipc.tabs.list();
        if (!cancelled && Array.isArray(list)) {
          setOpenTabs(list as TabSnapshot[]);
        }
      } catch (error) {
        console.warn('[CommandPalette] Failed to load tabs:', error);
      }
    };
    void loadTabs();

    const unsubscribeTabs = ipcEvents.on<any[]>('tabs:updated', (payload) => {
      if (Array.isArray(payload)) {
        setOpenTabs(payload as TabSnapshot[]);
      }
    });

    return () => {
      cancelled = true;
      unsubscribeTabs();
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHistorySearchResults([]);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);

    const runSearch = async () => {
      try {
        const results = await ipc.history.search(trimmed);
        if (!cancelled) {
          setHistorySearchResults(Array.isArray(results) ? results.slice(0, 20) : []);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('[CommandPalette] History search failed:', error);
          setHistorySearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const filteredItems = useMemo(() => {
    const trimmed = query.trim();
    const normalized = trimmed.toLowerCase();
    const historySource = normalized.length >= 2 ? historySearchResults : recentHistory;

    // Get command usage counts for scoring
    const usageCounts = new Map<string, number>();
    for (const cmd of commands) {
      usageCounts.set(cmd.id, commandHistory.getUsageCount(cmd.id));
    }

    const commandItems: PaletteItem[] = commands.map((cmd) => ({
      id: cmd.id,
      title: cmd.title,
      subtitle: cmd.subtitle,
      category: cmd.category,
      type: 'command',
      keywords: cmd.keywords,
      shortcut: cmd.shortcut,
      badge: cmd.badge,
      run: async () => {
        commandHistory.record(cmd.id, trimmed);
        await cmd.run();
      },
      meta: { usageCount: usageCounts.get(cmd.id) || 0 },
    }));

    const containerItems: PaletteItem[] = containers.map((container) => ({
      id: `container:${container.id}`,
      title: `Switch to ${container.name}`,
      subtitle: container.description || `${capitalize(container.scope ?? 'session')} container`,
      category: 'Containers',
      type: 'container',
      badge: container.id === activeContainerId ? 'Active' : undefined,
      keywords: [container.name, container.description ?? '', container.id, container.scope ?? ''],
      meta: { color: container.color, container },
      run: async () => {
        try {
          const result = await ipc.containers.setActive(container.id);
          const info = (result || container) as ContainerInfo;
          setActiveContainer(info);
        } catch (error) {
          console.warn('[CommandPalette] Failed to switch container:', error);
        }
      },
    }));

    const tabItems: PaletteItem[] = openTabs.map((tab) => ({
      id: `tab:${tab.id}`,
      title: tab.title || tab.url || 'Untitled tab',
      subtitle: tab.url,
      category: 'Open Tabs',
      type: 'tab',
      badge: tab.active ? 'Current Tab' : tab.containerName,
      keywords: [tab.title ?? '', tab.url ?? '', tab.containerName ?? '', tab.mode ?? ''],
      meta: { color: tab.containerColor, active: tab.active },
      run: async () => {
        await ipc.tabs.activate({ id: tab.id });
      },
    }));

    const historyItems: PaletteItem[] = historySource.map((entry) => ({
      id: `history:${entry.id}`,
      title: entry.title || entry.url,
      subtitle: entry.url,
      category: 'History',
      type: 'history',
      badge: entry.visitCount ? `${entry.visitCount}×` : undefined,
      keywords: [entry.url, entry.title],
      run: async () => {
        if (!entry.url) return;
        await ipc.tabs.create({ url: entry.url });
      },
    }));

    const openInContainerItems: PaletteItem[] =
      trimmed.length > 0
        ? containers.map((container) => {
            const target = buildNavigationTarget(trimmed);
            return {
              id: `open:${container.id}:${trimmed}`,
              title: target.isDirect
                ? `Open ${target.url} in ${container.name}`
                : `Search “${trimmed}” in ${container.name}`,
              subtitle: target.description,
              category: 'Open in Container',
              type: 'action',
              badge: 'New Tab',
              keywords: [trimmed, container.name, container.id],
              meta: { color: container.color },
              run: async () => {
                await ipc.tabs.create({ url: target.url, containerId: container.id });
              },
            } satisfies PaletteItem;
          })
        : [];

    const combined = [
      ...openInContainerItems,
      ...commandItems,
      ...containerItems,
      ...tabItems,
      ...historyItems,
    ];

    if (!normalized) {
      return combined.slice(0, 30);
    }

    const scored = combined
      .map((item) => ({
        item,
        score: scorePaletteItem(
          normalized,
          item,
          (item.meta?.usageCount as number) || 0
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        const orderA = TYPE_PRIORITY[a.item.type] ?? 99;
        const orderB = TYPE_PRIORITY[b.item.type] ?? 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.item.title.localeCompare(b.item.title);
      })
      .slice(0, 30)
      .map(({ item }) => item);
    return scored;
  }, [query, commands, containers, activeContainerId, openTabs, historySearchResults, recentHistory, setActiveContainer]);

  // Recent commands when query is empty
  const recentCommands = useMemo(() => {
    if (!showRecentCommands) return [];
    
    const recent = commandHistory.getRecent(10);
    const items: PaletteItem[] = [];
    for (const entry of recent) {
      const cmd = commands.find(c => c.id === entry.commandId);
      if (!cmd) continue;
      items.push({
        id: `recent:${entry.commandId}`,
        title: cmd.title,
        subtitle: cmd.subtitle || `Used ${new Date(entry.timestamp).toLocaleDateString()}`,
        category: 'Recent Commands',
        type: 'command' as const,
        keywords: cmd.keywords,
        shortcut: cmd.shortcut,
        badge: 'Recent',
        run: async () => {
          commandHistory.record(cmd.id);
          await cmd.run();
        },
        icon: <History size={14} />,
      });
      if (items.length >= 5) break;
    }
    return items;
  }, [showRecentCommands, commands]);

  // Combine recent commands with filtered items
  const displayItems = useMemo(() => {
    if (showRecentCommands && recentCommands.length > 0 && query.trim().length === 0) {
      return [...recentCommands, ...filteredItems.slice(0, 25)];
    }
    return filteredItems;
  }, [showRecentCommands, recentCommands, filteredItems, query]);

  const groupedItems = useMemo(() => {
    const sections: Array<{ category: string; items: PaletteItem[]; startIndex: number }> = [];
    let currentCategory = '';

    displayItems.forEach((item, index) => {
      if (item && item.category !== currentCategory) {
        currentCategory = item.category;
        sections.push({ category: currentCategory, items: [item], startIndex: index });
      } else if (item) {
        sections[sections.length - 1]?.items.push(item);
      }
    });

    return sections;
  }, [displayItems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, Math.max(displayItems.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (displayItems[selectedIndex]) {
          void displayItems[selectedIndex].run();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, displayItems, onClose]);

  useEffect(() => {
    if (selectedIndex >= displayItems.length) {
      setSelectedIndex(displayItems.length > 0 ? displayItems.length - 1 : 0);
    }
  }, [displayItems, selectedIndex]);

  // Show recent commands when query is empty
  useEffect(() => {
    setShowRecentCommands(query.trim().length === 0);
  }, [query]);

  const renderIcon = (item: PaletteItem) => {
    const color = typeof item.meta?.color === 'string' ? (item.meta.color as string) : undefined;
    const classNameBase =
      'inline-flex h-6 w-6 items-center justify-center rounded-lg border text-[11px]';
    const className =
      color != null
        ? classNameBase
        : `${classNameBase} border-gray-700 bg-gray-800/60 text-gray-300`;
    const style =
      color != null
        ? {
            borderColor: withAlpha(color, '66') ?? color,
            backgroundColor: withAlpha(color, '22') ?? color,
            color,
          }
        : undefined;

    if (item.icon) {
      return (
        <span className={className} style={style}>
          {item.icon}
        </span>
      );
    }

    switch (item.type) {
      case 'history':
        return (
          <span className={className} style={style}>
            <Clock size={14} />
          </span>
        );
      case 'container':
        return (
          <span className={className} style={style}>
            <Box size={14} />
          </span>
        );
      case 'tab':
        return (
          <span className={className} style={style}>
            <Box size={12} />
          </span>
        );
      case 'action':
        return (
          <span className={className} style={style}>
            <Sparkles size={14} />
          </span>
        );
      default:
        return (
          <span className={className} style={style}>
            <Sparkles size={14} />
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Palette */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: -20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl mx-4 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/50">
          <Search size={20} className="text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none"
          />
          <kbd className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {displayItems.length > 0 ? (
            <div className="py-2">
              {groupedItems.map((section) => (
                <div key={`section-${section.category}`}>
                  <div className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-gray-500">
                    {section.category}
                  </div>
                  <div className="flex flex-col">
                    {section.items.map((cmd, index) => {
                      const globalIndex = section.startIndex + index;
                      const isSelected = selectedIndex === globalIndex;
                      const iconElement = renderIcon(cmd);
                      return (
                        <motion.button
                          key={cmd.id}
                          onClick={async () => {
                            await cmd.run();
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            isSelected
                              ? 'bg-blue-600/20 border-l-2 border-blue-500'
                              : 'hover:bg-gray-800/40 border-l-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {iconElement}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-200 truncate">{cmd.title}</span>
                                {cmd.badge && (
                                  <span className="rounded-full border border-gray-700 bg-gray-800/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                                    {cmd.badge}
                                  </span>
                                )}
                              </div>
                              {cmd.subtitle && (
                                <div className="text-xs text-gray-500 truncate">
                                  {cmd.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            {cmd.shortcut && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                {cmd.shortcut.map((part, idx) => (
                                  <kbd
                                    key={`${cmd.id}-sc-${idx}`}
                                    className="rounded border border-gray-700 bg-gray-800/60 px-1.5 py-0.5 text-[10px] text-gray-400"
                                  >
                                    {part}
                                  </kbd>
                                ))}
                              </span>
                            )}
                            <ArrowRight size={16} className="text-gray-500" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 text-sm">
              {loading || historyLoading ? 'Searching…' : 'No commands found'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>{displayItems.length} {displayItems.length === 1 ? 'result' : 'results'}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

