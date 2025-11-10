/**
 * PrivacySwitch - Toggle between Normal/Private/Ghost modes
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, Network, MoonStar } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { useProfileStore } from '../state/profileStore';
import { useShadowStore } from '../state/shadowStore';

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

    if (newMode === 'Private') {
      try {
        if ((window as any).ipc?.invoke) {
          await (window as any).ipc.invoke('ob://ipc/v1/private:createWindow', { url: 'about:blank' });
        }
      } catch (error) {
        console.error('Failed to create private window:', error);
        return;
      }
    } else if (newMode === 'Ghost') {
      try {
        if ((window as any).ipc?.invoke) {
          await (window as any).ipc.invoke('ob://ipc/v1/private:createGhostTab', { url: 'about:blank' });
        }
      } catch (error) {
        console.error('Failed to create ghost tab:', error);
        return;
      }
    }

    setMode(newMode);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700/50">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.value;
        return (
          <motion.button
            key={m.value}
            onClick={() => handleModeChange(m.value)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              isActive
                ? `${m.color.replace('text-', 'bg-')} bg-opacity-20 text-white`
                : m.disabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            disabled={m.disabled}
            title={
              m.disabled
                ? `${m.label} disabled by profile policy`
                : `Switch to ${m.label}`
            }
          >
            <Icon size={14} />
            <span>{m.label}</span>
          </motion.button>
        );
      })}
      <motion.button
        key="Shadow"
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
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
          shadowSessionId
            ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
            : shadowDisabled
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-gray-400 hover:text-gray-300'
        }`}
        title={
          shadowDisabled
            ? 'Shadow Mode disabled by profile policy'
            : shadowSessionId
            ? 'End Shadow Mode session'
            : 'Start Shadow Mode (simulated private browsing)'
        }
      >
        <MoonStar size={14} />
        <span>{shadowSessionId ? 'Shadow On' : 'Shadow'}</span>
      </motion.button>
    </div>
  );
}

