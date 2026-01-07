/**
 * RightPanel Component
 * Slide-over panel for contextual content (e.g., SuperMemory)
 */

import React, { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTokens } from '../useTokens';

export interface RightPanelProps {
  open: boolean;
  width?: number;
  title?: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

/**
 * RightPanel - Slide-over panel
 *
 * Features:
 * - Slide-in animation
 * - Focus trap
 * - Escape key to close
 * - Backdrop click to close
 * - Keyboard accessible
 */
export function RightPanel({
  open,
  width = 420,
  title,
  children,
  className = '',
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
}: RightPanelProps) {
  const tokens = useTokens();

  // Escape key handler
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open) return;

    const panel = document.querySelector('[data-right-panel]') as HTMLElement;
    if (!panel) return;

    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      panel.removeEventListener('keydown', handleTab);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          {closeOnBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              aria-hidden="true"
            />
          )}

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 200,
            }}
            className={`
              fixed right-0 top-0 bottom-0 z-50
              bg-[var(--surface-root)] backdrop-blur-xl
              border-l border-[var(--surface-border)]
              flex flex-col shadow-2xl
              ${className}
            `}
            style={{
              width: `${width}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Panel'}
            data-right-panel
          >
            {/* Header */}
            {title && (
              <div
                className="flex items-center justify-between border-b border-[var(--surface-border)]"
                style={{
                  padding: tokens.spacing(4),
                }}
              >
                <h2
                  className="font-semibold text-[var(--text-primary)]"
                  style={{ fontSize: tokens.fontSize.lg }}
                >
                  {title}
                </h2>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                    aria-label="Close panel"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
