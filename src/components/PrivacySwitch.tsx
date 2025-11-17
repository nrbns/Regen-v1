/**
 * PrivacySwitch - Toggle between Normal/Private/Ghost modes
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Network, MoonStar } from 'lucide-react';
import { useProfileStore } from '../state/profileStore';
import { useShadowStore } from '../state/shadowStore';
import { useTabsStore } from '../state/tabsStore';
import { detectTorBrowser } from '../core/tor-detector';
import { getGhostMode, isGhostModeEnabled } from '../core/ghost-mode';

type PrivacyMode = 'Normal' | 'Private' | 'Ghost';

export function PrivacySwitch() {
  const [mode, setMode] = useState<PrivacyMode>('Normal');
  const [torDetected, setTorDetected] = useState(false);
  const [ghostModeActive, setGhostModeActive] = useState(false);
  const policy = useProfileStore((state) => state.policies[state.activeProfileId]);
  const {
    activeSessionId: shadowSessionId,
    startShadowSession,
    endShadowSession,
    loading: shadowLoading,
  } = useShadowStore();

  // Detect Tor Browser on mount
  useEffect(() => {
    const torDetection = detectTorBrowser();
    setTorDetected(torDetection.isTorBrowser);
    
    // Auto-enable Ghost Mode if Tor is detected
    if (torDetection.isTorBrowser && torDetection.confidence !== 'low') {
      const ghostMode = getGhostMode();
      if (!ghostMode.isEnabled()) {
        ghostMode.enable();
        setMode('Ghost');
        setGhostModeActive(true);
      }
    }
    
    // Check if Ghost Mode is already enabled
    setGhostModeActive(isGhostModeEnabled());
  }, []);

  const privateDisabled = policy ? !policy.allowPrivateWindows : false;
  const ghostDisabled = policy ? !policy.allowGhostTabs : false;
  const shadowDisabled = policy ? !policy.allowPrivateWindows : false;

  const modes: Array<{ value: PrivacyMode; icon: typeof Lock; label: string; color: string; disabled?: boolean; badge?: string }> = [
    { value: 'Normal', icon: Lock, label: 'Normal', color: 'text-gray-400' },
    { value: 'Private', icon: Eye, label: 'Private', color: 'text-blue-400', disabled: privateDisabled },
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

    const target = modes.find((m) => m.value === newMode);
    if (target?.disabled) {
      return;
    }

    const { ipc } = await import('../lib/ipc-typed');
    const { activeId } = useTabsStore.getState();
    const ghostMode = getGhostMode();

    if (newMode === 'Ghost') {
      // Enable Ghost Mode
      try {
        // Check if Tor is detected
        const torDetection = detectTorBrowser();
        if (!torDetection.isTorBrowser) {
          const confirmed = confirm(
            '⚠️ Ghost Mode is most secure when running inside Tor Browser.\n\n' +
            'Without Tor Browser, some security features may be limited.\n\n' +
            'Enable Ghost Mode anyway?'
          );
          if (!confirmed) {
            return;
          }
        }
        
        ghostMode.enable();
        setGhostModeActive(true);
        
        // Enable Tor proxy if available
        if (activeId) {
          try {
            await ipc.proxy.set({ 
              tabId: activeId, 
              type: 'socks5', 
              host: '127.0.0.1', 
              port: 9050 // Default Tor port
            });
          } catch (error) {
            console.warn('Could not set Tor proxy:', error);
            // Continue anyway - Ghost Mode can work without Tor proxy
          }
        }
        
        setMode('Ghost');
      } catch (error) {
        console.error('Failed to enable Ghost mode:', error);
      }
      return;
    }

    if (newMode === 'Normal') {
      // Disable Ghost Mode if active
      if (ghostModeActive) {
        ghostMode.disable();
        setGhostModeActive(false);
      }
      
      // Normal mode: Clear any active proxy settings by setting to direct
      try {
        if (activeId) {
          await ipc.proxy.set({ tabId: activeId });
        }
        await ipc.proxy.set({ mode: 'direct' });
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
      className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700/50"
      role="group"
      aria-label="Privacy mode selector"
    >
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.value;
        return (
          <motion.button
            key={m.value}
            type="button"
            onClick={() => handleModeChange(m.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleModeChange(m.value);
              }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
              isActive
                ? `${m.color.replace('text-', 'bg-')} bg-opacity-20 text-white`
                : m.disabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            disabled={m.disabled}
            aria-label={`Switch to ${m.label} privacy mode`}
            aria-pressed={isActive}
            aria-disabled={m.disabled}
            title={
              m.disabled
                ? `${m.label} disabled by profile policy`
                : `Switch to ${m.label}`
            }
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
      <motion.button
        key="Shadow"
        type="button"
        whileHover={{ scale: shadowLoading || shadowDisabled ? 1 : 1.05 }}
        whileTap={{ scale: shadowLoading || shadowDisabled ? 1 : 0.95 }}
        disabled={shadowDisabled || shadowLoading}
        onClick={async () => {
          if (shadowDisabled || shadowLoading) return;
          try {
            if (shadowSessionId) {
              await endShadowSession();
            } else {
              await startShadowSession({ summary: true });
            }
          } catch (error) {
            console.error('Shadow session error:', error);
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !shadowDisabled && !shadowLoading) {
            e.preventDefault();
            if (shadowSessionId) {
              void endShadowSession();
            } else {
              void startShadowSession({ summary: true });
            }
          }
        }}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400/50 ${
          shadowSessionId
            ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
            : shadowDisabled
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:text-gray-300'
        }`}
        aria-label={shadowSessionId ? 'End Shadow Mode session' : 'Start Shadow Mode'}
        aria-pressed={!!shadowSessionId}
        aria-disabled={shadowDisabled || shadowLoading}
        title={
          shadowDisabled
            ? 'Shadow Mode disabled by profile policy'
            : shadowSessionId
            ? 'End Shadow Mode session'
            : 'Start Shadow Mode (simulated private browsing)'
        }
      >
        <MoonStar size={14} aria-hidden="true" />
        <span>{shadowSessionId ? 'Shadow On' : 'Shadow'}</span>
      </motion.button>
    </div>
  );
}

