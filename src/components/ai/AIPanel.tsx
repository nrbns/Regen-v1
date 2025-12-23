/**
 * AI Panel Component
 * React component for interacting with the AI Bridge service
 */

import React, { useState, useEffect } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIPanelProps {
  bridgeUrl?: string;
  bridgeToken?: string;
  className?: string;
}

export function AIPanel({
  bridgeUrl = 'http://127.0.0.1:4300',
  bridgeToken,
  className = '',
}: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    try {
      const response = await fetch(`${bridgeUrl}/health`);
      const data = await response.json();
      setHealthStatus(data);

      // Clear error if health check succeeds
      if (data.status === 'ok') {
        setError(null);
      }

      // Show warning if provider not available
      if (data.providerAvailable === false && data.provider !== 'mock') {
        setError(
          `Provider ${data.requestedProvider} not available. ${data.providerError || 'Falling back to mock.'}`
        );
      }
    } catch (err) {
      console.error('[AIPanel] Health check failed:', err);
      setError("AI Bridge service not available. Make sure it's running on " + bridgeUrl);
      setHealthStatus(null);
    }
  }

  // Refresh health status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkHealth();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [bridgeUrl]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (bridgeToken) {
        headers['Authorization'] = `Bearer ${bridgeToken}`;
      }

      const response = await fetch(`${bridgeUrl}/v1/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'No response',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('[AIPanel] Error:', err);
      setError(err.message || 'Failed to get response from AI Bridge');

      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to connect to AI Bridge'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className={`flex h-full flex-col bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">AI Assistant</h2>
          </div>
          {healthStatus && (
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`h-2 w-2 rounded-full ${
                  healthStatus.status === 'ok' && healthStatus.providerAvailable !== false
                    ? 'bg-green-500'
                    : healthStatus.provider === 'mock'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {healthStatus.provider}
                {healthStatus.requestedProvider &&
                  healthStatus.requestedProvider !== healthStatus.provider && (
                    <span className="ml-1 text-xs text-yellow-600 dark:text-yellow-400">
                      (fallback from {healthStatus.requestedProvider})
                    </span>
                  )}
              </span>
            </div>
          )}
        </div>
        {error && (
          <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
            <Bot className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Start a conversation with the AI assistant</p>
            {healthStatus && (
              <p className="mt-2 text-sm">
                Provider: {healthStatus.provider} | Model: {healthStatus.modelPath || 'none'}
              </p>
            )}
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              <p
                className={`mt-1 text-xs ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
