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
            className="fixed inset-0 z-[90] bg-black/50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-[100] max-h-[80vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
                <Edit3 size={24} />
                Customize Shortcuts
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 transition-colors hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <Reorder.Group
              axis="y"
              values={editedSites}
              onReorder={setEditedSites}
              className="mb-4 space-y-2"
            >
              {editedSites.map(site => (
                <Reorder.Item
                  key={site.id}
                  value={site}
                  className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                >
                  <GripVertical size={20} className="cursor-move text-gray-400" />

                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-xl">
                    {site.favicon ? (
                      <img src={site.favicon} alt="" className="h-full w-full rounded-full" />
                    ) : (
                      <span>{site.icon || '🌐'}</span>
                    )}
                  </div>

                  {editingId === site.id ? (
                    <div className="flex flex-1 gap-2">
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                        placeholder="Title"
                        className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
                        autoFocus
                      />
                      <input
                        type="url"
                        value={editForm.url}
                        onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                        placeholder="URL"
                        className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
                      />
                      <button
                        onClick={handleSave}
                        className="rounded p-1.5 text-green-600 hover:bg-green-100"
                        aria-label="Save"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">
                          {site.title}
                        </div>
                        <div className="truncate text-xs text-gray-500">{site.url || 'No URL'}</div>
                      </div>
                      <button
                        onClick={() => handleEdit(site)}
                        className="rounded p-1.5 text-blue-600 hover:bg-blue-100"
                        aria-label="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(site.id)}
                        className="rounded p-1.5 text-red-600 hover:bg-red-100"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                <Plus size={16} />
                Add Shortcut
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAll}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
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
