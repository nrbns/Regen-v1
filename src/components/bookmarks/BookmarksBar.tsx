/**
 * BookmarksBar - Chrome/Edge/Brave-style always-visible bookmarks bar
 */

import { useState, useRef, useEffect as _useEffect } from 'react';
import { ChevronRight, Star, Folder, MoreHorizontal, X as _X } from 'lucide-react';
import { useBookmarksStore, type Bookmark as _Bookmark } from '../../state/bookmarksStore';
import { ipc } from '../../lib/ipc-typed';
import { motion, AnimatePresence } from 'framer-motion';

interface BookmarksBarProps {
  className?: string;
}

export function BookmarksBar({ className = '' }: BookmarksBarProps) {
  const { bookmarks, folders } = useBookmarksStore();
  const [_expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Get bookmarks without folders (for the bar) and favorites
  const barBookmarks = bookmarks.filter(b => !b.folder || b.folder === 'Favorites');

  const handleBookmarkClick = (url: string) => {
    ipc.tabs.create(url).catch(console.error);
  };

  const _toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const folderBookmarks = folders
    .filter(f => barBookmarks.some(b => b.folder === f.id))
    .map(folder => ({
      folder,
      bookmarks: barBookmarks.filter(b => b.folder === folder.id),
    }));

  return (
    <div
      ref={barRef}
      className={`flex items-center gap-1 border-b border-slate-700/50 bg-slate-900/80 px-2 py-1 text-sm ${className}`}
    >
      {/* Regular Bookmarks */}
      <div className="scrollbar-hide flex flex-1 items-center gap-1 overflow-x-auto">
        {barBookmarks
          .filter(b => !b.folder)
          .slice(0, 10)
          .map(bookmark => (
            <button
              key={bookmark.id}
              onClick={() => handleBookmarkClick(bookmark.url)}
              className="group relative flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-300 transition hover:bg-slate-700/50 hover:text-white"
              title={bookmark.title}
            >
              {bookmark.favicon ? (
                <img
                  src={bookmark.favicon}
                  alt=""
                  className="h-4 w-4 rounded"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Star size={14} className="text-yellow-400" />
              )}
              <span className="max-w-[120px] truncate">{bookmark.title}</span>
            </button>
          ))}

        {/* Folder Bookmarks */}
        {folderBookmarks.map(({ folder, bookmarks: folderBms }) => (
          <div key={folder.id} className="group relative">
            <button
              onMouseEnter={() => setHoveredFolder(folder.id)}
              onMouseLeave={() => setHoveredFolder(null)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-300 transition hover:bg-slate-700/50 hover:text-white"
            >
              <Folder size={14} className="text-blue-400" />
              <span className="max-w-[100px] truncate">{folder.name}</span>
              <ChevronRight size={12} className="text-gray-500" />
            </button>

            {/* Folder Dropdown */}
            <AnimatePresence>
              {hoveredFolder === folder.id && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onMouseEnter={() => setHoveredFolder(folder.id)}
                  onMouseLeave={() => setHoveredFolder(null)}
                  className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
                >
                  <div className="p-2">
                    <div className="mb-2 border-b border-slate-700 pb-2 text-xs font-semibold text-gray-400">
                      {folder.name}
                    </div>
                    <div className="space-y-1">
                      {folderBms.slice(0, 10).map(bookmark => (
                        <button
                          key={bookmark.id}
                          onClick={() => {
                            handleBookmarkClick(bookmark.url);
                            setHoveredFolder(null);
                          }}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-gray-300 transition hover:bg-slate-700/50 hover:text-white"
                        >
                          {bookmark.favicon ? (
                            <img
                              src={bookmark.favicon}
                              alt=""
                              className="h-4 w-4 rounded"
                              onError={e => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Star size={14} className="text-yellow-400" />
                          )}
                          <span className="flex-1 truncate">{bookmark.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Overflow Menu */}
      {barBookmarks.length > 10 && (
        <button
          className="flex items-center rounded px-2 py-1 text-gray-400 transition hover:bg-slate-700/50 hover:text-white"
          title="More bookmarks"
        >
          <MoreHorizontal size={16} />
        </button>
      )}
    </div>
  );
}
