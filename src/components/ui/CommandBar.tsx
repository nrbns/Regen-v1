import React, { useState } from 'react';
import { useCommandController } from '../../hooks/useCommandController';

type Props = {
  onUserInput?: (text: string) => void;
};

export default function CommandBar({ onUserInput }: Props) {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { executeCommand } = useCommandController();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isProcessing) return;

    setIsProcessing(true);

    try {
      // FIX: Use CommandController instead of TaskService directly
      const result = await executeCommand(text.trim(), {
        currentUrl: window.location.href,
        selectedText: window.getSelection()?.toString() || '',
      });

      // Call original handler if provided
      if (onUserInput) {
        onUserInput(text.trim());
      }

      // Clear input
      setText('');

      if (!result.success) {
        console.error('[CommandBar] Command failed:', result.message);
      }
    } catch (error) {
      console.error('[CommandBar] Failed to process input:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="command-bar" style={{ padding: 8, borderTop: '1px solid #222' }}>
      <form onSubmit={handleSubmit}>
        <input
          aria-label="command-input"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter command"
          disabled={isProcessing}
          style={{
            width: '80%',
            padding: 8,
            opacity: isProcessing ? 0.7 : 1
          }}
        />
        <button
          type="submit"
          disabled={isProcessing || !text.trim()}
          style={{
            marginLeft: 8,
            padding: '8px 12px',
            opacity: (isProcessing || !text.trim()) ? 0.5 : 1
          }}
        >
          {isProcessing ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
