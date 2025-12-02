/**
 * SettingsSync Component
 * Syncs settings between settingsStore and other stores (theme, performance, privacy)
 */

import { useEffect } from 'react';
import { useSettingsStore } from '../state/settingsStore';
import { useThemeStore } from '../state/themeStore';
import { applyPerformanceMode } from '../utils/performanceMode';

export function SettingsSync() {
  const settings = useSettingsStore();
  const themePreference = useThemeStore(state => state.preference);
  const setThemePreference = useThemeStore(state => state.setPreference);

  // Sync theme from settingsStore to themeStore
  useEffect(() => {
    const theme = settings.appearance.theme;
    if (theme === 'system' || theme === 'light' || theme === 'dark') {
      if (themePreference !== theme) {
        setThemePreference(theme);
      }
    }
  }, [settings.appearance.theme, themePreference, setThemePreference]);

  // Initialize and sync performance mode
  useEffect(() => {
    const performanceMode = settings.appearance.compactUI;
    applyPerformanceMode(performanceMode);
  }, [settings.appearance.compactUI]);

  // This component doesn't render anything
  return null;
}
