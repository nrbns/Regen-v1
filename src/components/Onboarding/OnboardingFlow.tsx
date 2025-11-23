/**
 * Onboarding Flow - Tier 3
 * Guided first-time experience
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Search, Zap, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { useTabsStore } from '../../state/tabsStore';
import { ipc } from '../../lib/ipc-typed';
import { track } from '../../services/analytics';
import { useOnboardingStore } from '../../state/onboardingStore';

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };
  skip?: boolean;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to OmniBrowser',
    description:
      "Your AI-powered research and automation browser. Let's get you started in 30 seconds.",
    icon: Sparkles,
  },
  {
    id: 'modes',
    title: 'Choose Your Mode',
    description:
      'Browse, Research, Trade, or automate—each mode is optimized for different workflows.',
    icon: Search,
    action: {
      label: 'Explore Modes',
      onClick: async () => {
        try {
          // Switch to Research mode as example
          const appStore = useAppStore.getState();
          await appStore.setMode('Research');
          track('onboarding_step_completed' as any, { step: 'modes' });
        } catch (error) {
          console.error('[OnboardingFlow] Error switching mode:', error);
          // Continue even if mode switch fails
        }
      },
    },
  },
  {
    id: 'agent',
    title: 'Meet OmniAgent',
    description:
      'Ask questions, get summaries, and automate tasks. Try "Explain this page" on any site.',
    icon: Zap,
    action: {
      label: 'Try OmniAgent',
      onClick: async () => {
        try {
          // Open a demo page
          const newTab = await ipc.tabs.create({
            url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
          });
          if (newTab && typeof newTab === 'object' && 'id' in newTab) {
            const tabId = newTab.id as string;
            if (tabId) {
              useTabsStore.getState().setActive(tabId);
              await ipc.tabs.activate({ id: tabId });
            }
          }
          track('onboarding_step_completed' as any, { step: 'agent' });
        } catch (error) {
          console.error('[OnboardingFlow] Error creating tab:', error);
          // Continue even if tab creation fails
        }
      },
    },
  },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setCompletedSteps] = useState<Set<string>>(new Set());
  const finishOnboarding = useOnboardingStore(state => state.finish);

  // Safety checks
  if (!ONBOARDING_STEPS || ONBOARDING_STEPS.length === 0) {
    finishOnboarding();
    onComplete();
    return null;
  }

  // Ensure currentStep is within bounds
  const safeStep = Math.max(0, Math.min(currentStep, ONBOARDING_STEPS.length - 1));
  const step = ONBOARDING_STEPS[safeStep];
  const isLastStep = safeStep === ONBOARDING_STEPS.length - 1;
  const progress = ((safeStep + 1) / ONBOARDING_STEPS.length) * 100;

  if (!step) {
    // Safety check - if step is undefined, complete onboarding
    finishOnboarding();
    onComplete();
    return null;
  }

  const handleNext = async () => {
    try {
      // Execute step action if it exists
      if (step.action) {
        try {
          await step.action.onClick();
          setCompletedSteps(prev => new Set([...prev, step.id]));
        } catch (error) {
          console.error('[OnboardingFlow] Error executing step action:', error);
          // Continue to next step even if action fails
        }
      }

      // Move to next step or complete
      if (isLastStep) {
        track('onboarding_completed' as any);
        localStorage.setItem('omnibrowser_onboarding_completed', 'true');
        finishOnboarding();
        onComplete();
      } else {
        const nextStep = Math.min(safeStep + 1, ONBOARDING_STEPS.length - 1);
        setCurrentStep(nextStep);
      }
    } catch (error) {
      console.error('[OnboardingFlow] Error in handleNext:', error);
      // Still try to advance or complete on error
      if (isLastStep) {
        finishOnboarding();
        onComplete();
      } else {
        const nextStep = Math.min(safeStep + 1, ONBOARDING_STEPS.length - 1);
        setCurrentStep(nextStep);
      }
    }
  };

  const handleSkip = () => {
    try {
      track('onboarding_skipped' as any, { step: step?.id || 'unknown' });
      localStorage.setItem('omnibrowser_onboarding_completed', 'true');
      finishOnboarding();
      onComplete();
    } catch (error) {
      console.error('[OnboardingFlow] Error skipping onboarding:', error);
      // Still try to finish
      finishOnboarding();
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[1070] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl mx-4 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                <step.icon size={24} className="text-purple-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{step.title}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Step {safeStep + 1} of {ONBOARDING_STEPS.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              aria-label="Skip onboarding"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-lg text-slate-300 mb-8">{step.description}</p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {ONBOARDING_STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  idx <= safeStep ? 'bg-purple-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Action button */}
          <div className="flex items-center justify-between">
            {safeStep > 0 && (
              <button
                onClick={() => {
                  const prevStep = Math.max(0, safeStep - 1);
                  setCurrentStep(prevStep);
                }}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                void handleNext();
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold hover:from-purple-600 hover:to-cyan-600 transition-all shadow-lg shadow-purple-500/30"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 size={18} />
                  Get Started
                </>
              ) : (
                <>
                  {step.action?.label || 'Next'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Check if onboarding should be shown
export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  const completed = localStorage.getItem('omnibrowser_onboarding_completed');
  return !completed;
}
