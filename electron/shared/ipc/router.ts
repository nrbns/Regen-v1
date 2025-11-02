/**
 * Typed IPC Router
 * Handles versioned channels (ob://ipc/v1/*) with Zod validation
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';

export type IPCChannel = string;
export type IPCRequest = unknown;
export type IPCResponse = { ok: boolean; data?: unknown; error?: string };

export interface IPCHandler<TRequest = unknown, TResponse = unknown> {
  schema: z.ZodSchema<TRequest>;
  handler: (event: IpcMainInvokeEvent, request: TRequest) => Promise<TResponse>;
}

const handlers = new Map<IPCChannel, IPCHandler>();

/**
 * Register a typed IPC handler
 * @param channel Channel name (e.g., 'tabs:create' will be registered as 'ob://ipc/v1/tabs:create')
 * @param schema Zod schema for request validation
 * @param handler Async handler function
 */
export function registerHandler<TRequest, TResponse>(
  channel: IPCChannel,
  schema: z.ZodSchema<TRequest>,
  handler: (event: IpcMainInvokeEvent, request: TRequest) => Promise<TResponse>
): void {
  const fullChannel = `ob://ipc/v1/${channel}`;
  
  // Remove existing handler if any
  if (handlers.has(fullChannel)) {
    ipcMain.removeHandler(fullChannel);
  }
  
  handlers.set(fullChannel, { schema, handler: handler as IPCHandler['handler'] });
  
  // Register with Electron IPC
  ipcMain.handle(fullChannel, async (event, rawRequest: unknown) => {
    try {
      // Validate request
      const parsed = schema.safeParse(rawRequest);
      if (!parsed.success) {
        return {
          ok: false,
          error: `Invalid request: ${parsed.error.message}`,
        } as IPCResponse;
      }
      
      // Call handler (cast to handle generic types)
      const handlerFn = handlers.get(fullChannel)!.handler;
      const response = await handlerFn(event, parsed.data);
      
      return {
        ok: true,
        data: response,
      } as IPCResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[IPC] Error in ${fullChannel}:`, message);
      return {
        ok: false,
        error: message,
      } as IPCResponse;
    }
  });
}

/**
 * Register a legacy handler (backwards compatibility)
 * Maps old channel names to new versioned channels
 */
export function registerLegacyHandler(
  oldChannel: IPCChannel,
  newChannel: IPCChannel,
  schema: z.ZodSchema,
  handler: IPCHandler['handler']
): void {
  registerHandler(newChannel, schema, handler);
  
  // Also register under old name for backwards compatibility
  ipcMain.handle(oldChannel, async (event, rawRequest: unknown) => {
    try {
      const parsed = schema.safeParse(rawRequest);
      if (!parsed.success) {
        return { ok: false, error: `Invalid request: ${parsed.error.message}` };
      }
      const response = await handler(event, parsed.data);
      return { ok: true, data: response };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });
}

/**
 * Get all registered channels
 */
export function getRegisteredChannels(): IPCChannel[] {
  return Array.from(handlers.keys());
}

