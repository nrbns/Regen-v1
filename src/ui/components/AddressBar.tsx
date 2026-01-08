import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { systemState, IPCHandler } from '../../backend';
import { IntentRouter } from '../../backend/ai/IntentRouter';

interface AddressBarProps {
  onNavigate: (url: string) => void;
  currentUrl?: string;
}

export function AddressBar({ onNavigate, currentUrl }: AddressBarProps) {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for system state changes to show loading
  useEffect(() => {
    const handleStateChange = (newState: any) => {
      const activeTab = newState.tabs.find((tab: any) => tab.id === newState.activeTabId);
      setIsLoading(activeTab?.isLoading || false);
    };

    systemState.on('state-changed', handleStateChange);
    return () => systemState.off('state-changed', handleStateChange);
  }, []);

  // Update input when currentUrl changes (from iframe navigation)
  useEffect(() => {
    if (currentUrl && currentUrl !== value) {
      setValue(currentUrl);
    }
  }, [currentUrl, value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = value.trim();
    if (!query) return;

    try {
      // Use IntentRouter to determine what to do (now async)
      const intent = await IntentRouter.route(query, { currentUrl });

      switch (intent.type) {
        case 'navigate':
          onNavigate(intent.input);
          break;
        case 'ai':
          // Send AI task via IPC
          IPCHandler.runAI(intent.input);
          setIsLoading(true);
          // Clear loading when AI completes (will be handled by IPC response)
          break;
        case 'search':
        default:
          // Default to search
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(intent.input)}`;
          onNavigate(searchUrl);
          break;
      }
    } catch (error) {
      console.error('[AddressBar] Intent routing failed:', error);
      // Fallback to search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      onNavigate(searchUrl);
    }

    inputRef.current?.blur();
  };

  // Navigation controls removed - iframe doesn't support real browser navigation
  // These would require native WebView APIs not available in web environment

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-700 bg-slate-800">
      {/* Address Bar */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-2xl">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search or enter URL..."
            className="w-full pl-10 pr-4 py-1.5 border border-slate-600 rounded-md bg-slate-700 text-white placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            aria-label="Address bar"
          />
          {/* Subtle loading progress line */}
          {isLoading && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 animate-pulse rounded-b-lg"></div>
          )}
        </div>
      </form>
    </div>
  );
}
