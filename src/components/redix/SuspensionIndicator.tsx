import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { PauseCircle, RotateCcw, Moon } from 'lucide-react';
import { useTabSuspensionStore } from '../../state/tabSuspensionStore';
import { acknowledgeSuspendedTab, resumeSuspendedTab } from '../../core/redix/tab-suspension';

export function SuspensionIndicator() {
  const suspensions = useTabSuspensionStore(state => state.suspensions);
  const unacknowledged = useMemo(
    () => Object.values(suspensions).filter(entry => !entry.acknowledged),
    [suspensions]
  );

  if (!unacknowledged.length) {
    return null;
  }

  const list = [...unacknowledged]
    .sort((a, b) => (b.suspendedAt || 0) - (a.suspendedAt || 0))
    .slice(0, 3);

  return (
    <div className="fixed bottom-6 left-6 z-[120] flex flex-col gap-3">
      {list.map(entry => (
        <article
          key={entry.tabId}
          className="flex w-[320px] items-center gap-3 rounded-2xl border border-purple-500/30 bg-slate-950/90 px-3 py-3 shadow-xl shadow-black/40 backdrop-blur"
        >
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
            {entry.snapshot ? (
              <img
                src={entry.snapshot}
                alt={entry.title || entry.url || 'Sleeping tab'}
                className="h-16 w-16 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center text-purple-300">
                <Moon size={20} />
              </div>
            )}
            <span className="absolute inset-0 bg-gradient-to-tr from-purple-600/30 to-transparent" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-purple-300">
              <PauseCircle size={12} />
              <span>Suspended</span>
            </div>
            <p className="text-sm font-semibold text-white line-clamp-1">
              {entry.title || entry.url || 'Sleeping tab'}
            </p>
            <p className="text-xs text-slate-400">
              {entry.reason === 'memory'
                ? 'Paused for memory health'
                : 'Suspended to save resources'}{' '}
              • {formatDistanceToNow(entry.suspendedAt ?? Date.now(), { addSuffix: true })}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => resumeSuspendedTab(entry.tabId, { activate: true })}
                className="inline-flex items-center gap-1 rounded-full bg-purple-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm shadow-purple-500/40 transition hover:brightness-110"
              >
                <RotateCcw size={12} />
                Resume
              </button>
              <button
                type="button"
                onClick={() => acknowledgeSuspendedTab(entry.tabId)}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300 transition hover:border-white/40 hover:text-white"
              >
                Keep sleeping
              </button>
            </div>
          </div>
        </article>
      ))}
      {unacknowledged.length > list.length && (
        <div className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1 text-xs text-slate-300 shadow-sm">
          +{unacknowledged.length - list.length} more tabs sleeping
        </div>
      )}
    </div>
  );
}
