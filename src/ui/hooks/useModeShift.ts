/**
 * useModeShift Hook
 * Provides mode shifting functionality with session snapshotting
 */

import { useState, useCallback } from 'react';
import { useAppStore } from '../../state/appStore';
import { showToast } from '../../state/toastStore';
import type { ModeId } from '../tokens-enhanced';

export interface ModeShiftOptions {
  snapshot?: boolean;
  preview?: boolean;
  skipConfirmation?: boolean;
}

export interface ModeShiftResult {
  sessionId: string;
  appliedModules: string[];
  success: boolean;
  error?: string;
}

/**
 * Mock omnix.mode API
 * In production, this would call the actual OmniKernel API
 */
const omnixMode = {
  getAvailable: async (): Promise<
    Array<{ id: ModeId; label: string; tools: string[]; themeHints: any }>
  > => {
    return [
      {
        id: 'browse',
        label: 'Browse',
        tools: ['tabs', 'bookmarks', 'history', 'extensions'],
        themeHints: { primary: 'blue' },
      },
      {
        id: 'research',
        label: 'Research',
        tools: ['memory', 'search', 'citations', 'notes'],
        themeHints: { primary: 'purple' },
      },
      {
        id: 'trade',
        label: 'Trade',
        tools: ['charts', 'orders', 'portfolio', 'alerts'],
        themeHints: { primary: 'green' },
      },
      {
        id: 'dev',
        label: 'Dev',
        tools: ['console', 'network', 'elements', 'sources'],
        themeHints: { primary: 'orange' },
      },
    ];
  },

  shift: async (_options: { to: ModeId; snapshot?: boolean }): Promise<ModeShiftResult> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));

    const sessionId = `session-${Date.now()}`;
    const appliedModules = ['ui', 'tools', 'theme'];

    return {
      sessionId,
      appliedModules,
      success: true,
    };
  },

  preview: async (_modeId: ModeId): Promise<{ config: any; changes: string[] }> => {
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      config: { themeHints: { primary: 'blue' } },
      changes: ['UI theme updated', 'Tools panel changed', 'Permissions updated'],
    };
  },
};

export function useModeShift() {
  const { mode, setMode } = useAppStore();
  const [isShifting, setIsShifting] = useState(false);
  const [previewMode, setPreviewMode] = useState<ModeId | null>(null);

  const shiftMode = useCallback(
    async (toMode: ModeId, _options: ModeShiftOptions = {}): Promise<ModeShiftResult | null> => {
      if (isShifting) return null;

      // Map ModeId to AppState mode
      const modeMap: Record<ModeId, typeof mode> = {
        browse: 'Browse',
        research: 'Research',
        trade: 'Trade',
        dev: 'Browse', // Dev mode maps to Browse for now
      };

      const targetMode = modeMap[toMode];
      if (!targetMode) {
        showToast('error', `Invalid mode: ${toMode}`);
        return null;
      }

      if (mode === targetMode && !_options.preview) {
        return null; // Already in this mode
      }

      setIsShifting(true);

      try {
        // Preview mode changes
        if (_options.preview) {
          await omnixMode.preview(toMode);
          setPreviewMode(toMode);
          return {
            sessionId: '',
            appliedModules: [],
            success: true,
          };
        }

        // Snapshot current state if requested
        if (_options.snapshot) {
          // TODO: Implement actual snapshotting
          // This would capture tabs, search context, agent states, etc.
          console.log('[ModeShift] Snapshotting current state...');
        }

        // Perform mode shift
        const result = await omnixMode.shift({
          to: toMode,
          snapshot: _options.snapshot,
        });

        if (result.success) {
          // Update app state
          await setMode(targetMode);
          showToast('success', `Switched to ${targetMode} mode`);
        } else {
          showToast('error', result.error || 'Failed to switch mode');
        }

        return result;
      } catch (error) {
        console.error('[ModeShift] Error:', error);
        showToast('error', 'Failed to switch mode');
        return {
          sessionId: '',
          appliedModules: [],
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      } finally {
        setIsShifting(false);
        setPreviewMode(null);
      }
    },
    [mode, setMode, isShifting]
  );

  const getAvailableModes = useCallback(async () => {
    return omnixMode.getAvailable();
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewMode(null);
  }, []);

  return {
    currentMode: mode,
    isShifting,
    previewMode,
    shiftMode,
    getAvailableModes,
    clearPreview,
  };
}
