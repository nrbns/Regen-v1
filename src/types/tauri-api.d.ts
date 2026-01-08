/**
 * Type declarations for @tauri-apps/api
 * DAY 10 FIX: Type declarations to avoid TypeScript errors when Tauri is not installed
 */

declare module '@tauri-apps/api/core' {
  export function invoke<T = unknown>(cmd: string, args?: unknown): Promise<T>;
}

declare module '@tauri-apps/api/event' {
  export function listen<T = unknown>(
    event: string,
    handler: (event: { payload: T }) => void
  ): Promise<() => void>;

  export function emit(event: string, payload?: unknown): Promise<void>;
}
