import React, { useState, useEffect } from 'react';
import { Brain, Search, Globe, MessageSquare } from 'lucide-react';

export interface IntentRippleProps {
  x: number;
  y: number;
  intent: string;
  selectedText?: string;
  onAction: (action: string, text?: string) => void;
  onClose: () => void;
}

export interface IntentBadgeProps {
  intent: string;
  status: 'detected' | 'running' | 'completed' | 'failed';
  onClose?: () => void;
}

export function IntentBadge({ intent, status, onClose }: IntentBadgeProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show immediately (50-100ms)
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-hide after 3 seconds if completed
  useEffect(() => {
    if (status === 'completed') {
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'detected':
        return <Brain size={16} className="text-blue-400" />;
      case 'running':
        return <Clock size={16} className="text-yellow-400 animate-spin" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return <Brain size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'detected':
        return 'Intent detected';
      case 'running':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 transition-all duration-200"
      style={{
        animation: 'slideDownFade 0.2s ease-out',
      }}
    >
      {getStatusIcon()}
      <div className="flex flex-col">
        <div className="text-sm text-white font-medium">
          {getStatusText()}: {intent}
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDownFade {
    from {
      opacity: 0;
      transform: translate(-50%, -10px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
`;
document.head.appendChild(style);

// Intent Ripple - Subtle instant feedback for user actions (50ms rule)
export function IntentRipple({ x, y, intent, selectedText, onAction, onClose }: IntentRippleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // MICRO-TIMING: 50ms rule - Show ripple IMMEDIATELY, no artificial delays
  useEffect(() => {
    // Show within 50ms max - immediate feedback
    const showTimer = setTimeout(() => setIsVisible(true), 0); // Immediate

    // Auto-hide after 8 seconds if no interaction
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 8000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onClose]);

  // ESC key to dismiss immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Generate options based on intent type
  const getOptions = (): Array<{ label: string; action: string; icon: React.ReactNode }> => {
    switch (intent.toLowerCase()) {
      case 'text_selected':
        return [
          {
            label: 'Explain',
            action: 'explain',
            icon: <Brain size={14} />
          },
          {
            label: 'Summarize',
            action: 'summarize',
            icon: <MessageSquare size={14} />
          },
          {
            label: 'Search',
            action: 'search',
            icon: <Search size={14} />
          }
        ];
      case 'url_typed':
        return [
          {
            label: 'Navigate',
            action: 'navigate',
            icon: <Globe size={14} />
          },
          {
            label: 'Analyze',
            action: 'analyze',
            icon: <Brain size={14} />
          }
        ];
      default:
        return [
          {
            label: 'Ask Regen',
            action: 'ask',
            icon: <MessageSquare size={14} />
          }
        ];
    }
  };

  const options = getOptions();

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-40 pointer-events-auto"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Subtle pulse background */}
      <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />

      {/* Options ring */}
      <div className="relative flex gap-1">
        {options.map((option, index) => (
          <button
            key={option.label}
            onClick={() => {
              onAction(option.action, selectedText);
              onClose();
            }}
            onMouseEnter={() => setSelectedIndex(index)}
            onMouseLeave={() => setSelectedIndex(null)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedIndex === index
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50'
                : 'bg-slate-800/80 text-gray-300 hover:bg-slate-700/80 border border-slate-600/50'
            } backdrop-blur-sm`}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>

      {/* Keyboard hint */}
      <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 text-center">
        Press ESC to dismiss
      </div>
    </div>
  );
}