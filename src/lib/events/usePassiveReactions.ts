/**
 * usePassiveReactions - Master hook that integrates all passive reaction tracking
 * LAYER 1: Passive Interaction (Always On, Zero Cost)
 * 
 * This hook initializes all passive reaction tracking systems:
 * - Mouse movement tracking
 * - Scroll direction & stop detection
 * - Typing pause detection
 * - Tab switch tracking
 * - Idle time detection
 * 
 * REQUIREMENTS (from README.md lines 406-430):
 * - Mouse movement speed
 * - Scroll direction
 * - Typing pauses
 * - Tab switching
 * - Idle time
 * 
 * Avatar Reactions:
 * - Stops scrolling → Avatar looks attentive
 * - Rapid tab switching → Avatar posture tightens
 * - Idle 20s → Avatar relaxes
 * - Typing pause → Avatar slight head tilt
 */

import { useEffect } from 'react';
import { useMouseMovementTracking } from './passiveReactions';
import { useScrollDirectionTracking } from './passiveReactions';
import { useTypingPauseDetection } from './passiveReactions';
import { useTabSwitchTracking } from './passiveReactions';
import { useExtendedIdleTracking } from './passiveReactions';

/**
 * Master hook that activates all passive reaction tracking
 * Call this once at the app root to enable Layer 1 passive interactions
 */
export function usePassiveReactions() {
  // All passive reactions are automatically initialized via these hooks
  useMouseMovementTracking();
  useScrollDirectionTracking();
  useTypingPauseDetection();
  useTabSwitchTracking();
  useExtendedIdleTracking();

  useEffect(() => {
    console.log('[PassiveReactions] Layer 1 passive interactions enabled');
  }, []);
}
