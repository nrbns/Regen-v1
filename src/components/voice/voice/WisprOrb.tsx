import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Sparkles, X, Eye, Brain } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { parseWisprCommand, executeWisprCommand } from '../../core/wispr/commandHandler';
import { toast } from '../../utils/toast';
import { isElectronRuntime } from '../../lib/env';

const LANGUAGE_LOCALE_MAP: Record<string, string> = {
  hi: 'hi-IN',
  en: 'en-US',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
};

function getSpeechRecognitionLocale(lang?: string): string {
  // Phase 2, Day 4: Support both Hindi and English simultaneously for best accuracy
  // DESI POLISH: Enhanced language detection for all Indian languages
  if (!lang || lang === 'auto') return 'hi-IN,en-US'; // Default to Hindi + English
  if (lang === 'hi') return 'hi-IN,en-US'; // Support both
  if (lang === 'en') return 'en-US,hi-IN'; // Support both

  // For other Indian languages, support with English fallback
  const indianLanguages = [
    'ta',
    'te',
    'bn',
    'mr',
    'kn',
    'ml',
    'gu',
    'pa',
    'ur',
    'or',
    'as',
    'mai',
    'sat',
    'ne',
    'kok',
    'mni',
    'brx',
    'doi',
    'ks',
    'sa',
  ];
  if (indianLanguages.includes(lang)) {
    const locale = LANGUAGE_LOCALE_MAP[lang] || `${lang}-IN`;
    return `${locale},en-US`; // Support Indian language + English
  }
  return LANGUAGE_LOCALE_MAP[lang] || lang.includes('-') ? lang : `${lang}-${lang.toUpperCase()}`;
}

export function WisprOrb() {
  return null;
}

export default WisprOrb;
