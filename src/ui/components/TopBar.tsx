/**
 * TopBar Component - Main browser chrome
 * Address bar, navigation controls, and mode tabs
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  X,
  Minus,
  Square,
  Plus,
  Home,
} from 'lucide-react';
import { ModeTabs } from './ModeTabs';
import { useTokens } from '../useTokens';
import { Container } from '../layout';
import { useAppStore } from '../../state/appStore';

export interface TopBarProps {
  className?: string;
  compact?: boolean;
  showAddressBar?: boolean;
  onModeChange?: (mode: string) => void;
}

export function TopBar({
  className,
  compact = false,
  showAddressBar = true,
  onModeChange,
}: TopBarProps) {
  const tokens = useTokens();
  const mode = useAppStore(state => state.mode);
  const [addressValue, setAddressValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Start with empty address bar - will be updated when navigating
  useEffect(() => {
    setAddressValue('');
  }, []);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = addressValue.trim();
    if (!query) return;

    // Simple behavior: decide between URL navigation or search
    const isUrl = /^https?:\/\//i.test(query) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(query);

    try {
      if (isUrl) {
        const urlToNavigate = query.startsWith('http') ? query : `https://${query}`;
        // Dispatch custom event for Home component to handle navigation
        window.dispatchEvent(new CustomEvent('navigate-to-url', {
          detail: urlToNavigate
        }));
        setAddressValue(urlToNavigate);
      } else {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        // Dispatch custom event for Home component to handle navigation
        window.dispatchEvent(new CustomEvent('navigate-to-url', {
          detail: searchUrl
        }));
        setAddressValue(searchUrl);
      }
    } catch (error) {
      console.error('[TopBar] Address navigation failed:', error);
    } finally {
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressValue(e.target.value);
  };

  // Simple navigation controls: back, forward, reload
  const handleBack = useCallback(async () => {
    try {
      window.history.back();
    } catch (error) {
      console.error('[TopBar] Back navigation failed:', error);
    }
  }, []);

  const handleForward = useCallback(async () => {
    try {
      window.history.forward();
    } catch (error) {
      console.error('[TopBar] Forward navigation failed:', error);
    }
  }, []);

  const handleReload = useCallback(async () => {
    try {
      window.location.reload();
    } catch (error) {
      console.error('[TopBar] Reload failed:', error);
    }
  }, []);

  // Basic window controls
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

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-gray-200 bg-white ${className || ''}`}
      style={{
        height: '56px',
      }}
      role="banner"
    >
      <div className="flex h-full items-center justify-between gap-4 px-4">
        {/* Left: Window Controls & Logo */}
        <div className="flex items-center gap-4">
          {/* Window Control Buttons */}
          <div className="flex items-center gap-1">
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
          <div className="flex items-center">
            <span className="text-lg font-bold tracking-wide text-blue-600">Regen</span>
          </div>

          {/* Mode tabs removed for Phase 1 stability */}
        </div>

        {/* Center: Address Bar */}
        {showAddressBar && (
          <div className="flex max-w-2xl flex-1 items-center gap-2">
            {/* Navigation controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="Home"
                aria-label="Home"
              >
                <Home size={16} />
              </button>
              <button
                type="button"
                onClick={() => window.open('/', '_blank')}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="New tab"
                aria-label="New tab"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="Go back"
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleForward}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="Go forward"
                aria-label="Go forward"
              >
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={handleReload}
                className="rounded p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="Reload page"
                aria-label="Reload page"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Address bar */}
            <form onSubmit={handleAddressSubmit} className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={addressValue}
                onChange={handleInputChange}
                placeholder="Search or enter URL..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                aria-label="Address bar"
              />
            </form>
          </div>
        )}

        {/* Right: Empty for now - Phase 1 focus on core functionality */}
        <div className="w-32"></div>
      </div>
    </header>
  );
}
