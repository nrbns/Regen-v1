/**
 * TopBar Component
 * Main application chrome with mode tabs, address bar, and quick actions
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ListChecks,
  X,
  Minus,
  Square,
  Bell,
  User,
} from 'lucide-react';
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
import { SystemBar } from '../../components/system/SystemBar';
import { PrivacyIndicator } from './PrivacyIndicator';

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

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = addressValue.trim();
    if (!query) return;

    // If a custom handler is provided, delegate to it
    if (onAddressBarSubmit) {
      onAddressBarSubmit(query);
      setShowPreview(false);
      setFocused(false);
      return;
    }

    // Default behavior: decide between URL navigation or search
    const isUrl = /^https?:\/\//i.test(query) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(query);

    try {
      if (isUrl) {
        const urlToNavigate = query.startsWith('http') ? query : `https://${query}`;
        if (activeId) {
          await ipc.tabs.navigate(activeId, urlToNavigate);
        } else {
          await ipc.tabs.create(urlToNavigate);
        }
      } else {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        if (activeId) {
          await ipc.tabs.navigate(activeId, searchUrl);
        } else {
          await ipc.tabs.create(searchUrl);
        }
      }
    } catch (error) {
      console.error('[TopBar] Address navigation failed:', error);
    } finally {
      setShowPreview(false);
      setFocused(false);
      setAddressValue('');
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

  // OS-style window controls
  const handleMinimize = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.minimizeWindow();
    }
  }, []);

  const handleMaximize = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.maximizeWindow();
    }
  }, []);

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.closeWindow();
    }
  }, []);

  const modeQuickActions = useMemo(() => {
    if (mode === 'Research') {
      return [
        { id: 'brief', label: 'Brief' }, // Only one primary action
      ];
    }
    if (mode === 'Trade') {
      return [
        { id: 'watch', label: 'Watchlist' }, // Only one primary action
      ];
    }
    return [];
  }, [mode]);

  const handleModeQuickAction = useCallback(
    async (actionId: string) => {
      if (mode === 'Research' && actionId === 'brief') {
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
      if (mode === 'Trade' && actionId === 'watch') {
        await setMode('Trade');
        try {
          await ipc.tabs.create('https://www.tradingview.com/watchlists/');
        } catch (error) {
          console.debug('[TopBar] open watchlist failed', error);
        }
        return;
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
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
      className={`sticky top-0 z-50 w-full border-b border-[var(--surface-border)] bg-[var(--surface-panel)] backdrop-blur-lg ${className || ''} ${!isAddressBarVisible ? 'pointer-events-none' : ''}`}
      style={{
        height: 'var(--systembar-height, 56px)',
      }}
      role="banner"
    >
      {/* Center breadcrumb / context (matches ref image) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 pl-4 pr-4 text-sm text-[var(--text-secondary)] lg:flex">
        <span className="font-medium text-[var(--accent)]">{mode}</span>
        <span className="opacity-50">›</span>
        <span>Quantum Computing</span>
        <span className="opacity-50">›</span>
        <span className="text-[var(--text-muted)]">Paper #3</span>
      </div>
      <Container
        className="flex h-full items-center justify-between gap-4"
        style={{ padding: tokens.spacing(3) }}
      >
        {/* OS Window Controls (Left) */}
        <div className="flex items-center gap-1">
          {/* Window Control Buttons */}
          <div className="mr-4 flex items-center gap-0.5">
            <button
              onClick={handleMinimize}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-yellow-400 transition-colors hover:bg-yellow-500"
              title="Minimize"
              aria-label="Minimize window"
            >
              <Minus size={6} className="text-yellow-900" />
            </button>
            <button
              onClick={handleMaximize}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-green-400 transition-colors hover:bg-green-500"
              title="Maximize"
              aria-label="Maximize window"
            >
              <Square size={6} className="text-green-900" />
            </button>
            <button
              onClick={handleClose}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-red-400 transition-colors hover:bg-red-500"
              title="Close"
              aria-label="Close window"
            >
              <X size={6} className="text-red-900" />
            </button>
          </div>

          {/* Logo */}
          <div className="mr-4 flex items-center">
            <span className="text-lg font-bold tracking-wide text-[var(--accent)]">Regen</span>
          </div>

          {/* Mode Tabs */}
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

        {/* Neon accent & quick status */}
        <div className="ml-4 hidden items-center gap-3 lg:flex">
          <div className="h-1 w-24 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--color-secondary-400)] opacity-90 shadow-[0_0_10px_var(--accent),0_0_20px_var(--accent)]" />
        </div>

        {/* Privacy indicator + System Bar (v1-mode info) */}
        <div className="ml-2 flex items-center gap-2">
          <PrivacyIndicator />
          <SystemBar />
        </div>

        {/* Profile / Notifications */}
        <div className="ml-4 flex items-center gap-2">
          <button
            title="Notifications"
            aria-label="Notifications"
            className="rounded p-2 hover:bg-[var(--surface-hover)]"
          >
            <Bell size={18} />
          </button>
          <button
            title="Profile"
            aria-label="Profile"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--surface-elevated)]"
          >
            <User size={18} />
          </button>
        </div>

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
