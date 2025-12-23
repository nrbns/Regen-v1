/**
 * Step Progress Indicator
 * Shows AI work stages: Thinking → Searching → Writing
 * Provides visual proof of what the AI is doing
 */

import { Check, Brain, Search, PenTool } from 'lucide-react';

export type JobStep = 'idle' | 'thinking' | 'searching' | 'writing' | 'complete';

interface StepProgressProps {
  currentStep: JobStep;
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface Step {
  id: JobStep;
  label: string;
  icon: typeof Brain;
}

const STEPS: Step[] = [
  { id: 'thinking', label: 'Thinking', icon: Brain },
  { id: 'searching', label: 'Searching', icon: Search },
  { id: 'writing', label: 'Writing', icon: PenTool },
];

/**
 * Visual step progress indicator with icons
 * Shows: Thinking → Searching → Writing
 */
export function StepProgress({
  currentStep,
  className = '',
  showLabels = true,
  size = 'md',
}: StepProgressProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isComplete = currentStep === 'complete';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStepIndex;
        const isCompleted = isComplete || index < currentStepIndex;
        const _isPending = index > currentStepIndex && !isComplete;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {/* Step circle with icon */}
            <div
              className={`
                ${sizeClasses[size]}
                flex items-center justify-center rounded-full
                transition-all duration-300
                ${
                  isActive
                    ? 'bg-blue-500 text-white animate-pulse'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                }
              `}
            >
              {isCompleted && !isActive ? (
                <Check className="w-4 h-4" />
              ) : (
                <Icon className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />
              )}
            </div>

            {/* Step label */}
            {showLabels && (
              <span
                className={`
                  text-xs font-medium transition-colors
                  ${isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-slate-500'}
                `}
              >
                {step.label}
              </span>
            )}

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={`
                  w-8 h-0.5 transition-colors duration-300
                  ${isCompleted ? 'bg-green-500' : 'bg-slate-700'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compact step indicator (just dots)
 */
export function StepProgressCompact({
  currentStep,
  className = '',
}: {
  currentStep: JobStep;
  className?: string;
}) {
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isComplete = currentStep === 'complete';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {STEPS.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = isComplete || index < currentStepIndex;

        return (
          <div
            key={step.id}
            className={`
              w-2 h-2 rounded-full transition-all duration-300
              ${
                isActive
                  ? 'bg-blue-500 animate-pulse scale-125'
                  : isCompleted
                    ? 'bg-green-500'
                    : 'bg-slate-700'
              }
            `}
            title={step.label}
          />
        );
      })}
    </div>
  );
}

/**
 * Step badge (text only)
 */
export function StepBadge({ currentStep }: { currentStep: JobStep }) {
  const step = STEPS.find((s) => s.id === currentStep);
  if (!step) return null;

  const Icon = step.icon;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
      <Icon className="w-3 h-3 animate-pulse" />
      {step.label}
    </div>
  );
}

/**
 * Parse step from string (for socket events)
 */
export function parseJobStep(stepString: string | undefined): JobStep {
  if (!stepString) return 'idle';
  
  const lower = stepString.toLowerCase();
  if (lower.includes('think') || lower.includes('plan') || lower.includes('reason')) return 'thinking';
  if (lower.includes('search') || lower.includes('query') || lower.includes('fetch')) return 'searching';
  if (lower.includes('writ') || lower.includes('generat') || lower.includes('compos')) return 'writing';
  if (lower.includes('complete') || lower.includes('done') || lower.includes('finish')) return 'complete';
  
  return 'idle';
}
