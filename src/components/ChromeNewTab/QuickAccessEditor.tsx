/**
 * QuickAccessEditor - Edit, add, remove, and reorder quick access icons
 */

import { useState } from 'react';
import { Edit3, Plus, Trash2, GripVertical, X, Check } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

interface QuickAccessSite {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  icon?: string;
  notificationCount?: number;
}

interface QuickAccessEditorProps {
  sites: QuickAccessSite[];
  onUpdate: (sites: QuickAccessSite[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickAccessEditor({ sites, onUpdate, isOpen, onClose }: QuickAccessEditorProps) {
  const [editedSites, setEditedSites] = useState<QuickAccessSite[]>(sites);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; url: string }>({
    title: '',
    url: '',
  });

  const handleAdd = () => {
    const newSite: QuickAccessSite = {
      id: `site-${Date.now()}`,
      url: '',
      title: 'New Site',
      icon: '🌐',
    };
    setEditedSites([...editedSites, newSite]);
    setEditingId(newSite.id);
    setEditForm({ title: 'New Site', url: '' });
  };

  const handleEdit = (site: QuickAccessSite) => {
    setEditingId(site.id);
    setEditForm({ title: site.title, url: site.url });
  };

  const handleSave = () => {
    if (!editingId) return;

    const updated = editedSites.map(site =>
      site.id === editingId ? { ...site, title: editForm.title, url: editForm.url } : site
    );
    setEditedSites(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = editedSites.filter(site => site.id !== id);
    setEditedSites(updated);
  };

  const handleSaveAll = () => {
    onUpdate(editedSites);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[90]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-white rounded-2xl shadow-2xl z-[100] p-6 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit3 size={24} />
                Customize Shortcuts
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <Reorder.Group
              axis="y"
              values={editedSites}
              onReorder={setEditedSites}
              className="space-y-2 mb-4"
            >
              {editedSites.map(site => (
                <Reorder.Item
                  key={site.id}
                  value={site}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <GripVertical size={20} className="text-gray-400 cursor-move" />

                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl flex-shrink-0">
                    {site.favicon ? (
                      <img src={site.favicon} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <span>{site.icon || '🌐'}</span>
                    )}
                  </div>

                  {editingId === site.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Title"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                        autoFocus
                      />
                      <input
                        type="url"
                        value={editForm.url}
                        onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                        placeholder="URL"
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={handleSave}
                        className="p-1.5 rounded hover:bg-green-100 text-green-600"
                        aria-label="Save"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {site.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{site.url || 'No URL'}</div>
                      </div>
                      <button
                        onClick={() => handleEdit(site)}
                        className="p-1.5 rounded hover:bg-blue-100 text-blue-600"
                        aria-label="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(site.id)}
                        className="p-1.5 rounded hover:bg-red-100 text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Shortcut
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
