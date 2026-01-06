// PageAIPanel deferred for v1 — original in src/_deferred/pageAI/PageAIPanel.tsx
export function PageAIPanel(_props: any) {
  return null;
}

export default PageAIPanel;
/**
 * Page-Level AI Assistant Panel
 * Sidebar/drawer with AI assistant for page content
 */

import { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, FileText, HelpCircle, Loader2, Copy } from 'lucide-react';
import { analyzePage } from '../../services/pageActions/analyzer';
import { aiEngine } from '../../core/ai';
import { summarizePage } from '../../services/pageAI/summarizer';
import { explainPage, explainText } from '../../services/pageAI/explainer';
import { useMobileDetection } from '../../mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../../utils/toast';

interface PageAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  action?: 'summarize' | 'explain' | 'ask';
}

function __removed_PageAIPanel_impl({ isOpen, onClose }: PageAIPanelProps) {
  const { isMobile } = useMobileDetection();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageContext, setPageContext] = useState<{
    url: string;
    title: string;
    content: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadPageContext();
      // Focus input when panel opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadPageContext = async () => {
    try {
      const analysis = await analyzePage();
      setPageContext({
        url: analysis.url,
        title: analysis.title,
        content: document.body.innerText.substring(0, 10000), // Limit to 10k chars
      });
    } catch (error) {
      console.error('Failed to load page context:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSummarize = async () => {
    if (!pageContext) return;

    setLoading(true);
    const messageId = `msg-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        role: 'user',
        content: 'Summarize this page',
        timestamp: Date.now(),
        action: 'summarize',
      },
    ]);

    try {
      const summary = await summarizePage({
        length: 'medium',
        includeKeyPoints: true,
      });

      let content = summary.summary;
      if (summary.keyPoints && summary.keyPoints.length > 0) {
        content += '\n\n**Key Points:**\n' + summary.keyPoints.map(p => `• ${p}`).join('\n');
      }
      if (summary.readingTime) {
        content += `\n\n_Reading time: ~${summary.readingTime} minute(s)_`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content,
          timestamp: Date.now(),
          action: 'summarize',
        },
      ]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate summary');
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async (text?: string) => {
    if (!pageContext) return;

    const textToExplain = text || document.getSelection()?.toString() || pageContext.title;

    setLoading(true);
    const messageId = `msg-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      {
        id: messageId,
        role: 'user',
        content: `Explain: ${textToExplain}`,
        timestamp: Date.now(),
        action: 'explain',
      },
    ]);

    try {
      let explanation: string;

      if (textToExplain === pageContext.title || textToExplain.length < 50) {
        // Explain entire page or short text
        const pageExplanation = await explainPage({ level: 'detailed' });
        explanation = pageExplanation.explanation;

        if (pageExplanation.concepts && pageExplanation.concepts.length > 0) {
          explanation += `\n\n**Key Concepts:** ${pageExplanation.concepts.join(', ')}`;
        }
      } else {
        // Explain selected text
        explanation = await explainText(textToExplain, { level: 'detailed' });
      }

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: explanation,
          timestamp: Date.now(),
          action: 'explain',
        },
      ]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate explanation');
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !pageContext) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
      action: 'ask',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const prompt = `You are an AI assistant helping the user understand a webpage. 

Page Context:
Title: ${pageContext.title}
URL: ${pageContext.url}

Page Content (excerpt):
${pageContext.content.substring(0, 6000)}

User Question: ${input}

Please provide a helpful answer based on the page content.`;

      const result = await aiEngine.runTask({
        kind: 'chat',
        prompt,
        context: {
          pageUrl: pageContext.url,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: result.text || 'I cannot answer that question.',
          timestamp: Date.now(),
          action: 'ask',
        },
      ]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to get response');
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: isMobile ? '100%' : 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: isMobile ? '100%' : 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed bottom-0 right-0 top-0 ${
          isMobile ? 'w-full' : 'w-[400px]'
        } safe-top safe-bottom flex flex-col border-l border-gray-700 bg-gray-900`}
        style={{ zIndex: 120 }}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-700 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-shrink-0 flex-wrap gap-2 border-b border-gray-700 p-4">
          <button
            onClick={handleSummarize}
            disabled={loading || !pageContext}
            className="flex min-h-[36px] items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Summarize
          </button>
          <button
            onClick={() => handleExplain()}
            disabled={loading || !pageContext}
            className="flex min-h-[36px] items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <HelpCircle className="h-4 w-4" />
            Explain
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-600" />
              <p className="text-sm">Ask me anything about this page</p>
              <p className="mt-2 text-xs text-gray-500">
                Try: "Summarize this page" or "Explain the main points"
              </p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(message.content)}
                      className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-800 p-3">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-gray-700 p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything about this page..."
              rows={2}
              disabled={loading || !pageContext}
              className="flex-1 resize-none rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !pageContext}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
