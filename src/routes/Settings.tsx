import { useState, useEffect, useMemo } from 'react';
import { Search, Settings as SettingsIcon, Monitor, Shield, Download, Globe, Cpu, Bell, Palette, Power, ChevronRight, Lock, Eye, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../lib/ipc-typed';
import { ShieldsPanel } from '../components/privacy/ShieldsPanel';
import { NetworkPanel } from '../components/privacy/NetworkPanel';

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

import { Video } from 'lucide-react';

const sections: Section[] = [
  { id: 'appearance', title: 'Appearance', icon: Palette, category: 'Basics' },
  { id: 'startup', title: 'On startup', icon: Power, category: 'Basics' },
  { id: 'privacy', title: 'Privacy and security', icon: Shield, category: 'Privacy' },
  { id: 'downloads', title: 'Downloads', icon: Download, category: 'Basics' },
  { id: 'videoCall', title: 'Video calls', icon: Video, category: 'Advanced' },
  { id: 'languages', title: 'Languages', icon: Globe, category: 'Advanced' },
  { id: 'system', title: 'System', icon: Monitor, category: 'Advanced' },
  { id: 'performance', title: 'Performance', icon: Cpu, category: 'Advanced' },
  { id: 'notifications', title: 'Notifications', icon: Bell, category: 'Advanced' },
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

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loaded = await ipc.settings.get() as Settings;
        // Ensure startup settings exist
        if (!loaded.startup) {
          loaded.startup = { behavior: 'newTab', customPages: [] };
        }
        setSettings(loaded);
        
        // Load video call config
        const vcConfig = await ipc.videoCall.getConfig();
        setVideoCallConfig({
          ...vcConfig,
          maxResolution: (vcConfig.maxResolution || '720p') as '720p' | '480p' | '360p' | '240p',
          priorityMode: (vcConfig.priorityMode || 'balanced') as 'performance' | 'balanced' | 'quality',
        });
        
        // Load network quality
        const quality = await ipc.videoCall.getNetworkQuality();
        setNetworkQuality(quality);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
    
    // Monitor network quality
    const qualityInterval = setInterval(async () => {
      try {
        const quality = await ipc.videoCall.getNetworkQuality();
        setNetworkQuality(quality);
      } catch {}
    }, 5000);
    
    return () => clearInterval(qualityInterval);
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

  if (loading || !settings) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#1A1D28]">
        <SettingsIcon size={24} className="text-blue-400 animate-spin" />
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
        </AnimatePresence>
      </div>
    </div>
  );
}
