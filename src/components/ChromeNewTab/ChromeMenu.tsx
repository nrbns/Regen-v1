/**
 * ChromeMenu - Three-dot menu similar to Chrome browser
 * Shows user account, browser actions, settings, etc.
 */

import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  User,
  ChevronRight,
  Plus,
  Shield,
  Eye,
  History,
  Download,
  Bookmark,
  FolderPlus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  Camera,
  Languages,
  Edit3,
  Share2,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';
import { useAppStore } from '../../state/appStore';
import { useSettingsStore } from '../../state/settingsStore';

interface ChromeMenuProps {
  className?: string;
}

export function ChromeMenu({ className = '' }: ChromeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setMode } = useAppStore();
  const account = useSettingsStore(state => state.account);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNewTab = async () => {
    await ipc.tabs.create('about:blank');
    setIsOpen(false);
  };

  const handleNewWindow = async () => {
    // In Electron, this would open a new window
    await ipc.tabs.create('about:blank');
    setIsOpen(false);
  };

  const handleIncognito = async () => {
    await ipc.tabs.create({ url: 'about:blank', mode: 'private' });
    setIsOpen(false);
  };

  const handleHistory = () => {
    setMode('Research');
    // Open history panel
    setIsOpen(false);
  };

  const handleDownloads = async () => {
    // Open downloads panel
    setIsOpen(false);
  };

  const handleBookmarks = () => {
    // Open bookmarks panel
    setIsOpen(false);
  };

  const handleExtensions = () => {
    // Open extensions panel
    setIsOpen(false);
  };

  const handleSettings = () => {
    // Open settings
    setIsOpen(false);
  };

  const menuItems = [
    {
      id: 'user',
      type: 'header' as const,
      title: account.displayName || 'Guest',
      subtitle: account.email ? 'Signed in' : 'Not signed in',
      icon: User,
      action: () => {},
    },
    {
      id: 'divider-1',
      type: 'divider' as const,
    },
    {
      id: 'new-tab',
      title: 'New tab',
      shortcut: 'Ctrl+T',
      icon: Plus,
      action: handleNewTab,
    },
    {
      id: 'new-window',
      title: 'New window',
      shortcut: 'Ctrl+N',
      icon: Plus,
      action: handleNewWindow,
    },
    {
      id: 'incognito',
      title: 'New Incognito window',
      shortcut: 'Ctrl+Shift+N',
      icon: Eye,
      action: handleIncognito,
    },
    {
      id: 'divider-2',
      type: 'divider' as const,
    },
    {
      id: 'passwords',
      title: 'Passwords and autofill',
      icon: Shield,
      hasArrow: true,
      action: () => setIsOpen(false),
    },
    {
      id: 'history',
      title: 'History',
      icon: History,
      hasArrow: true,
      action: handleHistory,
    },
    {
      id: 'downloads',
      title: 'Downloads',
      shortcut: 'Ctrl+J',
      icon: Download,
      action: handleDownloads,
    },
    {
      id: 'bookmarks',
      title: 'Bookmarks and lists',
      icon: Bookmark,
      hasArrow: true,
      action: handleBookmarks,
    },
    {
      id: 'tab-groups',
      title: 'Tab groups',
      icon: FolderPlus,
      hasArrow: true,
      action: () => setIsOpen(false),
    },
    {
      id: 'extensions',
      title: 'Extensions',
      icon: Settings,
      hasArrow: true,
      action: handleExtensions,
    },
    {
      id: 'delete-data',
      title: 'Delete browsing data...',
      shortcut: 'Ctrl+Shift+Del',
      icon: Trash2,
      action: () => setIsOpen(false),
    },
    {
      id: 'divider-3',
      type: 'divider' as const,
    },
    {
      id: 'zoom',
      type: 'zoom' as const,
      title: 'Zoom',
      current: 100,
    },
    {
      id: 'print',
      title: 'Print...',
      shortcut: 'Ctrl+P',
      icon: Printer,
      action: () => setIsOpen(false),
    },
    {
      id: 'lens',
      title: 'Search with Google Lens',
      icon: Camera,
      action: () => setIsOpen(false),
    },
    {
      id: 'translate',
      title: 'Translate...',
      icon: Languages,
      hasArrow: true,
      action: () => setIsOpen(false),
    },
    {
      id: 'find',
      title: 'Find and edit',
      icon: Edit3,
      hasArrow: true,
      action: () => setIsOpen(false),
    },
    {
      id: 'share',
      title: 'Cast, save and share',
      icon: Share2,
      hasArrow: true,
      action: () => setIsOpen(false),
    },
    {
      id: 'more-tools',
      title: 'More tools',
      icon: Settings,
      hasArrow: true,
      action: () => setIsOpen(false),
    },
    {
      id: 'divider-4',
      type: 'divider' as const,
    },
    {
      id: 'help',
      title: 'Help',
      icon: HelpCircle,
      hasArrow: true,
      action: () => setIsOpen(false),
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      action: handleSettings,
    },
    {
      id: 'exit',
      title: 'Exit',
      action: () => {
        // Close application
        setIsOpen(false);
      },
    },
  ];

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full p-2 transition-colors hover:bg-gray-200/50"
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <MoreVertical size={20} className="text-gray-700" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full z-[100] mt-2 max-h-[calc(100vh-120px)] w-72 overflow-hidden overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-2xl"
              style={{ marginRight: '-8px' }}
            >
              {menuItems.map((item, _index) => {
                if (item.type === 'divider') {
                  return <div key={item.id} className="my-1 h-px bg-gray-200" />;
                }

                if (item.type === 'header') {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50"
                      onClick={() => {
                        if (item.action) item.action();
                      }}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {item.title}
                        </div>
                        {item.subtitle && (
                          <div className="truncate text-xs text-gray-500">{item.subtitle}</div>
                        )}
                      </div>
                      {item.hasArrow && (
                        <ChevronRight size={16} className="flex-shrink-0 text-gray-400" />
                      )}
                    </div>
                  );
                }

                if (item.type === 'zoom') {
                  return (
                    <div key={item.id} className="border-b border-gray-100 px-4 py-3">
                      <div className="mb-2 text-xs font-medium text-gray-700">{item.title}</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded p-1.5 hover:bg-gray-100"
                          aria-label="Zoom out"
                        >
                          <ZoomOut size={16} className="text-gray-600" />
                        </button>
                        <span className="flex-1 text-center text-sm font-medium text-gray-700">
                          {item.current}%
                        </span>
                        <button
                          type="button"
                          className="rounded p-1.5 hover:bg-gray-100"
                          aria-label="Zoom in"
                        >
                          <ZoomIn size={16} className="text-gray-600" />
                        </button>
                        <button
                          type="button"
                          className="ml-2 rounded p-1.5 hover:bg-gray-100"
                          aria-label="Full screen"
                        >
                          <Maximize2 size={16} className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                  );
                }

                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.action) item.action();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                  >
                    {Icon && <Icon size={16} className="flex-shrink-0 text-gray-600" />}
                    <span className="flex-1 text-sm text-gray-700">{item.title}</span>
                    {item.shortcut && (
                      <span className="font-mono text-xs text-gray-400">{item.shortcut}</span>
                    )}
                    {item.hasArrow && (
                      <ChevronRight size={16} className="flex-shrink-0 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
