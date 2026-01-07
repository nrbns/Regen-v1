/**
 * Audio Processing Service
 * Handles audio capture, streaming, and format conversion
 */

/**
 * Audio configuration
 */
export interface AudioConfig {
  sampleRate: number; // 16000 Hz recommended for speech
  channels: number; // 1 for mono, 2 for stereo
  bitDepth: number; // 16-bit
  format: 'wav' | 'mp3' | 'flac' | 'pcm';
}

/**
 * Audio chunk
 */
export interface AudioChunk {
  data: Uint8Array;
  timestamp: number;
  duration: number;
}

/**
 * Audio stream controller
 */
export class AudioProcessor {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private config: AudioConfig;

  constructor(config?: Partial<AudioConfig>) {
    this.config = {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      format: 'wav',
      ...config,
    };
  }

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getMimeType(),
      });

      console.log(
        `[AudioProcessor] Recording started (${this.config.format}@${this.config.sampleRate}Hz)`
      );
    } catch (error) {
      console.error('[AudioProcessor] Failed to start recording:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recording not started'));
        return;
      }

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        resolve(event.data);
      };

      this.mediaRecorder.onerror = (event: Event) => {
        reject(new Error(`Recording error: ${(event as any).error}`));
      };

      this.mediaRecorder.stop();

      // Stop all audio tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }

      if (this.audioContext) {
        this.audioContext.close();
      }

      console.log('[AudioProcessor] Recording stopped');
    });
  }

  /**
   * Get mime type for format
   */
  private getMimeType(): string {
    const mimeTypes: Record<string, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      flac: 'audio/flac',
      pcm: 'audio/pcm',
    };

    return mimeTypes[this.config.format] || 'audio/wav';
  }

  /**
   * Convert blob to base64
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:audio/wav;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get audio stats
   */
  getStats(): {
    isRecording: boolean;
    sampleRate: number;
    format: string;
  } {
    return {
      isRecording: this.mediaRecorder?.state === 'recording',
      sampleRate: this.config.sampleRate,
      format: this.config.format,
    };
  }
}

/**
 * Browser-based audio processor (Web Audio API)
 */
export class WebAudioProcessor extends AudioProcessor {
  /**
   * Real-time audio level monitoring
   */
  async getAudioLevel(): Promise<number> {
    if (!navigator.mediaDevices) {
      return 0;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      // Cleanup
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();

      return average / 255; // Normalize to 0-1
    } catch (error) {
      console.error('[WebAudioProcessor] Audio level check failed:', error);
      return 0;
    }
  }
}

export const audioProcessor = new AudioProcessor();
