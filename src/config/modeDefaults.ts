/**
 * LAG FIX #8: Mode Defaults for Indian Users
 * Hindi-first defaults for better Desi UX
 */

import type { AppState } from '../state/appStore';

export interface ModeDefaults {
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  voiceLanguage: string;
  defaultSearchEngine?: string;
}

const INDIAN_DEFAULTS: ModeDefaults = {
  language: 'hi', // Hindi first
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY', // Indian format
  numberFormat: 'en-IN', // Indian number format (lakhs, crores)
  voiceLanguage: 'hi', // Hindi voice
  defaultSearchEngine: 'google',
};

const ENGLISH_DEFAULTS: ModeDefaults = {
  language: 'en',
  currency: 'USD',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  numberFormat: 'en-US',
  voiceLanguage: 'en',
  defaultSearchEngine: 'google',
};

/**
 * Get mode-specific defaults
 * LAG FIX #8: Hindi defaults for Indian users
 */
export function getModeDefaults(mode: AppState['mode']): ModeDefaults {
  // For Trade and Research modes, use Indian defaults
  if (mode === 'Trade' || mode === 'Research') {
    return INDIAN_DEFAULTS;
  }

  // For other modes, check user preference or default to English
  try {
    const stored = localStorage.getItem('regen:settings-v1');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.language === 'hi' || settings.language === 'auto') {
        return INDIAN_DEFAULTS;
      }
    }
  } catch {
    // Fallback to English if parsing fails
  }

  return ENGLISH_DEFAULTS;
}

/**
 * Get Hindi text for mode-specific actions
 */
export const HINDI_MODE_TEXT: Record<AppState['mode'], Record<string, string>> = {
  Browse: {
    search: 'खोजें',
    newTab: 'नया टैब',
    closeTab: 'टैब बंद करें',
    reload: 'रीलोड करें',
  },
  Research: {
    search: 'खोजें',
    summarize: 'सारांश',
    analyze: 'विश्लेषण करें',
    sources: 'स्रोत',
  },
  Trade: {
    buy: 'खरीदें',
    sell: 'बेचें',
    portfolio: 'पोर्टफोलियो',
    orders: 'ऑर्डर',
    upi: 'UPI भुगतान',
  },
  Games: {
    play: 'खेलें',
    pause: 'रोकें',
    score: 'स्कोर',
  },
  Docs: {
    open: 'खोलें',
    save: 'सेव करें',
    export: 'एक्सपोर्ट',
  },
  Images: {
    generate: 'बनाएं',
    edit: 'एडिट करें',
    download: 'डाउनलोड',
  },
  Threats: {
    scan: 'स्कैन करें',
    protect: 'सुरक्षा',
    block: 'ब्लॉक करें',
  },
  GraphMind: {
    visualize: 'विज़ुअलाइज़',
    connect: 'कनेक्ट करें',
    explore: 'एक्सप्लोर करें',
  },
};

/**
 * Get localized text for current mode
 */
export function getLocalizedText(mode: AppState['mode'], key: string): string {
  const defaults = getModeDefaults(mode);
  if (defaults.language === 'hi' && HINDI_MODE_TEXT[mode]?.[key]) {
    return HINDI_MODE_TEXT[mode][key];
  }
  // Fallback to English
  return key;
}
