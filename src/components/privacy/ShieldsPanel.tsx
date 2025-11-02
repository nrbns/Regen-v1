/**
 * Shields Panel - Brave-like privacy controls
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldOff, Lock, Cookie, FileCode, Webcam } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';

export function ShieldsPanel() {
  const { activeId } = useTabsStore();
  const [shields, setShields] = useState<any>(null);
  const [url, setUrl] = useState('');

  useEffect(() => {
    const loadShields = async () => {
      if (url) {
        try {
          const config = await ipc.shields.get(url);
          setShields(config);
        } catch (error) {
          console.error('Failed to load shields:', error);
        }
      }
    };
    loadShields();
  }, [url]);

  useEffect(() => {
    if (activeId) {
      ipc.tabs.list().then(tabs => {
        const tab = tabs.find((t: any) => t.id === activeId);
        if (tab) {
          setUrl((tab as any).url || '');
        }
      });
    }
  }, [activeId]);

  const updateShield = async (key: string, value: any) => {
    if (!shields) return;
    const newConfig = { ...shields.config, [key]: value };
    try {
      await ipc.shields.set(shields.hostname || url, { [key]: value });
      setShields({ ...shields, config: newConfig });
    } catch (error) {
      console.error('Failed to update shield:', error);
    }
  };

  if (!shields) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Navigate to a website to see shields configuration
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="text-blue-400" size={20} />
        <h3 className="font-semibold text-gray-200">Shields for {shields.hostname || 'this site'}</h3>
      </div>

      {/* Ad & Tracker Blocking */}
      <ShieldToggle
        icon={<ShieldCheck />}
        label="Ads & Trackers"
        description="Block ads and tracking scripts"
        enabled={shields.config.ads}
        onChange={(enabled) => updateShield('ads', enabled)}
      />

      {/* Cookie Control */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Cookie size={16} />
          <span>Cookies</span>
        </div>
        <select
          value={shields.config.cookies}
          onChange={(e) => updateShield('cookies', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200"
        >
          <option value="all">Allow all cookies</option>
          <option value="3p">Block third-party cookies</option>
          <option value="none">Block all cookies</option>
        </select>
      </div>

      {/* HTTPS-Only */}
      <ShieldToggle
        icon={<Lock />}
        label="HTTPS-Only Mode"
        description="Upgrade all HTTP connections to HTTPS"
        enabled={shields.config.httpsOnly}
        onChange={(enabled) => updateShield('httpsOnly', enabled)}
      />

      {/* Fingerprinting Protection */}
      <ShieldToggle
        icon={<FileCode />}
        label="Fingerprinting Protection"
        description="Add noise to canvas, audio, and WebGL fingerprints"
        enabled={shields.config.fingerprinting}
        onChange={(enabled) => updateShield('fingerprinting', enabled)}
      />

      {/* Script Blocking */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <FileCode size={16} />
          <span>JavaScript</span>
        </div>
        <select
          value={shields.config.scripts}
          onChange={(e) => updateShield('scripts', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200"
        >
          <option value="all">Allow all scripts</option>
          <option value="3p">Block third-party scripts</option>
          <option value="none">Block all scripts</option>
        </select>
      </div>

      {/* WebRTC Blocking */}
      <ShieldToggle
        icon={<Webcam />}
        label="WebRTC Leak Protection"
        description="Block WebRTC to prevent IP leaks"
        enabled={shields.config.webrtc}
        onChange={(enabled) => updateShield('webrtc', enabled)}
      />
    </div>
  );
}

function ShieldToggle({ 
  icon, 
  label, 
  description, 
  enabled, 
  onChange 
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded ${enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700/50 text-gray-500'}`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-200">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
      <motion.button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-blue-500' : 'bg-gray-700'
        }`}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
          animate={{ x: enabled ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
}

