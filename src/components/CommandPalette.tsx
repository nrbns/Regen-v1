/**
 * Command Palette (Cmd+K / Ctrl+K)
 * SigmaOS/Arc-style command bar for quick actions
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, TrendingUp, Globe, FileText, Settings, X } from 'lucide-react';
import { useAppStore } from '../state/appStore';
import { toast } from '../utils/toast';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void | Promise<void>;
  keywords: string[];
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setMode } = useAppStore();

  const commands: Command[] = [
    {
      id: 'research',
      label: 'Research Mode',
      description: 'Open research mode and search',
      icon: Sparkles,
      keywords: ['research', 'search', 'find', 'lookup'],
      action: async () => {
        await setMode('Research');
        setIsOpen(false);
        toast.info('Research mode opened');
      },
    },
    {
      id: 'trade',
      label: 'Trade Mode',
      description: 'Open trading mode with charts',
      icon: TrendingUp,
      keywords: ['trade', 'trading', 'chart', 'btc', 'crypto'],
      action: async () => {
        await setMode('Trade');
        setIsOpen(false);
        toast.info('Trade mode opened');
      },
    },
    {
      id: 'browse',
      label: 'Browse Mode',
      description: 'Switch to browsing mode',
      icon: Globe,
      keywords: ['browse', 'web', 'internet'],
      action: async () => {
        await setMode('Browse');
        setIsOpen(false);
        toast.info('Browse mode opened');
      },
    },
    {
      id: 'wispr',
      label: 'WISPR Voice',
      description: 'Activate WISPR voice assistant',
      icon: Sparkles,
      keywords: ['wispr', 'voice', 'jarvis', 'assistant'],
      action: () => {
        setIsOpen(false);
        // Trigger WISPR activation
        window.dispatchEvent(new CustomEvent('activate-wispr'));
        toast.info('WISPR activated');
      },
    },
  ];

  // Filter commands based on query
  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(
      cmd =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery) ||
        cmd.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))
    );
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Global shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        if (!isOpen) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Commands List */}
              <div className="max-h-96 overflow-y-auto">
                {filteredCommands.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400">No commands found</div>
                ) : (
                  filteredCommands.map((cmd, index) => {
                    const Icon = cmd.icon;
                    const isSelected = index === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected
                            ? 'bg-purple-600/20 border-l-2 border-purple-500'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        <Icon size={20} className="text-slate-400" />
                        <div className="flex-1">
                          <div className="text-white font-medium">{cmd.label}</div>
                          <div className="text-sm text-slate-400">{cmd.description}</div>
                        </div>
                        {isSelected && <div className="text-xs text-slate-500">Enter</div>}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                <div>↑↓ Navigate • Enter Select • Esc Close</div>
                <div>Cmd+K / Ctrl+K to open</div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
