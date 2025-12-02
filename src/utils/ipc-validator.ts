/**
 * IPC Message Validator
 * DAY 8 FIX: Validates and sanitizes all IPC messages for security
 */

// Note: zod schemas removed as they were unused

/**
 * Validate IPC command name
 */
export function validateCommandName(command: string): boolean {
  // Only allow alphanumeric, colon, underscore, dash
  const commandPattern = /^[a-zA-Z0-9:_-]+$/;
  if (!commandPattern.test(command)) {
    console.error(`[IPC Validator] Invalid command name: ${command}`);
    return false;
  }

  // Block dangerous commands (exact match, starts with, or contains as a word)
  const dangerousCommands = ['eval', 'exec', 'shell', 'spawn', 'child_process'];
  const commandLower = command.toLowerCase();
  if (
    dangerousCommands.some(dangerous => {
      // Block exact matches
      if (commandLower === dangerous) return true;
      // Block commands that start with dangerous word followed by : or _
      if (commandLower.startsWith(dangerous + ':') || commandLower.startsWith(dangerous + '_'))
        return true;
      // Block commands that contain dangerous word as a separate word (e.g., "research_eval", "test_eval")
      const wordBoundaryRegex = new RegExp(`[:_-]${dangerous}(?:[:_-]|$)|^${dangerous}[:_-]`);
      if (wordBoundaryRegex.test(commandLower)) return true;
      return false;
    })
  ) {
    console.error(`[IPC Validator] Blocked dangerous command: ${command}`);
    return false;
  }

  // Block standalone "system" but allow "system:" prefixed commands
  if (commandLower === 'system') {
    console.error(`[IPC Validator] Blocked dangerous command: ${command}`);
    return false;
  }

  return true;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }

  const sanitized = sanitizeString(input);

  // Validate URL format
  try {
    const url = new URL(sanitized);
    // Only allow http, https, and regen protocols
    if (!['http:', 'https:', 'regen:'].includes(url.protocol)) {
      return null;
    }
    return sanitized;
  } catch {
    // Not a valid URL
    return null;
  }
}

/**
 * Validate IPC request payload
 */
export function validateIpcRequest(
  command: string,
  payload: unknown
): {
  valid: boolean;
  sanitized?: unknown;
  error?: string;
} {
  // Validate command name
  if (!validateCommandName(command)) {
    return {
      valid: false,
      error: 'Invalid command name',
    };
  }

  // Basic payload validation
  if (payload === null || payload === undefined) {
    return { valid: true, sanitized: payload };
  }

  // If payload is an object, sanitize string values
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      // Sanitize key
      const safeKey = sanitizeString(key);
      if (!safeKey) continue;

      // Sanitize value based on type
      if (typeof value === 'string') {
        // Special handling for URL fields
        if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
          sanitized[safeKey] = sanitizeUrl(value);
        } else {
          sanitized[safeKey] = sanitizeString(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        const nestedResult = validateIpcRequest(`${command}:${key}`, value);
        if (nestedResult.valid && nestedResult.sanitized) {
          sanitized[safeKey] = nestedResult.sanitized;
        }
      } else {
        sanitized[safeKey] = value;
      }
    }
    return { valid: true, sanitized };
  }

  // If payload is a string, sanitize it
  if (typeof payload === 'string') {
    return { valid: true, sanitized: sanitizeString(payload) };
  }

  // Other types (number, boolean, etc.) are safe
  return { valid: true, sanitized: payload };
}

/**
 * Safe IPC invoke wrapper
 */
export async function safeIpcInvoke<T = unknown>(command: string, payload?: unknown): Promise<T> {
  // Validate before invoking
  const validation = validateIpcRequest(command, payload);

  if (!validation.valid) {
    throw new Error(`IPC validation failed: ${validation.error}`);
  }

  // Use sanitized payload if available
  const safePayload = validation.sanitized ?? payload;

  // Import IPC dynamically to avoid circular dependencies
  const { ipc } = await import('../lib/ipc-typed');

  // Invoke with validated payload using the typed IPC client
  // Using 'as any' because invoke is available but not in the type definition
  return (ipc as any).invoke(command, safePayload) as Promise<T>;
}
