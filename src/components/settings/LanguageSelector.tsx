/**
 * Language Selector Component
 * Allows users to select their preferred language
 */

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { getLanguageMeta } from '../../constants/languageMeta';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
] as const;

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useSettingsStore();

  const currentLang = language || i18n.language || 'en';
  const _currentMeta = getLanguageMeta(currentLang);

  const handleLanguageChange = (langCode: string) => {
    // Update both settings store and i18n
    setLanguage(langCode);
    i18n.changeLanguage(langCode);
    // Save to localStorage (i18n does this automatically, but ensure it)
    localStorage.setItem('i18nextLng', langCode);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-gray-400" />
        <label className="text-sm font-medium text-gray-200">
          Language / भाषा / மொழி / భాష
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SUPPORTED_LANGUAGES.map(lang => {
          const meta = getLanguageMeta(lang.code);
          const isSelected = currentLang === lang.code || currentLang === lang.code.split('-')[0];

          return (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-purple-500 bg-purple-500/10 text-white'
                  : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: meta.accent }}
              />
              <div className="flex-1">
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs opacity-70">{lang.name}</div>
              </div>
              {isSelected && (
                <div className="h-2 w-2 rounded-full bg-purple-500" />
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Select your preferred language. Search queries will be automatically translated if needed.
      </p>
    </div>
  );
}

