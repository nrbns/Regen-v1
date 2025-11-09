import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Brain, TrendingUp, Gamepad2, Zap } from 'lucide-react';
import { useAppStore } from '../../state/appStore';

interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  target?: string;
  type?: 'persona' | 'default';
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
  },
  {
    id: 'omnibox',
    title: 'Omnibox with @live AI',
    description:
      'Press ⌘/Ctrl + L to focus the omnibox. Try typing “@live quantum trends” to stream Redix results and graphs in real time.',
    target: '[data-onboarding="omnibox"]',
  },
  {
    id: 'tabstrip',
    title: 'Smart Tab Strip',
    description:
      'Tabs show peek previews, mode badges, and hibernation state. Scroll horizontally or hit Ctrl+Tab to jump quickly.',
    target: '[data-onboarding="tabstrip"]',
  },
  {
    id: 'regen',
    title: 'Regenerative Efficiency',
    description:
      'When the battery dips, Redix predicts remaining time, throttles background tabs, and offers +1.8 hr boost actions.',
    target: '[data-onboarding="status-bar"]',
  },
  {
    id: 'graph',
    title: 'Tab DNA Graph',
    description:
      'Press ⌘/Ctrl + Shift + G to open the live tab graph. You’ll see domains, containers, and session affinity mapped instantly.',
  },
  {
    id: 'consent',
    title: 'Ethical Control',
    description:
      'Every AI action requests consent in the ledger. Review what Redix can remember, approve, or revoke at any time.',
  },
];
interface Spotlight {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const { mode, setMode } = useAppStore();
  const initialPersona = useMemo<PersonaOption['id']>(() => {
    const fallback: PersonaOption['id'] = 'Browse';
    return PERSONAS.find((p) => p.id === mode) ? (mode as PersonaOption['id']) : fallback;
  }, [mode]);
  const [selectedPersona, setSelectedPersona] = useState<PersonaOption['id'] | null>(initialPersona);

  const step = useMemo(() => STEPS[index], [index]);

  useEffect(() => {
    if (!step?.target || step.type === 'persona') {
      setSpotlight(null);
      return;
    }
    const element = document.querySelector(step.target) as HTMLElement | null;
    if (!element) {
      setSpotlight(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    setSpotlight({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    });
  }, [step]);

  const handlePersonaSelect = (persona: PersonaOption['id']) => {
    setSelectedPersona(persona);
    setMode(persona);
  };

  const goNext = () => {
    if (step?.type === 'persona' && !selectedPersona) {
      return;
    }
    if (step?.type === 'persona' && selectedPersona) {
      setMode(selectedPersona);
    }
    if (index < STEPS.length - 1) {
      setIndex((current) => current + 1);
    } else {
      onClose();
    }
  };

  const goBack = () => {
    setIndex((current) => Math.max(0, current - 1));
  };

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
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
          className="relative w-[min(520px,90vw)] rounded-3xl border border-slate-700/70 bg-slate-950/95 p-6 text-gray-100 shadow-2xl"
        >
          <button
            className="absolute right-5 top-5 rounded-full border border-slate-700/60 bg-slate-900/70 p-1.5 text-gray-400 hover:text-gray-200"
            onClick={onClose}
            aria-label="Skip onboarding"
          >
            <X size={16} />
          </button>

          <div className="text-xs uppercase tracking-wide text-emerald-300/80">Step {index + 1} of {STEPS.length}</div>
          <h2 className="mt-2 text-xl font-semibold text-white">{step.title}</h2>
          {step.description && (
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{step.description}</p>
          )}

          {step.type === 'persona' ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PERSONAS.map((persona) => {
                const Icon = persona.icon;
                const isActive = selectedPersona === persona.id;
                return (
                  <motion.button
                    key={persona.id}
                    type="button"
                    onClick={() => handlePersonaSelect(persona.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex h-full flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100 shadow-[0_0_25px_rgba(34,197,94,0.25)]'
                        : 'border-slate-700/60 bg-slate-900/70 text-gray-200 hover:border-slate-500/80 hover:bg-slate-900/90'
                    }`}
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
          ) : null}

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              onClick={goBack}
              disabled={index === 0}
              className="rounded-lg border border-slate-700/60 px-3 py-2 text-gray-300 hover:border-slate-500/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-700/60 px-3 py-2 text-gray-400 hover:text-gray-200"
              >
                Skip
              </button>
              <button
                onClick={goNext}
                disabled={step.type === 'persona' && !selectedPersona}
                className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-100 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {index === STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
