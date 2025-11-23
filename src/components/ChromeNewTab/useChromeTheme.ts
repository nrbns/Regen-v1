/**
 * useChromeTheme - Hook for managing Chrome new tab themes and backgrounds
 */

import { useState, useEffect } from 'react';

interface ChromeTheme {
  backgroundImage?: string;
  themeColor?: string;
  name?: string;
}

const DEFAULT_MOTORCYCLE_THEME: ChromeTheme = {
  // You can set a URL to the motorcycle wallpaper image here
  // Example: backgroundImage: 'https://example.com/motorcycle-wallpaper.jpg'
  // Or use a local image: backgroundImage: '/themes/motorcycle-background.jpg'
  backgroundImage: undefined, // Set this to your motorcycle wallpaper URL/path
  themeColor: '#4CAF50',
  name: 'Motorcycle Theme',
};

// Predefined theme options
export const CHROME_THEMES: ChromeTheme[] = [
  DEFAULT_MOTORCYCLE_THEME,
  {
    backgroundImage: undefined,
    themeColor: '#2196F3',
    name: 'Blue Sky',
  },
  {
    backgroundImage: undefined,
    themeColor: '#FF5722',
    name: 'Sunset',
  },
];

export function useChromeTheme() {
  const [theme, setTheme] = useState<ChromeTheme>(DEFAULT_MOTORCYCLE_THEME);

  useEffect(() => {
    // Load saved theme from storage
    const loadTheme = () => {
      try {
        const saved = localStorage.getItem('chrome-theme');
        if (saved) {
          const parsed = JSON.parse(saved) as ChromeTheme;
          setTheme(parsed);
        }
      } catch (error) {
        console.error('[useChromeTheme] Failed to load theme:', error);
      }
    };

    loadTheme();
  }, []);

  const setCustomTheme = (newTheme: ChromeTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('chrome-theme', JSON.stringify(newTheme));
    } catch (error) {
      console.error('[useChromeTheme] Failed to save theme:', error);
    }
  };

  const setThemeById = (themeId: string) => {
    const selectedTheme = CHROME_THEMES.find(t => t.name === themeId);
    if (selectedTheme) {
      setCustomTheme(selectedTheme);
    }
  };

  return {
    backgroundImage: theme.backgroundImage,
    themeColor: theme.themeColor,
    themeName: theme.name,
    setTheme: setCustomTheme,
    setThemeById,
    availableThemes: CHROME_THEMES,
  };
}
