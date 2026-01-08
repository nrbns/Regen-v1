/**
 * Settings Export/Import - Backup and restore settings
 * Phase 1, Day 4: Settings Panel improvements
 */

import type { SettingsData } from '../../state/settingsStore';
import { useSettingsStore } from '../../state/settingsStore';
import { toast } from '../../utils/toast';

/**
 * Phase 1, Day 4: Export settings to JSON
 */
export function exportSettings(): string {
  const settings = useSettingsStore.getState();
  const exportData: Partial<SettingsData> = {
    general: settings.general,
    privacy: settings.privacy,
    appearance: settings.appearance,
    account: {
      displayName: settings.account.displayName,
      email: settings.account.email,
      workspace: settings.account.workspace,
      avatarColor: settings.account.avatarColor,
      // Don't export avatarUrl (may be large)
    },
    searchEngine: settings.searchEngine,
    language: settings.language,
    // Don't export videoDownloadConsent (privacy-sensitive)
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Phase 1, Day 4: Import settings from JSON
 */
export function importSettings(json: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json) as Partial<SettingsData>;
    const settings = useSettingsStore.getState();

    // Validate imported data
    if (data.general) {
      settings.updateGeneral(data.general);
    }
    if (data.privacy) {
      settings.updatePrivacy(data.privacy);
    }
    if (data.appearance) {
      settings.updateAppearance(data.appearance);
    }
    if (data.account) {
      settings.updateAccount(data.account);
    }
    if (data.searchEngine) {
      settings.setSearchEngine(data.searchEngine);
    }
    if (data.language) {
      settings.setLanguage(data.language);
    }

    toast.success('Settings imported successfully');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid settings file';
    toast.error(`Failed to import settings: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Phase 1, Day 4: Download settings as file
 */
export function downloadSettings(): void {
  const json = exportSettings();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `regen-settings-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Settings exported to file');
}

/**
 * Phase 1, Day 4: Import settings from file
 */
export function importSettingsFromFile(file: File): Promise<{ success: boolean; error?: string }> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const json = e.target?.result as string;
        const result = importSettings(json);
        resolve(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to read file';
        resolve({ success: false, error: errorMessage });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };
    reader.readAsText(file);
  });
}
