/**
 * Page Summarizer Component
 * Summarizes web pages using AI
 */

import { useState, useRef, useEffect } from 'react';
import { FileText, Loader, Sparkles, Copy, Check, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageSummarizerProps {
  url: string;
  onClose?: () => void;
}

type SummaryStyle = 'concise' | 'detailed' | 'bullet';

export function PageSummarizer({ url, onClose }: PageSummarizerProps) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [style, setStyle] = useState<SummaryStyle>('concise');
  const [maxLength, setMaxLength] = useState(200);
  const [copied, setCopied] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const generateSummary = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setSummary('');
    setIsStreaming(true);

    try {
      const apiUrl = process.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/llm/summarize-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          max_length: maxLength,
          style: style,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.statusText}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let accumulatedSummary = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'token' && data.text) {
                accumulatedSummary += data.text;
                setSummary(accumulatedSummary);
                
                // Auto-scroll to bottom
                if (summaryRef.current) {
                  summaryRef.current.scrollTop = summaryRef.current.scrollHeight;
                }
              } else if (data.type === 'done') {
                setIsStreaming(false);
              } else if (data.type === 'error') {
                throw new Error(data.text || 'Unknown error');
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setIsStreaming(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(errorMessage);
      setIsStreaming(false);
      console.error('[PageSummarizer] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[PageSummarizer] Copy failed:', err);
    }
  };

  useEffect(() => {
    if (url) {
      generateSummary();
    }
  }, [url]);

  return (
    <div className="flex flex-col h-full bg-[#1A1D28]">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Page Summary</h2>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
              title="Copy summary"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-800/50 space-y-3">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Style:</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as SummaryStyle)}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-900/60 border border-gray-800/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
          >
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
            <option value="bullet">Bullet Points</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Max Length:</label>
          <input
            type="number"
            value={maxLength}
            onChange={(e) => setMaxLength(Number(e.target.value))}
            min={50}
            max={1000}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-900/60 border border-gray-800/50 rounded-lg text-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
          />
          <span className="text-xs text-gray-500">words</span>
        </div>
        <button
          onClick={generateSummary}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed border border-purple-500/40 rounded-lg text-purple-200 text-sm font-medium transition-colors"
        >
          {loading ? (
            <>
              <Loader size={14} className="animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              <span>Regenerate</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Display */}
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

          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/60 rounded-lg border border-gray-800/50 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-purple-400" />
                <h3 className="text-white font-semibold text-sm">Summary</h3>
                {isStreaming && (
                  <Loader size={14} className="text-purple-400 animate-spin ml-auto" />
                )}
              </div>
              <div
                ref={summaryRef}
                className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap"
              >
                {summary}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 bg-purple-400 ml-1 animate-pulse" />
                )}
              </div>
            </motion.div>
          )}

          {loading && !summary && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader size={32} className="text-purple-400 animate-spin mb-4" />
              <p className="text-gray-400 text-sm">Generating summary...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

