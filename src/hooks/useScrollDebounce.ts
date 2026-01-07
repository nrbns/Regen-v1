/**
 * Hook for debounced scroll/resize handlers
 * Prevents excessive function calls and reduces CPU usage
 */

import { useEffect, useRef } from 'react';
import { debounce, throttle } from '../utils/debounce';

export function useScrollDebounce(
  handler: () => void,
  delay: number = 100,
  options: { debounce?: boolean } = {}
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const wrappedHandler = options.debounce
      ? debounce(() => handlerRef.current(), delay)
      : throttle(() => handlerRef.current(), delay);

    window.addEventListener('scroll', wrappedHandler, { passive: true });
    window.addEventListener('resize', wrappedHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', wrappedHandler);
      window.removeEventListener('resize', wrappedHandler);
    };
  }, [delay, options.debounce]);
}

