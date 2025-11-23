/**
 * SideRail Component
 * Left dock for mode-specific tools and contextual overlays
 */

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTokens } from '../useTokens';
import { type ModeId } from '../tokens-enhanced';

export interface SideRailProps {
  open: boolean;
  width?: number;
  mode?: ModeId;
  tools?: ReactNode[];
  className?: string;
  onClose?: () => void;
}

/**
 * SideRail - Left dock for mode tools
 *
 * Features:
 * - Mode-specific toolkits
 * - Collapsible/expandable
 * - Keyboard accessible
 * - Smooth animations
 */
export function SideRail({
  open,
  width = 280,
  mode,
  tools = [],
  className = '',
  onClose,
}: SideRailProps) {
  const tokens = useTokens();

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: -width }}
          animate={{ x: 0 }}
          exit={{ x: -width }}
          transition={{
            duration: 0.18,
            ease: [0.2, 0.9, 0.3, 1],
          }}
          className={`
            fixed left-0 top-0 bottom-0 z-40
            bg-[var(--surface-panel)] border-r border-[var(--surface-border)]
            flex flex-col
            ${className}
          `}
          style={{
            width: `${width}px`,
            padding: tokens.spacing(3),
          }}
          role="complementary"
          aria-label="Mode tools"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-semibold text-[var(--text-primary)]"
              style={{ fontSize: tokens.fontSize.sm }}
            >
              {mode ? `${mode.charAt(0).toUpperCase() + mode.slice(1)} Tools` : 'Tools'}
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                aria-label="Close side rail"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 4L4 12M4 4l8 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Tools */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-2">
              {tools.length > 0 ? (
                tools.map((tool, index) => <div key={index}>{tool}</div>)
              ) : (
                <div
                  className="text-[var(--text-muted)] text-center py-8"
                  style={{ fontSize: tokens.fontSize.sm }}
                >
                  No tools available for this mode
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
