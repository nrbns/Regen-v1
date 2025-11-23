/**
 * MiniHoverAI - Hover-based AI assistant for text selection
 * Based on Figma UI/UX Prototype Flow redesign
 */

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Copy, BookOpen, Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';

export interface MiniHoverAIProps {
  enabled?: boolean;
  onAction?: (action: string, text: string) => void;
}

type ActionType = 'summarize' | 'explain' | 'translate' | 'search' | 'copy';

const actions: Array<{ id: ActionType; label: string; icon: React.ReactNode }> = [
  { id: 'summarize', label: 'Summarize', icon: <BookOpen size={14} /> },
  { id: 'explain', label: 'Explain', icon: <Sparkles size={14} /> },
  { id: 'translate', label: 'Translate', icon: <Search size={14} /> },
  { id: 'search', label: 'Search', icon: <Search size={14} /> },
  { id: 'copy', label: 'Copy', icon: <Copy size={14} /> },
];

export function MiniHoverAI({ enabled = true, onAction }: MiniHoverAIProps) {
  const [selectedText, setSelectedText] = useState<string>('');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';

      if (text.length > 0 && text.length < 500) {
        // Get selection position
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          setPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
          setSelectedText(text);
          setShowActions(true);
        }
      } else {
        setShowActions(false);
        setSelectedText('');
        setPosition(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowActions(false);
        setSelectedText('');
        setPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [enabled]);

  const handleAction = async (actionId: ActionType) => {
    if (!selectedText) return;

    setIsProcessing(true);

    try {
      switch (actionId) {
        case 'copy':
          await navigator.clipboard.writeText(selectedText);
          onAction?.(actionId, selectedText);
          break;

        case 'summarize':
        case 'explain':
        case 'translate':
        case 'search':
          // Trigger AI action via IPC
          try {
            await ipc.redix.stream(
              `${actionId}: ${selectedText}`,
              { sessionId: `minihover-${Date.now()}` },
              chunk => {
                // Handle streaming response
                if (chunk.type === 'token' && chunk.text) {
                  // Could show a toast or open right panel
                  console.log('[MiniHoverAI] Response:', chunk.text);
                }
              }
            );
            onAction?.(actionId, selectedText);
          } catch (error) {
            console.error('[MiniHoverAI] AI action failed:', error);
          }
          break;
      }
    } catch (error) {
      console.error('[MiniHoverAI] Action failed:', error);
    } finally {
      setIsProcessing(false);
      setShowActions(false);
      setSelectedText('');
      setPosition(null);
      // Clear selection
      window.getSelection()?.removeAllRanges();
    }
  };

  if (!enabled || !showActions || !position) return null;

  return (
    <AnimatePresence>
      {showActions && position && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[9999] pointer-events-auto"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-lg shadow-2xl p-2 flex items-center gap-1">
            {isProcessing ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300">
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span>Processing...</span>
              </div>
            ) : (
              <>
                {actions.map(action => (
                  <motion.button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-gray-800/60 hover:bg-gray-700/80 border border-gray-700/50 text-gray-300 hover:text-blue-400 transition-colors text-xs font-medium"
                    title={action.label}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </motion.button>
                ))}
                <button
                  onClick={() => {
                    setShowActions(false);
                    setSelectedText('');
                    setPosition(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 transition-colors"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
          {/* Arrow pointing to selection */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700/50" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
