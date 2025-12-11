/**
 * Floating AI Bar Component
 * Appears when text is selected, providing quick AI actions
 */

import { useState, useEffect, useRef } from 'react';
import { X, Languages, FileText, ListTodo, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { summarizeSelection } from '../../services/pageAI/summarizer';
import { explainText } from '../../services/pageAI/explainer';
import { translateText } from '../../services/pageAI/translator';
import { extractTasks } from '../../services/pageAI/taskExtractor';
import { toast } from '../../utils/toast';
import { useMobileDetection } from '../../mobile';

interface FloatingAIBarProps {
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function FloatingAIBar({ selectedText, position, onClose }: FloatingAIBarProps) {
  const { isMobile } = useMobileDetection();
  const [action, setAction] = useState<'translate' | 'explain' | 'summarize' | 'extract' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Adjust position to keep bar visible
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check if bar would go off screen
      if (rect.right > viewportWidth) {
        barRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (rect.bottom > viewportHeight) {
        barRef.current.style.top = `${position.y - rect.height - 10}px`;
      }
    }
  }, [position]);

  const handleTranslate = async () => {
    setAction('translate');
    setLoading(true);
    try {
      const translation = await translateText(selectedText);
      setResult(translation);
    } catch (error: any) {
      toast.error(error.message || 'Failed to translate');
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    setAction('explain');
    setLoading(true);
    try {
      const explanation = await explainText(selectedText, { level: 'detailed' });
      setResult(explanation);
    } catch (error: any) {
      toast.error(error.message || 'Failed to explain');
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setAction('summarize');
    setLoading(true);
    try {
      const summary = await summarizeSelection(selectedText);
      setResult(summary);
    } catch (error: any) {
      toast.error(error.message || 'Failed to summarize');
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    setAction('extract');
    setLoading(true);
    try {
      const extraction = await extractTasks(selectedText);
      
      let resultText = '';
      
      if (extraction.tasks.length > 0) {
        resultText += '**Tasks:**\n';
        extraction.tasks.forEach(task => {
          resultText += `• ${task.task}`;
          if (task.date) resultText += ` (${task.date})`;
          if (task.priority) resultText += ` [${task.priority}]`;
          resultText += '\n';
        });
        resultText += '\n';
      }
      
      if (extraction.dates.length > 0) {
        resultText += `**Dates:** ${extraction.dates.join(', ')}\n\n`;
      }
      
      if (extraction.emails.length > 0) {
        resultText += `**Emails:** ${extraction.emails.join(', ')}\n\n`;
      }
      
      if (extraction.phoneNumbers.length > 0) {
        resultText += `**Phone Numbers:** ${extraction.phoneNumbers.join(', ')}\n\n`;
      }
      
      if (extraction.summary) {
        resultText += `\n${extraction.summary}`;
      }
      
      setResult(resultText || 'No tasks or items found.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to extract');
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast.success('Copied to clipboard');
    }
  };

  if (action && result) {
    // Show result view
    return (
      <AnimatePresence>
        <motion.div
          ref={barRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-md w-[90vw] md:w-[400px]"
          style={{ zIndex: 110 }}
          style={{
            left: `${Math.min(position.x, window.innerWidth - 420)}px`,
            top: `${Math.min(position.y + 30, window.innerHeight - 200)}px`,
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white capitalize">{action}</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded"
                >
                  Copy
                </button>
                <button
                  onClick={() => {
                    setAction(null);
                    setResult(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
              {result}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Show action buttons
  return (
    <AnimatePresence>
      <motion.div
        ref={barRef}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-xl flex items-center gap-1 p-1"
        style={{
          left: `${Math.min(position.x, window.innerWidth - 300)}px`,
          top: `${Math.min(
            position.y + 30,
            window.innerHeight - (isMobile ? 180 : 60) // Extra space on mobile for nav
          )}px`,
          zIndex: 110,
        }}
      >
        <button
          onClick={handleTranslate}
          disabled={loading}
          className="px-3 py-2 hover:bg-gray-800 rounded text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2 min-w-[80px] min-h-[36px] justify-center"
          title="Translate"
        >
          <Languages className="w-4 h-4" />
          {isMobile ? '' : 'Translate'}
        </button>
        <button
          onClick={handleExplain}
          disabled={loading}
          className="px-3 py-2 hover:bg-gray-800 rounded text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2 min-w-[80px] min-h-[36px] justify-center"
          title="Explain"
        >
          <MessageSquare className="w-4 h-4" />
          {isMobile ? '' : 'Explain'}
        </button>
        <button
          onClick={handleSummarize}
          disabled={loading}
          className="px-3 py-2 hover:bg-gray-800 rounded text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2 min-w-[80px] min-h-[36px] justify-center"
          title="Summarize"
        >
          <FileText className="w-4 h-4" />
          {isMobile ? '' : 'Summarize'}
        </button>
        <button
          onClick={handleExtract}
          disabled={loading}
          className="px-3 py-2 hover:bg-gray-800 rounded text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2 min-w-[80px] min-h-[36px] justify-center"
          title="Extract Tasks"
        >
          <ListTodo className="w-4 h-4" />
          {isMobile ? '' : 'Extract'}
        </button>
        <button
          onClick={onClose}
          className="px-2 py-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors min-w-[32px] min-h-[36px] flex items-center justify-center"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
        {loading && (
          <div className="px-2">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

