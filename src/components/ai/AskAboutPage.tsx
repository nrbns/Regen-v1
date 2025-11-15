/**
 * Ask About Page Component
 * Allows users to ask questions about the current page
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Loader, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageExtractor, ExtractedContent } from './PageExtractor';
import { sendPrompt } from '../../core/llm/adapter';

interface AskAboutPageProps {
  url: string;
  onClose?: () => void;
}

export function AskAboutPage({ url, onClose }: AskAboutPageProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  const handleAsk = async () => {
    if (!question.trim() || !url) return;

    setLoading(true);
    setError(null);
    setAnswer('');
    setIsStreaming(true);

    try {
      // Use LLM adapter instead of direct API call
      const prompt = extractedContent?.content
        ? `Based on the following page content from ${url}:\n\n${extractedContent.content}\n\nQuestion: ${question}\n\nAnswer:`
        : `Based on the page at ${url}, answer the following question: ${question}`;

      // Try LLM adapter first, fallback to API if it fails
      try {
        const response = await sendPrompt(prompt, {
          systemPrompt: 'You are a helpful assistant that answers questions about web pages. Provide clear, concise answers based on the page content provided.',
          maxTokens: 500,
        });
        
        setAnswer(response.text);
        setIsStreaming(false);
        
        // Auto-scroll to bottom
        if (answerRef.current) {
          answerRef.current.scrollTop = answerRef.current.scrollHeight;
        }
      } catch (llmError) {
        // Fallback to API if LLM adapter fails
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/llm/ask-about-page`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: question,
              url: url,
              context: extractedContent?.content,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to get answer: ${response.statusText}`);
          }
          
          const data = await response.json();
          setAnswer(data.answer || data.text || '');
          setIsStreaming(false);
          
          // Auto-scroll to bottom
          if (answerRef.current) {
            answerRef.current.scrollTop = answerRef.current.scrollHeight;
          }
        } catch (apiError) {
          // If both fail, throw the original LLM error
          throw llmError;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get answer';
      setError(errorMessage);
      setIsStreaming(false);
      console.error('[AskAboutPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1A1D28]">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Ask About This Page</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Page Extractor */}
      <div className="p-4 border-b border-gray-800/50">
        <PageExtractor
          url={url}
          onExtract={setExtractedContent}
          autoExtract={true}
        />
      </div>

      {/* Question Input */}
      <div className="p-4 border-b border-gray-800/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about this page..."
            className="flex-1 px-4 py-2.5 bg-gray-900/60 border border-gray-800/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            disabled={loading || !extractedContent}
          />
          <button
            onClick={handleAsk}
            disabled={loading || !question.trim() || !extractedContent}
            className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" />
                <span>Asking...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Ask</span>
              </>
            )}
          </button>
        </div>
        {!extractedContent && (
          <p className="mt-2 text-xs text-gray-500">Extracting page content...</p>
        )}
      </div>

      {/* Answer Display */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4"
            >
              <p className="text-red-200 text-sm">{error}</p>
            </motion.div>
          )}

          {answer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/60 rounded-lg border border-gray-800/50 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-blue-400" />
                <h3 className="text-white font-semibold text-sm">Answer</h3>
                {isStreaming && (
                  <Loader size={14} className="text-blue-400 animate-spin ml-auto" />
                )}
              </div>
              <div
                ref={answerRef}
                className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap"
              >
                {answer}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
                )}
              </div>
            </motion.div>
          )}

          {!answer && !error && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <Sparkles size={48} className="mb-4 opacity-50" />
              <p className="text-sm">Ask a question about this page to get started</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


