/**
 * Mobile Search Input Component
 * Touch-optimized search input for mobile devices
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface MobileSearchInputProps {
  onSearch?: (query: string) => void;
  onClear?: () => void;
  onChange?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  value?: string;
  isLoading?: boolean;
}

export function MobileSearchInput({
  onSearch,
  onClear,
  onChange,
  placeholder = 'Search...',
  autoFocus = false,
  value,
  isLoading = false,
}: MobileSearchInputProps) {
  const [query, setQuery] = useState(value ?? '');
  const [_isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    onChange?.(next);
  };

  const handleSearch = () => {
    onSearch?.(query);
  };

  const handleClear = () => {
    setQuery('');
    onChange?.('');
    onClear?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
      <Search className="h-5 w-5 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none"
      />
      {isLoading && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
      )}
      {query && (
        <button onClick={handleClear} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
