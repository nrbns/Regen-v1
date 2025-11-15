/**
 * RedixQuickDialog - Quick AI assistant dialog
 * Opens when user clicks "Ask Redix" from menu
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';

interface RedixQuickDialogProps {
  open: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

export function RedixQuickDialog({ open, onClose, initialPrompt = '' }: RedixQuickDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResponse('');

    try {
      let accumulatedText = '';
      
      await ipc.redix.stream(
        prompt.trim(),
        {},
        (chunk) => {
          try {
            if (chunk.type === 'token' && chunk.text) {
              accumulatedText += chunk.text;
              setResponse(accumulatedText);
            } else if (chunk.type === 'error') {
              setError(chunk.text || 'An error occurred');
              setIsLoading(false);
            } else if (chunk.done) {
              setIsLoading(false);
            }
          } catch (error) {
            console.error('[RedixQuickDialog] Error handling chunk:', error);
            setError('Error processing response');
            setIsLoading(false);
          }
        }
      );
    } catch (err) {
      // Enhanced error handling for offline/backend unavailable scenarios
      let errorMessage = 'Failed to get response from Redix';
      if (err instanceof Error) {
        if (err.message.includes('unavailable') || err.message.includes('timeout') || err.message.includes('connection')) {
          errorMessage = 'AI backend is unavailable. Please check your connection or start Ollama for local AI.';
        } else {
          errorMessage = err.message;
        }
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Check for prompt from window (set by Omnibox)
      const windowPrompt = typeof window !== 'undefined' ? (window as any).__redixInitialPrompt : null;
      const finalPrompt = windowPrompt || initialPrompt;
      setPrompt(finalPrompt);
      setResponse('');
      setError(null);
      // Clear window prompt after using it
      if (typeof window !== 'undefined' && (window as any).__redixInitialPrompt) {
        delete (window as any).__redixInitialPrompt;
      }
      setTimeout(() => {
        inputRef.current?.focus();
        // Auto-submit if prompt is provided
        if (finalPrompt && finalPrompt.trim()) {
          setTimeout(() => {
            // Call handleSubmit directly (defined above)
            handleSubmit();
          }, 300);
        }
      }, 100);
    }
  }, [open, initialPrompt]);

  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-700">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg">
                    <Sparkles size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Ask Redix</h2>
                    <p className="text-xs text-slate-400">AI-powered assistant</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Response area */}
              <div
                ref={responseRef}
                className="flex-1 overflow-y-auto p-6 min-h-[200px] max-h-[400px]"
              >
                {!response && !isLoading && !error && (
                  <div className="text-center text-slate-400 py-12">
                    <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Ask me anything...</p>
                    <p className="text-xs mt-2">Press Ctrl+Enter or Cmd+Enter to send</p>
                  </div>
                )}
                {isLoading && !response && (
                  <div className="flex items-center gap-3 text-slate-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span>Redix is thinking...</span>
                  </div>
                )}
                {error && (
                  <div className="text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-4">
                    <p className="font-medium">Error</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                )}
                {response && (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-slate-200 leading-relaxed">
                      {response}
                      {isLoading && (
                        <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input area */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Redix anything..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isLoading}
                    className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                    aria-label="Send"
                  >
                    {isLoading ? (
                      <Loader2 size={20} className="animate-spin text-white" />
                    ) : (
                      <Send size={20} className="text-white" />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>Press Esc to close</span>
                  <span>Ctrl+Enter to send</span>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

