/**
 * useRedix Hook - React hook for Redix events
 */
import { RedixEvent, RedixDispatchEvent } from './runtime';
/**
 * Hook to watch for Redix events
 */
export declare function useRedix(eventType: string | ((event: RedixEvent) => void), handler?: (event: RedixEvent) => void): void;
/**
 * Hook to dispatch Redix events
 */
export declare function useRedixDispatch(): (event: RedixDispatchEvent) => void;
