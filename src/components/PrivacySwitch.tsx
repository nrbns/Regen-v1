/**
 * PrivacySwitch - Toggle between Normal/Private/Ghost modes
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Network, MoonStar } from 'lucide-react';
import { useProfileStore } from '../state/profileStore';
import { useShadowStore } from '../state/shadowStore';
import { useTabsStore } from '../state/tabsStore';

type PrivacyMode = 'Normal' | 'Private' | 'Ghost';

export function PrivacySwitch() {
  const [mode, setMode] = useState<PrivacyMode>('Normal');
  const policy = useProfileStore((state) => state.policies[state.activeProfileId]);
  const {
    activeSessionId: shadowSessionId,
    startShadowSession,
    endShadowSession,
    loading: shadowLoading,
  } = useShadowStore();

  const privateDisabled = policy ? !policy.allowPrivateWindows : false;
  const ghostDisabled = policy ? !policy.allowGhostTabs : false;
  const shadowDisabled = policy ? !policy.allowPrivateWindows : false;

  const modes: Array<{ value: PrivacyMode; icon: typeof Lock; label: string; color: string; disabled?: boolean }> = [
    { value: 'Normal', icon: Lock, label: 'Normal', color: 'text-gray-400' },
    { value: 'Private', icon: Eye, label: 'Private', color: 'text-blue-400', disabled: privateDisabled },
    { value: 'Ghost', icon: Network, label: 'Ghost', color: 'text-purple-400', disabled: ghostDisabled },
  ];

  const handleModeChange = async (newMode: PrivacyMode) => {
    if (newMode === mode) return;

    const target = modes.find((m) => m.value === newMode);
    if (target?.disabled) {
      return;
    }

    const { ipc } = await import('../lib/ipc-typed');
    const { activeId } = useTabsStore.getState();

    if (newMode === 'Normal') {
      // Normal mode: Clear any active proxy settings by setting to direct
      try {
        if (activeId) {
          // Clear proxy for current tab
          await ipc.proxy.set({ tabId: activeId, type: null, host: null, port: null });
        }
        // Also clear global proxy
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
    } else if (newMode === 'Ghost') {
      // Ghost = Direct active with Tor (enable Tor for current active tab)
      try {
        // Ensure Tor is running
        try {
          const torStatus = await ipc.tor.status() as any;
          if (!torStatus.running || !torStatus.circuitEstablished) {
            await ipc.tor.start();
            // Wait for Tor to bootstrap
            let attempts = 0;
            const maxAttempts = 30;
            const checkTor = setInterval(async () => {
              attempts++;
              const status = await ipc.tor.status() as any;
              if (status.circuitEstablished || attempts >= maxAttempts) {
                clearInterval(checkTor);
                if (status.circuitEstablished && activeId) {
                  // Tor is ready - apply Tor proxy to current tab
                  try {
                    await ipc.proxy.set({
                      tabId: activeId,
                      type: 'socks5',
                      host: '127.0.0.1',
                      port: 9050, // Default Tor SOCKS5 port
                    });
                    setMode('Ghost');
                  } catch (error) {
                    console.error('Failed to apply Tor proxy to tab:', error);
                    // Fallback: create ghost tab
                    await ipc.private.createGhostTab({ url: 'about:blank' });
                    setMode('Normal');
                  }
                } else {
                  console.warn('Tor failed to establish circuit, creating ghost tab anyway');
                  try {
                    await ipc.private.createGhostTab({ url: 'about:blank' });
                    setMode('Normal');
                  } catch (error) {
                    console.error('Failed to create ghost tab:', error);
                  }
                }
              }
            }, 500);
          } else if (activeId) {
            // Tor already running - apply Tor proxy to current tab
            try {
              await ipc.proxy.set({
                tabId: activeId,
                type: 'socks5',
                host: '127.0.0.1',
                port: 9050,
              });
              setMode('Ghost');
            } catch (error) {
              console.error('Failed to apply Tor proxy to tab:', error);
              // Fallback: create ghost tab
              await ipc.private.createGhostTab({ url: 'about:blank' });
              setMode('Normal');
            }
          } else {
            // No active tab - create ghost tab
            await ipc.private.createGhostTab({ url: 'about:blank' });
            setMode('Normal');
          }
        } catch (torError) {
          console.warn('Tor not available, creating ghost tab without proxy:', torError);
          // Still create ghost tab even if Tor fails
          try {
            await ipc.private.createGhostTab({ url: 'about:blank' });
            setMode('Normal');
          } catch (error) {
            console.error('Failed to create ghost tab:', error);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to enable Ghost mode:', error);
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

