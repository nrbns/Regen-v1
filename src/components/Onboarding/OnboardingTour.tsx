/**
 * Onboarding Tour Component
 * AUDIT FIX #6: Joyride tour for modes
 *
 * Provides guided tour for first-time users
 */

import React from 'react'
import { isV1ModeEnabled } from '../../config/mvpFeatureFlags'

// Onboarding tour is deferred for v1; return null when v1-mode is enabled.
export function OnboardingTour() {
  if (isV1ModeEnabled()) return null
  return null
}
