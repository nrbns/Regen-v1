// @ts-nocheck

import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, Settings as SettingsIcon, Monitor, Shield, Download, Globe, Cpu, Bell, Palette, Power, ChevronRight, Lock, Eye, Trash2, Video, Database, Cloud, Sparkles, Loader2, RefreshCcw, Accessibility } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../lib/ipc-typed';
import { applyTelemetryOptIn } from '../lib/monitoring/sentry-client';
import { applyAnalyticsOptIn } from '../lib/monitoring/analytics-client';
import { ShieldsPanel } from '../components/privacy/ShieldsPanel';
import { NetworkPanel } from '../components/privacy/NetworkPanel';
import { GDPRDataExport } from '../components/privacy/GDPRDataExport';
import { AccessibilityAudit } from '../components/accessibility/AccessibilityAudit';

type Settings = {
  privacy: {
    burnOnClose: boolean;
    telemetry: 'off' | 'on';
    doNotTrack: boolean;
    autoPurgeCookies: boolean;
    purgeAfterDays: number;
  };
  network: {
    doh: boolean;
    dohProvider: 'cloudflare' | 'quad9';
    proxy: string | null;
    perTabProxy: boolean;
    quic: boolean;
  };
  downloads: {
    requireConsent: boolean;
    defaultPath: string;
    checksum: boolean;
  };
  diagnostics: {
    telemetryOptIn: boolean;
  };
  performance: {
    tabSleepMins: number;
    memoryCapMB: number;
    gpuAcceleration: boolean;
  };
  ai: {
    provider: 'local' | 'openai' | 'anthropic';
    model: string;
    maxTokens: number;
    temperature: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    showProxyBadge: boolean;
  };
  startup: {
    behavior: 'newTab' | 'continueSession' | 'customPages';
    customPages: string[];
  };
};

type Section = {
  id: string;
  title: string;
  icon: any;
  category: string;
};

type PermissionEntry = {
  type: 'camera' | 'microphone' | 'filesystem' | 'clipboard:write' | 'notifications';
  origin: string;
  grantedAt: number;
  expiresAt: number;
};

const sections: Section[] = [
  { id: 'appearance', title: 'Appearance', icon: Palette, category: 'Basics' },
  { id: 'startup', title: 'On startup', icon: Power, category: 'Basics' },
  { id: 'privacy', title: 'Privacy and security', icon: Shield, category: 'Privacy' },
  { id: 'downloads', title: 'Downloads', icon: Download, category: 'Basics' },
  { id: 'videoCall', title: 'Video calls', icon: Video, category: 'Advanced' },
  { id: 'languages', title: 'Languages', icon: Globe, category: 'Advanced' },
  { id: 'system', title: 'System', icon: Monitor, category: 'Advanced' },
  { id: 'diagnostics', title: 'Diagnostics', icon: Database, category: 'Advanced' },
  { id: 'performance', title: 'Performance', icon: Cpu, category: 'Advanced' },
  { id: 'notifications', title: 'Notifications', icon: Bell, category: 'Advanced' },
  { id: 'ai', title: 'AI Models', icon: Sparkles, category: 'AI & Sync' },
  { id: 'cloudVector', title: 'Cloud Vector DB', icon: Cloud, category: 'AI & Sync' },
  { id: 'hybridSearch', title: 'Hybrid Search', icon: Search, category: 'AI & Sync' },
  { id: 'e2eeSync', title: 'E2EE Sync', icon: Lock, category: 'AI & Sync' },
];

export default function Settings() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('appearance');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoCallConfig, setVideoCallConfig] = useState({
    enabled: true,
    adaptiveQuality: true,
    maxResolution: '720p' as '720p' | '480p' | '360p' | '240p',
    maxFrameRate: 30,
    bandwidthEstimate: 1000,
    priorityMode: 'balanced' as 'performance' | 'balanced' | 'quality',
  });
  const [networkQuality, setNetworkQuality] = useState({
    bandwidth: 1000,
    latency: 50,
    packetLoss: 0,
    quality: 'good',
  });
  const [ollamaChecking, setOllamaChecking] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaError, setOllamaError] = useState<string | null>(null);
  const [diagnosticsNotice, setDiagnosticsNotice] = useState<{ text: string; tone: 'success' | 'error' } | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [permissionsEntries, setPermissionsEntries] = useState<PermissionEntry[]>([]);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Try to load settings, with fallback defaults
        let loaded: Settings | null = null;
        try {
          loaded = await ipc.settings.get() as Settings;
        } catch (error) {
          console.warn('Failed to load settings from IPC, using defaults:', error);
        }
        
        
        // Use defaults if loading failed
        if (!loaded) {
          loaded = {
            privacy: {
              burnOnClose: false,
              telemetry: 'off',
              doNotTrack: true,
              autoPurgeCookies: false,
              purgeAfterDays: 30,
            },
            network: {
              doh: false,
              dohProvider: 'cloudflare',
              proxy: null,
              perTabProxy: false,
              quic: true,
            },
            downloads: {
              requireConsent: false,
              defaultPath: 'Downloads',
              checksum: false,
            },
            diagnostics: {
              telemetryOptIn: false,
            },
            performance: {
              tabSleepMins: 20,
              memoryCapMB: 2048,
              gpuAcceleration: true,
            },
            ai: {
              provider: 'local',
              model: 'default',
              maxTokens: 4096,
              temperature: 0.7,
            },
            ui: {
              theme: 'dark',
              compactMode: false,
              showProxyBadge: true,
            },
            startup: {
              behavior: 'newTab',
              customPages: [],
            },
          };
        }
        
        // Ensure startup settings exist
        if (!loaded.startup) {
          loaded.startup = { behavior: 'newTab', customPages: [] };
        }
        
        // Ensure all required properties exist
        if (!loaded.privacy) loaded.privacy = { burnOnClose: false, telemetry: 'off', doNotTrack: true, autoPurgeCookies: false, purgeAfterDays: 30 };
        if (!loaded.network) loaded.network = { doh: false, dohProvider: 'cloudflare', proxy: null, perTabProxy: false, quic: true };
        if (!loaded.downloads) loaded.downloads = { requireConsent: false, defaultPath: 'Downloads', checksum: false };
        if (!loaded.diagnostics) loaded.diagnostics = { telemetryOptIn: false };
        if (!loaded.performance) loaded.performance = { tabSleepMins: 20, memoryCapMB: 2048, gpuAcceleration: true };
        if (!loaded.ai) loaded.ai = { provider: 'local', model: 'default', maxTokens: 4096, temperature: 0.7 };
        if (!loaded.ui) loaded.ui = { theme: 'dark', compactMode: false, showProxyBadge: true };
        
        setSettings(loaded);
        
        // Load video call config (with fallback)
        try {
          const vcConfig = await ipc.videoCall.getConfig();
          setVideoCallConfig({
            enabled: vcConfig?.enabled ?? true,
            adaptiveQuality: vcConfig?.adaptiveQuality ?? true,
            maxResolution: (vcConfig?.maxResolution || '720p') as '720p' | '480p' | '360p' | '240p',
            maxFrameRate: vcConfig?.maxFrameRate ?? 30,
            bandwidthEstimate: vcConfig?.bandwidthEstimate ?? 1000,
            priorityMode: (vcConfig?.priorityMode || 'balanced') as 'performance' | 'balanced' | 'quality',
          });
        } catch (error) {
          console.warn('Failed to load video call config, using defaults:', error);
          // Keep default videoCallConfig state
        }
        
        // Load network quality (with fallback)
        try {
          const quality = await ipc.videoCall.getNetworkQuality();
          if (quality) {
            setNetworkQuality(quality);
          }
        } catch (error) {
          console.warn('Failed to load network quality, using defaults:', error);
          // Keep default networkQuality state
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Settings load timeout, using defaults');
      setLoading(false);
      // Set default settings if timeout occurs
      setSettings(prev => {
        if (prev) return prev; // Don't override if already loaded
        return {
          privacy: {
            burnOnClose: false,
            telemetry: 'off',
            doNotTrack: true,
            autoPurgeCookies: false,
            purgeAfterDays: 30,
          },
          network: {
            doh: false,
            dohProvider: 'cloudflare',
            proxy: null,
            perTabProxy: false,
            quic: true,
          },
          downloads: {
            requireConsent: false,
            defaultPath: 'Downloads',
            checksum: false,
          },
          performance: {
            tabSleepMins: 20,
            memoryCapMB: 2048,
            gpuAcceleration: true,
          },
          ai: {
            provider: 'local',
            model: 'default',
            maxTokens: 4096,
            temperature: 0.7,
          },
          ui: {
            theme: 'dark',
            compactMode: false,
            showProxyBadge: true,
          },
          startup: {
            behavior: 'newTab',
            customPages: [],
          },
        };
      });
    }, 3000); // 3 second timeout
    
    // Monitor network quality (only if IPC is available)
    let qualityInterval: NodeJS.Timeout | null = null;
    try {
      qualityInterval = setInterval(async () => {
        try {
          const quality = await ipc.videoCall.getNetworkQuality();
          if (quality) {
            setNetworkQuality(quality);
          }
        } catch {
          // Ignore errors in polling
        }
      }, 5000);
    } catch {
      // Interval not set if IPC fails
    }
    
    return () => {
      clearTimeout(timeoutId);
      if (qualityInterval) clearInterval(qualityInterval);
    };
  }, []);

  // Update setting
  const updateSetting = async (path: string[], value: unknown) => {
    try {
      await ipc.settings.set(path, value);
      // Update local state
      if (settings) {
        const newSettings = { ...settings };
        let target: any = newSettings;
        for (let i = 0; i < path.length - 1; i++) {
          target = target[path[i]] = { ...target[path[i]] };
        }
        target[path[path.length - 1]] = value;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const refreshPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    setPermissionsError(null);
    try {
      const result = (await ipc.permissions.list()) as PermissionEntry[] | undefined;
      if (Array.isArray(result)) {
        setPermissionsEntries(result);
      } else {
        setPermissionsEntries([]);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissionsError('Unable to load site permissions right now.');
      setPermissionsEntries([]);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  const handleRevokePermission = useCallback(
    async (entry: PermissionEntry) => {
      try {
        await ipc.permissions.revoke(entry.type, entry.origin);
        await refreshPermissions();
      } catch (error) {
        console.error('Failed to revoke permission:', error);
        setPermissionsError(`Failed to revoke ${entry.type} for ${entry.origin}.`);
      }
    },
    [refreshPermissions],
  );

  const handleClearOriginPermissions = useCallback(
    async (origin: string) => {
      try {
        await ipc.permissions.clearOrigin(origin);
        await refreshPermissions();
      } catch (error) {
        console.error('Failed to clear permissions for origin:', error);
        setPermissionsError(`Failed to clear permissions for ${origin}.`);
      }
    },
    [refreshPermissions],
  );

  const applyPrivacyPreset = useCallback(
    async (preset: 'strict' | 'moderate' | 'relaxed') => {
      const tasks: Promise<unknown>[] = [];
      switch (preset) {
        case 'strict':
          tasks.push(updateSetting(['privacy', 'burnOnClose'], true));
          tasks.push(updateSetting(['privacy', 'autoPurgeCookies'], true));
          tasks.push(updateSetting(['privacy', 'purgeAfterDays'], 1));
          tasks.push(updateSetting(['privacy', 'doNotTrack'], true));
          tasks.push(updateSetting(['downloads', 'requireConsent'], true));
          tasks.push(updateSetting(['diagnostics', 'telemetryOptIn'], false));
          break;
        case 'moderate':
          tasks.push(updateSetting(['privacy', 'burnOnClose'], false));
          tasks.push(updateSetting(['privacy', 'autoPurgeCookies'], true));
          tasks.push(updateSetting(['privacy', 'purgeAfterDays'], 7));
          tasks.push(updateSetting(['privacy', 'doNotTrack'], true));
          tasks.push(updateSetting(['downloads', 'requireConsent'], true));
          break;
        case 'relaxed':
        default:
          tasks.push(updateSetting(['privacy', 'burnOnClose'], false));
          tasks.push(updateSetting(['privacy', 'autoPurgeCookies'], false));
          tasks.push(updateSetting(['privacy', 'purgeAfterDays'], 30));
          tasks.push(updateSetting(['privacy', 'doNotTrack'], false));
          tasks.push(updateSetting(['downloads', 'requireConsent'], false));
          break;
      }
      await Promise.all(tasks);
    },
    [updateSetting],
  );

  const handleOpenLogs = useCallback(async () => {
    try {
      const result = await ipc.diagnostics.openLogs();
      if (result?.success) {
        setDiagnosticsNotice({ text: 'Logs folder opened in your file manager.', tone: 'success' });
      } else {
        setDiagnosticsNotice({ text: 'Unable to open logs folder.', tone: 'error' });
      }
    } catch (error) {
      console.error('Failed to open logs folder:', error);
      setDiagnosticsNotice({ text: 'Failed to open logs folder.', tone: 'error' });
    }
  }, []);

  const handleCopyDiagnostics = useCallback(async () => {
    try {
      const result = await ipc.diagnostics.copyDiagnostics();
      if (result?.diagnostics) {
        await navigator.clipboard.writeText(result.diagnostics);
        setDiagnosticsNotice({ text: 'Diagnostics copied to clipboard.', tone: 'success' });
      } else {
        throw new Error('No diagnostics payload received');
      }
    } catch (error) {
      console.error('Failed to copy diagnostics:', error);
      setDiagnosticsNotice({ text: 'Failed to copy diagnostics to clipboard.', tone: 'error' });
    }
  }, []);

  const handleExportSettings = useCallback(async () => {
    try {
      const result = await ipc.settings.exportFile();
      if (!result) {
        setDiagnosticsNotice({ text: 'Export failed.', tone: 'error' });
        return;
      }
      if (result.canceled) {
        return;
      }
      if (result.success) {
        setDiagnosticsNotice({
          text: result.path ? `Settings exported to ${result.path}.` : 'Settings exported.',
          tone: 'success',
        });
      } else {
        setDiagnosticsNotice({ text: 'Unable to export settings.', tone: 'error' });
      }
    } catch (error) {
      console.error('Failed to export settings:', error);
      setDiagnosticsNotice({ text: 'Failed to export settings.', tone: 'error' });
    }
  }, []);

  const handleImportSettings = useCallback(async () => {
    try {
      const result = await ipc.settings.importFile();
      if (!result) {
        setDiagnosticsNotice({ text: 'Import failed.', tone: 'error' });
        return;
      }
      if (result.canceled) {
        return;
      }
      if (result.success) {
        try {
          const fresh = (await ipc.settings.get()) as Settings;
          setSettings(fresh);
        } catch (error) {
          console.warn('Imported settings but failed to reload via IPC:', error);
        }
        setDiagnosticsNotice({
          text: result.path ? `Imported settings from ${result.path}.` : 'Settings imported.',
          tone: 'success',
        });
      } else {
        setDiagnosticsNotice({ text: 'Unable to import settings.', tone: 'error' });
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      setDiagnosticsNotice({ text: 'Failed to import settings.', tone: 'error' });
    }
  }, []);

  const formatPermissionType = useCallback((type: PermissionEntry['type']) => {
    switch (type) {
      case 'clipboard:write':
        return 'Clipboard';
      case 'filesystem':
        return 'File system';
      case 'microphone':
        return 'Microphone';
      case 'camera':
        return 'Camera';
      case 'notifications':
        return 'Notifications';
      default:
        return type;
    }
  }, []);

  const loadOllamaInfo = useCallback(async () => {
    setOllamaChecking(true);
    setOllamaError(null);
    try {
      const status = await ipc.ollama.check();
      const available = !!status?.available;
      setOllamaAvailable(available);
      if (available) {
        const models =
          status.models && status.models.length > 0
            ? status.models
            : (await ipc.ollama.listModels())?.models || [];
        setOllamaModels(models);
      } else {
        setOllamaModels([]);
      }
    } catch (error) {
      console.warn('Failed to check Ollama availability:', error);
      setOllamaAvailable(false);
      setOllamaModels([]);
      setOllamaError('Unable to reach local Ollama service. Make sure it is running on port 11434.');
    } finally {
      setOllamaChecking(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'ai' || settings?.ai.provider === 'local') {
      void loadOllamaInfo();
    }
  }, [activeSection, settings?.ai.provider, loadOllamaInfo]);

  useEffect(() => {
    if (activeSection === 'privacy') {
      void refreshPermissions();
    }
  }, [activeSection, refreshPermissions]);

  useEffect(() => {
    if (!diagnosticsNotice) return;
    const timeout = setTimeout(() => setDiagnosticsNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [diagnosticsNotice]);

  const aiProviders = useMemo(
    () => [
      {
        id: 'local' as const,
        title: 'Local (Ollama / GGUF)',
        description: 'Run GGUF models offline through the local Ollama service.',
      },
      {
        id: 'openai' as const,
        title: 'OpenAI',
        description: 'Use OpenAI hosted models when cloud consent is granted.',
      },
      {
        id: 'anthropic' as const,
        title: 'Anthropic (coming soon)',
        description: 'Future support for Claude models.',
      },
    ],
    [],
  );

  // Filter sections by search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group sections by category
  const groupedSections = useMemo(() => {
    const groups: { [key: string]: Section[] } = {};
    filteredSections.forEach(section => {
      if (!groups[section.category]) {
        groups[section.category] = [];
      }
      groups[section.category].push(section);
    });
    return groups;
  }, [filteredSections]);

  // Show loading state only briefly
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#1A1D28]">
        <div className="text-center">
          <SettingsIcon size={32} className="text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  // If settings failed to load, use defaults and show error banner
  if (!settings) {
    return (
      <div className="h-full w-full bg-[#1A1D28] text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Failed to load settings</h2>
          <p className="text-gray-400 mb-4">Using default settings. Some features may not be available.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#1A1D28] text-gray-100 flex">
      
      {/* Left Sidebar */}
      <div className="w-64 border-r border-gray-800/50 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings"
              className="w-full h-9 pl-9 pr-3 bg-gray-900/60 border border-gray-700/50 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
            />
          </div>
        </div>

        {/* Sections List */}
        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(groupedSections).map(([category, items]) => (
            <div key={category} className="mb-4">
              <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {category}
              </div>
              {items.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <motion.button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    whileHover={{ x: 2 }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="flex-1 text-left">{section.title}</span>
                    {isActive && <ChevronRight size={16} className="text-blue-400" />}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeSection === 'appearance' && (
            <motion.div
              key="appearance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Appearance</h2>
              
              <div className="space-y-6">
                {/* Theme */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Theme</h3>
                  <div className="space-y-2">
                    {(['light', 'dark', 'auto'] as const).map((theme) => (
                      <label
                        key={theme}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          settings.ui.theme === theme
                            ? 'bg-blue-900/20 border-blue-500/50'
                            : 'bg-gray-900/60 border-gray-800/50 hover:bg-gray-900/80'
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          checked={settings.ui.theme === theme}
                          onChange={() => updateSetting(['ui', 'theme'], theme)}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="capitalize text-gray-200">{theme}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Compact Mode */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Compact mode</h4>
                    <p className="text-sm text-gray-400">Reduce spacing for a more compact interface</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.ui.compactMode}
                      onChange={(e) => updateSetting(['ui', 'compactMode'], e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Show Proxy Badge */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Show proxy badge</h4>
                    <p className="text-sm text-gray-400">Display proxy status indicator in the address bar</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.ui.showProxyBadge}
                      onChange={(e) => updateSetting(['ui', 'showProxyBadge'], e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'startup' && (
            <motion.div
              key="startup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">On startup</h2>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-lg bg-gray-900/60 border border-gray-800/50 hover:bg-gray-900/80 transition-colors cursor-pointer ${
                  settings?.startup.behavior === 'newTab' ? 'border-blue-500/50 bg-blue-900/20' : ''
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer w-full">
                    <input
                      type="radio"
                      name="startup"
                      checked={settings?.startup.behavior === 'newTab'}
                      onChange={() => updateSetting(['startup', 'behavior'], 'newTab')}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-200">Open the New Tab page</div>
                      <div className="text-sm text-gray-400">Show a blank page when you start browsing</div>
                    </div>
                  </label>
                </div>
                <div className={`p-4 rounded-lg bg-gray-900/60 border border-gray-800/50 hover:bg-gray-900/80 transition-colors cursor-pointer ${
                  settings?.startup.behavior === 'continueSession' ? 'border-blue-500/50 bg-blue-900/20' : ''
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer w-full">
                    <input
                      type="radio"
                      name="startup"
                      checked={settings?.startup.behavior === 'continueSession'}
                      onChange={() => updateSetting(['startup', 'behavior'], 'continueSession')}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-200">Continue where you left off</div>
                      <div className="text-sm text-gray-400">Reopen tabs from last session</div>
                    </div>
                  </label>
                </div>
                <div className={`p-4 rounded-lg bg-gray-900/60 border border-gray-800/50 hover:bg-gray-900/80 transition-colors cursor-pointer ${
                  settings?.startup.behavior === 'customPages' ? 'border-blue-500/50 bg-blue-900/20' : ''
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer w-full">
                    <input
                      type="radio"
                      name="startup"
                      checked={settings?.startup.behavior === 'customPages'}
                      onChange={() => updateSetting(['startup', 'behavior'], 'customPages')}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-200">Open a specific page or set of pages</div>
                      <div className="text-sm text-gray-400">Choose which pages to open</div>
                    </div>
                  </label>
                  {settings?.startup.behavior === 'customPages' && (
                    <div className="mt-4 ml-7">
                      <div className="space-y-2">
                        {settings.startup.customPages.map((url, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded">
                            <input
                              type="text"
                              value={url}
                              onChange={(e) => {
                                const newPages = [...settings.startup.customPages];
                                newPages[idx] = e.target.value;
                                updateSetting(['startup', 'customPages'], newPages);
                              }}
                              className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="https://example.com"
                            />
                            <button
                              onClick={() => {
                                const newPages = settings.startup.customPages.filter((_, i) => i !== idx);
                                updateSetting(['startup', 'customPages'], newPages);
                              }}
                              className="px-2 py-1 text-xs text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newPages = [...(settings.startup.customPages || []), ''];
                            updateSetting(['startup', 'customPages'], newPages);
                          }}
                          className="ml-7 px-3 py-1.5 text-sm bg-blue-600/60 hover:bg-blue-600/80 rounded border border-blue-500/30 text-blue-200"
                        >
                          + Add page
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold mb-6">Privacy and security</h2>
                
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Privacy levels</h3>
                        <p className="text-sm text-gray-400">Apply a preset to quickly align browser behavior with your risk tolerance.</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <button
                        onClick={() => void applyPrivacyPreset('strict')}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-left hover:border-red-500/60 transition-colors"
                      >
                        <div className="text-sm font-semibold text-red-300">Strict</div>
                        <p className="mt-2 text-sm text-red-200/80">
                          Wipe data on close, block tracking, require consent for downloads, disable telemetry.
                        </p>
                      </button>
                      <button
                        onClick={() => void applyPrivacyPreset('moderate')}
                        className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-left hover:border-amber-500/60 transition-colors"
                      >
                        <div className="text-sm font-semibold text-amber-200">Moderate</div>
                        <p className="mt-2 text-sm text-amber-100/70">
                          Balanced defaults; auto-purge cookies after a week and keep consent prompts enabled.
                        </p>
                      </button>
                      <button
                        onClick={() => void applyPrivacyPreset('relaxed')}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-left hover:border-emerald-500/60 transition-colors"
                      >
                        <div className="text-sm font-semibold text-emerald-200">Relaxed</div>
                        <p className="mt-2 text-sm text-emerald-100/70">
                          Keep browsing data persistent and minimize prompts for everyday use.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Shields Panel */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield size={20} />
                      Shields
                    </h3>
                    <ShieldsPanel />
                  </div>

                  {/* Privacy Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                      <div className="flex items-center gap-3">
                        <Eye size={20} className="text-gray-400" />
                        <div>
                          <h4 className="font-medium">Send "Do Not Track" request</h4>
                          <p className="text-sm text-gray-400">Tell sites you don't want to be tracked</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.doNotTrack}
                          onChange={(e) => updateSetting(['privacy', 'doNotTrack'], e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                      <div className="flex items-center gap-3">
                        <Trash2 size={20} className="text-gray-400" />
                        <div>
                          <h4 className="font-medium">Burn on close</h4>
                          <p className="text-sm text-gray-400">Clear all data when closing tabs</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.burnOnClose}
                          onChange={(e) => updateSetting(['privacy', 'burnOnClose'], e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                      <div className="flex items-center gap-3">
                        <Lock size={20} className="text-gray-400" />
                        <div>
                          <h4 className="font-medium">Auto-purge cookies</h4>
                          <p className="text-sm text-gray-400">Automatically clear cookies after specified days</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.autoPurgeCookies}
                          onChange={(e) => updateSetting(['privacy', 'autoPurgeCookies'], e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {settings.privacy.autoPurgeCookies && (
                      <div className="ml-8 p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                        <label className="block mb-2 text-sm font-medium">Purge after (days)</label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={settings.privacy.purgeAfterDays}
                          onChange={(e) => updateSetting(['privacy', 'purgeAfterDays'], parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h4 className="font-medium">Per-site permissions</h4>
                        <p className="text-sm text-gray-400">
                          Review camera, microphone, filesystem, clipboard, and notification allowances.
                        </p>
                      </div>
                      <button
                        onClick={() => void refreshPermissions()}
                        className="inline-flex items-center gap-2 rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:border-blue-500/60 hover:text-blue-200 transition-colors"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Refresh
                      </button>
                    </div>
                    {permissionsError && (
                      <div className="mb-3 text-sm text-red-400">{permissionsError}</div>
                    )}
                    {permissionsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading permissions…
                      </div>
                    ) : permissionsEntries.length === 0 ? (
                      <p className="text-sm text-gray-400">No site permissions granted.</p>
                    ) : (
                      <div className="space-y-3">
                        {permissionsEntries.map((entry) => (
                          <div
                            key={`${entry.type}:${entry.origin}`}
                            className="flex flex-col gap-2 rounded-md border border-gray-800/70 bg-gray-900/80 p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-gray-100 break-all">{entry.origin}</p>
                              <p className="text-xs uppercase tracking-wide text-gray-400">
                                {formatPermissionType(entry.type)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Granted{' '}
                                {formatDistanceToNow(entry.grantedAt, { addSuffix: true })}
                                {typeof entry.expiresAt === 'number' && Number.isFinite(entry.expiresAt) && (
                                  <>
                                    {' • '}Expires{' '}
                                    {formatDistanceToNow(entry.expiresAt, { addSuffix: true })}
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => void handleRevokePermission(entry)}
                                className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:border-red-500/60 transition-colors"
                              >
                                Revoke
                              </button>
                              <button
                                onClick={() => void handleClearOriginPermissions(entry.origin)}
                                className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-100 hover:border-yellow-500/60 transition-colors"
                              >
                                Clear origin
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* GDPR Data Export */}
                  <div className="mt-8 p-6 rounded-lg bg-gray-900/60 border border-gray-800/50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Database size={20} />
                      <span>Data Export (GDPR)</span>
                    </h3>
                    <GDPRDataExport />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'downloads' && (
            <motion.div
              key="downloads"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Downloads</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Ask where to save each file before downloading</h4>
                    <p className="text-sm text-gray-400">Require consent before starting downloads</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.downloads.requireConsent}
                      onChange={(e) => updateSetting(['downloads', 'requireConsent'], e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Default download location</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.downloads.defaultPath || 'Downloads folder'}
                      readOnly
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none"
                    />
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
                      Change
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Verify file integrity</h4>
                    <p className="text-sm text-gray-400">Calculate checksums for downloaded files</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.downloads.checksum}
                      onChange={(e) => updateSetting(['downloads', 'checksum'], e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'videoCall' && (
            <motion.div
              key="videoCall"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Video calls</h2>
              <p className="text-gray-400 mb-6">Optimize video call quality for low bandwidth connections</p>
              
              <div className="space-y-6">
                {/* Network Quality Indicator */}
                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <h3 className="text-lg font-semibold mb-3">Network quality</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Bandwidth</div>
                      <div className="text-xl font-bold text-blue-400">{networkQuality.bandwidth} kbps</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Latency</div>
                      <div className="text-xl font-bold text-blue-400">{networkQuality.latency} ms</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Packet Loss</div>
                      <div className="text-xl font-bold text-blue-400">{networkQuality.packetLoss.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Quality</div>
                      <div className={`text-xl font-bold capitalize ${
                        networkQuality.quality === 'excellent' ? 'text-green-400' :
                        networkQuality.quality === 'good' ? 'text-blue-400' :
                        networkQuality.quality === 'fair' ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {networkQuality.quality}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enable Optimizer */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Enable video call optimization</h4>
                    <p className="text-sm text-gray-400">Automatically optimize video quality for low bandwidth</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoCallConfig.enabled}
                      onChange={async (e) => {
                        const newConfig = { ...videoCallConfig, enabled: e.target.checked };
                        setVideoCallConfig(newConfig);
                        await ipc.videoCall.updateConfig(newConfig);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Adaptive Quality */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Adaptive quality</h4>
                    <p className="text-sm text-gray-400">Automatically adjust quality based on network conditions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={videoCallConfig.adaptiveQuality}
                      onChange={async (e) => {
                        const newConfig = { ...videoCallConfig, adaptiveQuality: e.target.checked };
                        setVideoCallConfig(newConfig);
                        await ipc.videoCall.updateConfig(newConfig);
                      }}
                      disabled={!videoCallConfig.enabled}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                      videoCallConfig.enabled ? 'bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500' : 'bg-gray-800 opacity-50'
                    }`}></div>
                  </label>
                </div>

                {/* Max Resolution */}
                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Maximum resolution</label>
                  <select
                    value={videoCallConfig.maxResolution}
                    onChange={async (e) => {
                      const newConfig = { ...videoCallConfig, maxResolution: e.target.value as any };
                      setVideoCallConfig(newConfig);
                      await ipc.videoCall.updateConfig(newConfig);
                    }}
                    disabled={!videoCallConfig.enabled}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="720p">720p (HD)</option>
                    <option value="480p">480p (SD)</option>
                    <option value="360p">360p</option>
                    <option value="240p">240p (Low)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">Lower resolutions use less bandwidth</p>
                </div>

                {/* Max Frame Rate */}
                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Maximum frame rate: {videoCallConfig.maxFrameRate} fps</label>
                  <input
                    type="range"
                    min="10"
                    max="30"
                    step="5"
                    value={videoCallConfig.maxFrameRate}
                    onChange={async (e) => {
                      const newConfig = { ...videoCallConfig, maxFrameRate: parseInt(e.target.value) };
                      setVideoCallConfig(newConfig);
                      await ipc.videoCall.updateConfig(newConfig);
                    }}
                    disabled={!videoCallConfig.enabled}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>10 fps</span>
                    <span>30 fps</span>
                  </div>
                </div>

                {/* Priority Mode */}
                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Priority mode</label>
                  <div className="space-y-2">
                    {(['performance', 'balanced', 'quality'] as const).map((mode) => (
                      <label
                        key={mode}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="priorityMode"
                          checked={videoCallConfig.priorityMode === mode}
                          onChange={async () => {
                            const newConfig = { ...videoCallConfig, priorityMode: mode };
                            setVideoCallConfig(newConfig);
                            await ipc.videoCall.updateConfig(newConfig);
                          }}
                          disabled={!videoCallConfig.enabled}
                          className="w-4 h-4 text-blue-600 disabled:opacity-50"
                        />
                        <div>
                          <span className="capitalize font-medium">{mode}</span>
                          <p className="text-xs text-gray-400">
                            {mode === 'performance' && 'Minimize bandwidth, prioritize stability'}
                            {mode === 'balanced' && 'Balance quality and bandwidth'}
                            {mode === 'quality' && 'Prioritize video quality when possible'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Supported Platforms */}
                <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/30">
                  <h4 className="font-medium mb-2 text-blue-300">Supported platforms</h4>
                  <p className="text-sm text-blue-200/80">
                    Optimizations work automatically with Zoom, Google Meet, Microsoft Teams, WebEx, GoToMeeting, Discord, and other WebRTC-based video calling platforms.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'languages' && (
            <motion.div
              key="languages"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Languages</h2>
              <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                <p className="text-gray-400">Language settings will be available in a future update.</p>
              </div>
            </motion.div>
          )}

          {activeSection === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">System</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <h4 className="font-medium mb-2">Network</h4>
                  <NetworkPanel />
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'diagnostics' && settings && (
            <motion.div
              key="diagnostics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold">Diagnostics</h2>
                <p className="mt-2 text-sm text-gray-400">
                  Review logs, collect troubleshooting details, and control whether diagnostics ever leave your device.
                </p>
              </div>

              {diagnosticsNotice && (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    diagnosticsNotice.tone === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-500/40 bg-red-500/10 text-red-200'
                  }`}
                >
                  {diagnosticsNotice.text}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-gray-800/50 bg-gray-900/60 p-4">
                  <div className="max-w-xl">
                    <h3 className="font-medium text-gray-100">Opt-in diagnostics telemetry</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Share anonymized crash signatures and performance stats to help harden OmniBrowser. Nothing is sent unless you opt in.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.diagnostics.telemetryOptIn}
                      onChange={async (e) => {
                        updateSetting(['diagnostics', 'telemetryOptIn'], e.target.checked);
                        // Also update telemetry + crash reporting service
                        try {
                          await applyTelemetryOptIn(e.target.checked);
                        } catch (error) {
                          console.warn('Failed to update telemetry service', error);
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all" />
                  </label>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-800/50 bg-gray-900/60 p-4">
                  <div className="max-w-xl">
                    <h3 className="font-medium text-gray-100">Enable privacy-friendly analytics</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Collect anonymous feature usage (Matomo / Fathom compatible). No URLs, queries, or personal identifiers leave your device.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.diagnostics.analyticsOptIn}
                      onChange={async (e) => {
                        updateSetting(['diagnostics', 'analyticsOptIn'], e.target.checked);
                        try {
                          await applyAnalyticsOptIn(e.target.checked);
                        } catch (error) {
                          console.warn('Failed to update analytics service', error);
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all" />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => void handleOpenLogs()}
                    className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-3 text-left text-sm font-medium text-blue-100 hover:border-blue-500/60 transition-colors"
                  >
                    Open logs folder
                    <span className="block text-xs font-normal text-blue-200/80">View rotating log files directly.</span>
                  </button>
                  <button
                    onClick={() => void handleCopyDiagnostics()}
                    className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-left text-sm font-medium text-indigo-100 hover:border-indigo-500/60 transition-colors"
                  >
                    Copy diagnostics summary
                    <span className="block text-xs font-normal text-indigo-200/80">Copies environment info & recent log tail.</span>
                  </button>
                  <button
                    onClick={() => void handleExportSettings()}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left text-sm font-medium text-emerald-100 hover:border-emerald-500/60 transition-colors"
                  >
                    Export settings to file
                    <span className="block text-xs font-normal text-emerald-200/80">Saves your configuration to JSON.</span>
                  </button>
                  <button
                    onClick={() => void handleImportSettings()}
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left text-sm font-medium text-amber-100 hover:border-amber-500/60 transition-colors"
                  >
                    Import settings from file
                    <span className="block text-xs font-normal text-amber-200/80">Restore a previously exported setup.</span>
                  </button>
                </div>

                <div className="rounded-lg border border-gray-800/50 bg-gray-900/40 p-4 text-sm text-gray-400">
                  Logs rotate automatically after 5&nbsp;MB or three days, and private/ghost session activity is excluded. Telemetry stays off unless explicitly enabled.
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Performance</h2>
              
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Tab sleep timeout (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={settings.performance.tabSleepMins}
                    onChange={(e) => updateSetting(['performance', 'tabSleepMins'], parseInt(e.target.value) || 20)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Tabs will be put to sleep after this many minutes of inactivity</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Memory cap (MB)</label>
                  <input
                    type="number"
                    min="100"
                    max="8192"
                    value={settings.performance.memoryCapMB}
                    onChange={(e) => updateSetting(['performance', 'memoryCapMB'], parseInt(e.target.value) || 2048)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Maximum memory usage per tab</p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Hardware acceleration</h4>
                    <p className="text-sm text-gray-400">Use GPU acceleration when available</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.performance.gpuAcceleration}
                      onChange={(e) => updateSetting(['performance', 'gpuAcceleration'], e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'accessibility' && (
            <motion.div
              key="accessibility"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Accessibility</h2>
              <AccessibilityAudit />
            </motion.div>
          )}

          {activeSection === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Notifications</h2>
              <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                <p className="text-gray-400">Notification settings will be available in a future update.</p>
              </div>
            </motion.div>
          )}

          {activeSection === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8 space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-gray-100 mb-2">AI Models</h2>
                <p className="text-sm text-gray-400">
                  Configure how OmniBrowser summarizes pages. Local GGUF models keep content offline, while
                  cloud providers require user consent before data leaves your device.
                </p>
              </div>

              <div className="grid gap-3">
                {aiProviders.map((provider) => {
                  const isActive = settings?.ai.provider === provider.id;
                  const disabled = provider.id === 'anthropic';
                  return (
                    <button
                      key={provider.id}
                      onClick={() => {
                        if (disabled || !settings) return;
                        updateSetting(['ai', 'provider'], provider.id);
                      }}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        isActive
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-gray-800/60 bg-gray-900/40 hover:bg-gray-900/60'
                      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
                      disabled={disabled || !settings}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-100">{provider.title}</span>
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-500/40">
                                Active
                              </span>
                            )}
                            {disabled && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/40 text-gray-400 border border-gray-700/60">
                                Coming soon
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{provider.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!settings && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-8">
                  <Loader2 size={16} className="animate-spin" />
                  Loading AI settings…
                </div>
              )}

              {settings?.ai.provider === 'local' && (
                <div className="space-y-4 rounded-xl border border-gray-800/60 bg-gray-900/40 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-100">Local models (Ollama / GGUF)</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        OmniBrowser uses your local Ollama service to run GGUF models offline. Pull additional
                        models with <code className="bg-gray-800/60 border border-gray-700/60 px-2 py-0.5 rounded text-[11px]">ollama pull &lt;model&gt;</code>.
                      </p>
                    </div>
                    <button
                      onClick={() => void loadOllamaInfo()}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700/60 bg-gray-800/40 hover:bg-gray-800/60 text-xs text-gray-200 transition-colors"
                    >
                      {ollamaChecking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                      Refresh
                    </button>
                  </div>

                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    <span
                      className={`inline-flex h-2.5 w-2.5 rounded-full border ${
                        ollamaAvailable ? 'bg-emerald-400/80 border-emerald-300/60' : 'bg-red-400/70 border-red-300/60'
                      }`}
                    />
                    {ollamaAvailable === null
                      ? 'Detecting local Ollama service…'
                      : ollamaAvailable
                      ? 'Ollama is running on localhost:11434.'
                      : 'Ollama service not detected. Start Ollama to run GGUF models offline.'}
                  </div>

                  {ollamaError && (
                    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                      {ollamaError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Active local model
                    </label>
                    <select
                      value={settings.ai.model}
                      onChange={(e) => updateSetting(['ai', 'model'], e.target.value)}
                      disabled={!ollamaAvailable || ollamaChecking}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {ollamaModels.length === 0 && (
                        <option value={settings.ai.model}>
                          {ollamaAvailable ? 'No models detected' : 'Service unavailable'}
                        </option>
                      )}
                      {ollamaModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                      {!ollamaModels.includes(settings.ai.model) && (
                        <option value={settings.ai.model}>{settings.ai.model || 'custom model'}</option>
                      )}
                    </select>
                    <div className="text-[11px] text-gray-500">
                      You can type a custom model name below if it isn’t listed.
                    </div>
                    <input
                      type="text"
                      value={settings.ai.model}
                      onChange={(e) => updateSetting(['ai', 'model'], e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="llama3.2"
                    />
                  </div>
                </div>
              )}

              {settings?.ai.provider === 'openai' && (
                <div className="space-y-4 rounded-xl border border-gray-800/60 bg-gray-900/40 p-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-100">OpenAI configuration</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Set the model ID to use when cloud summarization is approved. Add{' '}
                      <code className="bg-gray-800/60 border border-gray-700/60 px-2 py-0.5 rounded text-[11px]">
                        OPENAI_API_KEY
                      </code>{' '}
                      to your environment before launching OmniBrowser.
                    </p>
                  </div>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Model ID
                  </label>
                  <input
                    type="text"
                    value={settings.ai.model}
                    onChange={(e) => updateSetting(['ai', 'model'], e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="gpt-4o-mini"
                  />
                  <div className="text-[11px] text-gray-500">
                    Cloud summaries always ask for consent before sending article content.
                  </div>
                </div>
              )}

              {settings?.ai.provider === 'anthropic' && (
                <div className="rounded-xl border border-gray-800/60 bg-gray-900/40 p-5 text-sm text-gray-400">
                  Anthropic/Claude integration is on the roadmap. In the meantime, use local GGUF models or the
                  OpenAI provider.
                </div>
              )}

              <div className="space-y-4 rounded-xl border border-gray-800/60 bg-gray-900/40 p-5">
                <h3 className="text-sm font-semibold text-gray-100">Tuning</h3>
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center justify-between text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      <span>Temperature</span>
                      <span className="text-gray-400">{settings?.ai.temperature.toFixed(1)}</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={settings?.ai.temperature ?? 0.7}
                      onChange={(e) => updateSetting(['ai', 'temperature'], parseFloat(e.target.value))}
                      className="w-full mt-2 accent-blue-500"
                    />
                    <div className="text-[11px] text-gray-500 mt-1">
                      Lower values make summaries more deterministic, higher values increase creativity.
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Max tokens
                    </label>
                    <input
                      type="number"
                      min={512}
                      max={65536}
                      step={256}
                      value={settings?.ai.maxTokens ?? 8192}
                      onChange={(e) =>
                        updateSetting(['ai', 'maxTokens'], Math.max(512, parseInt(e.target.value) || 8192))
                      }
                      className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-[11px] text-gray-500 mt-1">
                      Maximum tokens to request from the model during summaries and offline analysis.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'cloudVector' && (
            <motion.div
              key="cloudVector"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Cloud Vector Database</h2>
              <p className="text-gray-400 mb-6">Sync your knowledge graph to the cloud for cross-device access and semantic search</p>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Enable Cloud Vector DB</h4>
                    <p className="text-sm text-gray-400">Sync embeddings to Qdrant or Pinecone for cross-device knowledge sharing</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="cloudVectorEnabled"
                      className="sr-only peer"
                      defaultChecked={false}
                      onChange={async (e) => {
                        try {
                          await ipc.cloudVector.config({
                            enabled: e.target.checked,
                            provider: 'qdrant',
                          });
                        } catch (error) {
                          console.error('Failed to update cloud vector config:', error);
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Provider</label>
                  <select
                    id="cloudVectorProvider"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="qdrant"
                    onChange={async (e) => {
                      try {
                        await ipc.cloudVector.config({
                          enabled: (document.getElementById('cloudVectorEnabled') as HTMLInputElement)?.checked || false,
                          provider: e.target.value as 'qdrant' | 'pinecone' | 'none',
                        });
                      } catch (error) {
                        console.error('Failed to update provider:', error);
                      }
                    }}
                  >
                    <option value="none">None (Local only)</option>
                    <option value="qdrant">Qdrant</option>
                    <option value="pinecone">Pinecone</option>
                  </select>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Endpoint URL</label>
                  <input
                    type="url"
                    placeholder="https://your-qdrant-instance.com"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Qdrant server URL or Pinecone API endpoint</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">API Key</label>
                  <input
                    type="password"
                    placeholder="Enter API key"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Required for cloud providers</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Collection Name</label>
                  <input
                    type="text"
                    placeholder="omnibrowser-vectors"
                    defaultValue="omnibrowser-vectors"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={async () => {
                    try {
                      await ipc.cloudVector.sync([]);
                      alert('Sync started successfully');
                    } catch (error) {
                      console.error('Failed to sync:', error);
                      alert('Sync failed. Check console for details.');
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                >
                  Sync Now
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'hybridSearch' && (
            <motion.div
              key="hybridSearch"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">Hybrid Search</h2>
              <p className="text-gray-400 mb-6">Configure multi-source search aggregation (Brave, Bing, Custom crawler)</p>
              
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <h3 className="text-lg font-semibold mb-4">Search Sources</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Brave Search</h4>
                        <p className="text-sm text-gray-400">Privacy-focused search engine</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="sr-only peer"
                          onChange={async (e) => {
                            try {
                              await ipc.hybridSearch.config({
                                sources: {
                                  brave: { enabled: e.target.checked },
                                },
                              });
                            } catch (error) {
                              console.error('Failed to update Brave config:', error);
                            }
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Bing Search</h4>
                        <p className="text-sm text-gray-400">Microsoft Bing API</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={false}
                          className="sr-only peer"
                          onChange={async (e) => {
                            try {
                              await ipc.hybridSearch.config({
                                sources: {
                                  bing: { enabled: e.target.checked },
                                },
                              });
                            } catch (error) {
                              console.error('Failed to update Bing config:', error);
                            }
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Custom Crawler</h4>
                        <p className="text-sm text-gray-400">Internal web scraper</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="sr-only peer"
                          onChange={async (e) => {
                            try {
                              await ipc.hybridSearch.config({
                                sources: {
                                  custom: { enabled: e.target.checked },
                                },
                              });
                            } catch (error) {
                              console.error('Failed to update custom config:', error);
                            }
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Maximum Results</label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    defaultValue={20}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Enable Reranking</h4>
                    <p className="text-sm text-gray-400">Use ML-based reranking for better results</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="sr-only peer"
                      onChange={async (e) => {
                        try {
                          await ipc.hybridSearch.config({
                            rerank: e.target.checked,
                          });
                        } catch (error) {
                          console.error('Failed to update rerank config:', error);
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'e2eeSync' && (
            <motion.div
              key="e2eeSync"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-8"
            >
              <h2 className="text-2xl font-bold mb-6">End-to-End Encrypted Sync</h2>
              <p className="text-gray-400 mb-6">Brave Sync 2.0 style encrypted chain for cross-device synchronization</p>
              
              <div className="space-y-6">
                <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-700/30">
                  <h4 className="font-medium mb-2 text-blue-300">How it works</h4>
                  <p className="text-sm text-blue-200/80">
                    Your data is encrypted locally before syncing. Only you have the encryption key. 
                    Works without a central server (peer-to-peer) or with an optional relay server.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <div>
                    <h4 className="font-medium">Enable E2EE Sync</h4>
                    <p className="text-sm text-gray-400">Sync bookmarks, history, knowledge graph, and workspaces across devices</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id="e2eeSyncEnabled"
                      className="sr-only peer"
                      defaultChecked={false}
                      onChange={async (e) => {
                        try {
                          await ipc.e2eeSync.config({
                            enabled: e.target.checked,
                          });
                        } catch (error) {
                          console.error('Failed to update E2EE sync config:', error);
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Sync Password</label>
                  <input
                    type="password"
                    id="e2eeSyncPassword"
                    placeholder="Enter password for encryption"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Used to derive encryption key. Must be the same on all devices.</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <label className="block mb-2 text-sm font-medium">Relay Server (Optional)</label>
                  <input
                    type="url"
                    placeholder="wss://sync-relay.example.com"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Leave empty for peer-to-peer sync only</p>
                </div>

                <div className="p-4 rounded-lg bg-gray-900/60 border border-gray-800/50">
                  <h4 className="font-medium mb-3">Sync Targets</h4>
                  <div className="space-y-2">
                    {(['bookmark', 'history', 'knowledge', 'workspace', 'settings'] as const).map((type) => (
                      <label key={type} className="flex items-center gap-3 p-2 rounded bg-gray-800/50 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={true}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const passwordInput = document.getElementById('e2eeSyncPassword') as HTMLInputElement;
                      await ipc.e2eeSync.init({ password: passwordInput?.value || '' });
                      const status = await ipc.e2eeSync.status();
                      alert(`Sync initialized. Status: ${status.synced ? 'Active' : 'Inactive'}`);
                    } catch (error) {
                      console.error('Failed to init sync:', error);
                      alert('Sync initialization failed. Check console for details.');
                    }
                  }}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                >
                  Initialize Sync
                </button>

                <button
                  onClick={async () => {
                    try {
                      await ipc.e2eeSync.sync();
                      alert('Manual sync completed');
                    } catch (error) {
                      console.error('Failed to sync:', error);
                      alert('Sync failed. Check console for details.');
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium"
                >
                  Sync Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
