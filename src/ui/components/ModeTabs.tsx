/**
 * ModeTabs Component
 * Mode switching tabs with visual indicators and mode shifting
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, TrendingUp, Code, MoreHorizontal } from 'lucide-react';
import { useModeShift } from '../hooks/useModeShift';
import { useTokens } from '../useTokens';
import { type ModeId } from '../tokens-enhanced';
import { ModePreviewCard } from './ModePreviewCard';

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
}> = [
  { id: 'browse', label: 'Browse', icon: Globe, shortcut: '1' },
  { id: 'research', label: 'Research', icon: Search, shortcut: '2' },
  { id: 'trade', label: 'Trade', icon: TrendingUp, shortcut: '3' },
  { id: 'dev', label: 'Dev', icon: Code, shortcut: '4' },
];

export function ModeTabs({ className, compact, onModeChange }: ModeTabsProps) {
  const tokens = useTokens();
  const { currentMode, isShifting, shiftMode } = useModeShift();
  const [hoveredMode, setHoveredMode] = useState<ModeId | null>(null);
  const [_previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const [showPreview, setShowPreview] = useState<{ from: ModeId; to: ModeId } | null>(null);
  const buttonRefs = useRef<Record<ModeId, HTMLButtonElement | null>>({
    browse: null,
    research: null,
    trade: null,
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
          : 'browse';

  const getModeChanges = React.useCallback((from: ModeId, to: ModeId): string[] => {
    const changes: string[] = [];

    if (from !== to) {
      const fromLabel = MODE_CONFIG.find(m => m.id === from)?.label || from;
      const toLabel = MODE_CONFIG.find(m => m.id === to)?.label || to;
      changes.push(`Switching from ${fromLabel} to ${toLabel}`);

      // Mode-specific changes
      if (from === 'browse' && to === 'research') {
        changes.push('Research panel will open');
        changes.push('AI analysis tools will be available');
      } else if (from === 'browse' && to === 'trade') {
        changes.push('Trading panel will open');
        changes.push('Market data will be displayed');
      } else if (from === 'research' && to === 'trade') {
        changes.push('Research panel will close');
        changes.push('Trading panel will open');
      } else if (from === 'trade' && to === 'research') {
        changes.push('Trading panel will close');
        changes.push('Research panel will open');
      }
    }

    return changes;
  }, []);

  const handleModeClick = React.useCallback(
    (modeId: ModeId) => {
      if (modeId === currentModeId || isShifting) return;

      // Show preview before switching
      setShowPreview({ from: currentModeId, to: modeId });
    },
    [currentModeId, isShifting]
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

        return (
          <button
            key={mode.id}
            ref={el => {
              buttonRefs.current[mode.id] = el;
            }}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              (e as any).stopImmediatePropagation();
              handleModeClick(mode.id);
            }}
            onMouseDown={e => {
              e.stopPropagation();
            }}
            onMouseEnter={e => {
              // Clear any pending close timeout
              const timeoutId = (e.currentTarget as any).__previewTimeout;
              if (timeoutId) {
                clearTimeout(timeoutId);
                (e.currentTarget as any).__previewTimeout = null;
              }
              setHoveredMode(mode.id);
              const rect = e.currentTarget.getBoundingClientRect();
              setPreviewPosition({
                x: rect.left + rect.width / 2,
                y: rect.top,
              });
            }}
            onMouseLeave={e => {
              // Small delay to allow moving to preview card
              const timeoutId = setTimeout(() => {
                setHoveredMode(null);
                setPreviewPosition(null);
              }, 150);
              // Store timeout to clear if mouse re-enters
              (e.currentTarget as any).__previewTimeout = timeoutId;
            }}
            disabled={isShifting}
            className={`
              relative flex items-center gap-2 px-3 py-2 rounded-lg
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
              ${
                isActive
                  ? 'bg-[var(--color-primary-600)] text-white shadow-md'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }
              ${isShifting ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
              ${compact ? 'px-2 py-1.5' : ''}
            `}
            style={{
              fontSize: compact ? tokens.fontSize.xs : tokens.fontSize.sm,
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`mode-${mode.id}`}
            title={`${mode.label} (Alt+${mode.shortcut})`}
          >
            <Icon
              size={compact ? 16 : 18}
              className={isActive ? 'text-white' : 'text-[var(--text-muted)]'}
            />
            {!compact && <span className="font-medium">{mode.label}</span>}
            {isActive && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-lg bg-[var(--color-primary-500)]/20"
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
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-[var(--surface-elevated)] text-[var(--text-secondary)]
          hover:bg-[var(--surface-hover)] transition-colors
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
          ${compact ? 'px-2 py-1.5' : ''}
        `}
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
          className="ml-2 text-[var(--text-muted)] text-xs"
        >
          Switching...
        </motion.div>
      )}

      {/* Mode Preview Card */}
      {showPreview && buttonRefs.current[showPreview.to] && (
        <div
          className="absolute"
          style={{
            top: '100%',
            left: 0,
            zIndex: 50,
          }}
        >
          <ModePreviewCard
            preview={{
              from: showPreview.from,
              to: showPreview.to,
              changes: getModeChanges(showPreview.from, showPreview.to),
            }}
            onConfirm={async () => {
              await shiftMode(showPreview.to, {
                snapshot: true,
                skipConfirmation: true,
              });
              onModeChange?.(showPreview.to);
              setShowPreview(null);
            }}
            onCancel={() => {
              setShowPreview(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
