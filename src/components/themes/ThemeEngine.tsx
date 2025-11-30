/**
 * Theme Engine - Feature #6
 * Customizable themes with builder
 */

import { useState, useEffect } from 'react';
import { Palette, Sparkles, Moon, Sun, Zap, Heart } from 'lucide-react';

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  wallpaper?: string;
  animated?: boolean;
}

const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Dark',
    colors: {
      primary: '#8b5cf6',
      secondary: '#ec4899',
      background: '#1a1d28',
      surface: '#252836',
      text: '#ffffff',
      accent: '#10b981',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: {
      primary: '#00f5ff',
      secondary: '#ff00ff',
      background: '#0a0a0a',
      surface: '#1a1a2e',
      text: '#00ff00',
      accent: '#ff0080',
    },
  },
  {
    id: 'amoled',
    name: 'AMOLED',
    colors: {
      primary: '#ffffff',
      secondary: '#888888',
      background: '#000000',
      surface: '#111111',
      text: '#ffffff',
      accent: '#00ff00',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      accent: '#3b82f6',
    },
  },
  {
    id: 'anime',
    name: 'Anime',
    colors: {
      primary: '#ff6b9d',
      secondary: '#c44569',
      background: '#f8d7da',
      surface: '#fff0f3',
      text: '#2d3436',
      accent: '#ff6b9d',
    },
  },
];

export function ThemeEngine() {
  const [themes, setThemes] = useState<Theme[]>(BUILT_IN_THEMES);
  const [activeTheme, setActiveTheme] = useState<string>('dark');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [customTheme, setCustomTheme] = useState<Theme>({
    id: 'custom',
    name: 'Custom Theme',
    colors: {
      primary: '#8b5cf6',
      secondary: '#ec4899',
      background: '#1a1d28',
      surface: '#252836',
      text: '#ffffff',
      accent: '#10b981',
    },
  });

  useEffect(() => {
    // Load saved themes
    const saved = localStorage.getItem('regen-themes');
    if (saved) {
      try {
        const custom = JSON.parse(saved);
        setThemes([...BUILT_IN_THEMES, ...custom]);
      } catch {
        // Invalid data
      }
    }

    // Load active theme
    const active = localStorage.getItem('regen-active-theme');
    if (active) {
      setActiveTheme(active);
      applyTheme(active);
    }
  }, []);

  const applyTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-accent', theme.colors.accent);

    if (theme.wallpaper) {
      root.style.setProperty('--wallpaper', `url(${theme.wallpaper})`);
    }

    setActiveTheme(themeId);
    localStorage.setItem('regen-active-theme', themeId);
  };

  const saveCustomTheme = () => {
    const updated = [...themes];
    const existing = updated.findIndex(t => t.id === 'custom');
    
    if (existing >= 0) {
      updated[existing] = customTheme;
    } else {
      updated.push(customTheme);
    }

    setThemes(updated);
    const customThemes = updated.filter(t => !BUILT_IN_THEMES.find(b => b.id === t.id));
    localStorage.setItem('regen-themes', JSON.stringify(customThemes));
    setIsBuilderOpen(false);
    toast.success('Theme saved!');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Themes
        </h2>
        <button
          onClick={() => setIsBuilderOpen(!isBuilderOpen)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
        >
          {isBuilderOpen ? 'Close Builder' : 'Theme Builder'}
        </button>
      </div>

      {/* Theme Builder */}
      {isBuilderOpen && (
        <div className="p-4 bg-gray-800 rounded-lg space-y-4">
          <input
            type="text"
            value={customTheme.name}
            onChange={e => setCustomTheme({ ...customTheme, name: e.target.value })}
            placeholder="Theme name"
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(customTheme.colors).map(([key, value]) => (
              <div key={key}>
                <label className="text-sm text-gray-400 capitalize mb-1 block">{key}</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={value}
                    onChange={e => setCustomTheme({
                      ...customTheme,
                      colors: { ...customTheme.colors, [key]: e.target.value }
                    })}
                    className="w-12 h-10 rounded"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={e => setCustomTheme({
                      ...customTheme,
                      colors: { ...customTheme.colors, [key]: e.target.value }
                    })}
                    className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={saveCustomTheme}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Save Theme
          </button>
        </div>
      )}

      {/* Theme Grid */}
      <div className="grid grid-cols-2 gap-3">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => applyTheme(theme.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeTheme === theme.id
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
          >
            <div
              className="h-20 rounded mb-2"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
              }}
            />
            <p className="text-sm font-semibold text-white">{theme.name}</p>
            {activeTheme === theme.id && (
              <p className="text-xs text-purple-400 mt-1">Active</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Import toast
import { toast } from '../../utils/toast';

