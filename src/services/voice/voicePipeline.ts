/**
 * Full Voice Pipeline Service
 * Phase 2, Day 4: Hindi + English Full Voice Pipeline
 * Complete multi-language voice recognition and synthesis
 */

import { useSettingsStore } from '../../state/settingsStore';
import { detectLanguage } from '../languageDetection';
import { toast } from '../../utils/toast';
import { debounce } from 'lodash-es';
import { getSarvamService } from '../sarvamIntegration';

export type VoiceLanguage = 'hi' | 'en' | 'auto';

export interface VoiceRecognitionOptions {
  language?: VoiceLanguage;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onResult?: (text: string, confidence: number, language: string) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface VoiceSynthesisOptions {
  language?: VoiceLanguage;
  rate?: number; // 0.1 to 10
  pitch?: number; // 0 to 2
  volume?: number; // 0 to 1
  voice?: SpeechSynthesisVoice | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

/**
 * Phase 2, Day 4: Full Voice Pipeline Service
 */
class VoicePipelineService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isListening = false;
  private isSpeaking = false;
  private debouncedResultHandler:
    | ((text: string, confidence: number, language: string) => void)
    | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private usingSarvamFallback = false;

  // Language locale mapping for speech recognition
  private readonly RECOGNITION_LOCALES: Record<string, string> = {
    hi: 'hi-IN',
    en: 'en-US',
    'hi-IN': 'hi-IN',
    'en-US': 'en-US',
    'en-IN': 'en-IN', // Indian English
  };

  // Language locale mapping for speech synthesis
  private readonly SYNTHESIS_LOCALES: Record<string, string> = {
    hi: 'hi-IN',
    en: 'en-US',
    'hi-IN': 'hi-IN',
    'en-US': 'en-US',
    'en-IN': 'en-IN',
  };

  constructor() {
    this.initializeRecognition();
    this.initializeSynthesis();
  }

  /**
   * Phase 2, Day 4: Initialize speech recognition
   */
  private initializeRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[VoicePipeline] Speech Recognition not available');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
    } catch (error) {
      console.error('[VoicePipeline] Failed to initialize recognition:', error);
    }
  }

  /**
   * Phase 2, Day 4: Initialize speech synthesis
   */
  private initializeSynthesis(): void {
    if (typeof window === 'undefined') return;

    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('[VoicePipeline] Speech Synthesis not available');
    }
  }

  /**
   * Phase 2, Day 4: Get available voices for a language
   */
  getAvailableVoices(language: VoiceLanguage = 'auto'): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];

    const allVoices = this.synthesis.getVoices();
    const targetLocale =
      language === 'auto'
        ? this.SYNTHESIS_LOCALES[useSettingsStore.getState().language || 'en'] || 'en-US'
        : this.SYNTHESIS_LOCALES[language] || 'en-US';

    // Filter voices by language
    const filtered = allVoices.filter(voice => {
      const voiceLang = voice.lang.toLowerCase();
      const targetLang = targetLocale.toLowerCase();

      // Match exact locale or language code
      return (
        voiceLang === targetLang ||
        voiceLang.startsWith(targetLang.split('-')[0] + '-') ||
        (language === 'hi' && voiceLang.includes('hi')) ||
        (language === 'en' && voiceLang.includes('en'))
      );
    });

    // If no voices found, return all voices as fallback
    return filtered.length > 0 ? filtered : allVoices;
  }

  /**
   * Phase 2, Day 4: Get best voice for a language
   */
  getBestVoice(language: VoiceLanguage = 'auto'): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices(language);
    if (voices.length === 0) return null;

    // Prefer native voices, then local variants
    const targetLocale =
      language === 'auto'
        ? this.SYNTHESIS_LOCALES[useSettingsStore.getState().language || 'en'] || 'en-US'
        : this.SYNTHESIS_LOCALES[language] || 'en-US';

    // Try to find exact match first
    const exactMatch = voices.find(v => v.lang.toLowerCase() === targetLocale.toLowerCase());
    if (exactMatch) return exactMatch;

    // Try to find language match
    const langCode = targetLocale.split('-')[0];
    const langMatch = voices.find(v => v.lang.toLowerCase().startsWith(langCode + '-'));
    if (langMatch) return langMatch;

    // Return first available voice
    return voices[0];
  }

  /**
   * Phase 2, Day 4: Start voice recognition
   */
  async startRecognition(options: VoiceRecognitionOptions = {}): Promise<void> {
    // LAG FIX: Try Sarvam for Hindi if browser recognition fails/weak
    const settingsLanguage = useSettingsStore.getState().language || 'en';
    const isHindi = settingsLanguage === 'hi' || options.language === 'hi';

    // For Hindi, setup Sarvam fallback with MediaRecorder
    if (isHindi && 'MediaRecorder' in window) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });

          // LAG FIX: Try Sarvam if browser recognition confidence is low
          if (this.usingSarvamFallback) {
            try {
              const sarvam = getSarvamService();
              const result = await sarvam.transcribeHindi(audioBlob);
              if (result.confidence > 0.5) {
                if (this.debouncedResultHandler) {
                  this.debouncedResultHandler(result.text, result.confidence, 'hi');
                } else {
                  options.onResult?.(result.text, result.confidence, 'hi');
                }
                console.log('[VoicePipeline] Sarvam fallback succeeded');
              }
            } catch (error) {
              console.warn('[VoicePipeline] Sarvam fallback failed:', error);
            }
          }

          this.audioChunks = [];
        };

        this.mediaRecorder.start();
      } catch (error) {
        console.warn('[VoicePipeline] MediaRecorder setup failed:', error);
      }
    }

    // LAG FIX: Debounce result handler to prevent 1s agent queue lag
    if (options.onResult && !this.debouncedResultHandler) {
      this.debouncedResultHandler = debounce(options.onResult, 300, {
        leading: false,
        trailing: true,
      });
    }

    if (!this.recognition) {
      const error = 'Speech recognition not available';
      options.onError?.(error);
      toast.error(error);
      return;
    }

    if (this.isListening) {
      this.stopRecognition();
      return;
    }

    try {
      // Determine language
      let targetLanguage = options.language || 'auto';
      if (targetLanguage === 'auto') {
        const settingsLanguage = useSettingsStore.getState().language || 'en';
        targetLanguage = settingsLanguage === 'hi' ? 'hi' : 'en';
      }

      // Phase 2, Day 4: Support dual-language recognition (Hindi + English)
      // Chrome/Edge support multiple languages separated by comma
      const _locale = this.RECOGNITION_LOCALES[targetLanguage] || 'en-US';
      const dualLocale = targetLanguage === 'hi' ? 'hi-IN,en-US' : 'en-US,hi-IN'; // Support both

      this.recognition.lang = dualLocale;
      this.recognition.continuous = options.continuous ?? false;
      this.recognition.interimResults = options.interimResults ?? false;
      this.recognition.maxAlternatives = options.maxAlternatives ?? 1;

      // Set up event handlers
      this.recognition.onstart = () => {
        this.isListening = true;
        options.onStart?.();
      };

      this.recognition.onresult = async (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        // Detect language from transcript
        const detectionResult = await detectLanguage(transcript);
        const detectedLang =
          typeof detectionResult === 'string' ? detectionResult : detectionResult?.language || 'en';

        // LAG FIX: Use debounced handler to batch rapid voice inputs
        if (this.debouncedResultHandler) {
          this.debouncedResultHandler(transcript, confidence, detectedLang);
        } else {
          options.onResult?.(transcript, confidence, detectedLang);

          // LAG FIX: If Hindi and low confidence, trigger Sarvam fallback
          if (detectedLang === 'hi' && confidence < 0.7 && this.mediaRecorder) {
            console.log('[VoicePipeline] Low confidence, will try Sarvam fallback');
            this.usingSarvamFallback = true;
          }
        }
        try {
          const results = Array.isArray(event.results) ? Array.from(event.results) : [];
          const transcripts = results
            .map((res: any) => res?.[0]?.transcript)
            .filter((t: any) => t && typeof t === 'string');

          const text = transcripts.join(' ').trim();
          if (!text) return;

          // Phase 2, Day 4: Detect language of recognized text
          const detection = await detectLanguage(text, { preferIndic: true });
          // SECURITY: Fix type safety for results array access
          const firstResult = results[0] as any;
          const confidence = firstResult?.[0]?.confidence ?? 0.8;

          const normalizedLanguage =
            typeof detection === 'string' ? detection : detection?.language || 'en';

          options.onResult?.(text, confidence, normalizedLanguage);
        } catch (error) {
          console.error('[VoicePipeline] Error processing recognition result:', error);
          options.onError?.('Failed to process speech recognition result');
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        const error = event.error || 'Unknown error';
        console.error('[VoicePipeline] Recognition error:', error);
        options.onError?.(error);

        if (error === 'not-allowed') {
          toast.error('Microphone permission denied. Please enable it in your browser settings.');
        } else if (error === 'no-speech') {
          toast.error('No speech detected. Please try again.');
        } else {
          toast.error(`Speech recognition error: ${error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        options.onEnd?.();
      };

      // Start recognition
      this.recognition.start();
    } catch (error: any) {
      console.error('[VoicePipeline] Failed to start recognition:', error);
      this.isListening = false;
      options.onError?.(error.message || 'Failed to start voice recognition');
      toast.error('Failed to start voice recognition');
    }
  }

  /**
   * Phase 2, Day 4: Stop voice recognition
   */
  stopRecognition(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();

        // Stop MediaRecorder for Sarvam fallback
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        this.usingSarvamFallback = false;
      } catch (error) {
        console.error('[VoicePipeline] Error stopping recognition:', error);
      }
      this.isListening = false;
    }
  }

  /**
   * Phase 2, Day 4: Speak text with language detection
   */
  async speak(text: string, options: VoiceSynthesisOptions = {}): Promise<void> {
    if (!this.synthesis) {
      const error = 'Speech synthesis not available';
      options.onError?.(error);
      console.warn('[VoicePipeline]', error);
      return;
    }

    // Stop any current speech
    this.stopSpeaking();

    try {
      // Phase 2, Day 4: Auto-detect language if not specified
      let targetLanguage = options.language || 'auto';
      if (targetLanguage === 'auto') {
        const detection = await detectLanguage(text, { preferIndic: true });
        targetLanguage = detection.language === 'hi' ? 'hi' : 'en';
      }

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      const locale = this.SYNTHESIS_LOCALES[targetLanguage] || 'en-US';
      utterance.lang = locale;

      // Set voice
      if (options.voice) {
        utterance.voice = options.voice;
      } else {
        const bestVoice = this.getBestVoice(targetLanguage);
        if (bestVoice) {
          utterance.voice = bestVoice;
        }
      }

      // Set properties
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;

      // Set up event handlers
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.currentUtterance = utterance;
        options.onStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        options.onEnd?.();
      };

      utterance.onerror = (event: any) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        const error = event.error || 'Unknown error';
        console.error('[VoicePipeline] Synthesis error:', error);
        options.onError?.(error);
      };

      // Speak
      this.synthesis.speak(utterance);
    } catch (error: any) {
      console.error('[VoicePipeline] Failed to speak:', error);
      this.isSpeaking = false;
      options.onError?.(error.message || 'Failed to speak text');
    }
  }

  /**
   * Phase 2, Day 4: Stop speaking
   */
  stopSpeaking(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  /**
   * Phase 2, Day 4: Check if recognition is available
   */
  isRecognitionAvailable(): boolean {
    return this.recognition !== null;
  }

  /**
   * Phase 2, Day 4: Check if synthesis is available
   */
  isSynthesisAvailable(): boolean {
    return this.synthesis !== null;
  }

  /**
   * Phase 2, Day 4: Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Phase 2, Day 4: Check if currently speaking
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Phase 2, Day 4: Speak response in detected language
   */
  async speakResponse(
    text: string,
    detectedLanguage?: string,
    options?: Omit<VoiceSynthesisOptions, 'language'>
  ): Promise<void> {
    const language = detectedLanguage === 'hi' ? 'hi' : 'en';
    await this.speak(text, { ...options, language });
  }
}

// Singleton instance
let instance: VoicePipelineService | null = null;

export function getVoicePipeline(): VoicePipelineService {
  if (!instance) {
    instance = new VoicePipelineService();
  }
  return instance;
}
