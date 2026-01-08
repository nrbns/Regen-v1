/**
 * Quick Start Tour Component
 * DAY 9 FIX: 1-minute guided tour for first-time users
 * Focuses on Omni AI and key features
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Search, TrendingUp, ArrowRight } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
}

// SPRINT 0: Simplified 3-step onboarding tour
const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Regen Browser!',
    description:
      'Your offline-first AI browser with low-data mode, AI tools, and voice commands. Perfect for low-network areas.',
    icon: <Sparkles className="h-6 w-6" />,
  },
  {
    id: 'features',
    title: 'Key Features',
    description:
      'Try these commands in the address bar: `:summarize` (AI summaries), `:save-for-offline` (offline pages), or press Ctrl+K for command palette. Switch modes to Research/Trade for AI-powered workflows.',
    icon: <Search className="h-6 w-6" />,
  },
  {
    id: 'low-data',
    title: 'Low-Data Mode (Optional)',
    description:
      'On a slow connection? Enable Low-Data Mode in Settings → System to disable images by default, reduce bandwidth, and speed up browsing.',
    icon: <TrendingUp className="h-6 w-6" />,
    action: () => {
      // Optional: Auto-open settings to low-data mode section
      // For now, just inform user
    },
  },
];

export function QuickStartTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // SPRINT 0: Use settings store to check if user has seen tour
    const { hasSeenOnboardingTour } = useSettingsStore.getState();
    if (!hasSeenOnboardingTour()) {
      // Show tour after a short delay
      setTimeout(() => {
        setIsVisible(true);
      }, 2000);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      // Execute action if available
      const step = TOUR_STEPS[currentStep];
      if (step.action) {
        try {
          step.action();
        } catch (error) {
          console.warn('[Tour] Action failed:', error);
        }
      }
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    // SPRINT 0: Mark tour as seen in settings store
    const { setHasSeenOnboardingTour } = useSettingsStore.getState();
    setHasSeenOnboardingTour(true);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleSkip}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-800">
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    <p className="text-xs text-slate-400">
                      Step {currentStep + 1} of {TOUR_STEPS.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-1 text-slate-400 transition-colors hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-6 leading-relaxed text-slate-300">{step.description}</p>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm text-slate-400 transition-colors hover:text-white"
                >
                  Skip Tour
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-600"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                  {!isLastStep && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
