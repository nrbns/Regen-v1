// @ts-nocheck

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlarmPlus, RefreshCw, Trash2, Activity } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { ipcEvents, PageWatcher } from '../lib/ipc-events';

interface WatcherFormState {
  url: string;
  intervalMinutes: number;
}

const statusColors: Record<PageWatcher['status'], string> = {
  idle: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  checking: 'text-blue-300 bg-blue-500/10 border-blue-500/30',
  changed: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  error: 'text-red-300 bg-red-500/10 border-red-500/30',
};

export default function WatchersPage() {
  const [watchers, setWatchers] = useState<PageWatcher[]>([]);
  const [form, setForm] = useState<WatcherFormState>({ url: '', intervalMinutes: 15 });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await ipc.watchers.list();
        if (Array.isArray(list)) {
          setWatchers(list);
        }
      } catch (err) {
        console.error('Failed to load watchers:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    load();
    const unsubscribeUpdated = ipcEvents.on<PageWatcher[]>('watchers:updated', payload => {
      if (Array.isArray(payload)) {
        setWatchers(payload);
      }
    });
    const unsubscribeChanged = ipcEvents.on<PageWatcher>('watchers:changed', payload => {
      if (payload?.id) {
        setWatchers(prev =>
          prev.map(watcher => (watcher.id === payload.id ? { ...watcher, ...payload } : watcher))
        );
      }
    });

    return () => {
      unsubscribeUpdated();
      unsubscribeChanged();
    };
  }, []);

  const sortedWatchers = useMemo(
    () =>
      [...watchers].sort((a, b) => {
        const aTime = a.lastChangeAt || a.lastCheckedAt || a.createdAt;
        const bTime = b.lastChangeAt || b.lastCheckedAt || b.createdAt;
        return bTime - aTime;
      }),
    [watchers]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!form.url.trim()) {
      setError('Enter a valid URL.');
      return;
    }
    setAdding(true);
    try {
      await ipc.watchers.add({ url: form.url.trim(), intervalMinutes: form.intervalMinutes });
      setForm({ url: '', intervalMinutes: form.intervalMinutes });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await ipc.watchers.remove(id);
    } catch (err) {
      console.error('Failed to remove watcher', err);
    }
  };

  const handleTrigger = async (id: string) => {
    try {
      await ipc.watchers.trigger(id);
    } catch (err) {
      console.error('Failed to trigger watcher', err);
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#1A1D28] text-gray-100">
      <header className="flex items-center justify-between border-b border-gray-800/50 p-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Activity size={22} className="text-emerald-400" />
            Page Change Watchers
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Receive alerts when tracked pages change. Checks run automatically at the interval you
            choose.
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-6 overflow-y-auto p-6">
        <section className="rounded-xl border border-gray-800/60 bg-gray-900/70 p-5 shadow-lg shadow-black/20">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
            <AlarmPlus size={18} />
            Add watcher
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            We’ll keep a hash of the page content and alert you whenever it changes.
          </p>
          <form
            onSubmit={handleSubmit}
            className="mt-4 flex flex-col gap-3 md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label className="mb-2 block text-xs uppercase tracking-wide text-gray-500">
                Page URL
              </label>
              <input
                type="url"
                required
                value={form.url}
                onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/page"
                className="w-full rounded-lg border border-gray-700/60 bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="w-full md:w-36">
              <label className="mb-2 block text-xs uppercase tracking-wide text-gray-500">
                Check every (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={form.intervalMinutes}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    intervalMinutes: Number.parseInt(e.target.value || '15', 10),
                  }))
                }
                className="w-full rounded-lg border border-gray-700/60 bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {adding ? 'Adding…' : 'Add watcher'}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200">
              Active watchers
              <span className="text-xs text-gray-500">({watchers.length})</span>
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              Loading watchers…
            </div>
          ) : sortedWatchers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
              <p className="text-sm">No watchers yet. Add a page to start monitoring changes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedWatchers.map(watcher => (
                <motion.div
                  key={watcher.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-gray-800/60 bg-gray-900/60 p-4 transition-all hover:bg-gray-900/80"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusColors[watcher.status]}`}
                        >
                          {watcher.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          Every {watcher.intervalMinutes} min • Created{' '}
                          {new Date(watcher.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <a
                        href={watcher.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm font-medium text-emerald-200 hover:underline"
                        title={watcher.url}
                      >
                        {watcher.url}
                      </a>
                      <div className="mt-1 space-x-3 text-xs text-gray-500">
                        {watcher.lastCheckedAt && (
                          <span>
                            Last check: {new Date(watcher.lastCheckedAt).toLocaleString()}
                          </span>
                        )}
                        {watcher.lastChangeAt && (
                          <span className="text-amber-300">
                            Last change detected: {new Date(watcher.lastChangeAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {watcher.error && (
                        <div className="mt-2 text-xs text-red-400">Error: {watcher.error}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => handleTrigger(watcher.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-lg border border-gray-700/60 bg-gray-800/60 p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-blue-400"
                        title="Run check now"
                      >
                        <RefreshCw size={16} />
                      </motion.button>
                      <motion.button
                        onClick={() => handleRemove(watcher.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-lg border border-gray-700/60 bg-gray-800/60 p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-red-400"
                        title="Remove watcher"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
