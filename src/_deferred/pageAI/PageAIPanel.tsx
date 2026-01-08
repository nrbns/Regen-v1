/**
 * Page-Level AI Assistant Panel (deferred)
 * Original implementation moved to _deferred for v1.
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPageContext = async () => {
    try {
      const analysis = await analyzePage();
      setPageContext({
        url: analysis.url,
        title: analysis.title,
        content: document.body.innerText.substring(0, 10000),
      });
    } catch (error) {
      console.error('Failed to load page context:', error);
    }
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
      const summary = await summarizePage({ length: 'medium', includeKeyPoints: true });
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
        const pageExplanation = await explainPage({ level: 'detailed' });
        explanation = pageExplanation.explanation;
        if (pageExplanation.concepts && pageExplanation.concepts.length > 0) {
          explanation += `\n\n**Key Concepts:** ${pageExplanation.concepts.join(', ')}`;
        }
      } else {
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
      const prompt = `You are an AI assistant helping the user understand a webpage. \n\nPage Context:\nTitle: ${pageContext.title}\nURL: ${pageContext.url}\n\nPage Content (excerpt):\n${pageContext.content.substring(0, 6000)}\n\nUser Question: ${input}\n\nPlease provide a helpful answer based on the page content.`;

      const result = await aiEngine.runTask({
        kind: 'chat',
        prompt,
        context: {
          pageUrl: pageContext.url,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
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
        className={`fixed bottom-0 right-0 top-0 ${isMobile ? 'w-full' : 'w-[400px]'} safe-top safe-bottom flex flex-col border-l border-gray-700 bg-gray-900`}
        style={{ zIndex: 120 }}
      >
        {/* Header and rest of original UI (deferred) */}
      </motion.div>
    </AnimatePresence>
  );
}

export default PageAIPanel;
