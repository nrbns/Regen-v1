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

// DESI POLISH: Complete Indian language metadata with unique color schemes
const META_MAP: Record<string, LanguageMeta> = {
  en: DEFAULT_META,
  // Major Indian Languages (22 official + regional)
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
  te: {
    code: 'te',
    nativeName: 'తెలుగు',
    englishName: 'Telugu',
    accent: '#fb7185',
    gradient: ['#fb7185', '#f97316'],
    waveform: ['#fb7185', '#fcd34d'],
  },
  bn: {
    code: 'bn',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    accent: '#fbbf24',
    gradient: ['#fbbf24', '#f97316'],
    waveform: ['#f97316', '#fbbf24'],
  },
  mr: {
    code: 'mr',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    accent: '#22d3ee',
    gradient: ['#22d3ee', '#3b82f6'],
    waveform: ['#22d3ee', '#a78bfa'],
  },
  kn: {
    code: 'kn',
    nativeName: 'ಕನ್ನಡ',
    englishName: 'Kannada',
    accent: '#10b981',
    gradient: ['#10b981', '#3b82f6'],
    waveform: ['#10b981', '#34d399'],
  },
  ml: {
    code: 'ml',
    nativeName: 'മലയാളം',
    englishName: 'Malayalam',
    accent: '#8b5cf6',
    gradient: ['#8b5cf6', '#ec4899'],
    waveform: ['#8b5cf6', '#c084fc'],
  },
  gu: {
    code: 'gu',
    nativeName: 'ગુજરાતી',
    englishName: 'Gujarati',
    accent: '#f59e0b',
    gradient: ['#f59e0b', '#f97316'],
    waveform: ['#f59e0b', '#fbbf24'],
  },
  pa: {
    code: 'pa',
    nativeName: 'ਪੰਜਾਬੀ',
    englishName: 'Punjabi',
    accent: '#ef4444',
    gradient: ['#ef4444', '#f97316'],
    waveform: ['#ef4444', '#fb7185'],
  },
  ur: {
    code: 'ur',
    nativeName: 'اردو',
    englishName: 'Urdu',
    accent: '#06b6d4',
    gradient: ['#06b6d4', '#3b82f6'],
    waveform: ['#06b6d4', '#22d3ee'],
  },
  or: {
    code: 'or',
    nativeName: 'ଓଡ଼ିଆ',
    englishName: 'Odia',
    accent: '#14b8a6',
    gradient: ['#14b8a6', '#10b981'],
    waveform: ['#14b8a6', '#34d399'],
  },
  as: {
    code: 'as',
    nativeName: 'অসমীয়া',
    englishName: 'Assamese',
    accent: '#06b6d4',
    gradient: ['#06b6d4', '#3b82f6'],
    waveform: ['#06b6d4', '#67e8f9'],
  },
  mai: {
    code: 'mai',
    nativeName: 'मैथिली',
    englishName: 'Maithili',
    accent: '#a855f7',
    gradient: ['#a855f7', '#ec4899'],
    waveform: ['#a855f7', '#c084fc'],
  },
  sat: {
    code: 'sat',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    englishName: 'Santali',
    accent: '#f97316',
    gradient: ['#f97316', '#fbbf24'],
    waveform: ['#f97316', '#fcd34d'],
  },
  ne: {
    code: 'ne',
    nativeName: 'नेपाली',
    englishName: 'Nepali',
    accent: '#3b82f6',
    gradient: ['#3b82f6', '#06b6d4'],
    waveform: ['#3b82f6', '#60a5fa'],
  },
  kok: {
    code: 'kok',
    nativeName: 'कोंकणी',
    englishName: 'Konkani',
    accent: '#8b5cf6',
    gradient: ['#8b5cf6', '#a855f7'],
    waveform: ['#8b5cf6', '#c084fc'],
  },
  mni: {
    code: 'mni',
    nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ',
    englishName: 'Manipuri',
    accent: '#10b981',
    gradient: ['#10b981', '#14b8a6'],
    waveform: ['#10b981', '#34d399'],
  },
  brx: {
    code: 'brx',
    nativeName: 'बड़ो',
    englishName: 'Bodo',
    accent: '#f59e0b',
    gradient: ['#f59e0b', '#fbbf24'],
    waveform: ['#f59e0b', '#fcd34d'],
  },
  doi: {
    code: 'doi',
    nativeName: 'डोगरी',
    englishName: 'Dogri',
    accent: '#ec4899',
    gradient: ['#ec4899', '#f472b6'],
    waveform: ['#ec4899', '#f9a8d4'],
  },
  ks: {
    code: 'ks',
    nativeName: 'कॉशुर',
    englishName: 'Kashmiri',
    accent: '#06b6d4',
    gradient: ['#06b6d4', '#3b82f6'],
    waveform: ['#06b6d4', '#67e8f9'],
  },
  sa: {
    code: 'sa',
    nativeName: 'संस्कृतम्',
    englishName: 'Sanskrit',
    accent: '#fbbf24',
    gradient: ['#fbbf24', '#f59e0b'],
    waveform: ['#fbbf24', '#fcd34d'],
  },
};

export function getLanguageMeta(code?: string): LanguageMeta {
  if (!code || code === 'auto') return DEFAULT_META;
  const normalized = code.toLowerCase();
  return META_MAP[normalized] || DEFAULT_META;
}
