/**
 * Keyboard Navigation Hooks
 * Utilities for keyboard accessibility
 */

import { useEffect, useCallback, useState, RefObject } from 'react';

/**
 * Hook to handle arrow key navigation in lists
 */
export function useArrowKeyNavigation<T extends HTMLElement>(
  ref: RefObject<T>,
  itemCount: number,
  onSelect?: (index: number) => void
) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!ref.current || !ref.current.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = prev < itemCount - 1 ? prev + 1 : prev;
            if (onSelect) onSelect(next);
            return next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            const next = prev > 0 ? prev - 1 : 0;
            if (onSelect) onSelect(next);
            return next;
          });
          break;
        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          if (onSelect) onSelect(0);
          break;
        case 'End':
          e.preventDefault();
          setSelectedIndex(itemCount - 1);
          if (onSelect) onSelect(itemCount - 1);
          break;
      }
    },
    [ref, itemCount, onSelect]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { selectedIndex, setSelectedIndex };
}

/**
 * Hook to handle Escape key
 */
export function useEscapeKey(onEscape: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onEscape, enabled]);
}

/**
 * Hook to handle Enter/Space key activation
 */
export function useActivationKey(
  onActivate: () => void,
  enabled = true,
  ref?: RefObject<HTMLElement>
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (ref && ref.current && !ref.current.contains(document.activeElement)) {
          return;
        }
        e.preventDefault();
        onActivate();
      }
    };

    const target = ref?.current || document;
    target.addEventListener('keydown', handleKey as EventListener);
    return () => target.removeEventListener('keydown', handleKey as EventListener);
  }, [onActivate, enabled, ref]);
}
