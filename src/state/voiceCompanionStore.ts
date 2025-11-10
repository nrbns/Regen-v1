import { create } from 'zustand';
import { ipc } from '../lib/ipc-typed';

export type CompanionMood = 'calm' | 'positive' | 'concerned' | 'motivated';

export interface VoiceMessage {
  role: 'user' | 'companion';
  text: string;
  timestamp: number;
  mood?: CompanionMood;
}

interface VoiceCompanionState {
  open: boolean;
  listening: boolean;
  transcript: string;
  mood: CompanionMood;
  messages: VoiceMessage[];
  loadingReply: boolean;
  error: string | null;
  setOpen: (open: boolean) => void;
  setListening: (listening: boolean) => void;
  setTranscript: (text: string) => void;
  setMood: (mood: CompanionMood) => void;
  pushMessage: (message: VoiceMessage) => void;
  sendToCompanion: (text: string, mood: CompanionMood) => Promise<void>;
  clearConversation: () => void;
  setError: (error: string | null) => void;
}

export const useVoiceCompanionStore = create<VoiceCompanionState>((set, get) => ({
  open: false,
  listening: false,
  transcript: '',
  mood: 'calm',
  messages: [],
  loadingReply: false,
  error: null,
  setOpen(open) {
    set({ open });
  },
  setListening(listening) {
    set({ listening });
  },
  setTranscript(text) {
    set({ transcript: text });
  },
  setMood(mood) {
    set({ mood });
  },
  pushMessage(message) {
    set((state) => ({ messages: [...state.messages, message] }));
  },
  async sendToCompanion(text, mood) {
    if (!text.trim()) return;
    const timestamp = Date.now();
    const userMessage: VoiceMessage = {
      role: 'user',
      text,
      timestamp,
      mood,
    };
    set((state) => ({
      messages: [...state.messages, userMessage],
      loadingReply: true,
      error: null,
    }));

    try {
      const prompt = `You are Symbiotic, OmniBrowser's empathic voice companion. The user mood is ${mood}. Respond concisely (<=3 sentences) in a friendly tone, with optional short actionable tip.`;
      const response = await ipc.agent.ask(prompt, {
        text,
      });
      const reply: VoiceMessage = {
        role: 'companion',
        text: response?.answer ?? 'I hear you. Let me know how else I can help.',
        timestamp: Date.now(),
        mood,
      };
      set((state) => ({
        messages: [...state.messages, reply],
        loadingReply: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        loadingReply: false,
      });
    }
  },
  clearConversation() {
    set({ messages: [], transcript: '', mood: 'calm', error: null });
  },
  setError(error) {
    set({ error });
  },
}));
