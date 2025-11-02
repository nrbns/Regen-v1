/**
 * ResearchSplit - Reader + Notes split pane for Research mode
 */

import { useState, useEffect, useRef } from 'react';
import { FileText, BookOpen, Save, Highlighter, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { debounce } from 'lodash-es';

interface Highlight {
  id: string;
  text: string;
  color: string;
  position: { start: number; end: number };
}

export function ResearchSplit() {
  const { activeId } = useTabsStore();
  const [readerContent, setReaderContent] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const readerRef = useRef<HTMLDivElement>(null);

  // Load content for current tab
  useEffect(() => {
    const loadContent = async () => {
      if (!activeId) {
        setReaderContent('');
        setCurrentUrl('');
        setNotes('');
        setHighlights([]);
        return;
      }

      try {
        const tabs = await ipc.tabs.list();
        const tab = tabs.find((t: any) => t.id === activeId);
        if (!tab?.url) {
          setReaderContent('');
          setCurrentUrl('');
          return;
        }

        const url = tab.url;
        setCurrentUrl(url);

        // Skip special pages
        if (url.startsWith('about:') || url.startsWith('chrome:')) {
          setReaderContent('');
          setNotes('');
          setHighlights([]);
          return;
        }

        // Load saved notes for this URL
        try {
          const saved = await ipc.research.getNotes(url) as any;
          if (saved) {
            setNotes(saved.notes || '');
            setHighlights(saved.highlights || []);
          }
        } catch (error) {
          console.error('Failed to load notes:', error);
        }

        // Extract readable content
        setReaderContent('Extracting readable content...');
        try {
          const result = await ipc.research.extractContent(activeId) as any;
          if (result?.html) {
            setReaderContent(result.html);
          } else if (result?.content) {
            // Fallback: show plain text if no HTML
            setReaderContent(`<div class="prose prose-invert"><h1>${result.title || url}</h1><p>${result.content}</p></div>`);
          } else {
            setReaderContent('');
          }
        } catch (error) {
          console.error('Failed to extract content:', error);
          setReaderContent('');
        }
      } catch (error) {
        console.error('Failed to load research content:', error);
        setReaderContent('');
      }
    };

    loadContent();
    
    // Listen for tab updates
    const handleTabUpdate = () => {
      loadContent();
    };
    
    if ((window.ipc as any)?.on) {
      (window.ipc as any).on('tabs:updated', handleTabUpdate);
      return () => {
        if ((window.ipc as any)?.removeListener) {
          (window.ipc as any).removeListener('tabs:updated', handleTabUpdate);
        }
      };
    }
  }, [activeId]);

  // Auto-save notes (debounced)
  const saveNotes = useRef(
    debounce(async (url: string, notesText: string, highlightsData: Highlight[]) => {
      if (!url || url.startsWith('about:') || url.startsWith('chrome:')) return;
      try {
        await ipc.research.saveNotes(url, notesText, highlightsData);
        console.log('Auto-saved notes for', url);
      } catch (error) {
        console.error('Failed to save notes:', error);
      }
    }, 1000)
  ).current;

  useEffect(() => {
    if (currentUrl && (notes || highlights.length > 0)) {
      saveNotes(currentUrl, notes, highlights);
    }
  }, [notes, highlights, currentUrl, saveNotes]);

  const addHighlight = (text: string, start: number, end: number) => {
    const highlight: Highlight = {
      id: crypto.randomUUID(),
      text,
      color: '#fef08a', // yellow
      position: { start, end },
    };
    setHighlights(prev => [...prev, highlight]);
  };

  return (
    <div className="h-full flex">
      {/* Reader Pane */}
      <div className="flex-1 flex flex-col border-r border-gray-700/30 bg-gray-950 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Reader</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors"
              title="Add Highlight"
            >
              <Highlighter size={16} />
            </motion.button>
          </div>
        </div>
        <div
          ref={readerRef}
          className="flex-1 overflow-y-auto p-6 prose prose-invert max-w-none"
          style={{
            color: '#e5e7eb',
          }}
        >
          {readerContent ? (
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: readerContent }}
              onMouseUp={() => {
                const selection = window.getSelection();
                if (selection && selection.toString().trim()) {
                  const text = selection.toString();
                  // Would get position and add highlight
                  // addHighlight(text, start, end);
                }
              }}
            />
          ) : (
            <div className="text-center text-gray-500 py-12">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No readable content available</p>
              <p className="text-xs mt-2">Navigate to a page to extract content</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes Pane */}
      <div className="w-80 flex flex-col border-l border-gray-700/30 bg-gray-900/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-green-400" />
            <span className="text-sm font-medium text-gray-300">Notes</span>
          </div>
          {currentUrl && (
            <motion.span
              className="text-xs text-gray-500 px-2 py-0.5 bg-gray-800/40 rounded"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Auto-saving...
            </motion.span>
          )}
        </div>

        {/* Highlights List */}
        {highlights.length > 0 && (
          <div className="border-b border-gray-800/50 p-3 space-y-2 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-gray-400 mb-2">Highlights</div>
            {highlights.map(highlight => (
              <div
                key={highlight.id}
                className="flex items-start justify-between gap-2 p-2 bg-gray-800/40 rounded text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="inline-block px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: highlight.color + '40', color: highlight.color }}
                  >
                    {highlight.text.slice(0, 50)}...
                  </div>
                </div>
                <button
                  onClick={() => setHighlights(prev => prev.filter(h => h.id !== highlight.id))}
                  className="p-0.5 hover:bg-gray-700/50 rounded text-gray-500 hover:text-gray-300"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Notes Editor */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Take notes, add insights, save findings..."
          className="flex-1 p-4 bg-transparent text-sm text-gray-300 placeholder-gray-600 resize-none focus:outline-none"
        />

        {/* Footer Actions */}
        <div className="border-t border-gray-800/50 p-3 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              if (currentUrl && !currentUrl.startsWith('about:') && !currentUrl.startsWith('chrome:')) {
                saveNotes.flush();
                try {
                  await ipc.research.saveNotes(currentUrl, notes, highlights);
                } catch (error) {
                  console.error('Failed to save notes:', error);
                }
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-xs text-blue-400 transition-colors"
          >
            <Save size={14} />
            Save
          </motion.button>
        </div>
      </div>
    </div>
  );
}

