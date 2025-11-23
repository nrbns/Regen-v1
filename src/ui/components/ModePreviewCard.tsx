/**
 * ModePreviewCard Component
 * Shows a preview of what will change when switching modes
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertCircle } from 'lucide-react';
import { type ModeId } from '../tokens-enhanced';

export interface ModePreviewCardProps {
  preview: {
    from: ModeId;
    to: ModeId;
    changes: string[];
  };
  onConfirm: () => void;
  onCancel: () => void;
}

const MODE_LABELS: Record<ModeId, string> = {
  browse: 'Browse',
  research: 'Research',
  trade: 'Trade',
  dev: 'Dev',
};

export function ModePreviewCard({ preview, onConfirm, onCancel }: ModePreviewCardProps) {
  const { from, to, changes } = preview;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute z-50 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
        style={{ top: '100%', left: 0 }}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-750 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-slate-200">Mode Switch Preview</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close preview"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1">Switching from:</div>
            <div className="text-sm font-medium text-slate-200">{MODE_LABELS[from] || from}</div>
          </div>

          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1">Switching to:</div>
            <div className="text-sm font-medium text-cyan-400">{MODE_LABELS[to] || to}</div>
          </div>

          {changes.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-slate-400 mb-2">Changes:</div>
              <ul className="space-y-1">
                {changes.map((change, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 rounded transition-all flex items-center justify-center gap-1"
            >
              <Check size={14} />
              Confirm
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
