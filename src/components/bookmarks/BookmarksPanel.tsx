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
    <div className="flex flex-col h-full bg-slate-950 text-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
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
            className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Folders */}
        <div className="w-48 border-r border-gray-800 p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase">Folders</span>
            <button
              onClick={() => setShowAddFolder(true)}
              className="p-1 hover:bg-gray-800 rounded"
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
                className="flex-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleAddFolder}
                className="px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded text-xs"
              >
                Add
              </button>
            </div>
          )}

          <button
            onClick={() => setSelectedFolder(null)}
            className={`w-full text-left px-2 py-1.5 rounded text-sm mb-1 ${
              selectedFolder === null ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-gray-800'
            }`}
          >
            All Bookmarks ({bookmarks.length})
          </button>

          {folders.map((folder: BookmarkFolder) => {
            const count = getBookmarksByFolder(folder.id).length;
            return (
              <div key={folder.id} className="flex items-center group">
                <button
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`flex-1 text-left px-2 py-1.5 rounded text-sm ${
                    selectedFolder === folder.id
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder size={14} />
                    <span className="flex-1">{folder.name}</span>
                    <span className="text-xs text-gray-500">({count})</span>
                  </div>
                </button>
                {folder.name !== 'Favorites' &&
                  folder.name !== 'Work' &&
                  folder.name !== 'Personal' && (
                    <button
                      onClick={() => removeFolder(folder.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded"
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
            <div className="text-center text-gray-400 mt-8">
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
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/50 hover:bg-gray-900 group"
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
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{bookmark.title}</div>
                          <div className="text-xs text-gray-400 truncate">{bookmark.url}</div>
                          {bookmark.folder && (
                            <div className="text-xs text-gray-500 mt-1">
                              <Folder size={10} className="inline mr-1" />
                              {bookmark.folder}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenBookmark(bookmark.url)}
                            className="p-1.5 hover:bg-gray-800 rounded"
                            title="Open bookmark"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={() => handleEdit(bookmark.id)}
                            className="p-1.5 hover:bg-gray-800 rounded"
                            title="Edit bookmark"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => removeBookmark(bookmark.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded"
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
    <div className="flex-1 flex items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none"
        autoFocus
      />
      <select
        value={folder}
        onChange={e => setFolder(e.target.value)}
        className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none"
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
        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-sm"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
      >
        Cancel
      </button>
    </div>
  );
}
