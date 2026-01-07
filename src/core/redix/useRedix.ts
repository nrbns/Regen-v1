/**
 * useRedix Hook - React hook for Redix events
 */

import { useEffect, useRef } from 'react';
import { Redix, RedixEvent, RedixDispatchEvent } from './runtime';

/**
 * Hook to watch for Redix events
 */
export function useRedix(
  eventType: string | ((event: RedixEvent) => void),
  handler?: (event: RedixEvent) => void
): void {
  const handlerRef = useRef(handler);

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const actualHandler = typeof eventType === 'function' ? eventType : handlerRef.current;
    if (!actualHandler) return;

    const unsubscribe = Redix.watch(eventType as any, (event) => {
      if (typeof eventType === 'string') {
        actualHandler(event);
      } else {
        actualHandler(event);
      }
    });

    return unsubscribe;
  }, [eventType]);
}

/**
 * Hook to dispatch Redix events
 */
export function useRedixDispatch() {
  return (event: RedixDispatchEvent) => {
    Redix.dispatch(event);
  };
}

