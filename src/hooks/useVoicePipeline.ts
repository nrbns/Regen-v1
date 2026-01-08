/**
 * Voice Pipeline Hook
 * Phase 2, Day 4: Hindi + English Full Voice Pipeline
 * React hook for easy voice pipeline integration
 */

import { useEffect, useState, useCallback } from 'react';
import { getVoicePipeline, type VoiceLanguage } from '../services/voice/voicePipeline';
import { useSettingsStore } from '../state/settingsStore';
import { detectLanguage } from '../services/languageDetection';

export interface UseVoicePipelineOptions {
  autoDetectLanguage?: boolean;
  enableTTS?: boolean;
  onLanguageDetected?: (language: string, confidence: number) => void;
}

export interface UseVoicePipelineReturn {
  isListening: boolean;
  isSpeaking: boolean;
  isAvailable: boolean;
  detectedLanguage: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string, language?: string) => Promise<void>;
  speakResponse: (text: string, detectedLang?: string) => Promise<void>;
}

/**
 * Phase 2, Day 4: React hook for voice pipeline
 */
export function useVoicePipeline(
  onResult: (text: string, language: string) => void,
  options: UseVoicePipelineOptions = {}
): UseVoicePipelineReturn {
  const { autoDetectLanguage = true, enableTTS = true, onLanguageDetected } = options;
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('en');
  const voicePipeline = getVoicePipeline();
  const language = useSettingsStore(state => state.language || 'auto');

  // Phase 2, Day 4: Check availability
  useEffect(() => {
    setIsAvailable(voicePipeline.isRecognitionAvailable());
  }, []);

  // Phase 2, Day 4: Monitor speaking state
  useEffect(() => {
    const checkSpeaking = () => {
      setIsSpeaking(voicePipeline.getIsSpeaking());
    };
    const interval = setInterval(checkSpeaking, 100);
    return () => clearInterval(interval);
  }, []);

  // Phase 2, Day 4: Start listening
  const startListening = useCallback(async () => {
    if (!isAvailable) {
      console.warn('[useVoicePipeline] Recognition not available');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    try {
      const targetLanguage: VoiceLanguage =
        language === 'hi' ? 'hi' : language === 'auto' ? 'auto' : 'en';

      await voicePipeline.startRecognition({
        language: targetLanguage,
        continuous: false,
        interimResults: false,
        onStart: () => {
          setIsListening(true);
        },
        onResult: async (text, confidence, detectedLang) => {
          setIsListening(false);
          setDetectedLanguage(detectedLang);

          if (onLanguageDetected) {
            onLanguageDetected(detectedLang, confidence);
          }

          onResult(text, detectedLang);
        },
        onError: error => {
          setIsListening(false);
          console.error('[useVoicePipeline] Recognition error:', error);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
    } catch (error) {
      console.error('[useVoicePipeline] Failed to start recognition:', error);
      setIsListening(false);
    }
  }, [isAvailable, isListening, language, onResult, onLanguageDetected]);

  // Phase 2, Day 4: Stop listening
  const stopListening = useCallback(() => {
    voicePipeline.stopRecognition();
    setIsListening(false);
  }, []);

  // Phase 2, Day 4: Speak text
  const speak = useCallback(
    async (text: string, lang?: string) => {
      if (!enableTTS || !voicePipeline.isSynthesisAvailable()) return;

      try {
        const targetLang = lang || detectedLanguage;
        await voicePipeline.speak(text, {
          language: targetLang === 'hi' ? 'hi' : 'en',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
        });
      } catch (error) {
        console.error('[useVoicePipeline] Failed to speak:', error);
      }
    },
    [enableTTS, detectedLanguage]
  );

  // Phase 2, Day 4: Speak response with auto-detection
  const speakResponse = useCallback(
    async (text: string, detectedLang?: string) => {
      if (!enableTTS || !voicePipeline.isSynthesisAvailable()) return;

      try {
        let targetLang = detectedLang || detectedLanguage;

        // Auto-detect if not provided
        if (autoDetectLanguage && !detectedLang) {
          const detection = await detectLanguage(text, { preferIndic: true });
          targetLang = detection.language;
        }

        await voicePipeline.speakResponse(text, targetLang === 'hi' ? 'hi' : 'en', {
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
        });
      } catch (error) {
        console.error('[useVoicePipeline] Failed to speak response:', error);
      }
    },
    [enableTTS, autoDetectLanguage, detectedLanguage]
  );

  return {
    isListening,
    isSpeaking,
    isAvailable,
    detectedLanguage,
    startListening,
    stopListening,
    speak,
    speakResponse,
  };
}
