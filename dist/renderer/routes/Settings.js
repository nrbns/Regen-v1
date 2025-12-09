import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Settings Page - Complete UI for all settings
 * Tabs: Accounts, Appearance, APIs, Bookmarks, Workspaces, Safety, Shortcuts
 */
import { useState } from 'react';
import { User, Palette, Plug, Bookmark, FolderOpen, Shield, Keyboard, Zap, Activity, Settings2, Trophy, FileText, Video, Globe,
// Bot, // Unused
 } from 'lucide-react';
import { useSettingsStore } from '../state/settingsStore';
import { useExternalApisStore } from '../state/externalApisStore';
import { useCapabilityStore, getCapabilityDescriptions } from '../core/security/capabilities';
import { pluginRegistry } from '../core/plugins/registry';
import { crashReporter } from '../core/crash-reporting';
import { BookmarksPanel } from '../components/bookmarks/BookmarksPanel';
import { WorkspacesPanel } from '../components/WorkspacesPanel';
import { ShortcutsHelp } from '../components/help/ShortcutsHelp';
// Optional components - only available in tauri-migration, removed for now
import { EXTERNAL_APIS } from '../config/externalApis';
import { RedixModeToggle } from '../components/redix/RedixModeToggle';
// import { getRedixConfig } from '../lib/redix-mode'; // Unused
import { LanguageSelector } from '../components/settings/LanguageSelector';
import { ModelDownloader } from '../components/settings/ModelDownloader';
import { SettingsPersistence } from '../components/settings/SettingsPersistence';
// Helper Components
function SectionCard({ title, description, icon: Icon, children, }) {
    return (_jsxs("div", { className: "rounded-lg border border-slate-800 bg-slate-900/50 p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [Icon && _jsx(Icon, { size: 20, className: "text-slate-400" }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: title }), description && _jsx("p", { className: "text-sm text-slate-400 mt-1", children: description })] })] }), _jsx("div", { className: "space-y-4", children: children })] }));
}
function ToggleRow({ label, checked, onChange, description, }) {
    return (_jsxs("div", { className: "flex items-center justify-between py-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-sm font-medium text-slate-200 cursor-pointer", children: label }), description && _jsx("p", { className: "text-xs text-slate-400 mt-1", children: description })] }), _jsx("button", { type: "button", onClick: () => onChange(!checked), className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-700'}`, role: "switch", "aria-checked": checked, children: _jsx("span", { className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}` }) })] }));
}
function LabeledField({ label, children }) {
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium text-slate-200", children: label }), children] }));
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
    { id: 'system', label: 'System', icon: Settings2 },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'bounty', label: 'Bounty', icon: Trophy },
    { id: 'resume', label: 'Resume Fixer', icon: FileText },
    { id: 'recorder', label: 'Clip Recorder', icon: Video },
];
export default function SettingsRoute() {
    const [activeTab, setActiveTab] = useState('accounts');
    const settings = useSettingsStore();
    return (_jsxs("div", { className: "flex h-full w-full bg-slate-950 text-slate-100", children: [_jsxs("div", { className: "w-64 border-r border-slate-800 bg-slate-900/50 p-4", children: [_jsx("h2", { className: "text-lg font-semibold mb-4", children: "Settings" }), _jsx("nav", { className: "space-y-1", children: TABS.map(tab => {
                            const Icon = tab.icon;
                            return (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`, children: [_jsx(Icon, { size: 18 }), _jsx("span", { children: tab.label })] }, tab.id));
                        }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6", children: [activeTab === 'accounts' && _jsx(AccountsPanel, {}), activeTab === 'appearance' && _jsx(AppearancePanel, {}), activeTab === 'apis' && _jsx(ApisPanel, {}), activeTab === 'bookmarks' && (_jsx("div", { className: "h-full", children: _jsx(BookmarksPanel, {}) })), activeTab === 'workspaces' && (_jsx("div", { className: "h-full", children: _jsx(WorkspacesPanel, {}) })), activeTab === 'safety' && _jsx(SafetyPanel, {}), activeTab === 'shortcuts' && _jsx(ShortcutsHelp, {}), activeTab === 'system' && (_jsxs("div", { className: "max-w-4xl space-y-6", children: [_jsxs(SectionCard, { title: "System Settings", icon: Settings2, children: [_jsx("p", { className: "text-sm text-slate-400 mb-4", children: "System configuration and diagnostics." }), _jsxs("div", { className: "space-y-4", children: [_jsx(RedixModeToggle, { showLabel: true, compact: false }), _jsxs("div", { className: "pt-4 border-t border-slate-800", children: [_jsx("h4", { className: "text-sm font-semibold text-white mb-2", children: "Privacy Mode" }), _jsx(ToggleRow, { label: "Enable Privacy Mode", checked: settings.privacy.trackerProtection && settings.privacy.adBlockEnabled, onChange: checked => settings.updatePrivacy({
                                                            trackerProtection: checked,
                                                            adBlockEnabled: checked,
                                                        }), description: "Block trackers and ads for enhanced privacy" })] })] })] }), _jsx(SectionCard, { title: "AI Models", icon: Zap, children: _jsx(ModelDownloader, {}) }), _jsx(SectionCard, { title: "Data Management", icon: Activity, children: _jsx(SettingsPersistence, {}) })] })), activeTab === 'skills' && (_jsx("div", { className: "h-full", children: _jsx(SectionCard, { title: "Skills Store", icon: Zap, children: _jsx("p", { className: "text-sm text-slate-400", children: "Skills store coming soon." }) }) })), activeTab === 'bounty' && (_jsx("div", { className: "h-full", children: _jsx(SectionCard, { title: "Bounty Submission", icon: Trophy, children: _jsx("p", { className: "text-sm text-slate-400", children: "Bounty submission coming soon." }) }) })), activeTab === 'resume' && (_jsx("div", { className: "h-full", children: _jsx(SectionCard, { title: "Resume Fixer", icon: FileText, children: _jsx("p", { className: "text-sm text-slate-400", children: "Resume fixer coming soon." }) }) })), activeTab === 'recorder' && (_jsx("div", { className: "h-full", children: _jsx(SectionCard, { title: "Clip Recorder", icon: Video, children: _jsx("p", { className: "text-sm text-slate-400", children: "Clip recorder coming soon." }) }) }))] })] }));
}
// Panel Components
function AccountsPanel() {
    const settings = useSettingsStore();
    const account = settings.account;
    return (_jsx("div", { className: "max-w-4xl space-y-6", children: _jsxs(SectionCard, { title: "Account Settings", icon: User, children: [_jsx(LabeledField, { label: "Display Name", children: _jsx("input", { type: "text", value: account?.displayName || '', onChange: e => settings.updateAccount({ displayName: e.target.value }), className: "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none", placeholder: "Your name" }) }), _jsx(LabeledField, { label: "Email", children: _jsx("input", { type: "email", value: account?.email || '', onChange: e => settings.updateAccount({ email: e.target.value }), className: "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none", placeholder: "your@email.com" }) }), _jsx(LabeledField, { label: "Avatar Color", children: _jsx("input", { type: "color", value: account?.avatarColor || '#8b5cf6', onChange: e => settings.updateAccount({ avatarColor: e.target.value }), className: "h-10 w-20 rounded cursor-pointer" }) })] }) }));
}
function AppearancePanel() {
    const settings = useSettingsStore();
    const appearance = settings.appearance;
    return (_jsxs("div", { className: "max-w-4xl space-y-6", children: [_jsx(SectionCard, { title: "Language", icon: Globe, children: _jsx(LanguageSelector, {}) }), _jsxs(SectionCard, { title: "Theme", icon: Palette, children: [_jsx(LabeledField, { label: "Color Scheme", children: _jsxs("select", { value: appearance.theme || 'dark', onChange: e => settings.updateAppearance({ theme: e.target.value }), className: "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50", children: [_jsx("option", { value: "dark", children: "Dark" }), _jsx("option", { value: "light", children: "Light" }), _jsx("option", { value: "system", children: "System" })] }) }), _jsx(ToggleRow, { label: "Compact UI", checked: appearance.compactUI || false, onChange: checked => settings.updateAppearance({ compactUI: checked }), description: "Reduce spacing and padding for a more compact interface" }), _jsx(ToggleRow, { label: "Chrome-style New Tab Page", checked: appearance.chromeNewTabPage ?? true, onChange: checked => settings.updateAppearance({ chromeNewTabPage: checked }), description: "Use Google Chrome-style new tab page" })] })] }));
}
function ApisPanel() {
    const { apis: _apis, setApiKey, setApiEnabled, getApiConfig } = useExternalApisStore();
    const [selectedMode, setSelectedMode] = useState('research');
    const modeApis = EXTERNAL_APIS.filter(api => api.mode === selectedMode);
    return (_jsxs("div", { className: "max-w-4xl space-y-6", children: [_jsx("div", { className: "flex gap-2 mb-6", children: ['research', 'trade', 'threat', 'image'].map(mode => (_jsx("button", { onClick: () => setSelectedMode(mode), className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`, children: mode.charAt(0).toUpperCase() + mode.slice(1) }, mode))) }), _jsx(SectionCard, { title: `${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Mode APIs`, icon: Plug, children: _jsx("div", { className: "space-y-3", children: modeApis.map(api => {
                        const apiConfig = getApiConfig(api.id);
                        const isEnabled = apiConfig?.enabled ?? false;
                        const apiKey = apiConfig?.apiKey || '';
                        return (_jsxs("div", { className: "p-4 rounded-lg border border-slate-800 bg-slate-800/30", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h4", { className: "font-medium text-slate-200", children: api.name }), api.authType === 'apiKey' && !apiKey && (_jsx("span", { className: "px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300", children: "Key Required" }))] }), _jsx("p", { className: "text-xs text-slate-400 mb-2", children: api.description })] }), _jsx(ToggleRow, { label: "", checked: isEnabled, onChange: checked => setApiEnabled(api.id, checked) })] }), isEnabled && api.authType === 'apiKey' && (_jsxs("div", { className: "mt-3 pt-3 border-t border-slate-700", children: [_jsx(LabeledField, { label: "API Key", children: _jsx("input", { type: "password", value: apiKey, onChange: e => setApiKey(api.id, e.target.value), placeholder: `Enter ${api.name} API key`, className: "w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" }) }), api.docsUrl && (_jsx("a", { href: api.docsUrl, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block", children: "Get API key \u2192" }))] }))] }, api.id));
                    }) }) })] }));
}
function SafetyPanel() {
    const { capabilities, setCapability, experimentalToolsEnabled, externalPluginsEnabled, setExperimentalTools, setExternalPlugins } = useCapabilityStore();
    const capabilityDescriptions = getCapabilityDescriptions();
    const plugins = pluginRegistry.getAll();
    return (_jsxs("div", { className: "max-w-4xl space-y-6", children: [_jsxs(SectionCard, { title: "Agent Capabilities", icon: Shield, children: [_jsx("p", { className: "text-sm text-slate-400 mb-4", children: "Control what OmniAgent can do. Disable capabilities you don't trust." }), Object.entries(capabilities).map(([cap, enabled]) => (_jsx(ToggleRow, { label: capabilityDescriptions[cap] || cap, checked: enabled, onChange: checked => setCapability(cap, checked), description: `Allow agent to ${cap.replace(/_/g, ' ')}` }, cap)))] }), _jsxs(SectionCard, { title: "Experimental Features", icon: Zap, children: [_jsx(ToggleRow, { label: "Allow experimental tools", checked: experimentalToolsEnabled, onChange: setExperimentalTools, description: "Enable experimental agent tools that may be unstable" }), _jsx(ToggleRow, { label: "Allow external plugins", checked: externalPluginsEnabled, onChange: setExternalPlugins, description: "Allow loading and running external plugins" })] }), _jsxs(SectionCard, { title: "Plugins", icon: Plug, children: [_jsx("p", { className: "text-sm text-slate-400 mb-4", children: "Manage installed plugins and extensions." }), plugins.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500", children: "No plugins installed" })) : (_jsx("div", { className: "space-y-2", children: plugins.map(plugin => (_jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg border border-slate-800", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-white", children: plugin.name }), _jsx("p", { className: "text-xs text-slate-400", children: plugin.description || 'No description' })] }), _jsx(ToggleRow, { label: "", checked: plugin.enabled, onChange: enabled => {
                                        if (enabled) {
                                            pluginRegistry.enable(plugin.id);
                                        }
                                        else {
                                            pluginRegistry.disable(plugin.id);
                                        }
                                    } })] }, plugin.id))) }))] }), _jsxs(SectionCard, { title: "Crash Reporting", icon: Activity, children: [_jsx("p", { className: "text-sm text-slate-400 mb-4", children: "Help improve Regen by automatically reporting crashes and errors." }), _jsx(ToggleRow, { label: "Send crash reports", checked: crashReporter.isEnabled(), onChange: enabled => crashReporter.setEnabled(enabled), description: "Automatically send error reports to help improve Regen" })] })] }));
}
