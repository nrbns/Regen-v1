/**
 * TopBar Component
 * Main application chrome with mode tabs, address bar, and quick actions
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, ArrowLeft, ArrowRight, RotateCcw, Sparkles, ListChecks } from 'lucide-react';
import { ModeTabs } from './ModeTabs';
import { useTokens } from '../useTokens';
import { Container } from '../layout';
import { TopRightCluster } from './top-right';
import { BookmarkButton } from '../../components/bookmarks/BookmarkButton';
import { RealtimeSearchPreview } from '../../components/search/RealtimeSearchPreview';
import { useAddressBarAutoHide } from '../../hooks/useAddressBarAutoHide';
import { motion } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';

export interface TopBarProps {
  className?: string;
  compact?: boolean;
  showAddressBar?: boolean;
  showQuickActions?: boolean;
  onModeChange?: (mode: string) => void;
  onAddressBarSubmit?: (query: string) => void;
  currentUrl?: string;
}

export function TopBar({
  className,
  compact = false,
  showAddressBar = true,
  showQuickActions = true,
  onModeChange,
  onAddressBarSubmit,
  currentUrl,
}: TopBarProps) {
  const tokens = useTokens();
  const mode = useAppStore(state => state.mode);
  const setMode = useAppStore(state => state.setMode);
  const setResearchPaneOpen = useAppStore(state => state.setResearchPaneOpen);
  const [addressValue, setAddressValue] = useState(currentUrl || '');
  const [showPreview, setShowPreview] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeId } = useTabsStore();

  // SPRINT 0: Address bar auto-hide on scroll
  const { isVisible: isAddressBarVisible } = useAddressBarAutoHide({
    enabled: showAddressBar && !focused, // Don't hide when focused
    threshold: 50,
    hideDelay: 100,
  });

  useEffect(() => {
    setAddressValue(currentUrl || '');
  }, [currentUrl]);

  // Close preview on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPreview(false);
        setFocused(false);
      }
    };

    if (showPreview) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPreview]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressValue.trim() && onAddressBarSubmit) {
      onAddressBarSubmit(addressValue.trim());
      setShowPreview(false);
      setFocused(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressValue(e.target.value);
    setShowPreview(e.target.value.length >= 2);
  };

  const handleInputFocus = () => {
    setFocused(true);
    if (addressValue.length >= 2) {
      setShowPreview(true);
    }
  };

  const handlePreviewSelect = (result: { id: string; url?: string; title: string }) => {
    if (result.url && onAddressBarSubmit) {
      onAddressBarSubmit(result.url);
    } else if (onAddressBarSubmit) {
      onAddressBarSubmit(result.title);
    }
    setShowPreview(false);
    setFocused(false);
    inputRef.current?.blur();
  };

  // Minimal address bar controls: back, forward, reload
  const handleBack = useCallback(async () => {
    if (activeId) {
      try {
        await ipc.tabs.navigate(activeId, 'back');
      } catch (error) {
        console.error('[TopBar] Back navigation failed:', error);
      }
    }
  }, [activeId]);

  const handleForward = useCallback(async () => {
    if (activeId) {
      try {
        await ipc.tabs.navigate(activeId, 'forward');
      } catch (error) {
        console.error('[TopBar] Forward navigation failed:', error);
      }
    }
  }, [activeId]);

  const handleReload = useCallback(async () => {
    if (activeId) {
      try {
        await ipc.tabs.reload(activeId);
      } catch (error) {
        console.error('[TopBar] Reload failed:', error);
      }
    }
  }, [activeId]);

  const modeQuickActions = useMemo(() => {
    if (mode === 'Research') {
      return [
        { id: 'brief', label: 'Brief' },
        { id: 'sources', label: 'Sources' },
      ];
    }
    if (mode === 'Trade') {
      return [
        { id: 'watch', label: 'Watchlist' },
        { id: 'paper', label: 'Paper' },
      ];
    }
    return [];
  }, [mode]);

  const handleModeQuickAction = useCallback(
    async (actionId: string) => {
      if (mode === 'Research') {
        if (actionId === 'brief') {
          await setMode('Research');
          setResearchPaneOpen(true);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('ai:prompt', {
                detail: { prompt: 'Draft a research brief with key questions and sources.' },
              })
            );
          }
          return;
        }
        if (actionId === 'sources') {
          await setMode('Research');
          setResearchPaneOpen(true);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('research:start', { detail: { intent: 'sources' } })
            );
          }
          return;
        }
      }

      if (mode === 'Trade') {
        await setMode('Trade');
        if (actionId === 'watch') {
          try {
            await ipc.tabs.create('https://www.tradingview.com/watchlists/');
          } catch (error) {
            console.debug('[TopBar] open watchlist failed', error);
          }
          return;
        }
        if (actionId === 'paper') {
          try {
            await ipc.tabs.create('https://www.tradingview.com/paper-trading/');
          } catch (error) {
            console.debug('[TopBar] open paper trading failed', error);
          }
          return;
        }
      }
    },
    [mode, setMode, setResearchPaneOpen]
  );

  return (
    <motion.header
      animate={{
        y: isAddressBarVisible ? 0 : -100,
        opacity: isAddressBarVisible ? 1 : 0,
      }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={`sticky top-0 z-50 w-full border-b border-[var(--surface-border)] bg-[var(--surface-panel)] backdrop-blur-xl ${className || ''} ${!isAddressBarVisible ? 'pointer-events-none' : ''}`}
      style={{
        height: compact ? '48px' : '64px',
      }}
      role="banner"
    >
      <Container
        className="flex h-full items-center justify-between gap-4"
        style={{ padding: tokens.spacing(3) }}
      >
        {/* Left: Mode Tabs */}
        <div className="flex flex-shrink-0 items-center gap-4">
          <ModeTabs compact={compact} onModeChange={onModeChange} />
        </div>

        {/* Center: Address Bar (optional) - Telepathy Upgrade: Realtime Search */}
        {showAddressBar && (
          <div ref={containerRef} className="relative mx-4 max-w-2xl flex-1">
            <form onSubmit={handleAddressSubmit} className="relative flex items-center gap-2">
              {/* Minimal navigation controls */}
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
                  title="Go back"
                  aria-label="Go back"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleForward}
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
                  title="Go forward"
                  aria-label="Go forward"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleReload}
                  className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  title="Reload page"
                  aria-label="Reload page"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <Search
                size={16}
                className="pointer-events-none absolute left-[100px] top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                ref={inputRef}
                type="text"
                value={addressValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                placeholder="Search or enter URL... (Telepathy mode: instant results)"
                className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] py-2 pl-10 pr-4 text-[var(--text-primary)] transition-all placeholder:text-[var(--text-muted)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                style={{ fontSize: tokens.fontSize.sm }}
                aria-label="Address bar"
              />
              {/* Tier 2: Bookmark Button */}
              <div className="flex-shrink-0">
                <BookmarkButton />
              </div>
            </form>
            {/* Telepathy Upgrade: Realtime Search Preview */}
            {showPreview && (
              <RealtimeSearchPreview
                query={addressValue}
                onSelect={handlePreviewSelect}
                isVisible={showPreview && focused}
              />
            )}
          </div>
        )}

        {/* Right: Utility cluster */}
        {showQuickActions && <TopRightCluster />}
        {modeQuickActions.length > 0 && (
          <div className="hidden items-center gap-2 lg:flex">
            {modeQuickActions.map(action => (
              <button
                key={action.id}
                type="button"
                onClick={() => void handleModeQuickAction(action.id)}
                className="flex items-center gap-1 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--color-primary-500)] hover:bg-[var(--surface-hover)]"
              >
                {mode === 'Trade' ? <ListChecks size={14} /> : <Sparkles size={14} />}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </Container>
    </motion.header>
  );
}
