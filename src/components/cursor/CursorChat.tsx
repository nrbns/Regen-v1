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
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <AlertCircle className="text-yellow-500" size={48} />
        <h3 className="text-lg font-semibold text-gray-200">Cursor API Key Required</h3>
        <p className="text-sm text-gray-400 text-center max-w-md">
          Please configure your Cursor API key to use the AI assistant. Your key will be stored
          securely using your OS keychain.
        </p>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Configure API Key
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/60 border border-slate-700/70 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/70">
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
            className="p-1.5 rounded hover:bg-slate-800 transition"
            title="Settings"
          >
            <Settings size={16} className="text-gray-400" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-800 transition"
              title="Close"
            >
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
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
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.streaming && (
                  <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
                    {msg.citations.map((cite, idx) => (
                      <a
                        key={idx}
                        href={cite.url || cite.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-300 hover:text-blue-200 flex items-center gap-1"
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
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700/70 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask Cursor AI..."
            disabled={isStreaming}
            className="flex-1 px-3 py-2 bg-slate-800/80 border border-slate-700/70 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-700 transition"
            >
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600/80 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <button
            type="button"
            onClick={handleClearHistory}
            className="hover:text-gray-400 transition"
          >
            Clear history
          </button>
          <span>{messages.length} messages</span>
        </div>
      </form>

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Cursor API Key</h3>
            <p className="text-sm text-gray-400 mb-4">
              Your API key will be stored securely using your OS keychain.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="Enter Cursor API key"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-200 mb-4 focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSetApiKey}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setApiKeyInput('');
                }}
                className="px-4 py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition"
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
