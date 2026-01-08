/**
 * AIResponsePane (deferred)
 * Deferred original implementation to reduce active bundle surface for v1.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { requestRedix } from '../../services/redixClient';
import { createStreamingHandler } from '../../services/realtime/streamingBridge';

interface AIResponsePaneProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AIResponsePane({ query, isOpen, onClose }: AIResponsePaneProps) {
  const [response, setResponse] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const controllerRef = useRef<{ id: string; cancel: () => void } | null>(null);
  const sessionIdRef = useRef<string>(`redix-ai-${crypto.randomUUID()}`);
  const responseEndRef = useRef<HTMLDivElement>(null);
  const streamHandlerRef = useRef(createStreamingHandler(`redix-${Date.now()}`));

  useEffect(() => {
    if (responseEndRef.current && isStreaming) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response, isStreaming]);

  useEffect(() => {
    if (!isOpen || !query.trim()) return;
    controllerRef.current?.cancel();
    setResponse('');
    setError(null);
    setIsStreaming(true);

    streamHandlerRef.current.reset();
    streamHandlerRef.current = createStreamingHandler(`redix-${Date.now()}`);

    controllerRef.current = requestRedix(query, {
      sessionId: sessionIdRef.current,
      onPartial: message => {
        const payload = message.payload as any;
        if (payload.text) {
          setResponse(prev => prev + payload.text);
          streamHandlerRef.current.onChunk(payload.text);
        }
      },
      onFinal: message => {
        setIsStreaming(false);
        const payload = message.payload as any;
        if (payload.text) {
          setResponse(prev => prev + payload.text);
          streamHandlerRef.current.onChunk(payload.text);
        }
        streamHandlerRef.current.onComplete();
      },
      onError: message => {
        setIsStreaming(false);
        const errorMsg = (message.payload as any)?.message || 'Failed to get AI response';
        setError(errorMsg);
        console.error('[AIResponsePane] Redix error:', message);
      },
    });

    return () => {
      controllerRef.current?.cancel();
      controllerRef.current = null;
    };
  }, [query, isOpen]);

  const handleCopy = useCallback(async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[AIResponsePane] Failed to copy:', error);
    }
  }, [response]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-20 left-1/2 z-50 mx-4 w-full max-w-4xl -translate-x-1/2 rounded-2xl border border-slate-700/70 bg-slate-950/95 shadow-2xl backdrop-blur-xl"
        style={{ maxHeight: '60vh' }}
      >
        <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
              <Sparkles size={16} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">AI Response</h3>
              <p className="max-w-md truncate text-xs text-gray-400">{query}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {response && (
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-slate-800/60 hover:text-gray-200"
                title="Copy response"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-slate-800/60 hover:text-gray-200"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(60vh - 80px)' }}>
          {isStreaming && !response && (
            <div className="flex items-center gap-3 text-gray-400">
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              <span className="text-sm">Streaming response from Redix...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <p className="font-medium">Error</p>
              <p className="mt-1 text-xs text-red-300/80">{error}</p>
            </div>
          )}

          {response && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="prose prose-invert prose-sm max-w-none text-gray-200"
            >
              <div className="whitespace-pre-wrap break-words">
                {response}
                {isStreaming && (
                  <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-emerald-400" />
                )}
              </div>
              <div ref={responseEndRef} />
            </motion.div>
          )}

          {!response && !isStreaming && !error && (
            <div className="py-8 text-center text-gray-400">
              <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Waiting for AI response...</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
