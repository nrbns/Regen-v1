/**
 * Mobile-Optimized Search Input Component
 * Handles mobile keyboard, viewport adjustment, and touch targets
 */

import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { cn } from '../../lib/utils';

export interface MobileSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function MobileSearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  isLoading = false,
  disabled = false,
  className,
  autoFocus = false,
}: MobileSearchInputProps) {
  const { isMobile } = useMobileDetection();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current && !isMobile) {
      // Only auto-focus on desktop to avoid mobile keyboard issues
      inputRef.current.focus();
    }
  }, [autoFocus, isMobile]);

  // Handle mobile keyboard viewport adjustment
  useEffect(() => {
    if (!isMobile || !isFocused) return;

    const handleResize = () => {
      // Scroll input into view when keyboard appears
      if (inputRef.current && isFocused) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 300); // Delay to allow keyboard to appear
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && onSearch) {
      onSearch(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      onChange('');
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex items-center gap-2 rounded-lg border bg-slate-900/50 transition-all',
        'border-slate-700 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20',
        isMobile ? 'px-3 py-2.5' : 'px-4 py-2',
        isFocused && isMobile ? 'shadow-lg shadow-purple-500/10' : '',
        className
      )}
    >
      <Search
        className={cn(
          'flex-shrink-0 text-slate-400',
          isMobile ? 'h-5 w-5' : 'h-4 w-4'
        )}
      />

      <form onSubmit={handleSubmit} className="flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          inputMode="search"
          enterKeyHint="search"
          className={cn(
            'w-full bg-transparent text-white placeholder-slate-500',
            'focus:outline-none',
            isMobile ? 'text-base min-h-[44px]' : 'text-sm',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          style={{
            // Ensure input doesn't get hidden by mobile keyboard
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
      </form>

      {value && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className={cn(
            'flex-shrink-0 p-1 text-slate-400 hover:text-white transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'touch-manipulation', // Better touch handling
            isMobile ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''
          )}
          aria-label="Clear search"
        >
          <X className={cn(isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
        </button>
      )}

      {isLoading && (
        <div
          className={cn(
            'flex-shrink-0',
            isMobile ? 'min-w-[44px] min-h-[44px] flex items-center justify-center' : ''
          )}
        >
          <Loader2 className={cn('text-purple-400 animate-spin', isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
        </div>
      )}
    </div>
  );
}


