/**
 * Privacy Dashboard
 * 
 * Comprehensive privacy and security settings dashboard.
 * Shows current privacy status, encryption status, and provides controls.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Database,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Settings,
} from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';

interface PrivacyStatus {
  privacyMode: 'Normal' | 'Private' | 'Ghost';
  encryptionEnabled: boolean;
  incognitoTabs: number;
  historyEnabled: boolean;
  cookiesEnabled: boolean;
  cacheEnabled: boolean;
  fingerprintProtection: boolean;
  torEnabled: boolean;
  dnsOverHttps: boolean;
  webrtcBlocked: boolean;
}

export function PrivacyDashboard({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<PrivacyStatus>({
    privacyMode: 'Normal',
    encryptionEnabled: false,
    incognitoTabs: 0,
    historyEnabled: true,
    cookiesEnabled: true,
    cacheEnabled: true,
    fingerprintProtection: false,
    torEnabled: false,
    dnsOverHttps: false,
    webrtcBlocked: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadStatus = async () => {
      try {
        setLoading(true);

        // Get current tabs to count incognito tabs
        const tabs = useTabsStore.getState().tabs;
        const incognitoCount = tabs.filter((t: any) => t.mode === 'private' || t.mode === 'ghost').length;

        // Get Tor status
        let torEnabled = false;
        try {
          const torStatus = (await ipc.tor.status()) as any;
          torEnabled = torStatus?.running || false;
        } catch {
          // Tor not available
        }

        // Load privacy settings from localStorage/config
        const encryptionEnabled = localStorage.getItem('regen:encryption:enabled') === 'true';
        const historyEnabled = localStorage.getItem('regen:history:enabled') !== 'false';
        const cookiesEnabled = localStorage.getItem('regen:cookies:enabled') !== 'false';
        const cacheEnabled = localStorage.getItem('regen:cache:enabled') !== 'false';
        const fingerprintProtection = localStorage.getItem('regen:fingerprint:protection') === 'true';
        const dnsOverHttps = localStorage.getItem('regen:dns:over:https') === 'true';
        const webrtcBlocked = localStorage.getItem('regen:webrtc:blocked') === 'true';

        setStatus({
          privacyMode: 'Normal', // Default, could be enhanced
          encryptionEnabled,
          incognitoTabs: incognitoCount,
          historyEnabled,
          cookiesEnabled,
          cacheEnabled,
          fingerprintProtection,
          torEnabled,
          dnsOverHttps,
          webrtcBlocked,
        });
      } catch (error) {
        console.error('[PrivacyDashboard] Failed to load status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSetting = async (key: keyof PrivacyStatus, storageKey: string, applyToBackend = false) => {
    const newValue = !status[key];
    
    // Update local state
    setStatus({ ...status, [key]: newValue });
    
    // Persist to localStorage
    localStorage.setItem(storageKey, String(newValue));
    
    // Apply to backend if needed (for settings that require IPC)
    if (applyToBackend) {
      try {
        // Apply setting via IPC if available
        // For now, just persist locally
        console.log(`[PrivacyDashboard] Setting ${key} to ${newValue}`);
      } catch (error) {
        console.error(`[PrivacyDashboard] Failed to apply ${key}:`, error);
        // Revert on error
        setStatus({ ...status, [key]: !newValue });
        localStorage.setItem(storageKey, String(!newValue));
      }
    }
    
    // Emit event for real-time updates
    window.dispatchEvent(new CustomEvent('regen:privacy:setting:changed', {
      detail: { key, value: newValue, storageKey },
    }));
    
    // Also emit to event bus for cross-tab sync
    try {
      const { regenEventBus } = await import('../../core/events/eventBus');
      regenEventBus.emit({
        type: 'COMMAND',
        payload: JSON.stringify({
          action: 'privacy_setting_changed',
          key,
          value: newValue,
        }),
      });
    } catch (error) {
      console.warn('[PrivacyDashboard] Event bus not available:', error);
    }
  };

  const PrivacySection = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-slate-400" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );

  const StatusRow = ({
    label,
    value,
    description,
    enabled,
    settingKey,
    storageKey,
    applyToBackend = false,
    readOnly = false,
  }: {
    label: string;
    value?: string | number;
    description?: string;
    enabled?: boolean;
    settingKey?: keyof PrivacyStatus;
    storageKey?: string;
    applyToBackend?: boolean;
    readOnly?: boolean;
  }) => (
    <div className="flex items-start justify-between py-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-white">{label}</p>
          {enabled !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {enabled ? 'ON' : 'OFF'}
            </span>
          )}
        </div>
        {value !== undefined && (
          <p className="text-xs text-slate-400 mt-0.5">{value}</p>
        )}
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {!readOnly && settingKey && storageKey && (
        <button
          onClick={() => toggleSetting(settingKey, storageKey, applyToBackend)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            enabled ? 'bg-green-500' : 'bg-slate-600'
          }`}
          title={`Toggle ${label}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Privacy & Security Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded transition-colors"
          >
            <XCircle className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-400"></div>
              <p className="text-sm text-slate-400 mt-4">Loading privacy status...</p>
            </div>
          ) : (
            <>
              {/* Current Status Overview */}
              <PrivacySection title="Current Status" icon={Info}>
                <div className="space-y-2">
                  <StatusRow
                    label="Privacy Mode"
                    value={status.privacyMode}
                    description="Current browsing mode"
                    readOnly={true}
                  />
                  <StatusRow
                    label="Incognito Tabs"
                    value={`${status.incognitoTabs} active`}
                    description="Private browsing tabs"
                    readOnly={true}
                  />
                  <StatusRow
                    label="Tor Network"
                    value={status.torEnabled ? 'Connected' : 'Disabled'}
                    enabled={status.torEnabled}
                    description="Traffic routed through Tor"
                    readOnly={true}
                  />
                </div>
              </PrivacySection>

              {/* Data Protection */}
              <PrivacySection title="Data Protection" icon={Lock}>
                <div className="space-y-2">
                  <StatusRow
                    label="Encryption"
                    value={status.encryptionEnabled ? 'Enabled' : 'Disabled'}
                    enabled={status.encryptionEnabled}
                    description="Encrypt sensitive data at rest"
                    settingKey="encryptionEnabled"
                    storageKey="regen:encryption:enabled"
                    applyToBackend={false}
                  />
                  <StatusRow
                    label="History"
                    enabled={status.historyEnabled}
                    description="Store browsing history"
                    settingKey="historyEnabled"
                    storageKey="regen:history:enabled"
                    applyToBackend={true}
                  />
                  <StatusRow
                    label="Cookies"
                    enabled={status.cookiesEnabled}
                    description="Store cookies and site data"
                    settingKey="cookiesEnabled"
                    storageKey="regen:cookies:enabled"
                    applyToBackend={true}
                  />
                  <StatusRow
                    label="Cache"
                    enabled={status.cacheEnabled}
                    description="Store cached files"
                    settingKey="cacheEnabled"
                    storageKey="regen:cache:enabled"
                    applyToBackend={true}
                  />
                </div>
              </PrivacySection>

              {/* Privacy Features */}
              <PrivacySection title="Privacy Features" icon={Eye}>
                <div className="space-y-2">
                  <StatusRow
                    label="Fingerprint Protection"
                    enabled={status.fingerprintProtection}
                    description="Protect against browser fingerprinting"
                    settingKey="fingerprintProtection"
                    storageKey="regen:fingerprint:protection"
                    applyToBackend={true}
                  />
                  <StatusRow
                    label="WebRTC Blocking"
                    enabled={status.webrtcBlocked}
                    description="Block WebRTC IP leaks"
                    settingKey="webrtcBlocked"
                    storageKey="regen:webrtc:blocked"
                    applyToBackend={true}
                  />
                  <StatusRow
                    label="DNS-over-HTTPS"
                    enabled={status.dnsOverHttps}
                    description="Encrypt DNS queries"
                    settingKey="dnsOverHttps"
                    storageKey="regen:dns:over:https"
                    applyToBackend={true}
                  />
                </div>
              </PrivacySection>

              {/* Security Recommendations */}
              <PrivacySection title="Security Recommendations" icon={AlertTriangle}>
                <div className="space-y-3">
                  {!status.encryptionEnabled && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-400">Enable Encryption</p>
                        <p className="text-xs text-yellow-300/80 mt-1">
                          Encrypt sensitive data to protect against unauthorized access
                        </p>
                      </div>
                    </div>
                  )}
                  {!status.fingerprintProtection && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-400">Enable Fingerprint Protection</p>
                        <p className="text-xs text-yellow-300/80 mt-1">
                          Prevent websites from tracking you through browser fingerprinting
                        </p>
                      </div>
                    </div>
                  )}
                  {!status.webrtcBlocked && (
                    <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-400">Block WebRTC</p>
                        <p className="text-xs text-yellow-300/80 mt-1">
                          Prevent WebRTC IP address leaks
                        </p>
                      </div>
                    </div>
                  )}
                  {status.encryptionEnabled && status.fingerprintProtection && status.webrtcBlocked && (
                    <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-400">All Security Features Enabled</p>
                        <p className="text-xs text-green-300/80 mt-1">
                          Your browser is configured with recommended privacy settings
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </PrivacySection>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Privacy settings are stored locally and never transmitted
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
