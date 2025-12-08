/**
 * Settings Persistence Component
 * Export/import settings and clear data options
 */

import { useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { ResponsiveCard } from '../common/ResponsiveCard';
import { cn } from '../../lib/utils';

export function SettingsPersistence() {
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const settings = useSettingsStore();

  const handleExport = () => {
    try {
      const settingsData = {
        general: settings.general,
        privacy: settings.privacy,
        appearance: settings.appearance,
        account: settings.account,
        videoDownloadConsent: settings.videoDownloadConsent,
        searchEngine: settings.searchEngine,
        language: settings.language,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `regen-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to export settings:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate and import settings
        if (data.general) settings.updateGeneral(data.general);
        if (data.privacy) settings.updatePrivacy(data.privacy);
        if (data.appearance) settings.updateAppearance(data.appearance);
        if (data.account) settings.updateAccount(data.account);
        if (data.searchEngine) settings.setSearchEngine(data.searchEngine);
        if (data.language) settings.setLanguage(data.language);

        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } catch (error) {
        console.error('Failed to import settings:', error);
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    input.click();
  };

  const handleClearData = (type: 'settings' | 'history' | 'cache' | 'all') => {
    const confirmMessage =
      type === 'all'
        ? 'Are you sure you want to clear ALL data? This cannot be undone.'
        : `Are you sure you want to clear ${type}?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      switch (type) {
        case 'settings':
          settings.resetSettings();
          break;
        case 'history':
          // Clear history store
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('regen:history');
          }
          break;
        case 'cache':
          // Clear cache
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }
          break;
        case 'all':
          settings.resetSettings();
          if (typeof window !== 'undefined') {
            window.localStorage.clear();
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              });
            }
          }
          break;
      }

      alert(`${type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)} cleared successfully.`);
    } catch (error) {
      console.error(`Failed to clear ${type}:`, error);
      alert(`Failed to clear ${type}. Please try again.`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export/Import */}
      <ResponsiveCard padding="md">
        <h3 className="text-base font-semibold text-white mb-4">Backup & Restore</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExport}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
              exportStatus === 'success'
                ? 'bg-emerald-600 text-white'
                : exportStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {exportStatus === 'success' ? (
              <>
                <CheckCircle2 size={18} />
                Exported!
              </>
            ) : exportStatus === 'error' ? (
              <>
                <AlertTriangle size={18} />
                Error
              </>
            ) : (
              <>
                <Download size={18} />
                Export Settings
              </>
            )}
          </button>
          <button
            onClick={handleImport}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors',
              importStatus === 'success'
                ? 'bg-emerald-600 text-white'
                : importStatus === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            )}
          >
            {importStatus === 'success' ? (
              <>
                <CheckCircle2 size={18} />
                Imported!
              </>
            ) : importStatus === 'error' ? (
              <>
                <AlertTriangle size={18} />
                Error
              </>
            ) : (
              <>
                <Upload size={18} />
                Import Settings
              </>
            )}
          </button>
        </div>
      </ResponsiveCard>

      {/* Clear Data */}
      <ResponsiveCard padding="md">
        <h3 className="text-base font-semibold text-white mb-4">Clear Data</h3>
        <p className="text-sm text-slate-400 mb-4">
          Remove stored data. Some actions cannot be undone.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => handleClearData('settings')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Clear Settings
          </button>
          <button
            onClick={() => handleClearData('history')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Clear History
          </button>
          <button
            onClick={() => handleClearData('cache')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Clear Cache
          </button>
          <button
            onClick={() => handleClearData('all')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Clear All Data
          </button>
        </div>
      </ResponsiveCard>
    </div>
  );
}


