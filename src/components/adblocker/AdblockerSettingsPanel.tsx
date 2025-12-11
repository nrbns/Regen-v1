/**
 * Adblocker Settings Panel
 * UI for managing adblocker settings
 */

import { useState, useEffect } from 'react';
import { Shield, Loader2, Plus, Trash2 } from 'lucide-react';
import { getAdblockerService } from '../../services/adblocker/service';
import type { AdblockerSettings } from '../../services/adblocker/types';
import { toast } from '../../utils/toast';
import { useMobileDetection } from '../../mobile';

interface AdblockerSettingsPanelProps {
  onClose?: () => void;
}

export function AdblockerSettingsPanel({ onClose }: AdblockerSettingsPanelProps) {
  const { isMobile } = useMobileDetection();
  const [settings, setSettings] = useState<AdblockerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [newWhitelistDomain, setNewWhitelistDomain] = useState('');
  const [newBlockedDomain, setNewBlockedDomain] = useState('');

  const service = getAdblockerService();

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await service.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadStats = async () => {
    try {
      const currentStats = await service.getStats();
      setStats(currentStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (enabled) {
        await service.enable();
      } else {
        await service.disable();
      }
      await loadSettings();
      toast.success(enabled ? 'Adblocker enabled' : 'Adblocker disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFilterList = async (listId: string, enabled: boolean) => {
    setLoading(true);
    try {
      await service.updateFilterList(listId, { enabled });
      await loadSettings();
      toast.success(`${enabled ? 'Enabled' : 'Disabled'} filter list`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update filter list');
    } finally {
      setLoading(false);
    }
  };

  const handleWhitelistDomain = async () => {
    if (!newWhitelistDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setLoading(true);
    try {
      await service.whitelistDomain(newWhitelistDomain.trim());
      setNewWhitelistDomain('');
      await loadSettings();
      toast.success('Domain whitelisted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to whitelist domain');
    } finally {
      setLoading(false);
    }
  };

  const handleUnwhitelistDomain = async (domain: string) => {
    setLoading(true);
    try {
      await service.unwhitelistDomain(domain);
      await loadSettings();
      toast.success('Domain removed from whitelist');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove domain');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockDomain = async () => {
    if (!newBlockedDomain.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    setLoading(true);
    try {
      await service.blockDomain(newBlockedDomain.trim());
      setNewBlockedDomain('');
      await loadSettings();
      toast.success('Domain blocked');
    } catch (error: any) {
      toast.error(error.message || 'Failed to block domain');
    } finally {
      setLoading(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div
      className={`${isMobile ? 'p-4' : 'p-6'} max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-700 bg-gray-900`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Adblocker Settings</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        )}
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-6 rounded-lg bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-white">Enable Adblocker</div>
            <div className="mt-1 text-sm text-gray-400">
              Block ads and trackers across all websites
            </div>
          </div>
          <button
            onClick={() => handleToggle(!settings.enabled)}
            disabled={loading}
            className={`relative h-6 w-12 rounded-full transition-colors ${
              settings.enabled ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          >
            <div
              className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mb-6 rounded-lg bg-gray-800 p-4">
          <div className="mb-3 font-medium text-white">Statistics</div>
          <div className="mb-1 text-2xl font-bold text-indigo-400">{stats.totalBlocked || 0}</div>
          <div className="text-sm text-gray-400">Requests blocked</div>
        </div>
      )}

      {/* Filter Lists */}
      <div className="mb-6">
        <div className="mb-3 font-medium text-white">Filter Lists</div>
        <div className="space-y-2">
          {settings.filterLists.map(list => (
            <div
              key={list.id}
              className="flex items-center justify-between rounded-lg bg-gray-800 p-3"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{list.name}</div>
                <div className="truncate text-xs text-gray-400">{list.url}</div>
              </div>
              <button
                onClick={() => handleToggleFilterList(list.id, !list.enabled)}
                disabled={loading}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  list.enabled ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'
                } min-h-[28px] disabled:opacity-50`}
              >
                {list.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Whitelist */}
      <div className="mb-6">
        <div className="mb-3 font-medium text-white">Whitelisted Domains</div>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newWhitelistDomain}
            onChange={e => setNewWhitelistDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && handleWhitelistDomain()}
          />
          <button
            onClick={handleWhitelistDomain}
            disabled={loading}
            className="min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {settings.whitelistedDomains.map(domain => (
            <div key={domain} className="flex items-center justify-between rounded bg-gray-800 p-2">
              <span className="text-sm text-gray-300">{domain}</span>
              <button
                onClick={() => handleUnwhitelistDomain(domain)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {settings.whitelistedDomains.length === 0 && (
            <div className="py-4 text-center text-sm text-gray-400">No whitelisted domains</div>
          )}
        </div>
      </div>

      {/* Blocked Domains */}
      <div>
        <div className="mb-3 font-medium text-white">Blocked Domains</div>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newBlockedDomain}
            onChange={e => setNewBlockedDomain(e.target.value)}
            placeholder="ads.example.com"
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && handleBlockDomain()}
          />
          <button
            onClick={handleBlockDomain}
            disabled={loading}
            className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {settings.blockedDomains.map(domain => (
            <div key={domain} className="flex items-center justify-between rounded bg-gray-800 p-2">
              <span className="text-sm text-gray-300">{domain}</span>
            </div>
          ))}
          {settings.blockedDomains.length === 0 && (
            <div className="py-4 text-center text-sm text-gray-400">No custom blocked domains</div>
          )}
        </div>
      </div>
    </div>
  );
}
