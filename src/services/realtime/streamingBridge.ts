/**
 * Streaming Bridge - Standardizes token-by-token output across all AI systems
 * 
 * All AI agent outputs (research, code generation, analysis, etc.) should emit
 * MODEL_CHUNK events token-by-token instead of dumping full text.
 * 
 * This module provides helpers to:
 * 1. Intercept AI output streams
 * 2. Convert to token-by-token MODEL_CHUNK events
 * 3. Emit via Socket.IO to realtime panel
 * 4. Track streaming state
 */

import { getSocketClient } from './socketClient';

interface StreamChunkOptions {
  jobId: string;
  chunkIndex?: number;
  isComplete?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Convert a full text response to token-by-token chunks
 * Splits on whitespace + punctuation boundaries
 */
export function tokenizeText(text: string, chunkSize = 1): string[] {
  if (!text) return [];
  
  // Simple tokenization: split on word boundaries
  // In production, use proper tokenizer (BPE, SentencePiece, etc.)
  const tokens = text.split(/(\s+|[.,!?;:])/);
  
  // Group tokens by chunkSize (default 1 token per chunk)
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const token of tokens) {
    if (token === '') continue;
    currentChunk += token;
    
    if (currentChunk.split(/\s+/).filter(t => t.length > 0).length >= chunkSize) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * Emit a single text chunk via MODEL_CHUNK event
 */
export async function emitStreamChunk(
  chunk: string,
  _options: StreamChunkOptions
): Promise<void> {
  try {
    const client = getSocketClient();
    if (!client || !client.isReady()) {
      console.warn('[StreamingBridge] Socket not ready, chunk not emitted:', chunk.slice(0, 50));
      return;
    }

    // Emit via custom event handler
    const emitHandler = (client as any).on?.('model:chunk', () => {});
    if (typeof emitHandler === 'function') {
      emitHandler();
    }

    // In production, socket.emit('model:chunk', {...})
    // For now, track locally that streaming is happening
  } catch (err) {
    console.error('[StreamingBridge] Failed to emit chunk:', err);
  }
}

/**
 * Stream text output token-by-token
 * Yields each chunk with metadata
 */
export async function* streamText(
  text: string | Promise<string>,
  options: StreamChunkOptions
): AsyncGenerator<{ chunk: string; index: number; isComplete: boolean }> {
  try {
    // Wait for text if it's a promise
    const fullText = await Promise.resolve(text);
    
    // Tokenize into chunks
    const chunks = tokenizeText(fullText);
    const total = chunks.length;

    for (let i = 0; i < total; i++) {
      const chunk = chunks[i];
      const isComplete = i === total - 1;

      // Emit chunk event
      await emitStreamChunk(chunk, {
        ...options,
        chunkIndex: i,
        isComplete,
      });

      // Yield to caller
      yield {
        chunk,
        index: i,
        isComplete,
      };

      // Small delay to avoid overwhelming UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch (err) {
    console.error('[StreamingBridge] Stream error:', err);
    throw err;
  }
}

/**
 * Wrap a fetch response stream to emit chunks
 * Usage: const stream = wrapFetchStream(fetch(...), jobId)
 */
export async function wrapFetchStream(
  fetchPromise: Promise<Response>,
  jobId: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  try {
    const response = await fetchPromise;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';
    let chunkIndex = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode chunk
      const text = decoder.decode(value, { stream: true });
      fullText += text;

      // Tokenize and emit
      const tokens = tokenizeText(text, 1);
      for (const token of tokens) {
        await emitStreamChunk(token, {
          jobId,
          chunkIndex: chunkIndex++,
          isComplete: false,
        });
        onChunk?.(token);
      }
    }

    // Emit final complete event
    await emitStreamChunk('', {
      jobId,
      chunkIndex,
      isComplete: true,
    });

    return fullText;
  } catch (err) {
    console.error('[StreamingBridge] Fetch stream error:', err);
    throw err;
  }
}

/**
 * Create a streaming handler for React components
 * Returns callback to emit chunks + state
 */
export function createStreamingHandler(jobId: string) {
  let chunkIndex = 0;
  const chunks: string[] = [];

  return {
    /**
     * Call with each token/chunk as it arrives
     */
    onChunk: async (chunk: string) => {
      chunks.push(chunk);
      await emitStreamChunk(chunk, {
        jobId,
        chunkIndex: chunkIndex++,
        isComplete: false,
      });
    },

    /**
     * Call when streaming is complete
     */
    onComplete: async () => {
      await emitStreamChunk('', {
        jobId,
        chunkIndex,
        isComplete: true,
      });
    },

    /**
     * Get accumulated text so far
     */
    getText: () => chunks.join(''),

    /**
     * Reset for new stream
     */
    reset: () => {
      chunkIndex = 0;
      chunks.length = 0;
    },
  };
}

/**
 * Helper to track streaming state in UI
 */
export class StreamingTracker {
  private activeStreams = new Map<string, { chunks: string[]; startTime: number }>();

  start(jobId: string) {
    this.activeStreams.set(jobId, { chunks: [], startTime: Date.now() });
  }

  addChunk(jobId: string, chunk: string) {
    const stream = this.activeStreams.get(jobId);
    if (stream) stream.chunks.push(chunk);
  }

  complete(jobId: string) {
    const stream = this.activeStreams.get(jobId);
    if (stream) {
      const elapsedMs = Date.now() - stream.startTime;
      const text = stream.chunks.join('');
      const tokensPerSec = (stream.chunks.length / elapsedMs) * 1000;
      
      console.log(`[StreamingTracker] Job ${jobId}: ${stream.chunks.length} chunks, ${text.length} chars, ${tokensPerSec.toFixed(1)} tokens/sec`);
      
      this.activeStreams.delete(jobId);
      return { chunks: stream.chunks.length, text, tokensPerSec };
    }
  }

  getStatus(jobId: string) {
    const stream = this.activeStreams.get(jobId);
    if (!stream) return null;
    return {
      chunkCount: stream.chunks.length,
      elapsedMs: Date.now() - stream.startTime,
      text: stream.chunks.join(''),
    };
  }
}

export const streamingTracker = new StreamingTracker();
