/**
 * Transient Suggestion Component - BATTLE 2
 * 
 * AI appears only on pattern detection, disappears after action or ignore.
 * This is how Regen feels human, not robotic.
 * 
 * Requirements:
 * - One suggestion at a time
 * - Ignore = respected
 * - Suggest → act → disappear
 * - No chat bubbles, no prompts, no CTAs
 */

import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { patternDetector, type DetectedPattern } from '../../core/pattern/PatternDetector';
import { eventBus } from '../../core/state/eventBus';

interface TransientSuggestionProps {
  className?: string;
}

interface SuggestionState {
  pattern: DetectedPattern;
  action?: string; // AI-generated action suggestion
  dismissed: boolean;
}

/**
 * Transient Suggestion Component
 * BATTLE 2: AI appears only on pattern detection, disappears after action
 */
export function TransientSuggestion({ className = '' }: TransientSuggestionProps) {
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Listen for pattern detection
    const unsubscribe = patternDetector.onPatternChange((pattern) => {
      if (pattern && pattern.confidence > 0.6) {
        // Generate action suggestion based on pattern type
        const action = generateActionSuggestion(pattern);
        setSuggestion({
          pattern,
          action,
          dismissed: false,
        });
      } else {
        // Pattern cleared or dismissed
        setSuggestion(null);
      }
    });

    // Listen for AI-generated suggestions (optional, can be added later)
    const unsubscribeAI = eventBus.on('ai:suggestion:generated', (data: { pattern: DetectedPattern; action: string }) => {
      if (suggestion?.pattern.type === data.pattern.type) {
        setSuggestion(prev => prev ? { ...prev, action: data.action } : null);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeAI();
    };
  }, [suggestion?.pattern.type]);

  /**
   * Generate action suggestion based on pattern type
   * BATTLE 2: Cheap, no AI needed for basic suggestions
   */
  const generateActionSuggestion = (pattern: DetectedPattern): string => {
    switch (pattern.type) {
      case 'research_paper':
        return 'Summarize this paper';
      case 'long_article':
        return 'Extract key points';
      case 'document_editor':
        return 'Review document';
      case 'code_repository':
        return 'Explain this code';
      case 'video_content':
        return 'Summarize video';
      case 'shopping_page':
        return 'Compare products';
      case 'social_feed':
        return 'Analyze trends';
      case 'search_results':
        return 'Refine search';
      default:
        return 'Analyze content';
    }
  };

  /**
   * Handle suggestion action
   * BATTLE 2: Act → disappear
   */
  const handleAction = async () => {
    if (!suggestion || isProcessing) return;

    setIsProcessing(true);

    // Emit action request to AI engine
    eventBus.emit('ai:task:request', {
      kind: 'agent',
      prompt: suggestion.action || `Analyze this ${suggestion.pattern.type}`,
      context: {
        pattern: suggestion.pattern.type,
        url: suggestion.pattern.context.url,
        tabId: suggestion.pattern.context.metadata?.tabId,
      },
      mode: 'suggestion',
    });

    // Disappear after action (transient)
    setTimeout(() => {
      setSuggestion(null);
      setIsProcessing(false);
    }, 500);
  };

  /**
   * Handle dismiss/ignore
   * BATTLE 2: Ignore = respected
   */
  const handleDismiss = () => {
    if (!suggestion) return;

    // Mark pattern as ignored
    patternDetector.ignorePattern(suggestion.pattern.context.url);
    
    // Disappear immediately
    setSuggestion(null);
  };

  if (!suggestion || suggestion.dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`
          fixed bottom-4 right-4 z-50
          max-w-sm
          rounded-lg
          border border-[var(--surface-border)]
          bg-[var(--surface-panel)]
          shadow-lg
          ${className}
        `}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-3 p-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <Sparkles className="h-5 w-5 text-[var(--color-primary-500)]" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {suggestion.action || 'Suggestion'}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Detected: {suggestion.pattern.type.replace('_', ' ')}
            </p>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleAction}
                disabled={isProcessing}
                className={`
                  flex-1
                  rounded-md
                  px-3 py-1.5
                  text-xs font-medium
                  transition-colors
                  ${isProcessing
                    ? 'bg-[var(--surface-hover)] text-[var(--text-muted)] cursor-not-allowed'
                    : 'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)]'
                  }
                `}
              >
                {isProcessing ? 'Processing...' : 'Do it'}
              </button>
              <button
                onClick={handleDismiss}
                className="
                  rounded-md
                  p-1.5
                  text-[var(--text-muted)]
                  hover:bg-[var(--surface-hover)]
                  transition-colors
                "
                aria-label="Dismiss suggestion"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Auto-dismiss after 10 seconds if not interacted */}
        <AutoDismiss onDismiss={handleDismiss} delay={10000} />
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Auto-dismiss component
 * BATTLE 2: Suggestions disappear if ignored
 */
function AutoDismiss({ onDismiss, delay }: { onDismiss: () => void; delay: number }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, delay);
    return () => clearTimeout(timer);
  }, [onDismiss, delay]);

  return null;
}
