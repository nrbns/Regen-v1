/**
 * Tab Preview Component
 * Hover preview for tabs showing page thumbnail and metadata
 */

import { X, RefreshCw, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { Tab } from '../../state/tabsStore';

export interface TabPreviewProps {
  tab: Tab;
  visible: boolean;
  position?: { x: number; y: number };
  onClose?: () => void;
  onNavigate?: (url: string) => void;
  onReload?: () => void;
  className?: string;
}

export function TabPreview({
  tab,
  visible,
  position,
  onClose,
  onNavigate,
  onReload,
  className,
}: TabPreviewProps) {
  if (!visible) return null;

  const previewStyle = position
    ? {
        position: 'fixed' as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
      }
    : {};

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={previewStyle}
          className={cn(
            'z-50 w-80 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl',
            className
          )}
        >
          {/* Thumbnail */}
          <div className="relative h-48 bg-slate-800">
            {/* In a real implementation, this would show a screenshot/thumbnail */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-slate-700">
                  <ExternalLink size={24} className="text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">Preview</p>
              </div>
            </div>
          </div>

          {/* Tab Info */}
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 truncate text-sm font-semibold text-white">{tab.title}</h3>
                <p className="truncate text-xs text-slate-400">{tab.url}</p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-slate-800 pt-2">
              {onNavigate && tab.url && (
                <button
                  onClick={() => tab.url && onNavigate(tab.url)}
                  className="flex-1 rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
                >
                  Go to Page
                </button>
              )}
              {onReload && (
                <button
                  onClick={onReload}
                  className="rounded bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
                  title="Reload"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
