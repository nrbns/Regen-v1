import { useEffect, useState } from 'react';
import { Copy, Volume2, Zap } from 'lucide-react';

export interface TextSelectionAIBarProps {
  selectedText?: string;
}

export function TextSelectionAIBar({ selectedText }: TextSelectionAIBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleSelection = () => {
      const selected = window.getSelection()?.toString();
      setVisible(!!selected && selected.length > 0);
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, []);

  if (!visible && !selectedText) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex gap-2 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
      <button
        className="rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        title="Copy"
        onClick={() => navigator.clipboard.writeText(selectedText || '')}
      >
        <Copy className="h-4 w-4" />
      </button>
      <button
        className="rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        title="Read aloud"
      >
        <Volume2 className="h-4 w-4" />
      </button>
      <button
        className="rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        title="AI Actions"
      >
        <Zap className="h-4 w-4" />
      </button>
    </div>
  );
}
