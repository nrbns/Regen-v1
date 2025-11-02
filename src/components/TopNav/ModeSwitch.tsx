/**
 * ModeSwitch - Browser mode selector
 */

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Gamepad2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../state/appStore';
import { useNavigate } from 'react-router-dom';

const modes = [
  { id: 'Research', icon: Brain, label: 'Research', color: 'text-purple-400' },
  { id: 'Trade', icon: TrendingUp, label: 'Trade', color: 'text-green-400' },
  { id: 'Games', icon: Gamepad2, label: 'Game', color: 'text-yellow-400' },
  { id: 'AI Tasks', icon: Zap, label: 'AI Tasks', color: 'text-cyan-400' },
];

export function ModeSwitch() {
  const { mode, setMode } = useAppStore();
  const navigate = useNavigate();

  const handleModeChange = (newMode: typeof modes[number]) => {
    setMode(newMode.id as any);
    if (newMode.id === 'AI Tasks') {
      navigate('/agent');
    } else {
      navigate('/');
    }
  };

  // Map current mode - default to Research if Browse
  const currentMode = mode === 'Browse' ? 'Research' : mode;

  return (
    <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-1 border border-gray-700/50 shadow-sm">
      {modes.map((m) => {
        const Icon = m.icon;
        const isActive = currentMode === m.id;
        
        return (
          <motion.button
            key={m.id}
            onClick={() => handleModeChange(m)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
              transition-all duration-200
              ${isActive
                ? 'bg-gradient-to-r from-purple-600/40 to-purple-500/40 text-white shadow-lg'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
              }
            `}
            title={m.label}
          >
            <Icon size={16} className={isActive ? 'text-purple-200' : m.color} />
            <span>{m.label}</span>
            {isActive && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-purple-500/30 rounded-md"
                layoutId="activeMode"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

