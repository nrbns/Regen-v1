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

export function PageAIPanel({ isOpen, onClose }: PageAIPanelProps) {
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
        className={`fixed top-0 right-0 bottom-0 ${
          isMobile ? 'w-full' : 'w-[400px]'
        } bg-gray-900 border-l border-gray-700 flex flex-col safe-top safe-bottom`}
        style={{ zIndex: 120 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-700 flex gap-2 flex-wrap flex-shrink-0">
          <button
            onClick={handleSummarize}
            disabled={loading || !pageContext}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[36px]"
          >
            <FileText className="w-4 h-4" />
            Summarize
          </button>
          <button
            onClick={() => handleExplain()}
            disabled={loading || !pageContext}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[36px]"
          >
            <HelpCircle className="w-4 h-4" />
            Explain
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <p className="text-sm">Ask me anything about this page</p>
              <p className="text-xs mt-2 text-gray-500">
                Try: "Summarize this page" or "Explain the main points"
              </p>
            </div>
          ) : (
            messages.map((message) => (
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
                  <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(message.content)}
                      className="mt-2 text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-lg p-3">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
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
              className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none text-base disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !pageContext}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Send"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

