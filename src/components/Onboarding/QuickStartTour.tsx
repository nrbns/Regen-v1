/**
 * Quick Start Tour Component
 * DAY 9 FIX: 1-minute guided tour for first-time users
 * Focuses on Omni AI and key features
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Search, TrendingUp, Mic, ArrowRight, CheckCircle2, Keyboard } from 'lucide-react';
import { useAppStore } from '../../state/appStore';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
}

// Phase 1, Day 5: Enhanced onboarding tour with feature highlights
const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to RegenBrowser!',
    description: 'Your AI-powered browser with voice commands, research, and trading. Let\'s get started!',
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: 'voice',
    title: 'WISPR Voice Assistant',
    description: 'Press Ctrl+Space to activate WISPR. Speak in Hindi or English: "Research BTC" or "Nifty kharido 50". You can edit commands before executing.',
    icon: <Mic className="w-6 h-6" />,
  },
  {
    id: 'research',
    title: 'Research Mode',
    description: 'Switch to Research mode for AI-powered web research with real-time citations, summaries, and document analysis.',
    icon: <Search className="w-6 h-6" />,
    action: () => {
      useAppStore.getState().setMode('Research');
    },
  },
  {
    id: 'trade',
    title: 'Trade Mode',
    description: 'Switch to Trade mode for AI-powered trading signals, real-time market analysis, and position sizing.',
    icon: <TrendingUp className="w-6 h-6" />,
    action: () => {
      useAppStore.getState().setMode('Trade');
    },
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Press Ctrl+K for command palette, Ctrl+L for address bar, Ctrl+T for new tab. See all shortcuts in Settings → Shortcuts.',
    icon: <Keyboard className="w-6 h-6" />,
  },
  {
    id: 'complete',
    title: 'You\'re all set!',
    description: 'Start exploring RegenBrowser. You can always access this tour and shortcuts guide from Settings.',
    icon: <CheckCircle2 className="w-6 h-6" />,
  },
];

export function QuickStartTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('regen:has-seen-tour') === 'true';
    if (!hasSeenTour) {
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
    localStorage.setItem('regen:has-seen-tour', 'true');
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
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
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
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
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
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-300 mb-6 leading-relaxed">{step.description}</p>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Skip Tour
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                >
                  {isLastStep ? 'Get Started' : 'Next'}
                  {!isLastStep && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

