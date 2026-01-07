/**
 * Regen Sidebar Component
 * The AI brain of Regen - chat + voice interface
 */

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  X,
  Search,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { toast } from '../../utils/toast';
import { HandsFreeMode } from './HandsFreeMode';
import { getRegenSocket } from '../../lib/realtime/regen-socket';

export type RegenMode = 'research' | 'trade';

interface RegenMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  done?: boolean; // For streaming messages
  commands?: Array<{ type: string; payload: Record<string, unknown> }>;
}

// RegenCommand type is now handled by RegenSocket client

export function RegenSidebar() {
  const [messages, setMessages] = useState<RegenMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [mode, setMode] = useState<RegenMode>('research');
  const [sessionId] = useState(() => `regen-${Date.now()}`);
  const [isConnected] = useState(false);
  const [_currentStatus, _setCurrentStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const socketRef = useRef<ReturnType<typeof getRegenSocket> | null>(null);
  const { tabs, activeId } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeId);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0]?.transcript)
          .join(' ')
          .trim();

        if (transcript) {
          setInput(transcript);
          handleSend(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast.error('Voice recognition failed. Please try again.');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Track pending confirmation
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    orderId?: string;
    pendingOrder: any;
  } | null>(null);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    // Handle confirmation responses
    if (pendingConfirmation) {
      const lower = messageText.toLowerCase().trim();
      const confirmed = lower === 'yes' || lower === 'y' || lower === 'confirm';

      if (confirmed || lower === 'no' || lower === 'n' || lower === 'cancel') {
        try {
          const result = await ipc.regen.tradeConfirm({
            orderId: pendingConfirmation.orderId,
            confirmed,
            pendingOrder: pendingConfirmation.pendingOrder,
          });

          const confirmationMessage: RegenMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: confirmed
              ? `✅ Order placed successfully! Order ID: ${result.orderId || 'N/A'}`
              : '❌ Order cancelled.',
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, confirmationMessage]);
          setPendingConfirmation(null);
        } catch (error) {
          console.error('[Regen] Trade confirmation failed:', error);
          toast.error('Failed to process trade confirmation');
        }
        setInput('');
        return;
      }
    }

    setIsLoading(true);
    setInput('');

    // Add user message
    const userMessage: RegenMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Send query via HTTP (response streams via WebSocket)
      const socket = socketRef.current;
      const clientId = socket?.getClientId() || `client-${Date.now()}`;

      // Create placeholder message for streaming
      const placeholderMessage: RegenMessage = {
        id: `msg-${Date.now()}-streaming`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        done: false,
      };
      setMessages(prev => [...prev, placeholderMessage]);

      const response = await fetch('http://localhost:4000/api/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          sessionId,
          message: messageText,
          mode,
          source: text ? 'voice' : 'text',
          tabId: activeTab?.id,
          context: activeTab
            ? {
                url: activeTab.url,
                title: activeTab.title,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Query failed');
      }

      // Response is streamed via WebSocket, so we don't need to process HTTP response
      // The WebSocket handler above will receive the streaming events and update messages
      // Commands are also executed automatically via WebSocket command events
    } catch (error) {
      console.error('[Regen] Query failed:', error);
      toast.error('Failed to get response from Regen');

      const errorMessage: RegenMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recognition not available in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col border-l border-gray-700 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-200">Regen</h2>
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" aria-label="Connected" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" aria-label="Disconnected" />
          )}
        </div>
        <button
          onClick={async () => {
            // Close sidebar via appStore
            const { useAppStore } = await import('../../state/appStore');
            useAppStore.getState().setRegenSidebarOpen(false);
          }}
          className="text-gray-400 transition-colors hover:text-gray-300"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Mode Toggles */}
      <div className="flex gap-2 border-b border-gray-700 p-3">
        <button
          onClick={() => setMode('research')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors ${
            mode === 'research'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm font-medium">Research</span>
        </button>
        <button
          onClick={() => setMode('trade')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors ${
            mode === 'trade'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">Trade</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-gray-400">
            <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="text-sm">Ask me anything or use voice commands</p>
            {_currentStatus && <p className="mt-2 text-xs text-blue-400">{_currentStatus}</p>}
            <p className="mt-2 text-xs text-gray-500">
              {mode === 'research' ? (
                <>
                  Try: "Find 5 best brokers for intraday trading in India and give detailed
                  pros/cons"
                  <br />
                  or "Compare Zerodha, Upstox, Angel One for intraday trading"
                </>
              ) : (
                <>
                  Try: "Buy 10 shares of TCS at market"
                  <br />
                  or "Set SL at 1% and target 3%"
                </>
              )}
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              {msg.commands && msg.commands.length > 0 && (
                <div className="mt-2 text-xs opacity-75">
                  {msg.commands.length} command(s) executed
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-800 px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hands-Free Mode Toggle */}
      <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800/50 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Hands-Free Mode</span>
          <button
            onClick={() => setHandsFreeMode(!handsFreeMode)}
            className={`relative h-5 w-10 rounded-full transition-colors ${
              handsFreeMode ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            aria-label="Toggle hands-free mode"
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                handsFreeMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {handsFreeMode && (
          <div className="flex animate-pulse items-center gap-1 text-xs text-blue-400">
            <Mic className="h-3 w-3" />
            <span>Listening...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceToggle}
            className={`rounded p-2 transition-colors ${
              isListening ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Regen anything..."
            className="flex-1 rounded-lg bg-gray-800 px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Hands-Free Mode Overlay */}
      {handsFreeMode && (
        <HandsFreeMode
          sessionId={sessionId}
          mode={mode}
          onCommand={async cmd => {
            // Execute browser commands
            try {
              switch (cmd.type) {
                case 'OPEN_TAB':
                  if (cmd.payload.url) {
                    await ipc.regen.openTab({ url: cmd.payload.url as string });
                  }
                  break;
                case 'SCROLL':
                  if (cmd.payload.tabId) {
                    await ipc.regen.scroll({
                      tabId: cmd.payload.tabId as string,
                      amount: (cmd.payload.amount as number) || 500,
                    });
                  }
                  break;
                case 'CLICK_ELEMENT':
                  if (cmd.payload.tabId && cmd.payload.elementId) {
                    await ipc.regen.clickElement({
                      tabId: cmd.payload.tabId as string,
                      selector: cmd.payload.elementId as string,
                    });
                  }
                  break;
                case 'GO_BACK':
                  if (activeTab?.id) {
                    await ipc.tabs.goBack(activeTab.id);
                  }
                  break;
                case 'GO_FORWARD':
                  if (activeTab?.id) {
                    await ipc.tabs.goForward(activeTab.id);
                  }
                  break;
              }
            } catch (error) {
              console.error('[HandsFree] Command execution failed:', error);
            }
          }}
          onClose={() => setHandsFreeMode(false)}
        />
      )}
    </div>
  );
}
