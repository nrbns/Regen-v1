/* eslint-env node */

import { francAll } from 'franc';

const ISO3_TO_BCP47 = {
  eng: 'en',
  hin: 'hi',
  tam: 'ta',
  tel: 'te',
  ben: 'bn',
  mar: 'mr',
  kan: 'kn',
  mal: 'ml',
  pan: 'pa',
  guj: 'gu',
  urd: 'ur',
  nep: 'ne',
  asm: 'as',
  ori: 'or',
  sin: 'si',
  tha: 'th',
  vie: 'vi',
  ind: 'id',
  fil: 'fil',
  tur: 'tr',
  fas: 'fa',
  ara: 'ar',
  malayu: 'ms',
  zho: 'zh',
  jpn: 'ja',
  kor: 'ko',
  rus: 'ru',
  deu: 'de',
  fra: 'fr',
  spa: 'es',
  por: 'pt',
};

const LANGUAGE_LABELS = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  gu: 'Gujarati',
  ur: 'Urdu',
  ne: 'Nepali',
  as: 'Assamese',
  or: 'Odia',
  si: 'Sinhala',
  bn_IN: 'Bengali',
  ta_IN: 'Tamil',
  te_IN: 'Telugu',
  ml_IN: 'Malayalam',
  mr_IN: 'Marathi',
  kn_IN: 'Kannada',
  bn_BD: 'Bengali',
  pa_IN: 'Punjabi',
  gu_IN: 'Gujarati',
  as_IN: 'Assamese',
  or_IN: 'Odia',
  si_LK: 'Sinhala',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  pt: 'Portuguese',
  ar: 'Arabic',
  fa: 'Persian',
  tr: 'Turkish',
  id: 'Indonesian',
  th: 'Thai',
  vi: 'Vietnamese',
};

const SCRIPT_GUESSES = [
  { regex: /[\u0900-\u097F]/u, lang: 'hi' }, // Devanagari
  { regex: /[\u0980-\u09FF]/u, lang: 'bn' }, // Bengali
  { regex: /[\u0B80-\u0BFF]/u, lang: 'ta' }, // Tamil
  { regex: /[\u0C00-\u0C7F]/u, lang: 'te' }, // Telugu
  { regex: /[\u0C80-\u0CFF]/u, lang: 'kn' }, // Kannada
  { regex: /[\u0D00-\u0D7F]/u, lang: 'ml' }, // Malayalam
  { regex: /[\u0B00-\u0B7F]/u, lang: 'or' }, // Odia
  { regex: /[\u0A80-\u0AFF]/u, lang: 'gu' }, // Gujarati
  { regex: /[\u0A00-\u0A7F]/u, lang: 'pa' }, // Gurmukhi
  { regex: /[\u0D80-\u0DFF]/u, lang: 'si' }, // Sinhala
  { regex: /[\u0980-\u09FF]/u, lang: 'bn' },
];

const DEFAULT_LANGUAGE = 'en';

function normalizeLanguageTag(code) {
  if (!code) return DEFAULT_LANGUAGE;
  const lower = code.toLowerCase();
  if (lower.includes('-')) {
    return lower;
  }
  if (lower.length === 3 && ISO3_TO_BCP47[lower]) {
    return ISO3_TO_BCP47[lower];
  }
  return lower.slice(0, 2);
}

function detectByScript(sample) {
  if (!sample) return null;
  for (const guess of SCRIPT_GUESSES) {
    if (guess.regex.test(sample)) {
      return guess.lang;
    }
  }
  return null;
}

function buildResponse(language, source, confidence = 0) {
  const normalized = normalizeLanguageTag(language);
  return {
    language: normalized,
    displayName:
      LANGUAGE_LABELS[normalized] || LANGUAGE_LABELS[normalized.split('-')[0]] || normalized,
    confidence: Number(confidence.toFixed(3)),
    source,
  };
}

export function detectLanguage(text = '', hintLanguage) {
  if (hintLanguage && typeof hintLanguage === 'string') {
    return buildResponse(hintLanguage, 'hint', 1);
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return buildResponse(DEFAULT_LANGUAGE, 'default', 0);
  }

  const scriptGuess = detectByScript(trimmed);
  if (scriptGuess) {
    return buildResponse(scriptGuess, 'script', 0.95);
  }

  const sample = trimmed.slice(0, 800);
  const minLength = Math.min(24, sample.length);
  const ranked = francAll(sample, { minLength }).slice(0, 3);
  const candidate = ranked.find(entry => entry[0] !== 'und');

  if (!candidate) {
    return buildResponse(DEFAULT_LANGUAGE, 'fallback', 0);
  }

  const [iso6393, score = 0] = candidate;
  const language = ISO3_TO_BCP47[iso6393] || iso6393;
  return buildResponse(language, 'model', score);
}

export function getLanguageLabel(code) {
  if (!code) return LANGUAGE_LABELS[DEFAULT_LANGUAGE];
  const normalized = normalizeLanguageTag(code);
  return LANGUAGE_LABELS[normalized] || LANGUAGE_LABELS[normalized.split('-')[0]] || normalized;
}

export function normalizeLanguage(language) {
  return normalizeLanguageTag(language);
}
