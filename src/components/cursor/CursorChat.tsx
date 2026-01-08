/**
 * Cursor AI Chat Component
 * Displays streaming chat interface with Cursor AI
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Loader2,
  X,
  Settings,
  Code,
  FileText,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { showToast } from '../../state/toastStore';

interface CursorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  streaming?: boolean;
  patches?: Array<{ file: string; start: number; end: number; newText: string }>;
  citations?: Array<{ file?: string; url?: string; span: [number, number] }>;
}

interface CursorChatProps {
  pageSnapshot?: {
    url: string;
    title: string;
    html?: string;
    text?: string;
  };
  editorState?: {
    filePath: string;
    content: string;
    language?: string;
    cursorLine?: number;
    cursorCol?: number;
  };
  onClose?: () => void;
}

export function CursorChat({ pageSnapshot, editorState, onClose }: CursorChatProps) {
  const [messages, setMessages] = useState<CursorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check API key on mount
  useEffect(() => {
    checkApiKey();
  }, []);

  // Listen for streaming chunks
  useEffect(() => {
    const handleStream = (event: {
      jobId: string;
      chunk: { type: string; data: unknown; sequenceId?: number };
    }) => {
      if (event.jobId !== currentJobId) return;

      const chunk = event.chunk;
      if (chunk.type === 'token') {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && last.streaming) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                content: last.content + (chunk.data as string),
              },
            ];
          }
          return prev;
        });
      } else if (chunk.type === 'patch') {
        // Handle code patches
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                patches: [
                  ...(last.patches || []),
                  chunk.data as NonNullable<CursorMessage['patches']>[number],
                ],
              },
            ];
          }
          return prev;
        });
      } else if (chunk.type === 'citation') {
        // Handle citations
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                citations: [
                  ...(last.citations || []),
                  chunk.data as NonNullable<CursorMessage['citations']>[number],
                ],
              },
            ];
          }
          return prev;
        });
      } else if (chunk.type === 'done') {
        setIsStreaming(false);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && last.streaming) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                streaming: false,
              },
            ];
          }
          return prev;
        });
      } else if (chunk.type === 'error') {
        setIsStreaming(false);
        showToast('error', `Cursor error: ${chunk.data}`);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.streaming) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                streaming: false,
                content: last.content + `\n\n[Error: ${chunk.data}]`,
              },
            ];
          }
          return prev;
        });
      }
    };

    // @ts-ignore - Electron IPC
    window.electron?.ipcRenderer?.on('cursor:stream', handleStream);

    return () => {
      // @ts-ignore
      window.electron?.ipcRenderer?.removeListener('cursor:stream', handleStream);
    };
  }, [currentJobId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkApiKey = async () => {
    try {
      const result = await ipc.cursor.checkApiKey();
      setHasApiKey(result.hasKey);
    } catch (error) {
      console.error('[CursorChat] Failed to check API key', error);
      setHasApiKey(false);
    }
  };

  const handleSetApiKey = async () => {
    if (!apiKeyInput.trim()) {
      showToast('error', 'API key cannot be empty');
      return;
    }

    try {
      await ipc.cursor.setApiKey({ apiKey: apiKeyInput.trim() });
      setHasApiKey(true);
      setShowSettings(false);
      setApiKeyInput('');
      showToast('success', 'API key saved securely');
    } catch (error) {
      console.error('[CursorChat] Failed to set API key', error);
      showToast('error', 'Failed to save API key');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || !hasApiKey) return;

    const question = input.trim();
    setInput('');

    // Add user message
    const userMessage: CursorMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
    };

    // Add assistant placeholder
    const assistantMessage: CursorMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);

    try {
      const response = await ipc.cursor.query({
        question,
        pageSnapshot,
        editorState,
        useWebSocket: false, // Use SSE for now
      });

      setCurrentJobId(response.jobId);
    } catch (error) {
      console.error('[CursorChat] Query failed', error);
      showToast('error', error instanceof Error ? error.message : 'Query failed');
      setIsStreaming(false);
      setMessages(prev => prev.slice(0, -1)); // Remove assistant placeholder
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setCurrentJobId(null);
  };

  const handleClearHistory = async () => {
    try {
      await ipc.cursor.clearHistory();
      setMessages([]);
      showToast('success', 'Conversation history cleared');
    } catch (error) {
      console.error('[CursorChat] Failed to clear history', error);
    }
  };

  if (hasApiKey === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-8">
        <AlertCircle className="text-yellow-500" size={48} />
        <h3 className="text-lg font-semibold text-gray-200">Cursor API Key Required</h3>
        <p className="max-w-md text-center text-sm text-gray-400">
          Please configure your Cursor API key to use the AI assistant. Your key will be stored
          securely using your OS keychain.
        </p>
        <button
          onClick={() => setShowSettings(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
        >
          Configure API Key
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/70 p-4">
        <div className="flex items-center gap-2">
          <Bot className="text-blue-400" size={20} />
          <h3 className="text-sm font-semibold text-gray-200">Cursor AI</h3>
        </div>
        <div className="flex items-center gap-2">
          {(pageSnapshot || editorState) && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              {pageSnapshot && <FileText size={12} />}
              {editorState && <Code size={12} />}
            </div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="rounded p-1.5 transition hover:bg-slate-800"
            title="Settings"
          >
            <Settings size={16} className="text-gray-400" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1.5 transition hover:bg-slate-800"
              title="Close"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
            <Bot className="text-gray-500" size={48} />
            <p className="text-sm text-gray-400">Ask Cursor AI anything about this page or code</p>
          </div>
        )}

        <AnimatePresence>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600/80 text-white'
                    : 'bg-slate-800/80 text-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                {msg.streaming && (
                  <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-blue-400" />
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                    {msg.citations.map((cite, idx) => (
                      <a
                        key={idx}
                        href={cite.url || cite.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                      >
                        <ExternalLink size={12} />
                        {cite.file || cite.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="space-y-2 border-t border-slate-700/70 p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Cursor AI..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-slate-700/70 bg-slate-800/80 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg bg-red-600/80 px-4 py-2 text-white transition hover:bg-red-700"
            >
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600/80 px-4 py-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <button
            type="button"
            onClick={handleClearHistory}
            className="transition hover:text-gray-400"
          >
            Clear history
          </button>
          <span>{messages.length} messages</span>
        </div>
      </form>

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-200">Cursor API Key</h3>
            <p className="mb-4 text-sm text-gray-400">
              Your API key will be stored securely using your OS keychain.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="Enter Cursor API key"
              className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSetApiKey}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setApiKeyInput('');
                }}
                className="rounded-lg bg-slate-800 px-4 py-2 text-gray-300 transition hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
