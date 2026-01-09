import React, { useState } from 'react';
import { Send, Bot, Sparkles } from 'lucide-react';

interface AIPanelProps {
  onSendMessage?: (message: string) => void;
}

export function AIPanel({ onSendMessage }: AIPanelProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage?.(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-slate-200">AI Assistant</h3>
            <p className="text-sm text-slate-400">Ask me anything about your browsing</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="bg-slate-800 rounded-lg p-3 max-w-[80%]">
            <p className="text-slate-200 text-sm">
              Hello! I'm your AI assistant. I can help you with web analysis, content summarization,
              research, and much more. What would you like to do?
            </p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}