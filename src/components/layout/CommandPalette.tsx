/**
 * CommandPalette - ⌘K command overlay
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useAppStore } from '../../state/appStore';
import { useTabsStore } from '../../state/tabsStore';

interface Command {
  id: string;
  label: string;
  description: string;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const { activeId } = useTabsStore();
  const { setMode } = useAppStore();
  
  const commands: Command[] = [
    { 
      id: 'new-tab', 
      label: 'New Tab', 
      description: 'Open a new browser tab',
      category: 'Navigation',
      action: async () => {
        await ipc.tabs.create('about:blank');
      },
    },
    { 
      id: 'research-mode', 
      label: 'Open in Research Mode', 
      description: 'Switch to research mode for current tab',
      category: 'Modes',
      action: () => {
        setMode('Research');
      },
    },
    { 
      id: 'threat-mode', 
      label: 'Open in Threat Mode', 
      description: 'Switch to threat analysis mode',
      category: 'Modes',
      action: () => {
        setMode('Threats');
      },
    },
    { 
      id: 'trade-mode', 
      label: 'Open in Trade Mode', 
      description: 'Switch to trading mode',
      category: 'Modes',
      action: () => {
        setMode('Trade');
      },
    },
    { 
      id: 'ask-agent', 
      label: 'Ask Agent', 
      description: 'Send a prompt to the AI agent',
      category: 'AI',
      action: async () => {
        const promptText = prompt('Enter your question:');
        if (promptText) {
          await ipc.agent.createTask({
            title: 'User Query',
            role: 'researcher',
            goal: promptText,
            budget: { tokens: 4096, seconds: 120, requests: 20 },
          });
        }
      },
    },
    { 
      id: 'save-workspace', 
      label: 'Save Workspace', 
      description: 'Save current tabs and layout',
      category: 'Workspace',
      action: async () => {
        const name = prompt('Workspace name:');
        if (name) {
          await ipc.storage.saveWorkspace({
            id: crypto.randomUUID(),
            name,
            partition: `persist:workspace:${Date.now()}`,
          });
        }
      },
    },
    { 
      id: 'privacy-dashboard', 
      label: 'Privacy Dashboard', 
      description: 'View and manage privacy settings',
      category: 'Settings',
      action: () => {
        window.location.href = '#/privacy';
      },
    },
    { 
      id: 'burn-tab', 
      label: 'Burn Active Tab', 
      description: 'Permanently delete all data from active tab',
      category: 'Privacy',
      action: async () => {
        if (activeId) {
          if (confirm('Are you sure you want to burn this tab? All data will be deleted.')) {
            await ipc.tabs.burn(activeId);
          }
        }
      },
    },
  ];
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredCommands, onClose]);

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
          {filteredCommands.length > 0 ? (
            <div className="py-2">
              {filteredCommands.map((cmd, index) => (
                <motion.button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 text-left
                    transition-colors
                    ${selectedIndex === index
                      ? 'bg-blue-600/20 border-l-2 border-blue-500'
                      : 'hover:bg-gray-800/40'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-200">
                      {cmd.label}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {cmd.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-gray-600">{cmd.category}</span>
                    <ArrowRight size={16} className="text-gray-500" />
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 text-sm">
              No commands found
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
          <span>{filteredCommands.length} commands</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

