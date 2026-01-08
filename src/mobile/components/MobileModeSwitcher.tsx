/**
 * Mobile Mode Switcher Component
 * Allows switching between different viewing modes on mobile
 */

import React, { useState } from 'react';
import { Layout, List, Grid, Eye } from 'lucide-react';
import { isMVPFeatureEnabled } from '../../../src/config/mvpFeatureFlags';

export interface ModeSwitcherProps {
  onModeChange?: (mode: string) => void;
  defaultMode?: string;
}

export function MobileModeSwitcher({ onModeChange, defaultMode = 'grid' }: ModeSwitcherProps) {
  // Hide mobile mode switcher in v1-mode to keep UI simple and stable
  if (isV1ModeEnabled()) return null;

  const [activeMode, setActiveMode] = useState(defaultMode);

  const modes = [
    { id: 'grid', label: 'Grid', icon: Grid },
    { id: 'list', label: 'List', icon: List },
    { id: 'compact', label: 'Compact', icon: Layout },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];

  const handleModeChange = (modeId: string) => {
    setActiveMode(modeId);
    onModeChange?.(modeId);
  };

  return (
    <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
      {modes.map(mode => {
        const Icon = mode.icon;
        return (
          <button
            key={mode.id}
            onClick={() => handleModeChange(mode.id)}
            className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              activeMode === mode.id
                ? 'bg-white text-indigo-600 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title={mode.label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
