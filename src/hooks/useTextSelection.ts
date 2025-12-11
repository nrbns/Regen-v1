/**
 * Hook for Text Selection
 * Detects and handles text selection for AI actions
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TextSelection {
  text: string;
  position: { x: number; y: number };
  range: Range | null;
}

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
      // Clear selection after a delay
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setSelection(null);
      }, 200);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) {
      return; // Ignore very short selections
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelection({
      text: selectedText,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
      },
      range,
    });
  }, []);

  const clearSelection = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    // Listen for selection changes
    document.addEventListener('selectionchange', handleSelection);
    // Also listen for mouseup (user finished selecting)
    document.addEventListener('mouseup', handleSelection);
    // Clear on click outside
    document.addEventListener('click', (_e) => {
      const selection = window.getSelection();
      if (!selection?.toString() || selection.isCollapsed) {
        clearSelection();
      }
    });

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mouseup', handleSelection);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleSelection, clearSelection]);

  return {
    selection,
    clearSelection,
  };
}

