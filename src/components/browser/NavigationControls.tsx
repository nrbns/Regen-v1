/**
 * Navigation Controls Component
 * Back, forward, reload, and home buttons with history awareness
 */

import { ArrowLeft, ArrowRight, RefreshCw, Home, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Tab } from '../../state/tabsStore';

export interface NavigationControlsProps {
  tab: Tab | null;
  canGoBack?: boolean;
  canGoForward?: boolean;
  isLoading?: boolean;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
  onHome?: () => void;
  className?: string;
}

export function NavigationControls({
  tab,
  canGoBack = false,
  canGoForward = false,
  isLoading = false,
  onBack,
  onForward,
  onReload,
  onHome,
  className,
}: NavigationControlsProps) {
  // Determine navigation state from tab history
  const historyIndex = tab?.historyIndex ?? -1;
  const history = tab?.history ?? [];
  const actualCanGoBack = canGoBack || (historyIndex > 0);
  const actualCanGoForward = canGoForward || (historyIndex < history.length - 1);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Back Button */}
      <button
        onClick={onBack}
        disabled={!actualCanGoBack}
        className={cn(
          'p-2 rounded-lg transition-colors',
          actualCanGoBack
            ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
            : 'text-slate-600 cursor-not-allowed'
        )}
        title="Back"
        aria-label="Go back"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Forward Button */}
      <button
        onClick={onForward}
        disabled={!actualCanGoForward}
        className={cn(
          'p-2 rounded-lg transition-colors',
          actualCanGoForward
            ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
            : 'text-slate-600 cursor-not-allowed'
        )}
        title="Forward"
        aria-label="Go forward"
      >
        <ArrowRight size={18} />
      </button>

      {/* Reload Button */}
      <button
        onClick={onReload}
        className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        title="Reload"
        aria-label="Reload page"
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <RefreshCw size={18} />
        )}
      </button>

      {/* Home Button */}
      {onHome && (
        <button
          onClick={onHome}
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          title="Home"
          aria-label="Go to home page"
        >
          <Home size={18} />
        </button>
      )}
    </div>
  );
}



