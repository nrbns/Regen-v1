/**
 * Realtime Voice Integration - Production-ready voice input with transcription
 *
 * Features:
 * - Live transcription preview
 * - Visual feedback (waveform, mic status)
 * - Multilingual support (Hindi/Indian languages priority)
 * - Seamless pipe to AI streaming
 * - Error handling and fallbacks
 */

interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  autoStart: boolean;
}

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  interimTranscript: string;
  confidence: number;
  error?: string;
  waveformData: number[];
}

interface VoiceCallbacks {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: VoiceState) => void;
  onWaveform?: (data: number[]) => void;
}

export class RealtimeVoice {
  private recognition: SpeechRecognition | null = null;
  private config: VoiceConfig;
  private state: VoiceState;
  private callbacks: VoiceCallbacks = {};
  private waveformInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;

  constructor(config: Partial<VoiceConfig> = {}) {
    this.config = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      autoStart: false,
      ...config,
    };

    this.state = {
      isListening: false,
      isProcessing: false,
      currentTranscript: '',
      interimTranscript: '',
      confidence: 0,
      waveformData: [],
    };

    this.initializeSpeechRecognition();
  }

  /**
   * Initialize Web Speech API with fallbacks
   */
  private initializeSpeechRecognition(): void {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.state.error = 'Speech recognition not supported in this browser';
      this.notifyStateChange();
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;

      // Set up event handlers
      this.recognition.onstart = () => {
        this.state.isListening = true;
        this.state.error = undefined;
        this.startWaveformCapture();
        this.notifyStateChange();
        console.log('[RealtimeVoice] Listening started');
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let highestConfidence = 0;

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0;

          if (result.isFinal) {
            finalTranscript += transcript;
            highestConfidence = Math.max(highestConfidence, confidence);
          } else {
            interimTranscript += transcript;
          }
        }

        // Update state
        if (finalTranscript) {
          this.state.currentTranscript += finalTranscript;
          this.state.confidence = highestConfidence;
          this.callbacks.onTranscript?.(finalTranscript, true);
        }

        if (interimTranscript) {
          this.state.interimTranscript = interimTranscript;
          this.callbacks.onTranscript?.(interimTranscript, false);
        }

        this.notifyStateChange();
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessage = this.getErrorMessage(event.error);
        this.state.error = errorMessage;
        this.state.isListening = false;
        this.stopWaveformCapture();
        this.callbacks.onError?.(errorMessage);
        this.notifyStateChange();
        console.error('[RealtimeVoice] Recognition error:', event.error, errorMessage);
      };

      this.recognition.onend = () => {
        this.state.isListening = false;
        this.stopWaveformCapture();
        this.notifyStateChange();
        console.log('[RealtimeVoice] Listening ended');

        // Auto-restart if continuous mode and no error
        if (this.config.continuous && !this.state.error) {
          setTimeout(() => {
            if (!this.state.isListening) {
              this.start();
            }
          }, 100);
        }
      };

    } catch (error) {
      this.state.error = 'Failed to initialize speech recognition';
      this.notifyStateChange();
      console.error('[RealtimeVoice] Initialization error:', error);
    }
  }

  /**
   * Start voice recognition
   */
  async start(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not initialized');
    }

    if (this.state.isListening) {
      console.warn('[RealtimeVoice] Already listening');
      return;
    }

    try {
      // Request microphone permission and initialize waveform capture
      await this.initializeMicrophone();

      this.recognition.start();
      this.state.isProcessing = true;
      this.notifyStateChange();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start voice recognition';
      this.state.error = errorMessage;
      this.callbacks.onError?.(errorMessage);
      this.notifyStateChange();
      throw error;
    }
  }

  /**
   * Stop voice recognition
   */
  stop(): void {
    if (this.recognition && this.state.isListening) {
      this.recognition.stop();
    }
    this.stopWaveformCapture();
    this.cleanupMicrophone();
  }

  /**
   * Get final transcript and clear state
   */
  getTranscript(): string {
    const fullTranscript = this.state.currentTranscript + this.state.interimTranscript;
    this.clearTranscript();
    return fullTranscript;
  }

  /**
   * Clear current transcript
   */
  clearTranscript(): void {
    this.state.currentTranscript = '';
    this.state.interimTranscript = '';
    this.state.confidence = 0;
    this.notifyStateChange();
  }

  /**
   * Set language for recognition
   */
  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: VoiceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get current voice state
   */
  getState(): VoiceState {
    return { ...this.state };
  }

  /**
   * Check if voice recognition is available
   */
  isAvailable(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Initialize microphone for waveform visualization
   */
  private async initializeMicrophone(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);

      this.analyser.fftSize = 256;
      this.microphone.connect(this.analyser);

    } catch (error) {
      console.warn('[RealtimeVoice] Microphone access failed, waveform disabled:', error);
      // Waveform is optional, don't throw error
    }
  }

  /**
   * Start capturing waveform data
   */
  private startWaveformCapture(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    this.waveformInterval = setInterval(() => {
      if (!this.analyser || !this.state.isListening) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average amplitude for simple waveform
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Create waveform data (simplified)
      const waveformData = Array.from({ length: 32 }, (_, i) => {
        const baseValue = average / 255;
        const noise = (Math.random() - 0.5) * 0.2;
        return Math.max(0, Math.min(1, baseValue + noise));
      });

      this.state.waveformData = waveformData;
      this.callbacks.onWaveform?.(waveformData);
    }, 100); // 10 FPS
  }

  /**
   * Stop waveform capture
   */
  private stopWaveformCapture(): void {
    if (this.waveformInterval) {
      clearInterval(this.waveformInterval);
      this.waveformInterval = null;
    }
    this.state.waveformData = [];
  }

  /**
   * Clean up microphone resources
   */
  private cleanupMicrophone(): void {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Convert error codes to user-friendly messages
   */
  private getErrorMessage(error: string): string {
    switch (error) {
      case 'no-speech':
        return 'No speech detected. Try speaking louder or closer to the microphone.';
      case 'audio-capture':
        return 'Microphone access denied. Please allow microphone permissions.';
      case 'not-allowed':
        return 'Microphone permission denied. Please enable microphone access in browser settings.';
      case 'network':
        return 'Network error occurred. Please check your internet connection.';
      case 'service-not-allowed':
        return 'Speech recognition service unavailable. Try again later.';
      case 'language-not-supported':
        return `Language '${this.config.language}' not supported.`;
      case 'aborted':
        return 'Speech recognition was aborted.';
      default:
        return `Speech recognition error: ${error}`;
    }
  }

  /**
   * Notify state change to callbacks
   */
  private notifyStateChange(): void {
    this.callbacks.onStateChange?.({ ...this.state });
  }
}

// Multilingual support - prioritized for Indian languages
export const VOICE_LANGUAGES = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'hi-IN': 'हिंदी (India)', // Hindi
  'bn-IN': 'বাংলা (India)', // Bengali
  'te-IN': 'తెలుగు (India)', // Telugu
  'mr-IN': 'मराठी (India)', // Marathi
  'ta-IN': 'தமிழ் (India)', // Tamil
  'ur-IN': 'اردو (India)', // Urdu
  'gu-IN': 'ગુજરાતી (India)', // Gujarati
  'kn-IN': 'ಕನ್ನಡ (India)', // Kannada
  'ml-IN': 'മലയാളം (India)', // Malayalam
  'pa-IN': 'ਪੰਜਾਬੀ (India)', // Punjabi
  'or-IN': 'ଓଡ଼ିଆ (India)', // Odia
} as const;

export type SupportedLanguage = keyof typeof VOICE_LANGUAGES;

// Singleton instance
let realtimeVoice: RealtimeVoice | null = null;

export function getRealtimeVoice(config?: Partial<VoiceConfig>): RealtimeVoice {
  if (!realtimeVoice) {
    realtimeVoice = new RealtimeVoice(config);
  }
  return realtimeVoice;
}

export function disposeRealtimeVoice(): void {
  if (realtimeVoice) {
    realtimeVoice.stop();
    realtimeVoice = null;
  }
}
