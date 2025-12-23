/**
 * BookmarksPanel - Full bookmarks management UI
 */

import { useState } from 'react';
import { Star, Folder, Search, X, ExternalLink, Edit2, Trash2, Plus } from 'lucide-react';
import { useBookmarksStore, type BookmarkFolder, type Bookmark } from '../../state/bookmarksStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';

export function BookmarksPanel() {
  const {
    bookmarks,
    folders,
    removeBookmark,
    updateBookmark,
    getBookmarksByFolder,
    searchBookmarks,
    addFolder,
    removeFolder,
  } = useBookmarksStore();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);

  const filteredBookmarks = searchQuery
    ? searchBookmarks(searchQuery)
    : selectedFolder
      ? getBookmarksByFolder(selectedFolder)
      : bookmarks;

  const handleOpenBookmark = (url: string) => {
    ipc.tabs.create(url).catch(console.error);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleSaveEdit = (
    id: string,
    updates: { title?: string; folder?: string; tags?: string[] }
  ) => {
    updateBookmark(id, updates);
    setEditingId(null);
  };

  const handleAddFolder = () => {
    if (newFolderName.trim() && !folders.some(f => f.name === newFolderName.trim())) {
      addFolder(newFolderName.trim());
      setNewFolderName('');
      setShowAddFolder(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-gray-200">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Star size={20} className="text-yellow-400" />
          <h2 className="text-lg font-semibold">Bookmarks</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Folders */}
        <div className="w-48 overflow-y-auto border-r border-gray-800 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-gray-400">Folders</span>
            <button
              onClick={() => setShowAddFolder(true)}
              className="rounded p-1 hover:bg-gray-800"
              title="Add folder"
            >
              <Plus size={14} />
            </button>
          </div>

          {showAddFolder && (
            <div className="mb-2 flex gap-1">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddFolder();
                  if (e.key === 'Escape') {
                    setShowAddFolder(false);
                    setNewFolderName('');
                  }
                }}
                placeholder="Folder name"
                className="flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-xs focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleAddFolder}
                className="rounded bg-blue-500 px-2 py-1 text-xs hover:bg-blue-600"
              >
                Add
              </button>
            </div>
          )}

          <button
            onClick={() => setSelectedFolder(null)}
            className={`mb-1 flex min-h-[32px] w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
              selectedFolder === null ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-gray-800'
            }`}
          >
            <span className="flex-1">All Bookmarks</span>
            <span className="text-xs text-gray-500">({bookmarks.length})</span>
          </button>

          {folders.map((folder: BookmarkFolder) => {
            const count = getBookmarksByFolder(folder.id).length;
            return (
              <div key={folder.id} className="group mb-1 flex items-center justify-between gap-1">
                <button
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`flex min-h-[32px] flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                    selectedFolder === folder.id
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <Folder size={14} className="flex-shrink-0" />
                  <span className="flex-1 truncate">{folder.name}</span>
                  <span className="flex-shrink-0 text-xs text-gray-500">({count})</span>
                </button>
                {folder.name !== 'Favorites' &&
                  folder.name !== 'Work' &&
                  folder.name !== 'Personal' && (
                    <button
                      onClick={() => removeFolder(folder.id)}
                      className="flex min-h-[24px] min-w-[24px] items-center justify-center rounded p-1.5 opacity-0 transition-opacity hover:bg-red-500/20 group-hover:opacity-100"
                      title="Delete folder"
                    >
                      <X size={12} />
                    </button>
                  )}
              </div>
            );
          })}
        </div>

        {/* Main Content - Bookmarks List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredBookmarks.length === 0 ? (
            <div className="mt-8 text-center text-gray-400">
              {searchQuery ? 'No bookmarks found' : 'No bookmarks yet'}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredBookmarks.map((bookmark: Bookmark) => (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="group flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3 hover:bg-gray-900"
                  >
                    {editingId === bookmark.id ? (
                      <BookmarkEditor
                        bookmark={bookmark}
                        folders={folders.map(f => f.name)}
                        onSave={updates => handleSaveEdit(bookmark.id, updates)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <>
                        <div className="flex-shrink-0">
                          <Star size={20} className="text-yellow-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{bookmark.title}</div>
                          <div className="truncate text-xs text-gray-400">{bookmark.url}</div>
                          {bookmark.folder && (
                            <div className="mt-1 text-xs text-gray-500">
                              <Folder size={10} className="mr-1 inline" />
                              {bookmark.folder}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenBookmark(bookmark.url)}
                            className="rounded p-1.5 hover:bg-gray-800"
                            title="Open bookmark"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={() => handleEdit(bookmark.id)}
                            className="rounded p-1.5 hover:bg-gray-800"
                            title="Edit bookmark"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => removeBookmark(bookmark.id)}
                            className="rounded p-1.5 hover:bg-red-500/20"
                            title="Delete bookmark"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookmarkEditor({
  bookmark,
  folders,
  onSave,
  onCancel,
}: {
  bookmark: any;
  folders: string[];
  onSave: (updates: any) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(bookmark.title);
  const [folder, setFolder] = useState(bookmark.folder || '');

  return (
    <div className="flex flex-1 items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm focus:outline-none"
        autoFocus
      />
      <select
        value={folder}
        onChange={e => setFolder(e.target.value)}
        className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm focus:outline-none"
      >
        <option value="">No folder</option>
        {folders.map(f => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <button
        onClick={() => onSave({ title, folder: folder || undefined })}
        className="rounded bg-blue-500 px-3 py-1 text-sm hover:bg-blue-600"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
