/**
 * Language Selector Component
 * Integrates multi-language AI into UI
 */

import { useState } from 'react';
import {
  multiLanguageAI,
  LANGUAGE_METADATA,
  type SupportedLanguage,
} from '../../core/language/multiLanguageAI';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  onLanguageChange?: (lang: SupportedLanguage) => void;
  onTranslate?: (text: string, targetLang: SupportedLanguage) => Promise<string>;
  defaultLanguage?: SupportedLanguage;
}

export function LanguageSelector({
  onLanguageChange,
  onTranslate: _onTranslate,
  defaultLanguage = 'en',
}: LanguageSelectorProps) {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(defaultLanguage);
  const [detectedLang, _setDetectedLang] = useState<SupportedLanguage | null>(null);

  const handleLanguageSelect = (lang: SupportedLanguage) => {
    setSelectedLang(lang);
    onLanguageChange?.(lang);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-neutral-400" />
        <select
          value={selectedLang}
          onChange={e => handleLanguageSelect(e.target.value as SupportedLanguage)}
          className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none"
        >
          {Object.entries(LANGUAGE_METADATA).map(([code, meta]) => (
            <option key={code} value={code}>
              {meta.nativeName} ({meta.name})
            </option>
          ))}
        </select>
      </div>

      {detectedLang && detectedLang !== selectedLang && (
        <div className="text-xs text-neutral-500">
          Detected: {LANGUAGE_METADATA[detectedLang].nativeName}
        </div>
      )}
    </div>
  );
}

// Export helper functions
export async function handleTextInput(text: string): Promise<SupportedLanguage> {
  return multiLanguageAI.detectLanguage(text);
}

export async function handleTranslate(
  text: string,
  targetLang: SupportedLanguage,
  sourceLang?: SupportedLanguage
): Promise<string> {
  return multiLanguageAI.translate(text, targetLang, sourceLang);
}
