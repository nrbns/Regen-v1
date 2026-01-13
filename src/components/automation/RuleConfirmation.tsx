/**
 * Rule Confirmation Component - BATTLE 5
 * 
 * Simple confirmation UI for automation rules.
 * Explicit, visible, temporary, cancelable.
 */

import React from 'react';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus } from '../../core/state/eventBus';

interface ConfirmationRequest {
  ruleId: string;
  ruleName: string;
  action: string;
  eventData: Record<string, unknown>;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Rule Confirmation Component
 * BATTLE 5: Explicit confirmation before automation action
 */
export function RuleConfirmation() {
  const [request, setRequest] = React.useState<ConfirmationRequest | null>(null);

  React.useEffect(() => {
    const unsubscribe = eventBus.on('automation:rule:confirm', (data: ConfirmationRequest) => {
      setRequest(data);
    });

    return unsubscribe;
  }, []);

  const handleConfirm = () => {
    if (request) {
      request.onConfirm();
      setRequest(null);
    }
  };

  const handleCancel = () => {
    if (request) {
      request.onCancel();
      setRequest(null);
    }
  };

  if (!request) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed bottom-4 left-4 z-50 max-w-sm"
      >
        <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] shadow-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                {request.ruleName}
              </h4>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                {request.action === 'summarize' && 'Summarize this content?'}
                {request.action === 'save' && 'Save this to workspace?'}
                {request.action === 'extract' && 'Extract key points?'}
                {request.action === 'analyze' && 'Analyze this content?'}
                {!['summarize', 'save', 'extract', 'analyze'].includes(request.action) && 
                  `Execute ${request.action}?`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 rounded-md bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-600)] transition-colors"
                >
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                  Confirm
                </button>
                <button
                  onClick={handleCancel}
                  className="rounded-md border border-[var(--surface-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <X className="h-3 w-3 inline mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
