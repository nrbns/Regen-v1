import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, Plus, FileText, Trash2, Calendar } from 'lucide-react';
import { workspaceStore, type WorkspaceItem } from '../lib/workspace/WorkspaceStore';
import { showToast } from '../components/ui/Toast';

export default function Workspace() {
  const [items, setItems] = useState<WorkspaceItem[]>([]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    setItems(workspaceStore.getAll());
  };

  const handleDelete = (id: string) => {
    workspaceStore.delete(id);
    loadItems();
    showToast('Item deleted', 'success');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Local Workspace</h1>
            <p className="text-slate-400">
              Your saved research notes, summaries, and AI-generated content
            </p>
          </div>
          <motion.button
            onClick={() => {
              const newItem = workspaceStore.add({
                title: `New Note ${items.length + 1}`,
                content: 'This is a new workspace item. Click to edit.',
                type: 'note',
              });
              loadItems();
              showToast('New item created', 'success');
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            <span>New Item</span>
          </motion.button>
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-800 rounded-xl border border-slate-700">
            <Folder className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-slate-300 mb-2">No saved items yet</h3>
            <p className="text-slate-500 max-w-md text-center">
              Save summaries, notes, or AI-generated content to see them here.
              All data is stored locally on your device.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all group cursor-pointer shadow-lg hover:shadow-yellow-500/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  showToast(`Opening: ${item.title}`, 'info');
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-yellow-400" />
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 capitalize">
                      {item.type}
                    </span>
                  </div>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded transition-all"
                    whileHover={{ scale: 1.2, rotate: 15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </motion.button>
                </div>

                <h3 className="font-semibold text-slate-200 mb-2 line-clamp-2 group-hover:text-yellow-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-3 mb-3 group-hover:text-slate-300 transition-colors">
                  {item.content}
                </p>

                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}