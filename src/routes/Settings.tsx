/**
 * Settings Page - Complete UI for all settings
 * Tabs: Accounts, Appearance, APIs, Bookmarks, Workspaces, Safety, Shortcuts
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  Palette,
  Plug,
  Bookmark,
  FolderOpen,
  Shield,
  Keyboard,
  Zap,
  Activity,
} from 'lucide-react';
import { useSettingsStore } from '../state/settingsStore';
import { useExternalApisStore } from '../state/externalApisStore';
import { useCapabilityStore, getCapabilityDescriptions } from '../core/security/capabilities';
import { pluginRegistry } from '../core/plugins/registry';
import { crashReporter } from '../core/crash-reporting';
import { BookmarksPanel } from '../components/bookmarks/BookmarksPanel';
import { WorkspacesPanel } from '../components/WorkspacesPanel';
import { ShortcutsHelp } from '../components/help/ShortcutsHelp';
import { EXTERNAL_APIS, getApisForMode, type ExternalAPI } from '../config/externalApis';
import { formatDistanceToNow } from 'date-fns';
import { PrivacyDashboard } from '../components/integrations/PrivacyDashboard';

// Helper Components
function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center gap-3">
        {Icon && <Icon size={20} className="text-slate-400" />}
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <label className="cursor-pointer text-sm font-medium text-slate-200">{label}</label>
        {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-slate-700'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-200">{label}</label>
      {children}
    </div>
  );
}

// Tab definitions
const TABS = [
  { id: 'accounts', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'apis', label: 'APIs', icon: Plug },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'workspaces', label: 'Workspaces', icon: FolderOpen },
  { id: 'safety', label: 'Safety', icon: Shield },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'accounts'
  );

  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-900/50 p-4">
        <h2 className="mb-4 text-lg font-semibold">Settings</h2>
        <nav className="space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border border-blue-500/40 bg-blue-600/20 text-blue-300'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'accounts' && <AccountsPanel />}
        {activeTab === 'appearance' && <AppearancePanel />}
        {activeTab === 'apis' && <ApisPanel />}
        {activeTab === 'bookmarks' && (
          <div className="h-full">
            <BookmarksPanel />
          </div>
        )}
        {activeTab === 'workspaces' && (
          <div className="h-full">
            <WorkspacesPanel />
          </div>
        )}
        {activeTab === 'safety' && <SafetyPanel />}
        {activeTab === 'shortcuts' && <ShortcutsHelp />}
      </div>
    </div>
  );
}

// Accounts Panel
function AccountsPanel() {
  const settings = useSettingsStore();
  const account = settings.account;

  return (
    <div className="space-y-6">
      <SectionCard title="Profile" icon={User}>
        <LabeledField label="Display Name">
          <input
            type="text"
            value={account?.displayName || ''}
            onChange={e => settings.updateAccount({ displayName: e.target.value })}
            placeholder="Your name"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </LabeledField>
        <LabeledField label="Avatar Color">
          <input
            type="color"
            value={account?.avatarColor || '#8b5cf6'}
            onChange={e => settings.updateAccount({ avatarColor: e.target.value })}
            className="h-10 w-20 cursor-pointer rounded"
          />
        </LabeledField>
      </SectionCard>

      <SectionCard title="Account Status" icon={User}>
        <div className="text-sm text-slate-400">
          <p>Local account (no sign-in required)</p>
          <p className="mt-2 text-xs">Your data is stored locally on this device.</p>
        </div>
      </SectionCard>
    </div>
  );
}

// Appearance Panel
function AppearancePanel() {
  const settings = useSettingsStore();
  const appearance = settings.appearance;

  return (
    <div className="space-y-6">
      <SectionCard title="Theme" icon={Palette}>
        <LabeledField label="Color Scheme">
          <select
            value={appearance.theme || 'dark'}
            onChange={e =>
              settings.updateAppearance({ theme: e.target.value as 'light' | 'dark' | 'system' })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </LabeledField>
        <ToggleRow
          label="Compact UI"
          checked={appearance.compactUI || false}
          onChange={checked => settings.updateAppearance({ compactUI: checked })}
          description="Reduce spacing and padding for a more compact interface"
        />
        <ToggleRow
          label="Chrome-style New Tab Page"
          checked={appearance.chromeNewTabPage ?? true}
          onChange={checked => settings.updateAppearance({ chromeNewTabPage: checked })}
          description="Use Google Chrome-style new tab page"
        />
      </SectionCard>
    </div>
  );
}

// APIs Panel
function ApisPanel() {
  const { apis, setApiEnabled, setApiKey } = useExternalApisStore();
  const [selectedMode, setSelectedMode] = useState<'trade' | 'research' | 'threat' | 'image'>(
    'research'
  );
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const modeApis = getApisForMode(selectedMode);

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="mb-6 flex gap-2">
        {(['research', 'trade', 'threat', 'image'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setSelectedMode(mode)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* APIs List */}
      <SectionCard
        title={`${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Mode APIs`}
        icon={Plug}
      >
        <div className="space-y-3">
          {modeApis.map((api: ExternalAPI) => {
            const apiState = apis[api.id];
            const health = apiState?.health;
            const isEnabled = apiState?.enabled ?? false;
            const needsApiKey = api.authType === 'apiKey' && !apiState?.apiKey;

            return (
              <div key={api.id} className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="font-medium text-slate-200">{api.name}</h4>
                      {needsApiKey && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                          Key Required
                        </span>
                      )}
                      {api.rateLimitPerMin && api.rateLimitPerMin > 100 && (
                        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                          High Rate Limit
                        </span>
                      )}
                    </div>
                    <p className="mb-2 text-xs text-slate-400">{api.description}</p>
                    {health && (
                      <div className="text-xs text-slate-500">
                        Last success:{' '}
                        {health.lastSuccess
                          ? formatDistanceToNow(new Date(health.lastSuccess), { addSuffix: true })
                          : 'Never'}
                        {health.requestCount > 0 &&
                          health.errorCount > 0 &&
                          ` • Error rate: ${((health.errorCount / health.requestCount) * 100).toFixed(1)}%`}
                      </div>
                    )}
                  </div>
                  <ToggleRow
                    label=""
                    checked={isEnabled}
                    onChange={checked => setApiEnabled(api.id, checked)}
                  />
                </div>
                {isEnabled && needsApiKey && (
                  <div className="mt-3 border-t border-slate-700 pt-3">
                    <LabeledField label="API Key">
                      <input
                        type="password"
                        value={apiState?.apiKey || ''}
                        onChange={e => setApiKey(api.id, e.target.value)}
                        placeholder={`Enter ${api.name} API key`}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </LabeledField>
                    {api.docsUrl && (
                      <a
                        href={api.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-blue-400 hover:text-blue-300"
                      >
                        Get API key →
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Diagnostics */}
      <SectionCard title="API Diagnostics" icon={Activity}>
        <ToggleRow
          label="Show Diagnostics"
          checked={showDiagnostics}
          onChange={setShowDiagnostics}
          description="View detailed API health metrics"
        />
        {showDiagnostics && <ApiDiagnosticsPanel />}
      </SectionCard>
    </div>
  );
}

function ApiDiagnosticsPanel() {
  const { apis } = useExternalApisStore();
  const allApis = EXTERNAL_APIS;

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="px-3 py-2 text-left text-slate-400">API</th>
            <th className="px-3 py-2 text-left text-slate-400">Mode</th>
            <th className="px-3 py-2 text-left text-slate-400">Status</th>
            <th className="px-3 py-2 text-left text-slate-400">Last Success</th>
            <th className="px-3 py-2 text-left text-slate-400">Error Rate</th>
            <th className="px-3 py-2 text-left text-slate-400">Avg Latency</th>
          </tr>
        </thead>
        <tbody>
          {allApis.map((api: ExternalAPI) => {
            const apiState = apis[api.id];
            const health = apiState?.health;
            const isEnabled = apiState?.enabled ?? false;

            return (
              <tr key={api.id} className="border-b border-slate-800">
                <td className="px-3 py-2 text-slate-200">{api.name}</td>
                <td className="px-3 py-2 text-slate-400">{api.mode}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {health?.lastSuccess
                    ? formatDistanceToNow(new Date(health.lastSuccess), { addSuffix: true })
                    : 'Never'}
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {health && health.requestCount > 0
                    ? `${((health.errorCount / health.requestCount) * 100).toFixed(1)}%`
                    : 'N/A'}
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {health?.avgLatency ? `${health.avgLatency}ms` : 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Safety Panel
function SafetyPanel() {
  const {
    capabilities,
    experimentalToolsEnabled,
    externalPluginsEnabled,
    setCapability,
    setExperimentalTools,
    setExternalPlugins,
  } = useCapabilityStore();

  const capabilityDescriptions = getCapabilityDescriptions();
  const plugins = pluginRegistry.getAll();

  return (
    <div className="space-y-6">
      <SectionCard title="Agent Capabilities" icon={Shield}>
        <p className="mb-4 text-sm text-slate-400">
          Control what OmniAgent can do. Disable capabilities you don't trust.
        </p>
        {Object.entries(capabilities).map(([cap, enabled]) => (
          <ToggleRow
            key={cap}
            label={capabilityDescriptions[cap as keyof typeof capabilityDescriptions]}
            checked={enabled}
            onChange={checked => setCapability(cap as any, checked)}
          />
        ))}
      </SectionCard>

      <SectionCard title="Experimental Features" icon={Zap}>
        <ToggleRow
          label="Allow experimental tools"
          checked={experimentalToolsEnabled}
          onChange={setExperimentalTools}
          description="Enable experimental agent tools that may be unstable"
        />
        <ToggleRow
          label="Allow external plugins"
          checked={externalPluginsEnabled}
          onChange={setExternalPlugins}
          description="Allow loading and running external plugins"
        />
      </SectionCard>

      <SectionCard title="Plugins" icon={Plug}>
        <p className="mb-4 text-sm text-slate-400">Manage installed plugins and extensions.</p>
        {plugins.length === 0 ? (
          <p className="text-sm text-slate-500">No plugins installed</p>
        ) : (
          <div className="space-y-2">
            {plugins.map(plugin => (
              <div
                key={plugin.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">{plugin.name}</p>
                  <p className="text-xs text-slate-400">{plugin.description || 'No description'}</p>
                </div>
                <ToggleRow
                  label=""
                  checked={plugin.enabled}
                  onChange={enabled => {
                    if (enabled) {
                      pluginRegistry.enable(plugin.id);
                    } else {
                      pluginRegistry.disable(plugin.id);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Crash Reporting" icon={Activity}>
        <p className="mb-4 text-sm text-slate-400">
          Help improve Regen by automatically reporting crashes and errors.
        </p>
        <ToggleRow
          label="Send crash reports"
          checked={crashReporter.isEnabled()}
          onChange={enabled => crashReporter.setEnabled(enabled)}
          description="Automatically send error reports to help improve Regen"
        />
      </SectionCard>

      {/* Phase 2: Privacy Dashboard */}
      <SectionCard
        title="Privacy & Trust Controls"
        icon={Shield}
        description="Manage domain trust levels and privacy settings"
      >
        <PrivacyDashboard />
      </SectionCard>
    </div>
  );
}
