export type LanguageMeta = {
  code: string;
  nativeName: string;
  englishName: string;
  accent: string;
  gradient: [string, string];
  waveform: [string, string];
};

const DEFAULT_META: LanguageMeta = {
  code: 'en',
  nativeName: 'English',
  englishName: 'English',
  accent: '#38bdf8',
  gradient: ['#2563eb', '#38bdf8'],
  waveform: ['#38bdf8', '#a5f3fc'],
};

const META_MAP: Record<string, LanguageMeta> = {
  en: DEFAULT_META,
  hi: {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    accent: '#f97316',
    gradient: ['#f97316', '#ec4899'],
    waveform: ['#f97316', '#facc15'],
  },
  ta: {
    code: 'ta',
    nativeName: 'தமிழ்',
    englishName: 'Tamil',
    accent: '#a855f7',
    gradient: ['#a855f7', '#ec4899'],
    waveform: ['#a855f7', '#f472b6'],
  },
  bn: {
    code: 'bn',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    accent: '#fbbf24',
    gradient: ['#fbbf24', '#f97316'],
    waveform: ['#f97316', '#fbbf24'],
  },
  te: {
    code: 'te',
    nativeName: 'తెలుగు',
    englishName: 'Telugu',
    accent: '#fb7185',
    gradient: ['#fb7185', '#f97316'],
    waveform: ['#fb7185', '#fcd34d'],
  },
  mr: {
    code: 'mr',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    accent: '#22d3ee',
    gradient: ['#22d3ee', '#3b82f6'],
    waveform: ['#22d3ee', '#a78bfa'],
  },
};

export function getLanguageMeta(code?: string): LanguageMeta {
  if (!code || code === 'auto') return DEFAULT_META;
  const normalized = code.toLowerCase();
  return META_MAP[normalized] || DEFAULT_META;
}
