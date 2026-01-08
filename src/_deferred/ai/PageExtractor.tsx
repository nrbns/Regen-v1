/**
 * PageExtractor Component (deferred)
 * Original implementation moved to _deferred to reduce active bundle surface for v1.
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
      <div className="flex items-center justify-center rounded-lg border border-gray-800/50 bg-gray-900/60 p-8">
        <Loader size={24} className="mr-3 animate-spin text-blue-400" />
        <span className="text-gray-300">Extracting page content...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
        <div className="mb-2 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-400" />
          <h3 className="font-semibold text-red-300">Extraction Failed</h3>
        </div>
        <p className="text-sm text-red-200">{error}</p>
        <button
          onClick={extractContent}
          className="mt-4 rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="rounded-lg border border-gray-800/50 bg-gray-900/60 p-6 text-center">
        <FileText size={32} className="mx-auto mb-3 text-gray-500" />
        <p className="mb-4 text-sm text-gray-400">No content extracted yet</p>
        <button
          onClick={extractContent}
          className="rounded-lg border border-blue-500/40 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-500/30"
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
      className="overflow-hidden rounded-lg border border-gray-800/50 bg-gray-900/60"
    >
      <div className="border-b border-gray-800/50 bg-gray-900/40 p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 truncate font-semibold text-white">{content.title}</h3>
            <p className="truncate text-xs text-gray-400">{content.url}</p>
          </div>
          <button
            onClick={handleCopy}
            className="ml-3 rounded-lg border border-gray-700/50 bg-gray-800/60 p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-blue-400"
            title="Copy content"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto p-4">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
          {content.content}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-800/50 bg-gray-900/40 p-3 text-xs text-gray-400">
        <span>{content.content.length.toLocaleString()} characters</span>
        <span>Language: {content.lang}</span>
      </div>
    </motion.div>
  );
}
