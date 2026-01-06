import React, { useState, useEffect } from 'react';

interface FirstRunTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface TourStep {
  title: string;
  description: string;
  highlight?: string;
  action?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Omnibrowser',
    description:
      'A next-generation AI automation platform with full agent layer, realtime streaming, and job lifecycle management.',
    action: 'Get Started',
  },
  {
    title: 'Realtime Job Streaming',
    description:
      'Track your AI jobs in realtime with progress bars, streaming text, and instant updates via Socket.IO.',
    highlight: 'StatusBar',
  },
  {
    title: 'Resume from Checkpoints',
    description:
      'Jobs save checkpoints automatically. If something fails, retry and resume from where you left off.',
    highlight: 'RetryPanel',
  },
  {
    title: 'Connection Management',
    description:
      'Work offline or with flaky connections. Actions queue until reconnect and sync automatically.',
    highlight: 'ConnectionBanner',
  },
  {
    title: 'View Job Logs',
    description:
      'Access detailed logs for every job. Track progress, debug errors, and understand what happened.',
    highlight: 'JobLogsModal',
  },
  {
    title: 'Ready to Go!',
    description:
      'Everything is set up. Create your first job and see the realtime magic in action.',
    action: 'Start Using',
  },
];

import { isMVPFeatureEnabled } from '../../../src/config/mvpFeatureFlags';

export const FirstRunTour: React.FC<FirstRunTourProps> = ({ onComplete, onSkip }) => {
  // Hide onboarding tours in v1-mode
  if (isV1ModeEnabled()) return null;

  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Mark tour as seen in localStorage
    return () => {
      localStorage.setItem('omnibrowser:tour:completed', 'true');
    };
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setVisible(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    setVisible(false);
    onSkip();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-slate-700">
            <div
              className="h-1 rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <h2 className="mb-3 text-2xl font-bold text-white">{step.title}</h2>
          <p className="leading-relaxed text-slate-300">{step.description}</p>

          {step.highlight && (
            <div className="mt-4 rounded border border-slate-600 bg-slate-800/50 p-3 text-xs text-slate-400">
              <span className="font-mono text-blue-400">{step.highlight}</span> component
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            Skip tour
          </button>

          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={handlePrevious}
                className="rounded bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
            >
              {step.action || (isLast ? 'Finish' : 'Next')}
            </button>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="mt-6 flex justify-center gap-1.5">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep
                  ? 'w-6 bg-blue-500'
                  : idx < currentStep
                    ? 'w-1.5 bg-blue-700'
                    : 'w-1.5 bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FirstRunTour;
