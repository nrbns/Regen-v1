/**
 * TopBar Component
 * Main application chrome with mode tabs, address bar, and quick actions
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { ModeTabs } from './ModeTabs';
import { useTokens } from '../useTokens';
import { Container } from '../layout';
import { TopRightCluster } from './top-right';
import { BookmarkButton } from '../../components/bookmarks/BookmarkButton';
import { RealtimeSearchPreview } from '../../components/search/RealtimeSearchPreview';

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
  const [addressValue, setAddressValue] = useState(currentUrl || '');
  const [showPreview, setShowPreview] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-[var(--surface-border)] bg-[var(--surface-panel)] backdrop-blur-xl ${className || ''} `}
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
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
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
      </Container>
    </header>
  );
}
