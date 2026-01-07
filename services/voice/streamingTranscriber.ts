/**
 * Real-time Speech-to-Text Streaming
 * Streams audio chunks and returns partial transcriptions
 */

import { WhisperService, type TranscriptionChunk } from './whisperService';
import { audioProcessor } from './audioProcessor';

/**
 * Streaming transcriber options
 */
export interface StreamingTranscriberOptions {
  chunkDurationMs: number; // Send audio every N ms
  language?: string;
  includePartial: boolean; // Emit partial results
  onChunk: (chunk: TranscriptionChunk) => void;
  onError: (error: Error) => void;
}

/**
 * Real-time streaming transcriber
 */
export class StreamingTranscriber {
  private whisper: WhisperService;
  private options: StreamingTranscriberOptions;
  private isRecording: boolean = false;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private chunkInterval: NodeJS.Timeout | null = null;

  constructor(options: StreamingTranscriberOptions) {
    this.whisper = new WhisperService();
    this.options = options;
  }

  /**
   * Start streaming transcription
   */
  async start(): Promise<void> {
    try {
      await audioProcessor.startRecording();
      this.isRecording = true;
      this.startTime = Date.now();
      this.audioChunks = [];

      // Setup periodic transcription
      this.chunkInterval = setInterval(() => {
        this.processAudioChunk();
      }, this.options.chunkDurationMs);

      console.log('[StreamingTranscriber] Started streaming transcription');
    } catch (error) {
      this.options.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop streaming transcription
   */
  async stop(): Promise<string> {
    if (!this.isRecording) {
      return '';
    }

    this.isRecording = false;

    // Clear interval
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
    }

    // Get final audio blob
    const finalBlob = await audioProcessor.stopRecording();

    // Transcribe full audio
    try {
      const result = await this.whisper.transcribe(finalBlob, this.options.language);

      this.options.onChunk({
        partial: result.text,
        isFinal: true,
        timestamp: Date.now() - this.startTime,
      });

      console.log('[StreamingTranscriber] Transcription complete');
      return result.text;
    } catch (error) {
      this.options.onError(error instanceof Error ? error : new Error(String(error)));
      return '';
    }
  }

  /**
   * Process audio chunk (internal)
   */
  private async processAudioChunk(): Promise<void> {
    // In production with real Whisper streaming API:
    // 1. Collect audio chunks
    // 2. Send to streaming endpoint
    // 3. Receive partial transcriptions
    // 4. Emit partial results

    // For now: emit mock partial transcription
    if (this.options.includePartial && this.audioChunks.length > 0) {
      const elapsed = Date.now() - this.startTime;

      // Mock partial transcription
      const partial = this.generatePartialTranscription(elapsed);

      this.options.onChunk({
        partial,
        isFinal: false,
        timestamp: elapsed,
      });
    }
  }

  /**
   * Generate mock partial transcription
   */
  private generatePartialTranscription(elapsed: number): string {
    const phrases = [
      'Summarize',
      'Summarize my',
      'Summarize my emails',
      'Summarize my emails and',
      'Summarize my emails and send',
      'Summarize my emails and send me a',
      'Summarize my emails and send me a report',
    ];

    const index = Math.min(Math.floor(elapsed / 500), phrases.length - 1);
    return phrases[index];
  }

  /**
   * Get recording status
   */
  getStatus(): {
    isRecording: boolean;
    elapsedMs: number;
    audioChunks: number;
  } {
    return {
      isRecording: this.isRecording,
      elapsedMs: this.isRecording ? Date.now() - this.startTime : 0,
      audioChunks: this.audioChunks.length,
    };
  }
}

/**
 * Web Socket-based streaming transcriber (for server-side processing)
 */
export class WebSocketTranscriber {
  private ws: WebSocket | null = null;
  private url: string;
  private isConnected: boolean = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to streaming service
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log('[WebSocketTranscriber] Connected');
          resolve();
        };

        this.ws.onerror = error => {
          reject(new Error(`WebSocket error: ${String(error)}`));
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('[WebSocketTranscriber] Disconnected');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send audio chunk
   */
  sendAudioChunk(chunk: Uint8Array): void {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(chunk);
  }

  /**
   * Set message handler
   */
  onMessage(handler: (data: TranscriptionChunk) => void): void {
    if (this.ws) {
      this.ws.onmessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data) as TranscriptionChunk;
        handler(data);
      };
    }
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export type { TranscriptionChunk };
