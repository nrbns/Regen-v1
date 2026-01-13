/**
 * Voice Triggers for Realtime Actions
 * 
 * Integrates voice recognition with the event bus and command system
 * for realtime voice-activated actions.
 */

import { regenEventBus } from "../events/eventBus";
import { getRealtimeVoice, type SupportedLanguage } from "../../services/voice/realtimeVoice";

let isVoiceActive = false;
let currentVoiceService: ReturnType<typeof getRealtimeVoice> | null = null;

/**
 * Initialize voice triggers
 * Listens for voice commands and routes them through the event bus
 */
export function initVoiceTriggers(): () => void {
  console.log('[VoiceTriggers] Initializing voice trigger system...');

  // Voice will be activated via keyboard shortcut or UI
  // This just sets up the infrastructure

  return () => {
    if (currentVoiceService) {
      currentVoiceService.stop();
      currentVoiceService = null;
    }
    isVoiceActive = false;
    console.log('[VoiceTriggers] Voice trigger system cleaned up');
  };
}

/**
 * Start voice recognition for realtime actions
 */
export async function startVoiceRecognition(language: SupportedLanguage = 'en'): Promise<void> {
  if (isVoiceActive) {
    console.warn('[VoiceTriggers] Voice already active');
    return;
  }

  try {
    currentVoiceService = getRealtimeVoice({ language });
    
    currentVoiceService.setCallbacks({
      onTranscript: (transcript: string, isFinal: boolean) => {
        // Only process final transcripts (not interim results)
        if (isFinal && transcript.trim()) {
          // Emit command event via event bus
          regenEventBus.emit({
            type: 'COMMAND',
            payload: transcript,
          });

          console.log(`[VoiceTriggers] Voice command: "${transcript}"`);
        }
      },
      onStateChange: (state) => {
        isVoiceActive = state.isListening;
        
        // Emit voice state change event
        if (state.isListening) {
          regenEventBus.emit({
            type: 'AVATAR_INVOKE', // Trigger avatar to show listening state
          });
        }
      },
      onError: (error) => {
        console.error('[VoiceTriggers] Voice recognition error:', error);
        isVoiceActive = false;
      },
    });

    await currentVoiceService.start();
    isVoiceActive = true;
    console.log('[VoiceTriggers] Voice recognition started');
  } catch (error) {
    console.error('[VoiceTriggers] Failed to start voice recognition:', error);
    isVoiceActive = false;
    throw error;
  }
}

/**
 * Stop voice recognition
 */
export function stopVoiceRecognition(): void {
  if (currentVoiceService) {
    currentVoiceService.stop();
    isVoiceActive = false;
    console.log('[VoiceTriggers] Voice recognition stopped');
  }
}

/**
 * Toggle voice recognition
 */
export async function toggleVoiceRecognition(language: SupportedLanguage = 'en'): Promise<void> {
  if (isVoiceActive) {
    stopVoiceRecognition();
  } else {
    await startVoiceRecognition(language);
  }
}

/**
 * Check if voice is currently active
 */
export function isVoiceRecognitionActive(): boolean {
  return isVoiceActive;
}

/**
 * Check if voice recognition is available
 */
export function isVoiceRecognitionAvailable(): boolean {
  try {
    const voice = getRealtimeVoice();
    return voice.isAvailable();
  } catch {
    return false;
  }
}
