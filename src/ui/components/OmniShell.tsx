/**
 * OmniShell Component
 * Root container & layout engine for the browser shell
 * Provides mode-first architecture with contextual overlays
 */

import React, { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from './TopBar';
import { useTokens } from '../useTokens';
import { useAppStore } from '../../state/appStore';
import { type ModeId } from '../tokens-enhanced';

export interface OmniShellProps {
  children: ReactNode;
  className?: string;
  showTopBar?: boolean;
  showStatusBar?: boolean;
  onModeChange?: (mode: ModeId) => void;
}

/**
 * OmniShell - Root layout container
 *
 * Features:
 * - Mode-first architecture
 * - Contextual tool overlays
 * - Keyboard-first navigation
 * - Focus management
 * - Reduced motion support
 */
export function OmniShell({
  children,
  className = '',
  showTopBar = true,
  showStatusBar = true,
  onModeChange,
}: OmniShellProps) {
  const tokens = useTokens();
  const mode = useAppStore((s: any) => s.mode);

  // Apply reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      document.documentElement.style.setProperty('--motion-reduce', mediaQuery.matches ? '1' : '0');
    };
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div
      className={`
        flex flex-col h-screen w-screen
        bg-[var(--surface-root)] text-[var(--text-primary)]
        overflow-hidden
        ${className}
      `}
      role="application"
      aria-label="OmniBrowser"
    >
      {/* Top Bar */}
      {showTopBar && (
        <TopBar
          onModeChange={(modeId: string) => {
            onModeChange?.(modeId as ModeId);
          }}
        />
      )}

      {/* Main Content Area */}
      <main
        className="flex-1 flex overflow-hidden relative"
        role="main"
        style={{
          minHeight: 0, // Allows flex children to shrink
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.18,
              ease: [0.2, 0.9, 0.3, 1],
            }}
            className="flex-1 flex flex-col overflow-hidden"
            style={{
              // Respect reduced motion
              transition: 'opacity 180ms cubic-bezier(0.2, 0.9, 0.3, 1)',
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Status Bar */}
      {showStatusBar && (
        <div
          className="border-t border-[var(--surface-border)] bg-[var(--surface-panel)]"
          role="contentinfo"
          aria-label="Status bar"
          style={{
            height: '32px',
            padding: `0 ${tokens.spacing(3)}`,
          }}
        >
          {/* Status bar content will be rendered by BottomStatusBar component */}
        </div>
      )}
    </div>
  );
}
