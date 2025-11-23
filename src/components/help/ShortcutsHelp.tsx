import { useMemo, useState } from 'react';
import { Search, Command, MousePointerClick, Sparkles } from 'lucide-react';

type ShortcutEntry = {
  combo: string;
  action: string;
  context: string;
};

const SHORTCUT_GROUPS: Array<{ id: string; title: string; shortcuts: ShortcutEntry[] }> = [
  {
    id: 'navigation',
    title: 'Global navigation',
    shortcuts: [
      { combo: 'Ctrl/Cmd + L', action: 'Focus omnibox', context: 'Global' },
      { combo: 'Ctrl/Cmd + K', action: 'Command palette / AI actions', context: 'Global' },
      { combo: 'Ctrl/Cmd + T', action: 'Open new tab', context: 'Tabs' },
      { combo: 'Ctrl/Cmd + W', action: 'Close current tab', context: 'Tabs' },
      { combo: 'Ctrl/Cmd + Shift + T', action: 'Reopen last closed tab', context: 'Tabs' },
      { combo: 'Ctrl/Cmd + Tab', action: 'Cycle tabs in current mode', context: 'Tabs' },
    ],
  },
  {
    id: 'research',
    title: 'Research mode',
    shortcuts: [
      { combo: 'Ctrl/Cmd + Shift + G', action: 'Open tab DNA graph', context: 'Research' },
      { combo: 'Ctrl/Cmd + Shift + H', action: 'Capture highlight clipper', context: 'Research' },
      { combo: 'Ctrl/Cmd + Shift + M', action: 'Toggle memory sidebar', context: 'Research' },
    ],
  },
  {
    id: 'trade',
    title: 'Trade mode',
    shortcuts: [
      { combo: 'Shift + 1..9', action: 'Toggle indicator presets', context: 'Trade' },
      { combo: 'Ctrl/Cmd + Shift + R', action: 'Refresh TradingView feed', context: 'Trade' },
      { combo: 'Ctrl/Cmd + Enter', action: 'Submit staged order', context: 'Trade' },
    ],
  },
  {
    id: 'system',
    title: 'System & overlays',
    shortcuts: [
      { combo: 'Esc', action: 'Dismiss active overlay', context: 'Global' },
      { combo: 'Ctrl/Cmd + Shift + A', action: 'Toggle Agent console', context: 'Global' },
      { combo: 'F11', action: 'Toggle full-screen game mode', context: 'Games' },
    ],
  },
];

export function ShortcutsHelp() {
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    if (!query.trim()) {
      return SHORTCUT_GROUPS;
    }
    const lower = query.toLowerCase();
    return SHORTCUT_GROUPS.map(group => ({
      ...group,
      shortcuts: group.shortcuts.filter(
        shortcut =>
          shortcut.combo.toLowerCase().includes(lower) ||
          shortcut.action.toLowerCase().includes(lower) ||
          shortcut.context.toLowerCase().includes(lower)
      ),
    })).filter(group => group.shortcuts.length > 0);
  }, [query]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Command size={18} className="text-purple-300" />
          Keyboard reference
        </h1>
        <p className="text-sm text-slate-400">
          Every shortcut in OmniBrowser grouped by context. Type to filter or scan per-mode
          highlights.
        </p>
        <div className="relative mt-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filter shortcuts by key, action, or context"
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/60"
          />
        </div>
      </header>

      <div className="grid gap-4">
        {filteredGroups.map(group => (
          <section
            key={group.id}
            className="rounded-3xl border border-slate-900/70 bg-slate-950/60 p-4 shadow-inner shadow-black/30"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-[0.25em]">
                  {group.title}
                </h2>
              </div>
              {group.id === 'research' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-200">
                  <Sparkles size={12} />
                  AI aware
                </span>
              )}
            </div>
            <div className="space-y-2">
              {group.shortcuts.map(shortcut => (
                <div
                  key={`${group.id}-${shortcut.combo}`}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <kbd className="rounded-xl border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                      {shortcut.combo}
                    </kbd>
                    <span>{shortcut.action}</span>
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    {shortcut.context}
                  </span>
                </div>
              ))}
              {group.shortcuts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500">
                  No shortcuts match “{query}” in this group.
                </div>
              )}
            </div>
          </section>
        ))}
        {filteredGroups.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-500">
            No shortcuts match “{query}”. Try searching “tab”, “agent”, or “games”.
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400 flex items-start gap-3">
        <MousePointerClick size={14} className="mt-0.5 text-purple-300" />
        <span>
          Tip: Hold <strong>Ctrl/Cmd</strong> while hovering UI buttons to see contextual shortcuts
          in-line. This onboarding helper is also available from{' '}
          <strong>Settings → Shortcuts</strong> anytime.
        </span>
      </div>
    </div>
  );
}
