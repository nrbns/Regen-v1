/**
 * useRedix Hook - React hook for Redix events
 */
import { useEffect, useRef } from 'react';
import { Redix } from './runtime';
/**
 * Hook to watch for Redix events
 */
export function useRedix(eventType, handler) {
    const handlerRef = useRef(handler);
    // Update handler ref when it changes
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);
    useEffect(() => {
        const actualHandler = typeof eventType === 'function' ? eventType : handlerRef.current;
        if (!actualHandler)
            return;
        const unsubscribe = Redix.watch(eventType, (event) => {
            if (typeof eventType === 'string') {
                actualHandler(event);
            }
            else {
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
    return (event) => {
        Redix.dispatch(event);
    };
}
