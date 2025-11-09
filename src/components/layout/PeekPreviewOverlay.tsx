import { useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { CalendarClock, Clock, Eye, ShieldCheck, Sparkles, X, MoonStar } from 'lucide-react';
import { usePeekPreviewStore } from '../../state/peekStore';
import { ipc } from '../../lib/ipc-typed';

export function PeekPreviewOverlay() {
  const { visible, tab, close } = usePeekPreviewStore();

  useEffect(() => {
    if (!visible) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
      if ((event.key.toLowerCase() === 'p' && (event.metaKey || event.ctrlKey)) || event.key === ' ') {
        event.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [visible, close]);

  const createdAgo = useMemo(() => {
    if (!tab?.createdAt) return null;
    try {
      return formatDistanceToNow(new Date(tab.createdAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [tab?.createdAt]);

  const lastActiveAgo = useMemo(() => {
    if (!tab?.lastActiveAt) return null;
    try {
      return formatDistanceToNow(new Date(tab.lastActiveAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [tab?.lastActiveAt]);

  const activate = useCallback(async () => {
    if (!tab) return;
    try {
      await ipc.tabs.activate({ id: tab.id });
      close();
    } catch (error) {
      console.error('Failed to activate tab from peek overlay:', error);
    }
  }, [tab, close]);

  const wake = useCallback(async () => {
    if (!tab) return;
    try {
      await ipc.tabs.wake(tab.id);
    } catch (error) {
      console.error('Failed to wake tab from peek overlay:', error);
    }
  }, [tab]);

  const containerColor = tab?.containerColor || '#6366f1';
  const containerName =
    tab?.containerName && tab.containerName.toLowerCase() !== 'default'
      ? tab.containerName
      : null;

  return (
    <AnimatePresence>
      {visible && tab ? (
        <motion.div
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center px-6 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="peek-preview-title"
        >
          <motion.div
            className="relative max-w-5xl w-full bg-surface-elevated text-foreground border border-subtle rounded-2xl shadow-elevated overflow-hidden"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                  <Sparkles size={12} />
                  Peek Preview
                </div>
                <h2 id="peek-preview-title" className="text-2xl font-semibold">
                  {tab.title || 'Untitled tab'}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Eye size={14} />
                    {tab.url}
                  </span>
                  {containerName && (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-gray-500/40"
                        style={{ backgroundColor: containerColor }}
                      />
                      {containerName}
                    </span>
                  )}
                  {tab.mode && tab.mode !== 'normal' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-200">
                      {tab.mode === 'ghost' ? 'Ghost session' : 'Private session'}
                    </span>
                  )}
                  {tab.sleeping && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                      <MoonStar size={14} />
                      Hibernating
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Close peek preview"
                className="rounded-full border border-transparent text-muted hover:text-foreground hover:border-subtle transition-colors p-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-[1.6fr_1fr] px-6 pb-6 pt-4">
              <div className="rounded-xl border border-subtle bg-[color:var(--surface-muted)]/40 p-4 flex flex-col gap-4">
                <div className="rounded-lg border border-subtle/60 bg-black/80 text-gray-200 aspect-video flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.5),transparent_65%)]" />
                  <div className="relative text-center space-y-3 px-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-200">
                      Peek surface
                    </div>
                    <p className="text-base font-medium">
                      Live peek is staged. Activate this tab to jump directly into the page.
                    </p>
                    <p className="text-sm text-gray-400">
                      Split view docking ships next—peek pins here when the right rail is open.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-subtle/60 bg-surface px-4 py-3 flex items-start gap-3">
                    <CalendarClock size={18} className="text-muted mt-0.5" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">Opened</p>
                      <p className="text-sm">
                        {createdAgo ? createdAgo : 'Moments ago'}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-subtle/60 bg-surface px-4 py-3 flex items-start gap-3">
                    <Clock size={18} className="text-muted mt-0.5" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">Last active</p>
                      <p className="text-sm">
                        {lastActiveAgo ? lastActiveAgo : 'Now'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-subtle bg-[color:var(--surface-muted)]/30 p-4 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted uppercase tracking-wide mb-2">
                    Workspace context
                  </h3>
                  <ul className="space-y-2 text-sm text-muted">
                    <li className="flex items-center gap-2">
                      <ShieldCheck size={16} />
                      Container: {containerName ?? 'Default'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles size={16} />
                      Mode: {tab.mode ? tab.mode.charAt(0).toUpperCase() + tab.mode.slice(1) : 'Normal'}
                    </li>
                    <li className="flex items-center gap-2">
                      <Eye size={16} />
                      URL: <span className="truncate max-w-[200px]">{tab.url}</span>
                    </li>
                  </ul>
                </div>

                <div className="grid gap-2">
                  <h3 className="text-sm font-medium text-muted uppercase tracking-wide">
                    Actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={activate}
                      className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-100 hover:border-blue-500/60 transition-colors"
                    >
                      Activate tab
                    </button>
                    {tab.sleeping && (
                      <button
                        onClick={wake}
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-100 hover:border-amber-400/60 transition-colors"
                      >
                        Wake tab
                      </button>
                    )}
                    <button
                      onClick={close}
                      className="inline-flex items-center gap-2 rounded-lg border border-subtle px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

