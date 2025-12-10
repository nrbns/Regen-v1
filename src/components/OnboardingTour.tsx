/**
 * Onboarding Tour Component
 * AUDIT FIX #6: Joyride tour for modes
 *
 * Provides guided tour for first-time users
 */

import { useEffect, useState } from 'react';
import { useSettingsStore } from '../state/settingsStore';

// Lazy load react-joyride to avoid bundle bloat
let Joyride: any = null;
let loadJoyride: Promise<void> | null = null;

async function ensureJoyride() {
  if (Joyride) return;
  if (loadJoyride) return loadJoyride;

  loadJoyride = import('react-joyride').then(module => {
    Joyride = module.default;
  });

  return loadJoyride;
}

const TOUR_STEPS = [
  {
    target: '[data-tour="mode-switcher"]',
    content: 'Switch between Browse, Research, Trade, and other modes',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="voice-button"]',
    content: 'Use voice commands in Hindi or English. Say "Hey WISPR, research BTC"',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="research-input"]',
    content: 'Type or speak your research query. Results stream in real-time',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="tabs"]',
    content: 'Your tabs are organized here. Right-click for options',
    placement: 'bottom' as const,
  },
];

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<any[]>([]);
  const hasSeenTour = useSettingsStore(s => s.hasSeenOnboardingTour);
  const setHasSeenTour = useSettingsStore(s => s.setHasSeenOnboardingTour);

  useEffect(() => {
    // Load Joyride on mount
    ensureJoyride().then(() => {
      if (Joyride) {
        setSteps(TOUR_STEPS);
      }
    });
  }, []);

  useEffect(() => {
    // Show tour on first launch if not seen
    if (!hasSeenTour && steps.length > 0) {
      // Delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour, steps.length]);

  const handleTourComplete = () => {
    setRun(false);
    setHasSeenTour(true);
  };

  if (!Joyride || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={(data: any) => {
        if (data.status === 'finished' || data.status === 'skipped') {
          handleTourComplete();
        }
      }}
      styles={{
        options: {
          primaryColor: '#10b981', // emerald-500
          zIndex: 10000,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open',
        skip: 'Skip',
      }}
    />
  );
}
