/**
 * Typed IPC Router
 * Handles versioned channels (ob://ipc/v1/*) with Zod validation
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { checkRateLimit } from '../../services/ipc-rate-limit';
import { createLogger } from '../../services/utils/logger';

const log = createLogger('ipc-router');

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

  // Validate schema
  if (!schema || typeof schema.safeParse !== 'function') {
    console.error(
      `[IPC Router] Invalid schema for ${fullChannel}: schema.safeParse is not a function`
    );
    throw new Error(`Invalid schema for ${fullChannel}: schema.safeParse is not a function`);
  }

  // Remove existing handler if any
  if (handlers.has(fullChannel)) {
    ipcMain.removeHandler(fullChannel);
  }

  handlers.set(fullChannel, { schema, handler: handler as IPCHandler['handler'] });

  // Register with Electron IPC - use a wrapper to ensure handler exists
  const handlerWrapper = async (event: IpcMainInvokeEvent, rawRequest: unknown) => {
    const startTime = performance.now();
    try {
      // Get handler from map (might have been removed)
      const handlerEntry = handlers.get(fullChannel);
      if (!handlerEntry) {
        const message = `No handler registered for '${fullChannel}'`;
        log.error(message, { channel: fullChannel });
        return {
          ok: false,
          error: message,
        } as IPCResponse;
      }

      // Check rate limit
      const rateLimitCheck = checkRateLimit(event, channel);
      if (!rateLimitCheck.allowed) {
        log.warn('Rate limit exceeded', {
          channel: fullChannel,
          retryAfter: rateLimitCheck.retryAfter,
        });
        return {
          ok: false,
          error: `Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter}s`,
        } as IPCResponse;
      }

      // Validate request
      const parsed = handlerEntry.schema.safeParse(rawRequest);
      if (!parsed.success) {
        // Enhanced logging per blueprint
        log.error('Schema validation failed', {
          channel: fullChannel,
          errors: parsed.error.errors,
          issues: parsed.error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        });
        return {
          ok: false,
          error: `Invalid request: ${parsed.error.message}`,
        } as IPCResponse;
      }

      // Call handler
      const response = await handlerEntry.handler(event, parsed.data);

      // Record IPC latency
      const duration = performance.now() - startTime;
      try {
        const { recordMetric } = await import('../../../server/metrics.js');
        recordMetric('ipcLatency', duration);
      } catch {
        // Metrics module not available, continue
      }

      return {
        ok: true,
        data: response,
      } as IPCResponse;
    } catch (error) {
      const duration = performance.now() - startTime;
      // Record failed IPC latency
      try {
        const { recordMetric } = await import('../../../server/metrics.js');
        recordMetric('ipcLatency', duration);
      } catch {
        // Metrics module not available, continue
      }
      const message = error instanceof Error ? error.message : String(error);
      log.error('Handler error', {
        channel: fullChannel,
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        ok: false,
        error: message,
      } as IPCResponse;
    }
  };

  // Register the handler with Electron
  try {
    ipcMain.handle(fullChannel, handlerWrapper);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[IPC Router] Registered handler for ${fullChannel}`);
    }
  } catch (error) {
    console.error(`[IPC Router] Failed to register handler for ${fullChannel}:`, error);
    throw error;
  }
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

/**
 * Check if a handler is registered for a channel
 */
export function isHandlerRegistered(channel: IPCChannel): boolean {
  const fullChannel = `ob://ipc/v1/${channel}`;
  return handlers.has(fullChannel);
}
