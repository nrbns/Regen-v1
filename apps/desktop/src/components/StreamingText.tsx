import React, { useEffect, useRef } from 'react';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
  maxHeight?: number;
}

// Displays streamed text with an animated caret and auto-scroll to the bottom
export const StreamingText: React.FC<StreamingTextProps> = ({
  text,
  isStreaming,
  className = '',
  maxHeight = 240,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when text grows
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto whitespace-pre-wrap rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-200 ${className}`}
      style={{ maxHeight }}
    >
      {text || 'Awaiting response...'}
      {isStreaming && <span className="animate-pulse">▌</span>}
    </div>
  );
};

export default StreamingText;
