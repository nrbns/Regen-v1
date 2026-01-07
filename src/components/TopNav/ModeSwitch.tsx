/**
 * ModeSwitch - Browser mode selector with grouped secondary modes
 */

import { Brain, TrendingUp, Gamepad2, Zap, FileText, Image, Shield, Network, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../state/appStore';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { trackModeSwitch } from '../../core/supermemory/tracker';
import { getModeFlag, ModeAvailability } from '../../config/featureFlags';
import { showToast } from '../../state/toastStore';

type ModeStatus = ModeAvailability;

type ModeConfig<T extends string> = {
  id: T;
  icon: typeof Zap;
  label: string;
  color: string;
  glowColor: string;
  status: ModeStatus;
  description?: string;
};

// Primary modes - always visible
const primaryModes: ModeConfig<'Browse' | 'Research' | 'Trade'>[] = [
  { id: 'Browse', icon: Zap, label: 'Browse', color: 'text-cyan-400', glowColor: 'from-cyan-500 via-blue-600 to-cyan-500', status: 'ready' },
  { id: 'Research', icon: Brain, label: 'Research', color: 'text-purple-400', glowColor: 'from-purple-500 via-purple-600 to-purple-500', status: 'ready' },
  { id: 'Trade', icon: TrendingUp, label: 'Trade', color: 'text-green-400', glowColor: 'from-green-500 via-emerald-600 to-green-500', status: 'ready' },
];

// Secondary modes - grouped in dropdown
const secondaryModes: ModeConfig<'Games' | 'Docs' | 'Images' | 'Threats' | 'GraphMind'>[] = [
  { id: 'Games', icon: Gamepad2, label: 'Games', color: 'text-yellow-400', glowColor: 'from-yellow-500 via-amber-600 to-yellow-500', status: 'soon', description: 'Arcade layer coming soon' },
  { id: 'Docs', icon: FileText, label: 'Docs', color: 'text-blue-400', glowColor: 'from-blue-500 via-indigo-600 to-blue-500', status: 'soon', description: 'Knowledge workspace in progress' },
  { id: 'Images', icon: Image, label: 'Images', color: 'text-pink-400', glowColor: 'from-pink-500 via-rose-600 to-pink-500', status: 'soon', description: 'AI image search coming soon' },
  { id: 'Threats', icon: Shield, label: 'Threats', color: 'text-red-400', glowColor: 'from-red-500 via-orange-600 to-red-500', status: 'soon', description: 'Threat intelligence dashboard' },
  { id: 'GraphMind', icon: Network, label: 'GraphMind', color: 'text-indigo-400', glowColor: 'from-indigo-500 via-purple-600 to-indigo-500', status: 'soon', description: 'Knowledge graph explorer' },
];

type ModeId = typeof primaryModes[number]['id'] | typeof secondaryModes[number]['id'];

const resolveModeConfig = <T extends ModeId>(config: ModeConfig<T>): ModeConfig<T> => {
  const flag = getModeFlag(config.id);
  return {
    ...config,
    status: flag.status ?? config.status,
    description: flag.description ?? config.description,
  };
};

export function ModeSwitch() {
  const { mode, setMode } = useAppStore();
  const navigate = useNavigate();

  const handleModeChange = (modeConfig: ModeConfig<ModeId>) => {
    const flag = getModeFlag(modeConfig.id);
    if (flag.status === 'hidden') {
      showToast('error', `${modeConfig.label} mode is disabled in this build.`);
      return;
    }
    if (flag.status === 'soon') {
      showToast('info', `${modeConfig.label} mode is coming soon.`);
      return;
    }
    setMode(modeConfig.id);
    trackModeSwitch(modeConfig.id).catch(console.error);
    navigate('/');
    if (flag.status === 'beta') {
      showToast('info', `${modeConfig.label} mode is in beta.`);
    }
  };

  const resolvedPrimary = primaryModes
    .map(resolveModeConfig)
    .filter((mode) => mode.status !== 'hidden');
  const resolvedSecondary = secondaryModes
    .map(resolveModeConfig)
    .filter((mode) => mode.status !== 'hidden');

  const currentMode = mode || 'Browse';
  const isSecondaryMode = resolvedSecondary.some(m => m.id === currentMode);
  const currentModeConfig = [...resolvedPrimary, ...resolvedSecondary].find(m => m.id === currentMode);
  const activeSecondaryMode = resolvedSecondary.find(m => m.id === currentMode);

  return (
    <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-1 border border-gray-700/50 shadow-sm">
      {/* Primary modes - always visible */}
      {resolvedPrimary.map((m) => {
        const Icon = m.icon;
        const isActive = currentMode === m.id;
        const isDisabled = m.status === 'soon';
        const isBeta = m.status === 'beta';
        
        return (
          <motion.button
            key={m.id}
            onClick={() => handleModeChange(m)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium
              transition-all duration-200 cursor-pointer
              ${isActive
                ? `bg-gradient-to-r ${m.glowColor} text-white shadow-lg`
                : isDisabled
                  ? 'text-gray-500 cursor-not-allowed opacity-60'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
              }
            `}
            title={isDisabled ? `${m.label} (coming soon)` : m.label}
            disabled={isDisabled}
          >
            <Icon size={14} className={isActive ? 'text-white' : m.color} />
            <span className="hidden md:inline">{m.label}</span>
            {isBeta && !isDisabled && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                Beta
              </span>
            )}
            {isDisabled && (
              <span className="hidden lg:inline text-[10px] uppercase tracking-wide text-slate-400/80">
                Soon
              </span>
            )}
            {isActive && (
              <motion.div
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${m.glowColor} rounded-full`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}

      {/* Secondary modes - grouped in dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
              transition-all duration-200 cursor-pointer
              ${isSecondaryMode && currentModeConfig
                ? `bg-gradient-to-r ${currentModeConfig.glowColor} text-white shadow-lg`
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
              }
            `}
            title="More modes"
          >
            {activeSecondaryMode ? (
              <>
                <activeSecondaryMode.icon size={14} className={isSecondaryMode ? 'text-white' : activeSecondaryMode.color} />
                <span className="hidden sm:inline">{activeSecondaryMode.label}</span>
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                <span className="hidden sm:inline">More</span>
              </>
            )}
            {isSecondaryMode && currentModeConfig && (
              <motion.div
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${currentModeConfig.glowColor} rounded-full`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Additional Modes
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
            {resolvedSecondary.map((m) => {
            const Icon = m.icon;
            const isActive = currentMode === m.id;
              const isDisabled = m.status === 'soon';
              const isBeta = m.status === 'beta';
            
            return (
              <DropdownMenuItem
                key={m.id}
                  onClick={() => handleModeChange(m)}
                className={`
                  flex items-center gap-2 cursor-pointer
                  ${isActive ? 'bg-slate-800/60' : ''}
                  ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
                `}
                disabled={isDisabled}
              >
                <Icon size={14} className={isActive ? m.color : 'text-slate-400'} />
                <div className="flex flex-col">
                  <span className={isActive ? 'font-semibold' : ''}>{m.label}</span>
                    {isBeta && !isDisabled && (
                      <span className="text-[10px] uppercase text-amber-300 tracking-wide">
                        Beta
                      </span>
                    )}
                  {isDisabled && (
                    <span className="text-[10px] uppercase text-slate-500 tracking-wide">
                      Coming soon
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

