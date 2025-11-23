/**
 * TopBar Component
 * Main application chrome with mode tabs, address bar, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { ModeTabs } from './ModeTabs';
import { useTokens } from '../useTokens';
import { Container } from '../layout';
import { TopRightCluster } from './top-right';
import { BookmarkButton } from '../../components/BookmarkButton';

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

  useEffect(() => {
    setAddressValue(currentUrl || '');
  }, [currentUrl]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressValue.trim() && onAddressBarSubmit) {
      onAddressBarSubmit(addressValue.trim());
    }
  };

  return (
    <header
      className={`
        w-full border-b border-[var(--surface-border)] bg-[var(--surface-panel)]
        backdrop-blur-xl sticky top-0 z-50
        ${className || ''}
      `}
      style={{
        height: compact ? '48px' : '64px',
      }}
      role="banner"
    >
      <Container
        className="flex items-center justify-between h-full gap-4"
        style={{ padding: tokens.spacing(3) }}
      >
        {/* Left: Mode Tabs */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <ModeTabs compact={compact} onModeChange={onModeChange} />
        </div>

        {/* Center: Address Bar (optional) */}
        {showAddressBar && (
          <div className="flex-1 max-w-2xl mx-4">
            <form onSubmit={handleAddressSubmit} className="relative flex items-center gap-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="text"
                value={addressValue}
                onChange={e => setAddressValue(e.target.value)}
                placeholder="Search or enter URL..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--surface-elevated)] border border-[var(--surface-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition-all"
                style={{ fontSize: tokens.fontSize.sm }}
                aria-label="Address bar"
              />
              {/* Tier 2: Bookmark Button */}
              <div className="flex-shrink-0">
                <BookmarkButton />
              </div>
            </form>
          </div>
        )}

        {/* Right: Utility cluster */}
        {showQuickActions && <TopRightCluster />}
      </Container>
    </header>
  );
}
