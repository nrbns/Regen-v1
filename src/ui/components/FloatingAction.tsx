import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

interface FloatingActionProps {
  x: number;
  y: number;
  selectedText: string;
  onAnalyze: () => void;
  onClose: () => void;
}

export function FloatingAction({ x, y, selectedText, onAnalyze, onClose }: FloatingActionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to prevent flickering
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-40 bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-md shadow-sm px-2 py-1 transition-opacity duration-200"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -120%)', // Position above the selection
      }}
    >
      <button
        onClick={onAnalyze}
        className="flex items-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-300 text-xs transition-colors hover:bg-slate-700/50 rounded"
        title="Ask Regen about this text"
      >
        <Brain size={11} />
        Ask Regen
      </button>
    </div>
  );
}
