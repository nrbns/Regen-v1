import React, { useState, useEffect } from 'react';
import { Brain, Search, Globe, MessageSquare } from 'lucide-react';

interface RippleOption {
  label: string;
  action: () => void;
  icon: React.ReactNode;
}

interface IntentRippleProps {
  x: number;
  y: number;
  intent: string;
  onAction: (action: string) => void;
  onClose: () => void;
}

export function IntentRipple({ x, y, intent, onAction, onClose }: IntentRippleProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Show ripple immediately
  useEffect(() => {
    setIsVisible(true);

    // Auto-hide after 5 seconds if no interaction
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Generate options based on intent type
  const getOptions = (): RippleOption[] => {
    switch (intent.toLowerCase()) {
      case 'text_selected':
        return [
          {
            label: 'Explain',
            action: () => onAction('explain'),
            icon: <Brain size={14} />
          },
          {
            label: 'Summarize',
            action: () => onAction('summarize'),
            icon: <MessageSquare size={14} />
          },
          {
            label: 'Search',
            action: () => onAction('search'),
            icon: <Search size={14} />
          }
        ];
      case 'url_typed':
        return [
          {
            label: 'Navigate',
            action: () => onAction('navigate'),
            icon: <Globe size={14} />
          },
          {
            label: 'Analyze',
            action: () => onAction('analyze'),
            icon: <Brain size={14} />
          }
        ];
      default:
        return [
          {
            label: 'Ask Regen',
            action: () => onAction('ask'),
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
              option.action();
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

