/**
 * PageExtractor Component
 * Extracts and displays page content for AI features
 */

import { useState, useEffect } from 'react';
import { Loader, FileText, AlertCircle, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface PageExtractorProps {
  url: string;
  onExtract?: (content: ExtractedContent) => void;
  autoExtract?: boolean;
}

export interface ExtractedContent {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  lang: string;
}

export function PageExtractor({ url, onExtract, autoExtract = true }: PageExtractorProps) {
  const [content, setContent] = useState<ExtractedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (autoExtract && url) {
      extractContent();
    }
  }, [url, autoExtract]);

  const extractContent = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/extract/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract content: ${response.statusText}`);
      }

      const data = await response.json();
      setContent(data);
      onExtract?.(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract page content';
      setError(errorMessage);
      console.error('[PageExtractor] Extraction failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[PageExtractor] Copy failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-900/60 rounded-lg border border-gray-800/50">
        <Loader size={24} className="text-blue-400 animate-spin mr-3" />
        <span className="text-gray-300">Extracting page content...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle size={20} className="text-red-400" />
          <h3 className="text-red-300 font-semibold">Extraction Failed</h3>
        </div>
        <p className="text-red-200 text-sm">{error}</p>
        <button
          onClick={extractContent}
          className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-200 text-sm font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-6 bg-gray-900/60 rounded-lg border border-gray-800/50 text-center">
        <FileText size={32} className="text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 text-sm mb-4">No content extracted yet</p>
        <button
          onClick={extractContent}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-blue-200 text-sm font-medium transition-colors"
        >
          Extract Content
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/60 rounded-lg border border-gray-800/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 bg-gray-900/40">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate mb-1">{content.title}</h3>
            <p className="text-gray-400 text-xs truncate">{content.url}</p>
          </div>
          <button
            onClick={handleCopy}
            className="ml-3 p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-blue-400 transition-colors"
            title="Copy content"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
          {content.content}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800/50 bg-gray-900/40 flex items-center justify-between text-xs text-gray-400">
        <span>{content.content.length.toLocaleString()} characters</span>
        <span>Language: {content.lang}</span>
      </div>
    </motion.div>
  );
}
