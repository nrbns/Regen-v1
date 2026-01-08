/**
 * ResearchTour - lightweight first-run tour focused on the Research alpha
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, BookOpenCheck, Save, ArrowRightCircle, CheckCircle2 } from 'lucide-react';
import { useOnboardingStore } from '../../state/onboardingStore';

const TOUR_STEPS = [
  {
    title: 'Welcome to Research Mode',
    description:
      'Regen alpha is laser-focused on research flows. Every tab, shortcut, and agent is tuned for deep dives.',
    icon: Sparkles,
    highlight: 'Research-mode only',
  },
  {
    title: 'Ask OmniAgent Anything',
    description:
      'Press Ctrl/Cmd + Shift + R to open the research panel instantly and stream AI summaries for the page you are on.',
    icon: BookOpenCheck,
    highlight: 'Ctrl/Cmd + Shift + R',
  },
  {
    title: 'Save Sessions (Soon)',
    description:
      'Ctrl/Cmd + Shift + S instantly exports the current session as a .omnisession file. Restore it anytime from Workspaces → Import Session.',
    icon: Save,
    highlight: 'Ctrl/Cmd + Shift + S',
  },
];

interface ResearchTourProps {
  onClose: () => void;
}

export function ResearchTour({ onClose }: ResearchTourProps) {
  const finishOnboarding = useOnboardingStore(state => state.finish);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = TOUR_STEPS[stepIndex];

  const closeTour = () => {
    finishOnboarding();
    onClose();
  };

  const goNext = () => {
    if (stepIndex === TOUR_STEPS.length - 1) {
      closeTour();
      return;
    }
    setStepIndex(prev => Math.min(TOUR_STEPS.length - 1, prev + 1));
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 p-8 text-slate-100 shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-500">
          <span>Research tour</span>
          <span>
            Step {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mt-6 space-y-4"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-200">
              <currentStep.icon size={16} />
              {currentStep.highlight}
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{currentStep.title}</h2>
              <p className="mt-3 text-sm text-slate-300">{currentStep.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={closeTour}
            className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
          >
            <CheckCircle2 size={16} />
            Skip tour
          </button>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:from-blue-400 hover:to-indigo-400"
          >
            {stepIndex === TOUR_STEPS.length - 1 ? (
              <>
                Finish
                <CheckCircle2 size={16} />
              </>
            ) : (
              <>
                Next
                <ArrowRightCircle size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
