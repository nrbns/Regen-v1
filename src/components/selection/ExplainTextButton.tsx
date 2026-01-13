/**
 * Explain Text Button - ONE REAL ACTION
 * 
 * Shows button when text is selected
 * User clicks → Task created → Execute → Cancel → Done
 */

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { explainSelectedText } from '../../core/tasks/explainSelectedText';
import { listTasks, getSystemState } from '../../core/execution/taskManager';

export function ExplainTextButton() {
  const [selectedText, setSelectedText] = useState<string>('');
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';

      if (text.length > 0) {
        setSelectedText(text);
        
        // Get selection position
        const range = selection?.getRangeAt(0);
        if (range) {
          const rect = range.getBoundingClientRect();
          setPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
          });
        }
      } else {
        setSelectedText('');
        setPosition(null);
      }
    };

    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(handleSelection, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, []);

  useEffect(() => {
    // Check if there's an active "explain-text" task
    const checkTasks = () => {
      const tasks = listTasks();
      const runningExplainTask = tasks.find(
        t => t.type === 'explain-text' && t.status === 'RUNNING'
      );
      setIsExplaining(!!runningExplainTask);
    };

    checkTasks(); // Initial check
    
    // ENFORCEMENT: No polling - update only via eventBus
    import('../../core/execution/eventBus').then(({ eventBus }) => {
      const handlers = [
        eventBus.on('task:created', checkTasks),
        eventBus.on('task:updated', checkTasks),
        eventBus.on('task:completed', checkTasks),
      ];
      return () => {
        handlers.forEach(unsub => unsub());
      };
    }).catch(() => {
      // Event bus not available
    });
  }, []);

  const handleExplain = async () => {
    if (!selectedText || isExplaining) return;

    try {
      setIsExplaining(true);
      await explainSelectedText(selectedText);
    } catch (error) {
      console.error('[ExplainText] Failed:', error);
    } finally {
      setIsExplaining(false);
      // Clear selection after explaining
      window.getSelection()?.removeAllRanges();
      setSelectedText('');
      setPosition(null);
    }
  };

  if (!selectedText || !position) return null;
  if (selectedText.length < 3) return null; // Minimum 3 characters

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <button
        onClick={handleExplain}
        disabled={isExplaining}
        className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm rounded-lg shadow-lg transition-colors"
        title="Explain selected text"
      >
        <Sparkles className="w-4 h-4" />
        <span>{isExplaining ? 'Explaining...' : 'Explain'}</span>
      </button>
    </div>
  );
}
