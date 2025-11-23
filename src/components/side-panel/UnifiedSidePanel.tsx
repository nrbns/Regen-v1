/**
 * UnifiedSidePanel - Combined History, Bookmarks, and Downloads panel
 * Based on Figma UI/UX Prototype Flow redesign
 */

import { useState } from 'react';
import { Clock, Star, Download, X, Search, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Use existing BookmarksPanel from bookmarks folder (has folders support)
import { BookmarksPanel } from '../bookmarks/BookmarksPanel';
import { WorkspacesPanel } from '../WorkspacesPanel';
import HistoryPage from '../../routes/History';
import DownloadsPage from '../../routes/Downloads';

export interface UnifiedSidePanelProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'history' | 'bookmarks' | 'workspaces' | 'downloads';
  width?: number;
}

type TabType = 'history' | 'bookmarks' | 'workspaces' | 'downloads';

const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: 'history', label: 'History', icon: <Clock size={16} /> },
  { id: 'bookmarks', label: 'Bookmarks', icon: <Star size={16} /> },
  { id: 'workspaces', label: 'Workspaces', icon: <FolderOpen size={16} /> },
  { id: 'downloads', label: 'Downloads', icon: <Download size={16} /> },
];

export function UnifiedSidePanel({
  open,
  onClose,
  defaultTab = 'history',
  width = 420,
}: UnifiedSidePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
            }}
            className="fixed right-0 top-0 bottom-0 z-50 bg-[#1A1D28] border-l border-gray-800/60 flex flex-col shadow-2xl"
            style={{ width: `${width}px` }}
            role="dialog"
            aria-modal="true"
            aria-label="Side panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-100">Library</h2>
              </div>
              <button
                onClick={e => {
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                  onClose();
                }}
                onMouseDown={e => {
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                style={{ zIndex: 10011, isolation: 'isolate' }}
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-gray-800/60 px-4 bg-gray-900/30">
              {tabs
                .filter(tab => tab && tab.id)
                .map(tab => (
                  <button
                    key={tab.id}
                    onClick={e => {
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                      if (tab) setActiveTab(tab.id);
                    }}
                    onMouseDown={e => {
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                    }}
                    className={`
                    relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                    ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}
                  `}
                    style={{ zIndex: 10011, isolation: 'isolate' }}
                    aria-selected={activeTab === tab.id}
                    role="tab"
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                        initial={false}
                      />
                    )}
                  </button>
                ))}
            </div>

            {/* Search Bar (optional, can be shown based on active tab) */}
            {(activeTab === 'history' ||
              activeTab === 'bookmarks' ||
              activeTab === 'workspaces') && (
              <div className="px-4 py-3 border-b border-gray-800/60">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeTab}...`}
                    className="w-full pl-9 pr-3 py-2 bg-gray-900/60 border border-gray-700/50 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                  />
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-y-auto"
                >
                  {activeTab === 'history' && (
                    <div className="h-full">
                      <HistoryPage />
                    </div>
                  )}
                  {activeTab === 'bookmarks' && (
                    <div className="h-full">
                      <BookmarksPanel />
                    </div>
                  )}
                  {activeTab === 'workspaces' && (
                    <div className="h-full">
                      <WorkspacesPanel />
                    </div>
                  )}
                  {activeTab === 'downloads' && (
                    <div className="h-full">
                      <DownloadsPage />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
