/**
 * SPRINT 2: Hook to use adaptive layout manager
 * Provides responsive layout state based on screen size and network quality
 */

import { useState, useEffect } from 'react';
import { getAdaptiveLayoutManager, type LayoutMode } from '../services/adaptiveUI/adaptiveLayoutManager';

interface AdaptiveLayoutState {
  networkQuality: 'offline' | 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
  layoutMode: LayoutMode;
  screenWidth: number;
  hideSidebars: boolean;
  compactTabs: boolean;
  verticalTabs: boolean;
  isUserOverride: boolean;
}

export type { AdaptiveLayoutState };

/**
 * Hook to get current adaptive layout state
 */
export function useAdaptiveLayout(): AdaptiveLayoutState {
  const [state, setState] = useState<AdaptiveLayoutState>(() => {
    const manager = getAdaptiveLayoutManager();
    return manager.getState();
  });

  useEffect(() => {
    const manager = getAdaptiveLayoutManager();
    const unsubscribe = manager.subscribe(newState => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  return state;
}

