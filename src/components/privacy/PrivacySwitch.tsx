/**
 * PrivacySwitch - Toggle between Normal/Private/Ghost modes
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Network } from 'lucide-react';
import { useProfileStore } from '../state/profileStore';
import { useTabsStore } from '../state/tabsStore';
import { detectTorBrowser } from '../core/tor-detector';
import { getGhostMode } from '../core/ghost-mode';

type PrivacyMode = 'Normal' | 'Private' | 'Ghost';

export function PrivacySwitch() {
  const [mode, setMode] = useState<PrivacyMode>('Normal');
  const [torDetected, setTorDetected] = useState(false);
  const [ghostModeActive, setGhostModeActive] = useState(false);
  const policy = useProfileStore(state => state.policies[state.activeProfileId]);

  // Detect Tor Browser on mount
  useEffect(() => {
    const torDetection = detectTorBrowser();
    setTorDetected(torDetection.isTorBrowser);

    // Ghost mode disabled - always use normal mode
    // Ensure ghost mode is disabled
    const ghostMode = getGhostMode();
    if (ghostMode.isEnabled()) {
      ghostMode.disable();
    }
    setGhostModeActive(false);
    setMode('Normal');
  }, []);

  const privateDisabled = policy ? !policy.allowPrivateWindows : false;
  const ghostDisabled = policy ? !policy.allowGhostTabs : false;

  const modes: Array<{
    value: PrivacyMode;
    icon: typeof Lock;
    label: string;
    color: string;
    disabled?: boolean;
    badge?: React.ReactNode;
  }> = [
    { value: 'Normal', icon: Lock, label: 'Normal', color: 'text-gray-400' },
    {
      value: 'Private',
      icon: Eye,
      label: 'Private',
      color: 'text-blue-400',
      disabled: privateDisabled,
    },
    {
      value: 'Ghost',
      icon: Network,
      label: 'Ghost',
      color: 'text-purple-400',
      disabled: ghostDisabled,
      badge: torDetected ? 'Tor' : undefined,
    },
  ];

  const handleModeChange = async (newMode: PrivacyMode) => {
    if (newMode === mode) return;

    const target = modes.find(m => m.value === newMode);
    if (target?.disabled) {
      return;
    }

    const { ipc } = await import('../lib/ipc-typed');
    const { activeId } = useTabsStore.getState();
    const ghostMode = getGhostMode();

    if (newMode === 'Ghost') {
      // Ghost mode is disabled - stay in Normal mode
      setMode('Normal');
      return;
    }

    if (newMode === 'Normal') {
      // Disable Ghost Mode if active
      if (ghostModeActive) {
        ghostMode.disable();
        setGhostModeActive(false);
      }

      // Normal mode: Clear any active proxy settings
      try {
        if (activeId) {
          // Clear per-tab proxy by omitting type/host/port
          await ipc.proxy.set({ tabId: activeId });
        }
        // Clear global proxy by omitting type/host/port (schema allows optional fields)
        await ipc.proxy.set({});
        setMode('Normal');
      } catch (error) {
        console.error('Failed to switch to Normal mode:', error);
        setMode('Normal');
      }
    } else if (newMode === 'Private') {
      // Private = Incognito mode (separate session, no history)
      try {
        await ipc.private.createWindow({ url: 'about:blank' });
        // Reset mode after creating window (don't keep it active)
        setMode('Normal');
        return; // Don't set mode again at the end
      } catch (error) {
        console.error('Failed to create private window:', error);
        return;
      }
    }

    // Only set mode if we haven't already set it (Normal and Private modes set it themselves)
    if (newMode !== 'Normal' && newMode !== 'Private') {
      setMode(newMode);
    }
  };

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-gray-700/50 bg-gray-800/50 p-1"
      role="group"
      aria-label="Privacy mode selector"
    >
      {modes.map(m => {
        const Icon = m.icon;
        const isActive = mode === m.value;
        return (
          <motion.button
            key={m.value}
            type="button"
            onClick={() => handleModeChange(m.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleModeChange(m.value);
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
              isActive
                ? `${m.color.replace('text-', 'bg-')} bg-opacity-20 text-white`
                : m.disabled
                  ? 'cursor-not-allowed text-gray-600'
                  : 'text-gray-400 hover:text-gray-300'
            }`}
            disabled={m.disabled}
            aria-label={`Switch to ${m.label} privacy mode`}
            aria-pressed={isActive}
            aria-disabled={m.disabled}
            title={m.disabled ? `${m.label} disabled by profile policy` : `Switch to ${m.label}`}
          >
            <Icon size={14} aria-hidden="true" />
            <span>{m.label}</span>
            {m.badge && (
              <span className="text-[10px] opacity-75" title="Tor Browser detected">
                {m.badge}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
