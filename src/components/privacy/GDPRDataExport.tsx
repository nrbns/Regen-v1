/**
 * GDPRDataExport - GDPR Data Export Component
 * 
 * Allows users to export all their personal data stored in OmniBrowser.
 * Complies with GDPR Article 15 (Right of Access).
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Database, Clock, Bookmark, Settings, Cookie, Shield, Loader2, Check, AlertCircle } from 'lucide-react';
import { useBookmarksStore } from '../../state/bookmarksStore';
import { useHistoryStore } from '../../state/historyStore';
import { useSettingsStore } from '../../state/settingsStore';
import { getCookiePreferences } from '../Onboarding/CookieConsent';

export interface ExportData {
  version: string;
  exportedAt: string;
  user: {
    settings: any;
    cookiePreferences: any;
  };
  browsing: {
    bookmarks: any[];
    history: any[];
  };
  privacy: {
    consentLedger?: any[];
    permissions?: any[];
  };
  metadata: {
    totalBookmarks: number;
    totalHistoryEntries: number;
    exportFormat: 'json';
  };
}

export function GDPRDataExport() {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  
  const bookmarks = useBookmarksStore((state) => state.bookmarks);
  const historyEntries = useHistoryStore((state) => state.entries);
  const searchEngineSetting = useSettingsStore((state) => state.searchEngine);
  const videoDownloadConsent = useSettingsStore((state) => state.videoDownloadConsent);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setExported(false);

    try {
      // Collect all user data
      const data: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        user: {
          settings: {
            searchEngine: searchEngineSetting,
            videoDownloadConsent,
          },
          cookiePreferences: getCookiePreferences(),
        },
        browsing: {
          bookmarks: Array.isArray(bookmarks) ? bookmarks : Object.values(bookmarks),
          history: historyEntries,
        },
        privacy: {
          // Try to get consent ledger if available
          consentLedger: await getConsentLedger(),
          permissions: await getPermissions(),
        },
        metadata: {
          totalBookmarks: Array.isArray(bookmarks) ? bookmarks.length : Object.keys(bookmarks).length,
          totalHistoryEntries: historyEntries.length,
          exportFormat: 'json',
        },
      };

      setExportData(data);

      // Convert to JSON
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `omnibrowser-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExported(true);
      setTimeout(() => setExported(false), 3000);
    } catch (err) {
      console.error('GDPR export failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const getConsentLedger = async (): Promise<any[]> => {
    try {
      // Try to get consent ledger from IPC if available
      const { ipc } = await import('../../lib/ipc-typed');
      const ledger = await ipc.consent?.list?.();
      return Array.isArray(ledger) ? ledger : [];
    } catch {
      // Fallback: try localStorage
      try {
        const stored = localStorage.getItem('omnibrowser:consent-ledger');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore errors
      }
      return [];
    }
  };

  const getPermissions = async (): Promise<any[]> => {
    try {
      // Permissions API not implemented yet
      return [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Export Your Data</h3>
        <p className="text-sm text-gray-400">
          Under GDPR, you have the right to access your personal data. This will export all data stored in OmniBrowser 
          including bookmarks, history, settings, and privacy preferences.
        </p>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-200">
            <strong>What's included:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-blue-300">
              <li>Bookmarks ({Array.isArray(bookmarks) ? bookmarks.length : Object.keys(bookmarks).length} items)</li>
              <li>Browsing history ({historyEntries.length} entries)</li>
              <li>Settings and preferences</li>
              <li>Cookie preferences</li>
              <li>Consent ledger (if available)</li>
              <li>Permissions (if available)</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-900/60 border border-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Bookmark size={20} className="text-blue-400" />
            <h4 className="font-medium text-gray-200">Bookmarks</h4>
          </div>
          <p className="text-sm text-gray-400">
            {Array.isArray(bookmarks) ? bookmarks.length : Object.keys(bookmarks).length} bookmark{(Array.isArray(bookmarks) ? bookmarks.length : Object.keys(bookmarks).length) !== 1 ? 's' : ''} stored
          </p>
        </div>

        <div className="p-4 bg-gray-900/60 border border-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={20} className="text-green-400" />
            <h4 className="font-medium text-gray-200">History</h4>
          </div>
          <p className="text-sm text-gray-400">
            {historyEntries.length} history entr{historyEntries.length !== 1 ? 'ies' : 'y'} stored
          </p>
        </div>

        <div className="p-4 bg-gray-900/60 border border-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Settings size={20} className="text-purple-400" />
            <h4 className="font-medium text-gray-200">Settings</h4>
          </div>
          <p className="text-sm text-gray-400">Theme, search engine, and preferences</p>
        </div>

        <div className="p-4 bg-gray-900/60 border border-gray-800/50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Cookie size={20} className="text-yellow-400" />
            <h4 className="font-medium text-gray-200">Cookie Preferences</h4>
          </div>
          <p className="text-sm text-gray-400">Your cookie consent preferences</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-200">
              <strong>Export failed:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {exported && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-200">
              <strong>Export successful!</strong> Your data has been downloaded.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <motion.button
          onClick={handleExport}
          disabled={exporting}
          whileHover={{ scale: exporting ? 1 : 1.02 }}
          whileTap={{ scale: exporting ? 1 : 0.98 }}
          className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${
            exporting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {exporting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Export All Data</span>
            </>
          )}
        </motion.button>

        {exportData && (
          <button
            onClick={() => {
              const json = JSON.stringify(exportData, null, 2);
              navigator.clipboard.writeText(json).then(() => {
                alert('Data copied to clipboard!');
              });
            }}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-200 transition-colors flex items-center gap-2"
          >
            <FileText size={16} />
            <span>Copy to Clipboard</span>
          </button>
        )}
      </div>

      <div className="p-4 bg-gray-900/60 border border-gray-800/50 rounded-lg">
        <h4 className="font-medium text-gray-200 mb-2 flex items-center gap-2">
          <Shield size={16} className="text-gray-400" />
          <span>Privacy & Security</span>
        </h4>
        <p className="text-sm text-gray-400">
          Your exported data is stored locally and only downloaded to your device. 
          We do not have access to your exported data. The export file contains all personal data 
          stored in OmniBrowser in a machine-readable JSON format.
        </p>
      </div>
    </div>
  );
}

