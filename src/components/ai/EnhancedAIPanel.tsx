/**
 * EnhancedAIPanel - AI Assistant Panel with Smart Actions and Voice Input
 * Based on Figma UI/UX Prototype Flow redesign
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Send, X, Loader2, Copy, Check } from 'lucide-react';
import { SmartActionGroup, type SmartAction } from './SmartActionButton';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { VoiceButton } from '../voice';
import { createStreamingHandler } from '../../services/realtime/streamingBridge';

export interface EnhancedAIPanelProps {
  onClose?: () => void;
  initialQuery?: string;
}

export function EnhancedAIPanel({ onClose, initialQuery = '' }: EnhancedAIPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [response, setResponse] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [smartActions, setSmartActions] = useState<SmartAction[]>([]);
  const responseEndRef = useRef<HTMLDivElement>(null);
  const streamHandlerRef = useRef(createStreamingHandler(`ai-panel-${Date.now()}`));
  const { activeId, tabs } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeId);

  // Auto-scroll to bottom as response streams
  useEffect(() => {
    if (responseEndRef.current && isStreaming) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response, isStreaming]);

  // Generate smart actions from response
  useEffect(() => {
    if (!response || isStreaming) {
      setSmartActions([]);
      return;
    }

    // Extract potential actions from response
    const actions: SmartAction[] = [];

    // Check for URLs in response
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = response.match(urlRegex) || [];
    urls.slice(0, 3).forEach((url, idx) => {
      actions.push({
        id: `navigate-${idx}`,
        type: 'navigate',
        label: 'Open URL',
        description: url,
        onClick: async () => {
          await ipc.tabs.create(url);
        },
      });
    });

    // Add research action if query is research-related
    if (query.toLowerCase().includes('research') || query.toLowerCase().includes('find')) {
      actions.push({
        id: 'research',
        type: 'research',
        label: 'Research This',
        description: 'Start research session',
        onClick: async () => {
          // Trigger research mode
          const { useAppStore } = await import('../../state/appStore');
          useAppStore.getState().setMode('Research');
        },
      });
    }

    // Add copy action
    if (response.length > 0) {
      actions.push({
        id: 'copy',
        type: 'copy',
        label: 'Copy Response',
        onClick: async () => {
          await navigator.clipboard.writeText(response);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        },
      });
    }

    setSmartActions(actions);
  }, [response, query, isStreaming]);

  const handleSubmit = async () => {
    if (!query.trim() || isStreaming) return;

    setError(null);
    setResponse('');
    setIsStreaming(true);
    setSmartActions([]);

    // Reset streaming handler for new request
    streamHandlerRef.current.reset();
    streamHandlerRef.current = createStreamingHandler(`ai-panel-${Date.now()}`);

    try {
      // Stream AI response
      await ipc.redix.stream(
        query,
        {
          sessionId: `ai-panel-${Date.now()}`,
        },
        (chunk: any) => {
          if (chunk.type === 'token' && chunk.text) {
            setResponse(prev => prev + chunk.text);
            // Emit MODEL_CHUNK events for realtime panel
            streamHandlerRef.current.onChunk(chunk.text);
          } else if (chunk.type === 'done') {
            setIsStreaming(false);
            // Mark streaming complete
            streamHandlerRef.current.onComplete();
          } else if (chunk.type === 'error') {
            setIsStreaming(false);
            setError(chunk.error || 'Failed to get AI response');
          }
        }
      );
    } catch (err) {
      console.error('[EnhancedAIPanel] Error:', err);
      setIsStreaming(false);
      setError('Failed to get AI response. Please try again.');
    }
  };

  const handleVoiceResult = (text: string) => {
    setQuery(text);
    // Auto-submit after voice input
    setTimeout(() => {
      handleSubmit();
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col bg-gray-900/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/50 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
            <Sparkles size={16} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-100">AI Assistant</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-gray-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="space-y-3 border-b border-gray-800/50 p-4">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI assistant... (or use voice input)"
              className="w-full resize-none rounded-lg border border-gray-700/50 bg-gray-800/60 px-4 py-3 pr-12 text-sm text-gray-200 placeholder-gray-500 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              rows={3}
              disabled={isStreaming}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {query && (
                <button
                  onClick={handleSubmit}
                  disabled={isStreaming || !query.trim()}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 p-1.5 text-emerald-200 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Send (Enter)"
                >
                  {isStreaming ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <VoiceButton onResult={handleVoiceResult} small={true} />
          </div>
        </div>

        {/* Context Display */}
        {activeTab && (
          <div className="flex items-center gap-2 px-2 text-xs text-gray-500">
            <span>Context:</span>
            <span className="truncate text-gray-400">{activeTab.title || activeTab.url}</span>
          </div>
        )}
      </div>

      {/* Response Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isStreaming && !response && (
          <div className="flex items-center gap-3 py-8 text-gray-400">
            <Loader2 size={16} className="animate-spin text-emerald-400" />
            <span className="text-sm">AI is thinking...</span>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="prose prose-invert prose-sm max-w-none text-gray-200">
              <div className="whitespace-pre-wrap break-words">
                {response}
                {isStreaming && (
                  <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-emerald-400" />
                )}
              </div>
              <div ref={responseEndRef} />
            </div>

            {/* Smart Actions */}
            {smartActions.length > 0 && (
              <div className="border-t border-gray-800/50 pt-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Quick Actions
                </div>
                <SmartActionGroup actions={smartActions} />
              </div>
            )}

            {/* Copy Button */}
            {response && (
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(response);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/60 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-gray-100"
                >
                  {copied ? (
                    <>
                      <Check size={14} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {!response && !isStreaming && !error && (
          <div className="py-12 text-center text-gray-400">
            <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
            <p className="mb-1 text-sm">Ask me anything</p>
            <p className="text-xs text-gray-500">
              I can help with research, explanations, navigation, and more
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
