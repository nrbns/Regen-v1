/**
 * HeroPanel / LaunchFlow Component
 * Hero section with quick actions and command bar
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, BookOpen, TrendingUp, Code } from 'lucide-react';
// Logo import - handle gracefully if file doesn't exist
// Logo will be loaded at runtime, so we don't need to import it here
const logo: string | undefined = '/logo.png';
import { useTokens } from '../useTokens';
import { Button } from '../button';
import { Container } from '../layout';

export interface HeroPanelProps {
  className?: string;
  compact?: boolean;
  onQuickAction?: (action: string) => void;
}

const QUICK_ACTIONS = [
  { id: 'search', label: 'Search', icon: Search, color: 'blue' },
  { id: 'research', label: 'Research', icon: Sparkles, color: 'purple' },
  { id: 'trade', label: 'Trade', icon: TrendingUp, color: 'green' },
  { id: 'dev', label: 'Dev Tools', icon: Code, color: 'orange' },
  { id: 'docs', label: 'Docs', icon: BookOpen, color: 'indigo' },
];

export function HeroPanel({ className, compact, onQuickAction }: HeroPanelProps) {
  const tokens = useTokens();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onQuickAction?.(query);
    }
  };

  return (
    <div
      className={`w-full border-b border-[var(--surface-border)] bg-gradient-to-br from-[var(--surface-root)] via-[var(--surface-panel)] to-[var(--surface-elevated)] ${className || ''} `}
      style={{
        paddingTop: compact ? tokens.spacing(8) : tokens.spacing(16),
        paddingBottom: compact ? tokens.spacing(8) : tokens.spacing(12),
      }}
    >
      <Container>
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          {/* Hero Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-3"
          >
            {logo && (
              <img
                src={logo}
                alt="Regen logo"
                width={72}
                height={72}
                className="rounded-full bg-black/20 p-4 drop-shadow-xl"
              />
            )}
            <h1
              className="mb-2 font-bold text-[var(--text-primary)]"
              style={{ fontSize: compact ? tokens.fontSize['3xl'] : tokens.fontSize['5xl'] }}
            >
              Regen
            </h1>
            <p className="text-[var(--text-muted)]" style={{ fontSize: tokens.fontSize.lg }}>
              Your intelligent browser for research, trading, and development
            </p>
          </motion.div>

          {/* Command Bar */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative mx-auto max-w-2xl"
          >
            <div className="relative">
              <Search
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search, ask a question, or enter a URL..."
                className="w-full rounded-xl border-2 border-[var(--surface-border)] bg-[var(--surface-elevated)] py-4 pl-12 pr-4 text-[var(--text-primary)] shadow-lg transition-all placeholder:text-[var(--text-muted)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                style={{ fontSize: tokens.fontSize.base }}
                aria-label="Command bar"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <kbd className="rounded border border-[var(--surface-border)] bg-[var(--surface-panel)] px-2 py-1 text-xs text-[var(--text-muted)]">
                  ⌘K
                </kbd>
              </div>
            </div>
          </motion.form>

          {/* Quick Actions */}
          {!compact && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <span
                className="text-sm text-[var(--text-muted)]"
                style={{ fontSize: tokens.fontSize.sm }}
              >
                Quick actions:
              </span>
              {QUICK_ACTIONS.map(action => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.id}
                    tone="secondary"
                    size="sm"
                    icon={<Icon size={16} />}
                    onClick={() => onQuickAction?.(action.id)}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </motion.div>
          )}
        </div>
      </Container>
    </div>
  );
}
