import React, { useState, useRef, useEffect } from 'react';
import { Search, Zap, Globe, MessageSquare } from 'lucide-react';
import { IntentRouter } from '../backend/ai/IntentRouter';
import { aiController } from '../core/ai/AIController';

interface CommandBarProps {
  onSubmit: (intent: { type: string; input: string; confidence: number }) => void;
  placeholder?: string;
}

export function CommandBar({ onSubmit, placeholder = "Search / URL / Ask Regen..." }: CommandBarProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [intent, setIntent] = useState<{ type: string; confidence: number } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Intent badge mapping
  const getIntentBadge = (type: string) => {
    switch (type) {
      case 'navigate': return { icon: Globe, label: 'URL', color: 'text-blue-400' };
      case 'search': return { icon: Search, label: 'Search', color: 'text-green-400' };
      case 'ai': return { icon: MessageSquare, label: 'Ask AI', color: 'text-purple-400' };
      default: return { icon: Search, label: 'Query', color: 'text-gray-400' };
    }
  };

  // Detect intent as user types
  useEffect(() => {
    if (input.trim()) {
      const detectedIntent = IntentRouter.route(input);
      setIntent({ type: detectedIntent.type, confidence: detectedIntent.confidence });
    } else {
      setIntent(null);
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isExecuting) return;

    const detectedIntent = IntentRouter.route(trimmedInput);

    // MICRO-TIMING: <100ms rule - Show execution state IMMEDIATELY
    setIsExecuting(true);

    // Clear input immediately for instant feedback
    setInput('');
    setIntent(null);

    // Handle AI tasks directly
    if (detectedIntent.type === 'ai') {
      try {
        // Initialize AI if needed
        await aiController.initialize();

        // Process the AI request
        const response = await aiController.processSelectedText(
          trimmedInput,
          'explain' // Default to explain for general queries
        );

        // Pass result to parent for task creation
        onSubmit({
          ...detectedIntent,
          result: response
        });

      } catch (error) {
        console.error('AI processing failed:', error);
        // Still submit to create error task
        onSubmit({
          ...detectedIntent,
          error: error.message
        });
      }
    } else {
      // Handle navigation/search normally
      onSubmit(detectedIntent);
    }

    // Reset execution state after brief moment (visual feedback)
    setTimeout(() => {
      setIsExecuting(false);
      inputRef.current?.blur();
    }, 200);
  };

  const getIntentIcon = () => {
    if (!intent) return <Search size={16} className="text-gray-400" />;

    switch (intent.type) {
      case 'navigate':
        return <Globe size={16} className="text-blue-400" />;
      case 'ai':
        return <MessageSquare size={16} className="text-purple-400" />;
      case 'search':
        return <Search size={16} className="text-green-400" />;
      default:
        return <Search size={16} className="text-gray-400" />;
    }
  };

  const getIntentColor = () => {
    if (!intent) return 'border-slate-600 focus-within:border-slate-500';

    switch (intent.type) {
      case 'navigate':
        return 'border-blue-500/50 focus-within:border-blue-400';
      case 'ai':
        return 'border-purple-500/50 focus-within:border-purple-400';
      case 'search':
        return 'border-green-500/50 focus-within:border-green-400';
      default:
        return 'border-slate-600 focus-within:border-slate-500';
    }
  };

  return (
    <div className="p-4 bg-slate-900 border-b border-slate-700">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="relative">
          {/* Intent Badge - Shows immediately */}
          {intent && (
            <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getIntentBadge(intent.type).color} bg-slate-800`}>
              <getIntentBadge(intent.type).icon size={12} />
              {getIntentBadge(intent.type).label}
            </div>
          )}

          {/* Universal Input Surface */}
          <div className={`relative bg-slate-800 border-2 rounded-lg transition-all duration-200 ${
            intent ? 'border-slate-600' : 'border-slate-700'
          } ${isExecuting ? 'border-blue-500 shadow-lg shadow-blue-500/20' : ''}`}>
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search size={16} className="text-gray-400" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-3 bg-transparent border-0 outline-none text-white placeholder:text-gray-400 text-sm"
              autoComplete="off"
            />

            {/* Execution indicator */}
            {isExecuting && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );

          {/* Confidence indicator */}
          {intent && intent.confidence > 0.5 && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className={`w-2 h-2 rounded-full ${
                intent.confidence > 0.8 ? 'bg-green-400' :
                intent.confidence > 0.6 ? 'bg-yellow-400' : 'bg-orange-400'
              }`} />
            </div>
          )}

          {/* Subtle pulse when focused */}
          {isFocused && (
            <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-pulse" />
          )}
        </div>

        {/* Intent hint (appears below) */}
        {intent && input.trim() && (
          <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-slate-800/95 backdrop-blur-xl rounded-lg px-3 py-1 text-xs text-gray-300 border border-slate-600/50 whitespace-nowrap">
            {intent.type === 'navigate' && 'Navigate to URL'}
            {intent.type === 'ai' && 'Ask Regen (AI)'}
            {intent.type === 'search' && 'Search web'}
            {intent.type === 'unknown' && 'Enter command'}
          </div>
        )}
      </form>
    </div>
  );
}
