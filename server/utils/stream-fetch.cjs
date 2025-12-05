/**
 * PERFORMANCE FIX #3: Streaming fetch with timeout and debounce
 * Replaces blocking fetch calls with streaming for Trade/Research data
 */

const { EventEmitter } = require('events');

/**
 * Stream fetch with AbortController and timeout
 */
async function streamFetch(url, options = {}) {
  const {
    signal: externalSignal,
    timeout = 5000,
    headers = {},
    method = 'GET',
    body = null,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine signals if external signal provided
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check if response is streamable
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamed = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        streamed += chunk;

        // Emit chunk for streaming handlers
        if (options.onChunk) {
          options.onChunk(chunk, streamed);
        }
      }

      return streamed;
    }

    // Fallback to regular text response
    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Debounced fetch for Trade/Research data
 * PERFORMANCE FIX #3: Prevents excessive API calls
 */
function createDebouncedFetch(debounceMs = 300) {
  const pending = new Map(); // url -> { timeout, resolve, reject }

  return async (url, options = {}) => {
    const key = `${url}:${JSON.stringify(options)}`;

    // Cancel pending request for same URL
    if (pending.has(key)) {
      const { timeout, reject } = pending.get(key);
      clearTimeout(timeout);
      reject(new Error('Request superseded'));
      pending.delete(key);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        pending.delete(key);
        try {
          const result = await streamFetch(url, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, debounceMs);

      pending.set(key, { timeout, resolve, reject });
    });
  };
}

module.exports = {
  streamFetch,
  createDebouncedFetch,
};




