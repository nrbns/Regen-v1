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
            'z-50 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden',
            className
          )}
        >
          {/* Thumbnail */}
          <div className="relative h-48 bg-slate-800">
            {/* In a real implementation, this would show a screenshot/thumbnail */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-700 rounded-lg mb-2 mx-auto flex items-center justify-center">
                  <ExternalLink size={24} className="text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">Preview</p>
              </div>
            </div>
          </div>

          {/* Tab Info */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate mb-1">{tab.title}</h3>
                <p className="text-xs text-slate-400 truncate">{tab.url}</p>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              {onNavigate && tab.url && (
                <button
                  onClick={() => tab.url && onNavigate(tab.url)}
                  className="flex-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition-colors"
                >
                  Go to Page
                </button>
              )}
              {onReload && (
                <button
                  onClick={onReload}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors"
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



