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
        className="absolute z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
        style={{ top: '100%', left: 0 }}
      >
        {/* Header */}
        <div className="bg-slate-750 flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-slate-200">Mode Switch Preview</span>
          </div>
          <button
            onClick={onCancel}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
            aria-label="Close preview"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-3">
            <div className="mb-1 text-xs text-slate-400">Switching from:</div>
            <div className="text-sm font-medium text-slate-200">{MODE_LABELS[from] || from}</div>
          </div>

          <div className="mb-3">
            <div className="mb-1 text-xs text-slate-400">Switching to:</div>
            <div className="text-sm font-medium text-cyan-400">{MODE_LABELS[to] || to}</div>
          </div>

          {changes.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-xs text-slate-400">Changes:</div>
              <ul className="space-y-1">
                {changes.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-0.5 text-cyan-400">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-slate-700 pt-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded bg-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex flex-1 items-center justify-center gap-1 rounded bg-gradient-to-r from-purple-500 to-cyan-500 px-3 py-2 text-xs font-medium text-white transition-all hover:from-purple-600 hover:to-cyan-600"
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
