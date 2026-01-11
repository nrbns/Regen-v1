/**
 * Settings Store - Global application settings
 * PERFORMANCE: Includes AI silence toggle for performance control
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Existing settings
  theme: 'dark' | 'light' | 'system';
  
  // PERFORMANCE: AI Silence Control
  aiSilenced: boolean;
  aiSilencedUntil?: number; // Timestamp when silence expires (optional)
  aiSilenceReason?: string; // Why AI was silenced (for analytics)
  
  // Actions
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  
  // PERFORMANCE: AI Silence Actions
  toggleAISilence: (duration?: number, reason?: string) => void;
  isAISilenced: () => boolean;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Default settings
      theme: 'dark',
      aiSilenced: false,
      
      setTheme: (theme) => set({ theme }),
      
      // PERFORMANCE: Toggle AI silence
      toggleAISilence: (duration?: number, reason?: string) => {
        const silenced = !get().aiSilenced;
        const now = Date.now();
        
        set({
          aiSilenced: silenced,
          aiSilencedUntil: duration ? now + duration : undefined,
          aiSilenceReason: silenced ? reason : undefined,
        });
        
        // If silencing, emit event to cancel active AI tasks
        if (silenced) {
          window.dispatchEvent(new CustomEvent('regen:ai:silence', { 
            detail: { duration, reason } 
          }));
        }
        
        // Auto-unsilence after duration
        if (silenced && duration) {
          setTimeout(() => {
            const current = get();
            if (current.aiSilenced && current.aiSilencedUntil === now + duration) {
              set({ 
                aiSilenced: false, 
                aiSilencedUntil: undefined,
                aiSilenceReason: undefined 
              });
              window.dispatchEvent(new CustomEvent('regen:ai:unsilence'));
            }
          }, duration);
        }
      },
      
      // PERFORMANCE: Check if AI is currently silenced
      isAISilenced: () => {
        const state = get();
        if (!state.aiSilenced) return false;
        
        // Check if timed silence has expired
        if (state.aiSilencedUntil && Date.now() > state.aiSilencedUntil) {
          set({ 
            aiSilenced: false, 
            aiSilencedUntil: undefined,
            aiSilenceReason: undefined 
          });
          return false;
        }
        
        return true;
      },
    }),
    {
      name: 'regen-settings',
      partialize: (state) => ({
        theme: state.theme,
        // Don't persist AI silence state (reset on app restart)
      }),
    }
  )
);
