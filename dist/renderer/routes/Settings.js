import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Settings Page - Complete UI for all settings
 * Tabs: Accounts, Appearance, APIs, Bookmarks, Workspaces, Safety, Shortcuts
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Palette, Plug, Bookmark, FolderOpen, Shield, Keyboard, Zap, Activity, } from 'lucide-react';
import { useSettingsStore } from '../state/settingsStore';
import { useExternalApisStore } from '../state/externalApisStore';
import { useCapabilityStore, getCapabilityDescriptions } from '../core/security/capabilities';
import { pluginRegistry } from '../core/plugins/registry';
import { crashReporter } from '../core/crash-reporting';
import { BookmarksPanel } from '../components/bookmarks/BookmarksPanel';
import { WorkspacesPanel } from '../components/WorkspacesPanel';
import { ShortcutsHelp } from '../components/help/ShortcutsHelp';
import { EXTERNAL_APIS, getApisForMode } from '../config/externalApis';
import { formatDistanceToNow } from 'date-fns';
import { PrivacyDashboard } from '../components/integrations/PrivacyDashboard';
import { useTheme } from '../ui/theme';
// Helper Components
function SectionCard({ title, description, icon: Icon, children, }) {
    return (_jsxs("div", { className: "rounded-lg border border-slate-800 bg-slate-900/50 p-6", children: [_jsxs("div", { className: "mb-4 flex items-center gap-3", children: [Icon && _jsx(Icon, { size: 20, className: "text-slate-400" }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: title }), description && _jsx("p", { className: "mt-1 text-sm text-slate-400", children: description })] })] }), _jsx("div", { className: "space-y-4", children: children })] }));
}
function ToggleRow({ label, checked, onChange, description, }) {
    return (_jsxs("div", { className: "flex items-center justify-between py-2", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "cursor-pointer text-sm font-medium text-slate-200", children: label }), description && _jsx("p", { className: "mt-1 text-xs text-slate-400", children: description })] }), _jsx("button", { type: "button", onClick: () => onChange(!checked), className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-700'}`, role: "switch", "aria-checked": checked, children: _jsx("span", { className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}` }) })] }));
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
];
export default function SettingsRoute() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'accounts');
    useEffect(() => {
        if (tabParam && TABS.some(t => t.id === tabParam)) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
    };
    return (_jsxs("div", { className: "flex h-full w-full bg-slate-950 text-slate-100", children: [_jsxs("div", { className: "w-64 border-r border-slate-800 bg-slate-900/50 p-4", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "Settings" }), _jsx("nav", { className: "space-y-1", children: TABS.map(tab => {
                            const Icon = tab.icon;
                            return (_jsxs("button", { onClick: () => handleTabChange(tab.id), className: `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${activeTab === tab.id
                                    ? 'border border-blue-500/40 bg-blue-600/20 text-blue-300'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`, children: [_jsx(Icon, { size: 18 }), _jsx("span", { children: tab.label })] }, tab.id));
                        }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6", children: [activeTab === 'accounts' && _jsx(AccountsPanel, {}), activeTab === 'appearance' && _jsx(AppearancePanel, {}), activeTab === 'apis' && _jsx(ApisPanel, {}), activeTab === 'bookmarks' && (_jsx("div", { className: "h-full", children: _jsx(BookmarksPanel, {}) })), activeTab === 'workspaces' && (_jsx("div", { className: "h-full", children: _jsx(WorkspacesPanel, {}) })), activeTab === 'safety' && _jsx(SafetyPanel, {}), activeTab === 'shortcuts' && _jsx(ShortcutsHelp, {})] })] }));
}
// Accounts Panel
function AccountsPanel() {
    const settings = useSettingsStore();
    const account = settings.account;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(SectionCard, { title: "Profile", icon: User, children: [_jsx(LabeledField, { label: "Display Name", children: _jsx("input", { type: "text", value: account?.displayName || '', onChange: e => settings.updateAccount({ displayName: e.target.value }), placeholder: "Your name", className: "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" }) }), _jsx(LabeledField, { label: "Avatar Color", children: _jsx("input", { type: "color", value: account?.avatarColor || '#8b5cf6', onChange: e => settings.updateAccount({ avatarColor: e.target.value }), className: "h-10 w-20 cursor-pointer rounded" }) })] }), _jsx(SectionCard, { title: "Account Status", icon: User, children: _jsxs("div", { className: "text-sm text-slate-400", children: [_jsx("p", { children: "Local account (no sign-in required)" }), _jsx("p", { className: "mt-2 text-xs", children: "Your data is stored locally on this device." })] }) })] }));
}
// Appearance Panel
function AppearancePanel() {
    const settings = useSettingsStore();
    const appearance = settings.appearance;
    const { preference, setPreference } = useTheme();
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(SectionCard, { title: "Theme", icon: Palette, children: [_jsx(LabeledField, { label: "Color Scheme", children: _jsxs("select", { value: preference || 'system', onChange: e => setPreference(e.target.value), className: "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50", children: [_jsx("option", { value: "system", children: "System (Auto)" }), _jsx("option", { value: "dark", children: "Dark" }), _jsx("option", { value: "light", children: "Light" })] }) }), _jsx("p", { className: "text-xs text-slate-400", children: "System mode automatically switches between light and dark based on your OS preference" }), _jsx(ToggleRow, { label: "Compact UI", checked: appearance.compactUI || false, onChange: checked => settings.updateAppearance({ compactUI: checked }), description: "Reduce spacing and padding for a more compact interface" }), _jsx(ToggleRow, { label: "Chrome-style New Tab Page", checked: appearance.chromeNewTabPage ?? true, onChange: checked => settings.updateAppearance({ chromeNewTabPage: checked }), description: "Use Google Chrome-style new tab page" })] }), _jsxs(SectionCard, { title: "Display", icon: Palette, children: [_jsx(LabeledField, { label: "Font Size", children: _jsxs("select", { value: appearance.fontSize || 'medium', onChange: e => settings.updateAppearance({ fontSize: e.target.value }), className: "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50", children: [_jsx("option", { value: "small", children: "Small" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "large", children: "Large" })] }) }), _jsx(ToggleRow, { label: "Smooth Scrolling", checked: appearance.smoothScrolling ?? true, onChange: checked => settings.updateAppearance({ smoothScrolling: checked }), description: "Enable smooth scrolling animations" }), _jsx(ToggleRow, { label: "Reduced Motion", checked: appearance.reducedMotion || false, onChange: checked => settings.updateAppearance({ reducedMotion: checked }), description: "Reduce animations for better performance" })] })] }));
}
// APIs Panel
function ApisPanel() {
    const { apis, setApiEnabled, setApiKey } = useExternalApisStore();
    const [selectedMode, setSelectedMode] = useState('research');
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const modeApis = getApisForMode(selectedMode);
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "mb-6 flex gap-2", children: ['research', 'trade', 'threat', 'image'].map(mode => (_jsx("button", { onClick: () => setSelectedMode(mode), className: `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`, children: mode.charAt(0).toUpperCase() + mode.slice(1) }, mode))) }), _jsx(SectionCard, { title: `${selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1)} Mode APIs`, icon: Plug, children: _jsx("div", { className: "space-y-3", children: modeApis.map((api) => {
                        const apiState = apis[api.id];
                        const health = apiState?.health;
                        const isEnabled = apiState?.enabled ?? false;
                        const needsApiKey = api.authType === 'apiKey' && !apiState?.apiKey;
                        return (_jsxs("div", { className: "rounded-lg border border-slate-800 bg-slate-800/30 p-4", children: [_jsxs("div", { className: "mb-3 flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("h4", { className: "font-medium text-slate-200", children: api.name }), needsApiKey && (_jsx("span", { className: "rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300", children: "Key Required" })), api.rateLimitPerMin && api.rateLimitPerMin > 100 && (_jsx("span", { className: "rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300", children: "High Rate Limit" }))] }), _jsx("p", { className: "mb-2 text-xs text-slate-400", children: api.description }), health && (_jsxs("div", { className: "text-xs text-slate-500", children: ["Last success:", ' ', health.lastSuccess
                                                            ? formatDistanceToNow(new Date(health.lastSuccess), { addSuffix: true })
                                                            : 'Never', health.requestCount > 0 &&
                                                            health.errorCount > 0 &&
                                                            ` • Error rate: ${((health.errorCount / health.requestCount) * 100).toFixed(1)}%`] }))] }), _jsx(ToggleRow, { label: "", checked: isEnabled, onChange: checked => setApiEnabled(api.id, checked) })] }), isEnabled && needsApiKey && (_jsxs("div", { className: "mt-3 border-t border-slate-700 pt-3", children: [_jsx(LabeledField, { label: "API Key", children: _jsx("input", { type: "password", value: apiState?.apiKey || '', onChange: e => setApiKey(api.id, e.target.value), placeholder: `Enter ${api.name} API key`, className: "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" }) }), api.docsUrl && (_jsx("a", { href: api.docsUrl, target: "_blank", rel: "noopener noreferrer", className: "mt-1 inline-block text-xs text-blue-400 hover:text-blue-300", children: "Get API key \u2192" }))] }))] }, api.id));
                    }) }) }), _jsxs(SectionCard, { title: "API Diagnostics", icon: Activity, children: [_jsx(ToggleRow, { label: "Show Diagnostics", checked: showDiagnostics, onChange: setShowDiagnostics, description: "View detailed API health metrics" }), showDiagnostics && _jsx(ApiDiagnosticsPanel, {})] })] }));
}
function ApiDiagnosticsPanel() {
    const { apis } = useExternalApisStore();
    const allApis = EXTERNAL_APIS;
    return (_jsx("div", { className: "mt-4 overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-slate-700", children: [_jsx("th", { className: "px-3 py-2 text-left text-slate-400", children: "API" }), _jsx("th", { className: "px-3 py-2 text-left text-slate-400", children: "Mode" }), _jsx("th", { className: "px-3 py-2 text-left text-slate-400", children: "Status" }), _jsx("th", { className: "px-3 py-2 text-left text-slate-400", children: "Last Success" }), _jsx("th", { className: "px-3 py-2 text-left text-slate-400", children: "Error Rate" }), _jsx("th", { className: "px-3 py-2 text-left text-slate-400", children: "Avg Latency" })] }) }), _jsx("tbody", { children: allApis.map((api) => {
                        const apiState = apis[api.id];
                        const health = apiState?.health;
                        const isEnabled = apiState?.enabled ?? false;
                        return (_jsxs("tr", { className: "border-b border-slate-800", children: [_jsx("td", { className: "px-3 py-2 text-slate-200", children: api.name }), _jsx("td", { className: "px-3 py-2 text-slate-400", children: api.mode }), _jsx("td", { className: "px-3 py-2", children: _jsx("span", { className: `rounded px-2 py-0.5 text-xs ${isEnabled ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400'}`, children: isEnabled ? 'Enabled' : 'Disabled' }) }), _jsx("td", { className: "px-3 py-2 text-slate-400", children: health?.lastSuccess
                                        ? formatDistanceToNow(new Date(health.lastSuccess), { addSuffix: true })
                                        : 'Never' }), _jsx("td", { className: "px-3 py-2 text-slate-400", children: health && health.requestCount > 0
                                        ? `${((health.errorCount / health.requestCount) * 100).toFixed(1)}%`
                                        : 'N/A' }), _jsx("td", { className: "px-3 py-2 text-slate-400", children: health?.avgLatency ? `${health.avgLatency}ms` : 'N/A' })] }, api.id));
                    }) })] }) }));
}
// Safety Panel
function SafetyPanel() {
    const { capabilities, experimentalToolsEnabled, externalPluginsEnabled, setCapability, setExperimentalTools, setExternalPlugins, } = useCapabilityStore();
    const capabilityDescriptions = getCapabilityDescriptions();
    const plugins = pluginRegistry.getAll();
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(SectionCard, { title: "Agent Capabilities", icon: Shield, children: [_jsx("p", { className: "mb-4 text-sm text-slate-400", children: "Control what OmniAgent can do. Disable capabilities you don't trust." }), Object.entries(capabilities).map(([cap, enabled]) => (_jsx(ToggleRow, { label: capabilityDescriptions[cap], checked: enabled, onChange: checked => setCapability(cap, checked) }, cap)))] }), _jsxs(SectionCard, { title: "Experimental Features", icon: Zap, children: [_jsx(ToggleRow, { label: "Allow experimental tools", checked: experimentalToolsEnabled, onChange: setExperimentalTools, description: "Enable experimental agent tools that may be unstable" }), _jsx(ToggleRow, { label: "Allow external plugins", checked: externalPluginsEnabled, onChange: setExternalPlugins, description: "Allow loading and running external plugins" })] }), _jsxs(SectionCard, { title: "Plugins", icon: Plug, children: [_jsx("p", { className: "mb-4 text-sm text-slate-400", children: "Manage installed plugins and extensions." }), plugins.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500", children: "No plugins installed" })) : (_jsx("div", { className: "space-y-2", children: plugins.map(plugin => (_jsxs("div", { className: "flex items-center justify-between rounded-lg border border-slate-800 p-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-white", children: plugin.name }), _jsx("p", { className: "text-xs text-slate-400", children: plugin.description || 'No description' })] }), _jsx(ToggleRow, { label: "", checked: plugin.enabled, onChange: enabled => {
                                        if (enabled) {
                                            pluginRegistry.enable(plugin.id);
                                        }
                                        else {
                                            pluginRegistry.disable(plugin.id);
                                        }
                                    } })] }, plugin.id))) }))] }), _jsxs(SectionCard, { title: "Crash Reporting", icon: Activity, children: [_jsx("p", { className: "mb-4 text-sm text-slate-400", children: "Help improve Regen by automatically reporting crashes and errors." }), _jsx(ToggleRow, { label: "Send crash reports", checked: crashReporter.isEnabled(), onChange: enabled => crashReporter.setEnabled(enabled), description: "Automatically send error reports to help improve Regen" })] }), _jsx(SectionCard, { title: "Privacy & Trust Controls", icon: Shield, description: "Manage domain trust levels and privacy settings", children: _jsx(PrivacyDashboard, {}) })] }));
}
