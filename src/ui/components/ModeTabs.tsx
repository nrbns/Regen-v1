/**
 * ModeTabs Component
 * Mode switching tabs with visual indicators and mode shifting
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, TrendingUp, Code, BookOpen, MoreHorizontal } from 'lucide-react';
import { useModeShift } from '../hooks/useModeShift';
import { useAppStore } from '../../state/appStore';
import { isMVPFeatureEnabled, isV1ModeEnabled } from '../../config/mvpFeatureFlags';
import { useTokens } from '../useTokens';
import { type ModeId } from '../tokens-enhanced';
import { getModeFlag } from '../../config/featureFlags';
export interface ModeTabsProps {
  className?: string;
  compact?: boolean;
  onModeChange?: (mode: ModeId) => void;
}

const MODE_CONFIG: Array<{
  id: ModeId;
  label: string;
  icon: React.ComponentType<any>;
  shortcut?: string;
  comingSoon?: boolean;
}> = [
  { id: 'browse', label: 'Browse', icon: Globe, shortcut: '1' },
  { id: 'research', label: 'Research', icon: Search, shortcut: '2' },
  { id: 'trade', label: 'Trade', icon: TrendingUp, shortcut: '3' },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen, shortcut: '4' },
  { id: 'dev', label: 'Dev', icon: Code, shortcut: '5', comingSoon: true }, // Tier 1: Hide unfinished
];

export function ModeTabs({ className, compact, onModeChange }: ModeTabsProps) {
  // In v1-mode, hide mode tabs to keep UI simple and stable
  if (isV1ModeEnabled()) return null;

  const tokens = useTokens();
  const { currentMode, isShifting } = useModeShift();
  const setMode = useAppStore(state => state.setMode);
  const [hoveredMode, setHoveredMode] = useState<ModeId | null>(null);
  const buttonRefs = useRef<Record<ModeId, HTMLButtonElement | null>>({
    browse: null,
    research: null,
    trade: null,
    knowledge: null,
    dev: null,
  });

  // Map AppState mode to ModeId
  const currentModeId: ModeId =
    currentMode === 'Browse'
      ? 'browse'
      : currentMode === 'Research'
        ? 'research'
        : currentMode === 'Trade'
          ? 'trade'
          : currentMode === 'Knowledge'
            ? 'knowledge'
            : 'browse';

  const handleModeClick = React.useCallback(
    async (modeId: ModeId) => {
      if (modeId === currentModeId || isShifting) return;

      // Map ModeId to AppState mode
      const modeMap: Record<
        ModeId,
        | 'Browse'
        | 'Research'
        | 'Trade'
        | 'Knowledge'
        | 'Games'
        | 'Docs'
        | 'Images'
        | 'Threats'
        | 'GraphMind'
      > = {
        browse: 'Browse',
        research: 'Research',
        trade: 'Trade',
        knowledge: 'Knowledge',
        dev: 'Browse', // Dev maps to Browse for now
      };

      const targetMode = modeMap[modeId];
      if (!targetMode) return;

      // Immediately switch mode by directly calling setMode
      await setMode(targetMode);

      // Call onModeChange callback if provided (for TopBar integration)
      if (onModeChange) {
        onModeChange(modeId);
      }
    },
    [currentModeId, isShifting, setMode, onModeChange]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const mode = MODE_CONFIG.find(m => m.shortcut === e.key);
      if (mode) {
        e.preventDefault();
        void handleModeClick(mode.id);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleModeClick]);

  return (
    <div
      className={`flex items-center gap-1 ${className || ''}`}
      role="tablist"
      aria-label="Mode selection"
    >
      {MODE_CONFIG.map((mode: (typeof MODE_CONFIG)[0]) => {
        const Icon = mode.icon;
        const isActive = currentModeId === mode.id;
        const isHovered = hoveredMode === mode.id;

        // Check if mode is hidden by feature flags (production hides beta modes)
        const modeFlag = getModeFlag(mode.id as any);
        const isHidden = modeFlag.status === 'hidden';
        if (isHidden && !isActive) {
          return null;
        }

        return (
          <button
            key={mode.id}
            ref={el => {
              buttonRefs.current[mode.id] = el;
            }}
            onClick={async e => {
              e.preventDefault();
              e.stopPropagation();
              if ((e.nativeEvent as any)?.stopImmediatePropagation) {
                (e.nativeEvent as any).stopImmediatePropagation();
              }
              if (isHidden) {
                // Show "Coming Soon" toast instead of switching
                const { toast } = await import('../../utils/toast');
                toast.info(`${mode.label} mode is coming soon!`);
                return;
              }
              await handleModeClick(mode.id);
            }}
            onMouseDown={e => {
              e.stopPropagation();
            }}
            onMouseEnter={() => {
              setHoveredMode(mode.id);
            }}
            onMouseLeave={() => {
              setHoveredMode(null);
            }}
            disabled={isShifting || isHidden}
            className={`relative flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1 ${
              isActive
                ? 'bg-[var(--color-primary-600)] text-white shadow-md'
                : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
            } ${isShifting ? 'cursor-wait opacity-50' : isHidden ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${compact ? 'px-2 py-1.5' : ''} `}
            style={{
              fontSize: compact ? tokens.fontSize.xs : tokens.fontSize.sm,
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`mode-${mode.id}`}
            title={
              isHidden ? `${mode.label} (Coming Soon)` : `${mode.label} (Alt+${mode.shortcut})`
            }
          >
            <Icon
              size={compact ? 16 : 18}
              className={isActive ? 'text-white' : 'text-[var(--text-muted)]'}
            />
            {!compact && (
              <span className="font-medium">
                {mode.label}
                {isHidden && <span className="ml-1 text-xs opacity-70">(Soon)</span>}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="mode-indicator"
                className="bg-[var(--color-primary-500)]/20 absolute inset-0 rounded-lg"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            {isHovered && !isActive && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-[var(--surface-hover)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </button>
        );
      })}

      {/* More button for additional modes */}
      <button
        className={`flex items-center gap-2 rounded-lg bg-[var(--surface-elevated)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1 ${compact ? 'px-2 py-1.5' : ''} `}
        style={{
          fontSize: compact ? tokens.fontSize.xs : tokens.fontSize.sm,
        }}
        aria-label="More modes"
        title="More modes"
      >
        <MoreHorizontal size={compact ? 16 : 18} />
      </button>

      {/* Loading indicator */}
      {isShifting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="ml-2 text-xs text-[var(--text-muted)]"
        >
          Switching...
        </motion.div>
      )}
    </div>
  );
}
