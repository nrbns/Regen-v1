import React from 'react';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Globe className="h-5 w-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-slate-200">Language</h3>
      </div>

      <div className="space-y-2">
        {languages.map((lang) => (
          <label key={lang.code} className="flex items-center space-x-3 p-3 bg-slate-800 hover:bg-slate-750 rounded-lg cursor-pointer">
            <input
              type="radio"
              name="language"
              value={lang.code}
              defaultChecked={lang.code === 'en'}
              className="text-blue-500 focus:ring-blue-500"
            />
            <div>
              <div className="text-slate-200 font-medium">{lang.nativeName}</div>
              <div className="text-sm text-slate-400">{lang.name}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}