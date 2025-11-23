import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  X,
  Brain,
  TrendingUp,
  Gamepad2,
  Zap,
  Keyboard,
  MousePointerClick,
  Sparkles,
  Gauge,
  Leaf,
  Shield,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { useOnboardingStore } from '../../state/onboardingStore';
import { useTabGraphStore } from '../../state/tabGraphStore';
// import { ipc } from '../../lib/ipc-typed'; // Unused for now
import { applyTelemetryOptIn } from '../../lib/monitoring/sentry-client';
import { applyAnalyticsOptIn } from '../../lib/monitoring/analytics-client';

type StepTipAction = 'focus-omnibox' | 'open-graph';

type StepTip = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionId?: StepTipAction;
  actionLabel?: string;
};

interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  target?: string;
  type?: 'persona' | 'default';
  tips?: StepTip[];
}

type PersonaOption = {
  id: 'Research' | 'Trade' | 'Games' | 'Browse';
  title: string;
  subtitle: string;
  icon: typeof Brain;
  hint: string;
};

const PERSONAS: PersonaOption[] = [
  {
    id: 'Research',
    title: 'Researcher',
    subtitle: 'Deep dives & synthesis',
    icon: Brain,
    hint: 'Focuses on live graphs, consent checks, and @redix recall.',
  },
  {
    id: 'Trade',
    title: 'Trader',
    subtitle: 'Market intelligence',
    icon: TrendingUp,
    hint: 'Highlights history graphs, playbooks, and automation runs.',
  },
  {
    id: 'Games',
    title: 'Creator',
    subtitle: 'Streams & overlays',
    icon: Gamepad2,
    hint: 'Keeps overlays light and tabs organised for content flow.',
  },
  {
    id: 'Browse',
    title: 'Everyday',
    subtitle: 'Balanced defaults',
    icon: Zap,
    hint: 'A little of everything—perfect for daily browsing.',
  },
];

const STEPS: OnboardingStep[] = [
  {
    id: 'persona',
    title: 'Choose your focus',
    description: 'Tell Redix how you work. We’ll tailor shortcuts, menus, and defaults instantly.',
    type: 'persona',
  },
  {
    id: 'welcome',
    title: 'Welcome to OmniBrowser × Redix',
    description:
      'This browser is built for agentic research. Let’s take a 30-second tour of the core controls and regenerative superpowers.',
    tips: [
      {
        icon: Sparkles,
        title: 'Your regenerative co-pilot',
        description:
          'Redix learns your persona, monitors eco impact, and rewires the workspace to stay in flow.',
      },
    ],
  },
  {
    id: 'omnibox',
    title: 'Omnibox with @live AI',
    description:
      'Press ⌘/Ctrl + L to focus the omnibox. Try typing “@live quantum trends” to stream Redix results and graphs in real time.',
    target: '[data-onboarding="omnibox"]',
    tips: [
      {
        icon: Keyboard,
        title: 'Shortcut ready',
        description:
          'Press ⌘/Ctrl + L any time to jump into the omnibox without leaving the keyboard.',
        actionId: 'focus-omnibox',
        actionLabel: 'Focus omnibox',
      },
      {
        icon: Sparkles,
        title: 'Use @live for streaming answers',
        description:
          'Start your query with “@live” to pull in real-time sources, graphs, and metrics as you type.',
      },
    ],
  },
  {
    id: 'tabstrip',
    title: 'Smart Tab Strip',
    description:
      'Tabs show peek previews, mode badges, and hibernation state. Scroll horizontally or hit Ctrl+Tab to jump quickly.',
    target: '[data-onboarding="tabstrip"]',
    tips: [
      {
        icon: MousePointerClick,
        title: 'Drag into spaces',
        description:
          'Drag a tab to reorder or drop it straight into Workspace or GraphMind for deeper grouping.',
      },
      {
        icon: Brain,
        title: 'Sessions remember everything',
        description:
          'Tab badges show whether a session is ghosted, private, or synced across devices.',
      },
    ],
  },
  {
    id: 'regen',
    title: 'Regenerative Efficiency',
    description:
      'When the battery dips, Redix predicts remaining time, throttles background tabs, and offers +1.8 hr boost actions.',
    target: '[data-onboarding="status-bar"]',
    tips: [
      {
        icon: Gauge,
        title: 'Live system metrics',
        description:
          'CPU, memory, and carbon intensity stream in real time. Hover to see the sparkline history.',
      },
      {
        icon: Leaf,
        title: 'Eco-aware actions',
        description:
          'Switch to Regen mode when on battery to pause heavy tabs and save up to +1.8 hours.',
      },
    ],
  },
  {
    id: 'graph',
    title: 'Tab DNA Graph',
    description:
      'Press ⌘/Ctrl + Shift + G to open the live tab graph. You’ll see domains, containers, and session affinity mapped instantly.',
    tips: [
      {
        icon: Brain,
        title: 'Map your research instantly',
        description:
          'GraphMind clusters tabs by topic, mode, and relationship so you can spot gaps fast.',
        actionId: 'open-graph',
        actionLabel: 'Launch GraphMind',
      },
    ],
  },
  {
    id: 'consent',
    title: 'Ethical Control',
    description:
      'Every AI action requests consent in the ledger. Review what Redix can remember, approve, or revoke at any time.',
    tips: [
      {
        icon: Shield,
        title: 'Live consent timeline',
        description:
          'The ledger records every AI request, so you can revoke memory or flag behaviour instantly.',
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Your Command Center',
    description:
      'The dashboard shows your Live Redix Pulse, Eco Scoreboard, and quick access cards. Everything updates in real time.',
    target: '[data-onboarding="dashboard"]',
    tips: [
      {
        icon: Sparkles,
        title: 'Live Redix Pulse',
        description:
          'See agent activity, recent events, and quick actions. Click "Open agent console" to dive deeper.',
      },
      {
        icon: Leaf,
        title: 'Eco Scoreboard',
        description:
          'Monitor battery, carbon intensity, and efficiency. Achievements unlock as you optimize.',
      },
      {
        icon: FileText,
        title: 'Quick Access Cards',
        description:
          'Ask Agent, Search, Notes, and Playbooks are always one click away from the dashboard.',
      },
    ],
  },
  {
    id: 'telemetry',
    title: 'Help improve OmniBrowser',
    description:
      'Opt-in to privacy-safe telemetry to help us improve performance and fix bugs. We never collect personal information, URLs, or browsing history.',
    tips: [
      {
        icon: Shield,
        title: 'Privacy-first',
        description:
          'All data is anonymized. No PII, no URLs, no browsing history. You can change this anytime in Settings.',
      },
    ],
  },
];
const TOTAL_STEPS = STEPS.length;
interface Spotlight {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour({ onClose }: { onClose: () => void }) {
  const { mode, setMode } = useAppStore();
  const finishOnboarding = useOnboardingStore(state => state.finish);
  const onboardingVisible = useOnboardingStore(state => state.visible);
  const [telemetryOptIn, setTelemetryOptIn] = useState(false);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const personaFromMode = useMemo<PersonaOption['id']>(() => {
    const fallback: PersonaOption['id'] = 'Browse';
    return PERSONAS.find(p => p.id === mode) ? (mode as PersonaOption['id']) : fallback;
  }, [mode]);
  const initialPersonaRef = useRef<PersonaOption['id']>(personaFromMode);
  const [selectedPersona, setSelectedPersona] = useState<PersonaOption['id'] | null>(
    initialPersonaRef.current
  );
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const personaFirstButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const openGraph = useTabGraphStore(state => state.open);

  const handleTipAction = useCallback(
    (actionId?: StepTipAction) => {
      if (!actionId) return;
      switch (actionId) {
        case 'focus-omnibox': {
          const target = document.querySelector<HTMLElement>(
            '[data-onboarding="omnibox"] input, [data-onboarding="omnibox"] textarea, [data-onboarding="omnibox"] [role="combobox"]'
          );
          if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          }
          break;
        }
        case 'open-graph':
          void openGraph();
          break;
        default:
          break;
      }
    },
    [openGraph]
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => void 0;
    }
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (
        window as typeof window & {
          __tourDebug?: { stepIndex: number; persona: PersonaOption['id'] | null };
        }
      ).__tourDebug = { stepIndex, persona: selectedPersona };
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Onboarding] Render', { stepIndex, selectedPersona });
    }
  }, [stepIndex, selectedPersona]);

  const step = useMemo(() => STEPS[stepIndex] ?? STEPS[0], [stepIndex]);
  const progressPercent = Math.round(((stepIndex + 1) / TOTAL_STEPS) * 100);
  const isLastStep = stepIndex >= TOTAL_STEPS - 1;
  const isPersonaStep = step.type === 'persona';
  const canGoBack = stepIndex > 0;
  // Only disable Next button on persona step if no persona is selected
  // For other steps, always allow Next
  const isNextDisabled = isPersonaStep && !selectedPersona;

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Onboarding] Button state:', {
      stepIndex,
      isPersonaStep,
      selectedPersona,
      isNextDisabled,
      stepId: step?.id,
    });
  }

  useEffect(() => {
    if (stepIndex === 0 && !selectedPersona) {
      initialPersonaRef.current = personaFromMode;
      setSelectedPersona(personaFromMode);
    }
  }, [personaFromMode, selectedPersona, stepIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (focusTimeoutRef.current) {
      window.clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = window.setTimeout(() => {
      if (step?.type === 'persona') {
        personaFirstButtonRef.current?.focus({ preventScroll: true });
      } else {
        primaryButtonRef.current?.focus({ preventScroll: true });
      }
    }, 120);
    return () => {
      if (focusTimeoutRef.current) {
        window.clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, [step, stepIndex]);

  useEffect(() => {
    if (!step?.target || step.type === 'persona') {
      setSpotlight(null);
      return;
    }

    let rafId = 0;
    let cancelled = false;
    let element: HTMLElement | null = null;
    let retryTimeout: number | null = null;
    const targetSelector = step.target as string;

    const resolveElement = () => document.querySelector(targetSelector) as HTMLElement | null;

    const updateSpotlight = () => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      setSpotlight({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    };

    const ensureVisible = () => {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const outOfView =
        rect.top < 0 ||
        rect.bottom > window.innerHeight ||
        rect.left < 0 ||
        rect.right > window.innerWidth;
      if (outOfView) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    };

    const attachToElement = (attempt = 0) => {
      if (cancelled) return;
      element = resolveElement();
      if (!element) {
        if (attempt < 10) {
          retryTimeout = window.setTimeout(() => attachToElement(attempt + 1), 100);
        } else {
          setSpotlight(null);
        }
        return;
      }
      updateSpotlight();
      ensureVisible();
    };

    const handleReposition = () => {
      if (cancelled) return;
      if (!element || !document.body.contains(element)) {
        attachToElement();
        return;
      }
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(updateSpotlight);
    };

    attachToElement();

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      cancelled = true;
      if (retryTimeout !== null) {
        window.clearTimeout(retryTimeout);
      }
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [step]);

  const handlePersonaSelect = useCallback(
    (persona: PersonaOption['id']) => {
      initialPersonaRef.current = persona;
      setSelectedPersona(persona);
      if (mode !== persona) {
        setMode(persona);
      }
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Onboarding] Persona selected', persona);
      }
    },
    [mode, setMode]
  );

  const goNext = useCallback(() => {
    console.log('[Onboarding] goNext called - START, current stepIndex:', stepIndex);
    try {
      // Get current step
      const currentStep = STEPS[stepIndex];
      const isTelemetryStep = currentStep?.id === 'telemetry';
      const isLastStep = stepIndex >= TOTAL_STEPS - 1;

      // Save telemetry opt-in preference asynchronously before state update
      // This prevents any IPC errors from blocking the state update
      if (isTelemetryStep) {
        // Save telemetry opt-in preference asynchronously (don't wait for it)
        // Use void to explicitly ignore the promise
        void Promise.allSettled([
          applyTelemetryOptIn(telemetryOptIn),
          applyAnalyticsOptIn(telemetryOptIn),
        ]).catch(error => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Onboarding] Failed to save telemetry opt-in', error);
          }
        });
      }

      // If we're on the last step (telemetry), finish and close
      if (isTelemetryStep || isLastStep) {
        console.log('[Onboarding] Finishing tour from step', stepIndex);

        // Finish onboarding (this updates the store and marks as completed)
        console.log('[Onboarding] Calling finishOnboarding()');
        finishOnboarding();

        console.log('[Onboarding] finishOnboarding() called, calling onClose()');

        // Call onClose for any cleanup
        onClose();
        console.log('[Onboarding] goNext - onClose() called - END');

        return;
      }

      // Handle persona step validation
      if (currentStep?.type === 'persona') {
        console.log('[Onboarding] Persona step - selectedPersona:', selectedPersona, 'mode:', mode);
        if (!selectedPersona) {
          console.warn('[Onboarding] Cannot advance: no persona selected');
          // Try to get selected persona from DOM if state is out of sync
          const selectedPersonaCard = document.querySelector(
            '[aria-pressed="true"]'
          ) as HTMLElement;
          if (selectedPersonaCard) {
            const personaId =
              selectedPersonaCard.getAttribute('data-persona-id') ||
              selectedPersonaCard.closest('[data-persona-id]')?.getAttribute('data-persona-id');
            if (personaId) {
              console.log('[Onboarding] Found selected persona from DOM:', personaId);
              handlePersonaSelect(personaId as PersonaOption['id']);
              // Continue with the selected persona
            } else {
              console.warn('[Onboarding] No persona selected, cannot advance');
              return;
            }
          } else {
            console.warn('[Onboarding] No persona selected, cannot advance');
            return;
          }
        }
        if (selectedPersona && mode !== selectedPersona) {
          console.log('[Onboarding] Setting mode to:', selectedPersona);
          setMode(selectedPersona);
        }
      }

      // Advance to next step
      const nextIndex = Math.min(stepIndex + 1, TOTAL_STEPS - 1);

      console.log('[Onboarding] Next from step', stepIndex, '->', nextIndex);

      setStepIndex(nextIndex);
    } catch (error) {
      console.error('[Onboarding] Error in goNext:', error);
    }
  }, [stepIndex, selectedPersona, mode, setMode, finishOnboarding, onClose, telemetryOptIn]);

  const goBack = useCallback(() => {
    setStepIndex(current => {
      if (current === 0) {
        return 0;
      }
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Onboarding] Back from step', current);
      }
      return Math.max(0, current - 1);
    });
  }, []);

  const handleSkip = useCallback(() => {
    console.log('[Onboarding] handleSkip called - START');
    try {
      console.log('[Onboarding] Skip pressed at step', stepIndex);
      // Finish onboarding (this updates the store and marks as completed)
      console.log('[Onboarding] Skip - calling finishOnboarding()');
      finishOnboarding();

      console.log('[Onboarding] Skip - finishOnboarding() called, calling onClose()');

      // Call onClose for any cleanup
      onClose();
      console.log('[Onboarding] Skip - onClose() called - END');
    } catch (error) {
      console.error('[Onboarding] Error in handleSkip:', error);
      // Fallback: try to close anyway
      try {
        finishOnboarding();
        onClose();
      } catch (fallbackError) {
        console.error('[Onboarding] Fallback close also failed:', fallbackError);
      }
    }
  }, [finishOnboarding, onClose, stepIndex]);

  // Add native event listeners as fallback to test if clicks are reaching buttons
  // This runs AFTER all callbacks are defined
  useEffect(() => {
    if (!onboardingVisible) return;

    console.log('[Onboarding] Setting up native event listeners...');
    console.log('[Onboarding] Current stepIndex:', stepIndex);
    console.log('[Onboarding] isNextDisabled:', isNextDisabled);
    console.log('[Onboarding] canGoBack:', canGoBack);

    let attached = false;
    const attachListeners = () => {
      if (attached) return;
      const nextButton =
        primaryButtonRef.current ||
        (document.querySelector('[data-onboarding-next]') as HTMLButtonElement);
      const skipButton = document.querySelector('[data-onboarding-skip]') as HTMLButtonElement;
      const backButton = document.querySelector('[data-onboarding-back]') as HTMLButtonElement;
      const closeButton = document.querySelector('[data-onboarding-close]') as HTMLButtonElement;

      console.log('[Onboarding] Button elements found:', {
        next: !!nextButton,
        skip: !!skipButton,
        back: !!backButton,
        close: !!closeButton,
      });

      const handleNextClick = (e: Event) => {
        console.log('[Onboarding] ✅✅✅ NATIVE CLICK DETECTED ON NEXT BUTTON! ✅✅✅', e);
        console.log('[Onboarding] Event details:', {
          type: e.type,
          target: e.target,
          currentTarget: e.currentTarget,
          bubbles: e.bubbles,
          cancelable: e.cancelable,
        });
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        try {
          // Always call goNext - it will handle validation internally
          console.log('[Onboarding] Calling goNext() from native listener...');
          // Use setTimeout to ensure state updates happen
          setTimeout(() => {
            goNext();
          }, 0);
        } catch (err) {
          console.error('[Onboarding] Error in goNext from native listener:', err);
        }
        return false;
      };

      const handleSkipClick = (e: Event) => {
        console.log('[Onboarding] ✅✅✅ NATIVE CLICK DETECTED ON SKIP BUTTON! ✅✅✅', e);
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        try {
          // Call immediately, don't wait
          handleSkip();
        } catch (err) {
          console.error('[Onboarding] Error in handleSkip from native listener:', err);
        }
        return false;
      };

      const handleBackClick = (e: Event) => {
        console.log('[Onboarding] ✅✅✅ NATIVE CLICK DETECTED ON BACK BUTTON! ✅✅✅', e);
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        try {
          setTimeout(() => {
            goBack();
          }, 0);
        } catch (err) {
          console.error('[Onboarding] Error in goBack from native listener:', err);
        }
        return false;
      };

      const handleCloseClick = (e: Event) => {
        console.log('[Onboarding] ✅✅✅ NATIVE CLICK DETECTED ON CLOSE BUTTON! ✅✅✅', e);
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        try {
          setTimeout(() => {
            finishOnboarding();
            onClose();
          }, 0);
        } catch (err) {
          console.error('[Onboarding] Error in close from native listener:', err);
        }
        return false;
      };

      if (nextButton) {
        // Check if button is disabled
        const isDisabled =
          nextButton.hasAttribute('disabled') || (nextButton as HTMLButtonElement).disabled;
        console.log(
          '[Onboarding] Next button disabled state:',
          isDisabled,
          'isNextDisabled:',
          isNextDisabled
        );

        // Force enable the button for testing (remove disabled attribute)
        if (isDisabled) {
          console.warn('[Onboarding] ⚠️ Next button is disabled! Force enabling for testing...');
          nextButton.removeAttribute('disabled');
          (nextButton as HTMLButtonElement).disabled = false;
          nextButton.style.pointerEvents = 'auto';
          nextButton.style.cursor = 'pointer';
          nextButton.style.opacity = '1';
        }

        // Attach listeners with capture phase and also without
        nextButton.addEventListener('click', handleNextClick, true);
        nextButton.addEventListener('click', handleNextClick, false);
        nextButton.addEventListener('mousedown', handleNextClick, true);
        nextButton.addEventListener('mousedown', handleNextClick, false);
        nextButton.addEventListener('pointerdown', handleNextClick, true);
        nextButton.addEventListener('touchstart', handleNextClick, true);

        // Also try direct onclick assignment as ultimate fallback
        (nextButton as any).onclick = handleNextClick;
        (nextButton as any).onmousedown = handleNextClick;

        console.log(
          '[Onboarding] ✅ Native listeners attached to Next button (capture + bubble + direct)'
        );

        // Test: Try programmatically clicking to see if button works
        console.log(
          '[Onboarding] Testing: Button clickable?',
          nextButton.offsetWidth > 0 && nextButton.offsetHeight > 0
        );

        // Test if button is actually clickable
        const computedStyle = window.getComputedStyle(nextButton);
        console.log('[Onboarding] Next button computed styles:', {
          pointerEvents: computedStyle.pointerEvents,
          cursor: computedStyle.cursor,
          zIndex: computedStyle.zIndex,
          position: computedStyle.position,
          opacity: computedStyle.opacity,
        });
      } else {
        console.warn('[Onboarding] ⚠️ Next button not found!');
      }

      if (skipButton) {
        // Use capture phase to catch events early
        skipButton.addEventListener('click', handleSkipClick, { capture: true, passive: false });
        skipButton.addEventListener('mousedown', handleSkipClick, {
          capture: true,
          passive: false,
        });
        skipButton.addEventListener('pointerdown', handleSkipClick, {
          capture: true,
          passive: false,
        });
        skipButton.addEventListener('touchstart', handleSkipClick, {
          capture: true,
          passive: false,
        });
        console.log('[Onboarding] ✅ Native listeners attached to Skip button');
      } else {
        console.warn('[Onboarding] ⚠️ Skip button not found!');
      }

      if (backButton) {
        backButton.addEventListener('click', handleBackClick, true);
        backButton.addEventListener('mousedown', handleBackClick, true);
        backButton.addEventListener('pointerdown', handleBackClick, true);
        console.log('[Onboarding] ✅ Native listeners attached to Back button');
      } else {
        console.warn('[Onboarding] ⚠️ Back button not found!');
      }

      if (closeButton) {
        closeButton.addEventListener('click', handleCloseClick, true);
        closeButton.addEventListener('mousedown', handleCloseClick, true);
        closeButton.addEventListener('pointerdown', handleCloseClick, true);
        console.log('[Onboarding] ✅ Native listeners attached to Close button');
      } else {
        console.warn('[Onboarding] ⚠️ Close button not found!');
      }

      // Store cleanup function
      (window as any).__onboardingCleanup = () => {
        if (nextButton) {
          nextButton.removeEventListener('click', handleNextClick, true);
          nextButton.removeEventListener('click', handleNextClick, false);
          nextButton.removeEventListener('mousedown', handleNextClick, true);
          nextButton.removeEventListener('mousedown', handleNextClick, false);
          nextButton.removeEventListener('pointerdown', handleNextClick, true);
          nextButton.removeEventListener('touchstart', handleNextClick, true);
          (nextButton as any).onclick = null;
          (nextButton as any).onmousedown = null;
        }
        if (skipButton) {
          skipButton.removeEventListener('click', handleSkipClick, { capture: true } as any);
          skipButton.removeEventListener('mousedown', handleSkipClick, { capture: true } as any);
          skipButton.removeEventListener('pointerdown', handleSkipClick, { capture: true } as any);
          skipButton.removeEventListener('touchstart', handleSkipClick, { capture: true } as any);
        }
        if (backButton) {
          backButton.removeEventListener('click', handleBackClick, true);
          backButton.removeEventListener('mousedown', handleBackClick, true);
          backButton.removeEventListener('pointerdown', handleBackClick, true);
        }
        if (closeButton) {
          closeButton.removeEventListener('click', handleCloseClick, true);
          closeButton.removeEventListener('mousedown', handleCloseClick, true);
          closeButton.removeEventListener('pointerdown', handleCloseClick, true);
        }
      };

      attached = true;
      console.log('[Onboarding] ✅ All listeners attached successfully');
    };

    // Try multiple times with increasing delays
    const timeouts = [
      setTimeout(() => {
        console.log('[Onboarding] Attempt 1: Attaching listeners (100ms delay)');
        attachListeners();
      }, 100),
      setTimeout(() => {
        console.log('[Onboarding] Attempt 2: Attaching listeners (300ms delay)');
        attachListeners();
      }, 300),
      setTimeout(() => {
        console.log('[Onboarding] Attempt 3: Attaching listeners (500ms delay)');
        attachListeners();
      }, 500),
    ];

    // Also use MutationObserver to catch when buttons appear
    const observer = new MutationObserver(() => {
      console.log('[Onboarding] DOM mutation detected, checking for buttons...');
      attachListeners();
    });

    // Observe the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // ULTIMATE FALLBACK: Global document click handler
    const globalClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Check if click is on any onboarding button
      const isNextButton =
        target.closest('[data-onboarding-next]') || target.hasAttribute('data-onboarding-next');
      const isSkipButton =
        target.closest('[data-onboarding-skip]') || target.hasAttribute('data-onboarding-skip');
      const isBackButton =
        target.closest('[data-onboarding-back]') || target.hasAttribute('data-onboarding-back');
      const isCloseButton =
        target.closest('[data-onboarding-close]') || target.hasAttribute('data-onboarding-close');

      if (isNextButton) {
        console.log('[Onboarding] 🔥🔥🔥 GLOBAL CLICK HANDLER: Next button clicked! 🔥🔥🔥');
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        setTimeout(() => goNext(), 0);
        return false;
      }
      if (isSkipButton) {
        console.log('[Onboarding] 🔥🔥🔥 GLOBAL CLICK HANDLER: Skip button clicked! 🔥🔥🔥');
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        // Call immediately
        handleSkip();
        return false;
      }
      if (isBackButton) {
        console.log('[Onboarding] 🔥🔥🔥 GLOBAL CLICK HANDLER: Back button clicked! 🔥🔥🔥');
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        setTimeout(() => goBack(), 0);
        return false;
      }
      if (isCloseButton) {
        console.log('[Onboarding] 🔥🔥🔥 GLOBAL CLICK HANDLER: Close button clicked! 🔥🔥🔥');
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        setTimeout(() => {
          finishOnboarding();
          onClose();
        }, 0);
        return false;
      }
    };

    // Add global handler with capture phase (runs before React)
    document.addEventListener('click', globalClickHandler, true);
    document.addEventListener('mousedown', globalClickHandler, true);

    console.log('[Onboarding] ✅ Global click handlers attached to document');

    return () => {
      timeouts.forEach(clearTimeout);
      observer.disconnect();
      document.removeEventListener('click', globalClickHandler, true);
      document.removeEventListener('mousedown', globalClickHandler, true);
      if ((window as any).__onboardingCleanup) {
        (window as any).__onboardingCleanup();
        delete (window as any).__onboardingCleanup;
      }
      attached = false;
    };
  }, [
    onboardingVisible,
    goNext,
    handleSkip,
    goBack,
    finishOnboarding,
    onClose,
    stepIndex,
    isNextDisabled,
    canGoBack,
  ]);

  // Keyboard navigation
  useEffect(() => {
    if (!onboardingVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      console.log('[Onboarding] Keyboard event:', e.key);

      switch (e.key) {
        case 'Enter':
          // Enter key - go to next step or finish
          e.preventDefault();
          e.stopPropagation();
          if (!isNextDisabled) {
            console.log('[Onboarding] Enter pressed - calling goNext()');
            goNext();
          } else {
            console.log('[Onboarding] Enter pressed but Next is disabled');
          }
          break;

        case 'ArrowRight':
          // Right arrow - go to next step or finish
          e.preventDefault();
          e.stopPropagation();
          if (!isNextDisabled) {
            console.log('[Onboarding] ArrowRight pressed - calling goNext()');
            goNext();
          } else {
            console.log('[Onboarding] ArrowRight pressed but Next is disabled');
          }
          break;

        case 'ArrowLeft':
          // Left arrow - go back
          e.preventDefault();
          e.stopPropagation();
          if (canGoBack) {
            console.log('[Onboarding] ArrowLeft pressed - calling goBack()');
            goBack();
          } else {
            console.log('[Onboarding] ArrowLeft pressed but cannot go back');
          }
          break;

        case 'Escape':
          // Escape key - skip onboarding
          e.preventDefault();
          e.stopPropagation();
          console.log('[Onboarding] Escape pressed - calling handleSkip()');
          handleSkip();
          break;

        default:
          // Other keys - do nothing
          break;
      }
    };

    // Add keyboard listener
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);

    console.log('[Onboarding] Keyboard listeners attached');

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      console.log('[Onboarding] Keyboard listeners removed');
    };
  }, [onboardingVisible, goNext, handleSkip, goBack, isNextDisabled, canGoBack]);

  return (
    <AnimatePresence mode="wait">
      {onboardingVisible && (
        <motion.div
          key="onboarding-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          style={{ pointerEvents: 'auto' }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          onMouseDown={e => {
            // Completely ignore button clicks - don't interfere at all
            const target = e.target as HTMLElement;
            if (
              target.closest('button') ||
              target.closest('[data-onboarding-skip]') ||
              target.closest('[data-onboarding-next]') ||
              target.closest('[data-onboarding-back]') ||
              target.closest('[data-onboarding-close]') ||
              target.closest('[role="button"]')
            ) {
              return; // Don't do anything - let button handle it completely
            }
            // Only prevent default for backdrop clicks (not on buttons)
            e.preventDefault();
          }}
          onClick={e => {
            // Completely ignore button clicks - don't interfere at all
            const target = e.target as HTMLElement;
            if (
              target.closest('button') ||
              target.closest('[data-onboarding-skip]') ||
              target.closest('[data-onboarding-next]') ||
              target.closest('[data-onboarding-back]') ||
              target.closest('[data-onboarding-close]') ||
              target.closest('[role="button"]')
            ) {
              return; // Don't do anything - let button handle it completely
            }
          }}
        >
          {spotlight && (
            <div
              className="pointer-events-none absolute rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              style={{
                top: spotlight.top - 8,
                left: spotlight.left - 8,
                width: spotlight.width + 16,
                height: spotlight.height + 16,
                transition: 'all 0.25s ease',
              }}
            />
          )}

          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-[min(520px,90vw)] rounded-3xl border border-slate-700/70 bg-slate-950/95 p-6 text-gray-100 shadow-2xl z-[10000]"
            style={{ pointerEvents: 'auto', position: 'relative' }}
            onMouseDown={e => {
              // Completely ignore button clicks - don't interfere at all
              const target = e.target as HTMLElement;
              if (
                target.closest('button') ||
                target.closest('[data-onboarding-skip]') ||
                target.closest('[data-onboarding-next]') ||
                target.closest('[data-onboarding-back]') ||
                target.closest('[data-onboarding-close]') ||
                target.closest('[role="button"]')
              ) {
                return; // Don't do anything - let button handle it completely
              }
            }}
            onClick={e => {
              // Completely ignore button clicks - don't interfere at all
              const target = e.target as HTMLElement;
              if (
                target.closest('button') ||
                target.closest('[data-onboarding-skip]') ||
                target.closest('[data-onboarding-next]') ||
                target.closest('[data-onboarding-back]') ||
                target.closest('[data-onboarding-close]') ||
                target.closest('[role="button"]')
              ) {
                return; // Don't do anything - let button handle it completely
              }
              // Only stop propagation for non-button clicks
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              data-onboarding-close
              className="absolute right-5 top-5 rounded-full border border-slate-700/60 bg-slate-900/70 p-1.5 text-gray-400 hover:text-gray-200 cursor-pointer active:scale-95"
              style={{
                pointerEvents: 'auto',
                position: 'absolute',
                zIndex: 10010,
                isolation: 'isolate',
              }}
              onClick={e => {
                console.log('[Onboarding] ✅ Close (X) button clicked!');
                e.preventDefault();
                e.stopPropagation();
                (e as any).stopImmediatePropagation();
                finishOnboarding();
                onClose();
              }}
              onMouseDown={e => {
                console.log('[Onboarding] ✅ Close (X) button mousedown!');
                e.preventDefault();
                e.stopPropagation();
                finishOnboarding();
                onClose();
              }}
              aria-label="Close onboarding"
            >
              <X size={16} />
            </button>

            <div
              className="text-xs uppercase tracking-wide text-emerald-300/80"
              data-tour-step-indicator
            >
              Step {stepIndex + 1} of {TOTAL_STEPS}
            </div>
            <div className="mt-2" aria-live="polite">
              <h2 id="onboarding-title" className="text-xl font-semibold text-white">
                {step.title}
              </h2>
              {step.description && (
                <p className="mt-3 text-sm leading-relaxed text-gray-300">{step.description}</p>
              )}
              {step.tips && step.tips.length > 0 && (
                <div className="mt-4 space-y-3">
                  {step.tips.map(tip => {
                    const Icon = tip.icon;
                    return (
                      <div
                        key={tip.title}
                        className="flex items-start gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3"
                      >
                        <div className="mt-1 text-emerald-300/80">
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 text-sm text-slate-200">
                          <div className="font-semibold text-slate-100">{tip.title}</div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {tip.description}
                          </p>
                          {tip.actionId && tip.actionLabel && (
                            <button
                              type="button"
                              onClick={e => {
                                (e as any).stopImmediatePropagation();
                                e.stopPropagation();
                                handleTipAction(tip.actionId!);
                              }}
                              onMouseDown={e => {
                                (e as any).stopImmediatePropagation();
                                e.stopPropagation();
                              }}
                              className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100 transition hover:border-emerald-400/60 hover:text-emerald-50"
                              style={{ zIndex: 10011, isolation: 'isolate' }}
                            >
                              {tip.actionLabel}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <motion.div
                  className="h-full rounded-full bg-emerald-400/80"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">{progressPercent}% complete</div>
            </div>

            {step.type === 'persona' ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PERSONAS.map((persona, index) => {
                  const Icon = persona.icon;
                  const isActive = selectedPersona === persona.id;
                  return (
                    <motion.button
                      key={persona.id}
                      type="button"
                      data-persona-id={persona.id}
                      ref={index === 0 ? personaFirstButtonRef : undefined}
                      onClick={e => {
                        console.log('[Onboarding] Persona clicked:', persona.id);
                        e.preventDefault();
                        (e as any).stopImmediatePropagation();
                        e.stopPropagation();
                        handlePersonaSelect(persona.id);
                      }}
                      onMouseDown={e => {
                        e.preventDefault();
                        (e as any).stopImmediatePropagation();
                        e.stopPropagation();
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      aria-pressed={isActive}
                      className={`flex h-full flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                        isActive
                          ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100 shadow-[0_0_25px_rgba(34,197,94,0.25)]'
                          : 'border-slate-700/60 bg-slate-900/70 text-gray-200 hover:border-slate-500/80 hover:bg-slate-900/90'
                      }`}
                      style={{
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        zIndex: 10011,
                        isolation: 'isolate',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={20} />
                        <div>
                          <div className="text-sm font-semibold">{persona.title}</div>
                          <div className="text-xs text-gray-400">{persona.subtitle}</div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{persona.hint}</p>
                    </motion.button>
                  );
                })}
              </div>
            ) : step.id === 'telemetry' ? (
              <div className="mt-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 hover:border-slate-500/80">
                  <input
                    type="checkbox"
                    checked={telemetryOptIn}
                    onChange={e => setTelemetryOptIn(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold text-slate-100">
                      Enable privacy-safe telemetry
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Help us improve OmniBrowser by sharing anonymized performance data and crash
                      reports. No personal information is collected.
                    </p>
                    <a
                      href="#"
                      onClick={e => {
                        e.preventDefault();
                        // Open privacy policy or settings
                      }}
                      className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Learn more about our privacy policy →
                    </a>
                  </div>
                </label>
              </div>
            ) : null}

            <div
              className="mt-6 flex items-center justify-between text-sm"
              style={{ pointerEvents: 'auto', zIndex: 1002, position: 'relative' }}
            >
              <button
                type="button"
                data-onboarding-back
                onClick={e => {
                  console.log('[Onboarding] ✅ Back button clicked!', { canGoBack });
                  e.preventDefault();
                  e.stopPropagation();
                  (e as any).stopImmediatePropagation();
                  if (canGoBack) {
                    goBack();
                  }
                }}
                onMouseDown={e => {
                  console.log('[Onboarding] ✅ Back button mousedown!', { canGoBack });
                  e.preventDefault();
                  e.stopPropagation();
                  if (canGoBack) {
                    goBack();
                  }
                }}
                disabled={false} // Never disable - just check canGoBack in handler
                className="rounded-lg border border-slate-700/60 px-3 py-2 text-gray-300 transition hover:border-slate-500/80 hover:text-gray-100 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                style={{
                  pointerEvents: 'auto',
                  position: 'relative',
                  zIndex: 10010,
                  touchAction: 'manipulation',
                  opacity: canGoBack ? 1 : 0.4,
                  cursor: canGoBack ? 'pointer' : 'not-allowed',
                }}
              >
                Back
              </button>
              <div
                className="flex items-center gap-2"
                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10010 }}
                onMouseDown={e => {
                  // Completely ignore button clicks - don't interfere at all
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('[role="button"]')) {
                    return; // Don't do anything - let button handle it completely
                  }
                }}
                onClick={e => {
                  // Completely ignore button clicks - don't interfere at all
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('[role="button"]')) {
                    return; // Don't do anything - let button handle it completely
                  }
                }}
              >
                <button
                  type="button"
                  data-onboarding-skip
                  onClick={e => {
                    console.log('[Onboarding] ✅ Skip button clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    (e as any).stopImmediatePropagation();
                    handleSkip();
                  }}
                  onMouseDown={e => {
                    console.log('[Onboarding] ✅ Skip button mousedown!');
                    e.preventDefault();
                    e.stopPropagation();
                    handleSkip();
                  }}
                  className="rounded-lg border border-slate-700/60 px-3 py-2 text-gray-400 transition hover:border-slate-500/80 hover:text-gray-200 hover:bg-slate-800/50 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  style={{
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 10010,
                    touchAction: 'manipulation',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    isolation: 'isolate',
                  }}
                  tabIndex={0}
                  aria-label="Skip onboarding"
                >
                  Skip
                </button>
                <button
                  type="button"
                  data-onboarding-next
                  ref={primaryButtonRef}
                  onClick={e => {
                    console.log('[Onboarding] ✅ Next/Finish button clicked!', {
                      isNextDisabled,
                      stepIndex,
                    });
                    e.preventDefault();
                    e.stopPropagation();
                    (e as any).stopImmediatePropagation();

                    if (!isNextDisabled) {
                      goNext();
                    } else {
                      console.warn('[Onboarding] ⚠️ Button disabled, but trying anyway...', {
                        isNextDisabled,
                        stepIndex,
                        selectedPersona,
                      });
                      // Force proceed if disabled (might be state sync issue)
                      if (stepIndex === 0 && isPersonaStep) {
                        const defaultPersona = personaFromMode || 'Browse';
                        console.log('[Onboarding] Auto-selecting default persona:', defaultPersona);
                        handlePersonaSelect(defaultPersona);
                        setTimeout(() => goNext(), 50);
                      } else {
                        // Try to proceed anyway
                        goNext();
                      }
                    }
                  }}
                  onMouseDown={e => {
                    console.log('[Onboarding] ✅ Next/Finish button mousedown!', {
                      isNextDisabled,
                    });
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isNextDisabled) {
                      goNext();
                    } else {
                      // Force proceed on mousedown too
                      goNext();
                    }
                  }}
                  disabled={false} // Never disable - always allow click
                  className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-100 transition hover:bg-emerald-500/20 cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  style={{
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 10010,
                    touchAction: 'manipulation',
                    cursor: 'pointer',
                    isolation: 'isolate',
                    opacity: isNextDisabled ? 0.6 : 1,
                  }}
                >
                  {isLastStep ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
