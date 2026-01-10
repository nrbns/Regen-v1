/**
 * Activity Detection Hook - Real-time user activity tracking
 * Emits CLICK, KEYPRESS events to EventBus for AI observation
 */

import { useEffect, useRef } from 'react';
import { eventBus } from './EventBus';

export function useActivityDetection() {
  const activityRef = useRef(Date.now());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      activityRef.current = Date.now();
      eventBus.emit('CLICK', {
        x: e.clientX,
        y: e.clientY,
        target: (e.target as HTMLElement)?.tagName || 'unknown',
      }, 'activity-detector');
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      activityRef.current = Date.now();
      eventBus.emit('KEYPRESS', {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      }, 'activity-detector');
    };

    // Track selection events (text selection)
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        eventBus.emit('TEXT_SELECT', {
          text: selection.toString().trim(),
          url: window.location.href,
        }, 'selection-detector');
      }
    };

    window.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('keypress', handleKeyPress, { passive: true });
    document.addEventListener('selectionchange', handleSelection);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, []);

  return activityRef;
}
