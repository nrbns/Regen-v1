/**
 * Settings Page - Complete UI for all settings
 * Tabs: Accounts, Appearance, APIs, Bookmarks, Workspaces, Safety, Shortcuts
 */

import { useState } from 'react';
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
      <div className="flex items-center gap-3 mb-4">
        {Icon && <Icon size={20} className="text-slate-400" />}
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
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
        <label className="text-sm font-medium text-slate-200 cursor-pointer">{label}</label>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
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
  const [activeTab, setActiveTab] = useState<TabId>('accounts');

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-lg font-semibold mb-4">Settings</h2>
        <nav className="space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </LabeledField>
        <LabeledField label="Avatar Color">
          <input
            type="color"
            value={account?.avatarColor || '#8b5cf6'}
            onChange={e => settings.updateAccount({ avatarColor: e.target.value })}
            className="h-10 w-20 rounded cursor-pointer"
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
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
      <div className="flex gap-2 mb-6">
        {(['research', 'trade', 'threat', 'image'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setSelectedMode(mode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              <div key={api.id} className="p-4 rounded-lg border border-slate-800 bg-slate-800/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-200">{api.name}</h4>
                      {needsApiKey && (
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300">
                          Key Required
                        </span>
                      )}
                      {api.rateLimitPerMin && api.rateLimitPerMin > 100 && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-300">
                          High Rate Limit
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{api.description}</p>
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
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <LabeledField label="API Key">
                      <input
                        type="password"
                        value={apiState?.apiKey || ''}
                        onChange={e => setApiKey(api.id, e.target.value)}
                        placeholder={`Enter ${api.name} API key`}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </LabeledField>
                    {api.docsUrl && (
                      <a
                        href={api.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
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
            <th className="text-left py-2 px-3 text-slate-400">API</th>
            <th className="text-left py-2 px-3 text-slate-400">Mode</th>
            <th className="text-left py-2 px-3 text-slate-400">Status</th>
            <th className="text-left py-2 px-3 text-slate-400">Last Success</th>
            <th className="text-left py-2 px-3 text-slate-400">Error Rate</th>
            <th className="text-left py-2 px-3 text-slate-400">Avg Latency</th>
          </tr>
        </thead>
        <tbody>
          {allApis.map((api: ExternalAPI) => {
            const apiState = apis[api.id];
            const health = apiState?.health;
            const isEnabled = apiState?.enabled ?? false;

            return (
              <tr key={api.id} className="border-b border-slate-800">
                <td className="py-2 px-3 text-slate-200">{api.name}</td>
                <td className="py-2 px-3 text-slate-400">{api.mode}</td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-400">
                  {health?.lastSuccess
                    ? formatDistanceToNow(new Date(health.lastSuccess), { addSuffix: true })
                    : 'Never'}
                </td>
                <td className="py-2 px-3 text-slate-400">
                  {health && health.requestCount > 0
                    ? `${((health.errorCount / health.requestCount) * 100).toFixed(1)}%`
                    : 'N/A'}
                </td>
                <td className="py-2 px-3 text-slate-400">
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
        <p className="text-sm text-slate-400 mb-4">
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
        <p className="text-sm text-slate-400 mb-4">Manage installed plugins and extensions.</p>
        {plugins.length === 0 ? (
          <p className="text-sm text-slate-500">No plugins installed</p>
        ) : (
          <div className="space-y-2">
            {plugins.map(plugin => (
              <div
                key={plugin.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-800"
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
        <p className="text-sm text-slate-400 mb-4">
          Help improve OmniBrowser by automatically reporting crashes and errors.
        </p>
        <ToggleRow
          label="Send crash reports"
          checked={crashReporter.isEnabled()}
          onChange={enabled => crashReporter.setEnabled(enabled)}
          description="Automatically send error reports to help improve OmniBrowser"
        />
      </SectionCard>
    </div>
  );
}
