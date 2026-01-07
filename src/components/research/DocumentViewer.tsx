/**
 * Document Viewer - Overlay for viewing full documents with highlighted snippets
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, BookOpen } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    title: string;
    url?: string;
    type: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html' | 'snapshot' | 'web';
    snippet?: string;
    content?: string;
  };
  highlightText?: string;
}

export function DocumentViewer({ isOpen, onClose, document, highlightText }: DocumentViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && highlightText && contentRef.current) {
      // Scroll to and highlight the text
      const content = contentRef.current;
      const text = highlightText.toLowerCase();
      
      // Simple text highlighting approach
      if (content.textContent?.toLowerCase().includes(text)) {
        // Find and highlight the text
        const walker = window.document.createTreeWalker(
          content,
          NodeFilter.SHOW_TEXT,
          null
        );
        let node;
        
        while ((node = walker.nextNode())) {
          if (node.textContent?.toLowerCase().includes(text)) {
            const parent = node.parentElement;
            if (parent && parent.textContent) {
              // Replace text with highlighted version
              const highlighted = parent.innerHTML.replace(
                new RegExp(highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                `<span class="bg-yellow-400/30 text-yellow-200 rounded px-1">$&</span>`
              );
              parent.innerHTML = highlighted;
              parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
              break;
            }
          }
        }
      }
    }
  }, [isOpen, highlightText]);

  const handleOpenInTab = async () => {
    if (document.url) {
      try {
        await ipc.tabs.create(document.url);
      } catch (error) {
        console.error('Failed to open in tab:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                {document.type === 'pdf' ? (
                  <FileText size={20} />
                ) : (
                  <BookOpen size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-100 truncate">{document.title}</h2>
                {document.url && (
                  <p className="text-xs text-gray-400 truncate mt-1">{document.url}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {document.url && (
                <button
                  onClick={handleOpenInTab}
                  className="p-2 rounded-lg hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {document.content ? (
              <div
                ref={contentRef}
                className="prose prose-invert max-w-none text-gray-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: document.content }}
              />
            ) : document.snippet ? (
              <div className="text-gray-200 leading-relaxed">
                <p className="text-lg mb-4">{document.snippet}</p>
                <p className="text-sm text-gray-400">
                  Full document content not available. Click "Open in new tab" to view the complete document.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText size={48} className="opacity-50 mb-4" />
                <p>No content available for this document.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="px-2 py-1 rounded bg-slate-800 uppercase">
                {document.type}
              </span>
              {highlightText && (
                <span className="text-yellow-400">
                  Highlighted: "{highlightText.slice(0, 50)}..."
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

