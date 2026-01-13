/**
 * Regen Onboarding Tour
 * Interactive tutorial for new users
 * Highlights realtime features, AI controls, and privacy-first design
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Brain, Zap, Shield, Settings, CheckCircle } from 'lucide-react';
import { useOnboardingStore } from '../../state/onboardingStore';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  target?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Regen',
    description: 'A privacy-first browser with presence-based AI. Regen observes and helps without interrupting.',
    icon: Brain,
  },
  {
    id: 'ai-toggle',
    title: 'AI Silent Mode',
    description: 'Click the brain icon in the navigation bar to toggle AI on/off. Regen stays silent by default.',
    icon: Brain,
    target: '[data-tour="ai-toggle"]',
    position: 'bottom',
  },
  {
    id: 'realtime',
    title: 'Realtime Intelligence',
    description: 'Regen detects patterns (redundant tabs, search loops) and suggests actions only when useful.',
    icon: Zap,
  },
  {
    id: 'privacy',
    title: 'Privacy First',
    description: 'Everything runs locally. Your data never leaves your device. Works offline.',
    icon: Shield,
  },
  {
    id: 'settings',
    title: 'Customize',
    description: 'Open Settings to configure AI models, privacy modes, and local AI setup (Ollama).',
    icon: Settings,
    target: '[data-tour="settings"]',
    position: 'bottom',
  },
  {
    id: 'complete',
    title: "You're Ready!",
    description: 'Start browsing. Regen will help when needed, stay silent when not.',
    icon: CheckCircle,
  },
];

export function RegenOnboardingTour() {
  const { visible, finish } = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (visible) {
      // Small delay to let UI render
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible || !showTour) {
    return null;
  }

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const handleNext = () => {
    if (isLast) {
      finish();
      setShowTour(false);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    finish();
    setShowTour(false);
  };

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const Icon = step.icon;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-[9998] bg-[var(--bg-overlay)] backdrop-blur-sm transition-opacity" 
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Tour Card */}
      <div 
        className="fixed left-1/2 top-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 md:p-6 shadow-2xl backdrop-blur-sm"
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        aria-modal="true"
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Step {currentStep + 1} of {TOUR_STEPS.length}</span>
            <button
              onClick={handleSkip}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded p-1 hover:bg-[var(--surface-hover)]"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-1 w-full rounded-full bg-[var(--surface-hover)]">
            <div
              className="h-1 rounded-full bg-[var(--color-primary-500)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-[var(--color-primary-500)]/20 p-3">
              <Icon className="h-8 w-8 text-[var(--color-primary-500)]" />
            </div>
          </div>
          <h3 id="tour-title" className="mb-2 text-xl font-semibold text-[var(--text-primary)]">{step.title}</h3>
          <p id="tour-description" className="text-sm text-[var(--text-secondary)]">{step.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handlePrevious}
            disabled={isFirst}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isFirst
                ? 'cursor-not-allowed bg-[var(--surface-hover)] text-[var(--text-disabled)] opacity-50'
                : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex gap-2">
            {!isLast && (
              <button
                onClick={handleSkip}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Skip Tour
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-600)] hover:scale-105 active:scale-95"
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
