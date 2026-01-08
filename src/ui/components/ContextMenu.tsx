import React, { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onAskRegen: () => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, onAskRegen, onClose }: ContextMenuProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-md shadow-lg py-1 min-w-32"
      style={{
        left: x,
        top: y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onAskRegen();
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
      >
        <Brain size={14} />
        Ask Regen
      </button>
    </div>
  );
}