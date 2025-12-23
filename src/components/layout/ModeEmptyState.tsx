import { useCallback } from 'react';
import { BookOpen, Globe2, Sparkles, TrendingUp, ArrowRight, Brain } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useAppStore } from '../../state/appStore';

export function ModeEmptyState({ mode }: { mode: string }) {
  const normalized = mode?.toLowerCase() || 'browse';
  const { setMode, setResearchPaneOpen } = useAppStore();

  const presets: Record<
    string,
    {
      badge: string;
      title: string;
      subtitle: string;
      accent: string;
      cta?: { label: string; helper: string; primary: boolean };
      actions: Array<{ id: string; label: string; helper: string }>; // Helper text kept brief
    }
  > = {
    research: {
      badge: 'Research Mode',
      title: 'Research anything, get instant answers',
      subtitle:
        'Ask a question. Omnibrowser gathers sources, analyzes them, and shows you how it thinks.',
      accent: 'text-emerald-300',
      cta: {
        label: 'Start a research job',
        helper: 'Ask about any topic',
        primary: true,
      },
      actions: [
        { id: 'sources', label: 'Run multi-source search', helper: 'News · papers · web' },
        { id: 'summary', label: 'Get a quick summary', helper: 'One focused paragraph' },
        { id: 'outline', label: 'Generate an outline', helper: 'Headlines and bullets' },
      ],
    },
    trade: {
      badge: 'Trade Mode',
      title: 'Set your next move',
      subtitle: 'Check watchlists, simulate a position, or connect an exchange.',
      accent: 'text-cyan-300',
      actions: [
        { id: 'watchlist', label: 'Open watchlist', helper: 'Track tickers and alerts' },
        { id: 'paper', label: 'Start a paper trade', helper: 'Try a risk-free order' },
        { id: 'connect', label: 'Connect a brokerage', helper: 'Sync balances securely' },
      ],
    },
    browse: {
      badge: 'Browse Mode',
      title: 'Start a fresh tab',
      subtitle: 'Enter a URL or search to begin.',
      accent: 'text-indigo-300',
      actions: [
        { id: 'url', label: 'Open a site', helper: 'Go to a known URL' },
        { id: 'search', label: 'Search the web', helper: 'Find something new' },
        { id: 'ai', label: 'Ask the AI', helper: 'Describe what you need' },
      ],
    },
  };

  const config = presets[normalized] ?? presets.browse;

  const Icon = normalized === 'research' ? BookOpen : normalized === 'trade' ? TrendingUp : Globe2;

  const openTab = useCallback(async (url: string) => {
    try {
      await ipc.tabs.create(url);
    } catch (error) {
      console.debug('[ModeEmptyState] openTab failed', error);
    }
  }, []);

  const handleAction = useCallback(
    async (actionId: string) => {
      if (normalized === 'research') {
        if (actionId === 'sources') {
          await setMode('Research');
          setResearchPaneOpen(true);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('research:start', { detail: { intent: 'sources' } })
            );
          }
          return;
        }
        if (actionId === 'summary') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('ai:prompt', {
                detail: { prompt: 'Summarize this topic in one paragraph.' },
              })
            );
          }
          return;
        }
        if (actionId === 'outline') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('ai:prompt', {
                detail: { prompt: 'Draft a research outline with key sections.' },
              })
            );
          }
          return;
        }
      }

      if (normalized === 'trade') {
        await setMode('Trade');
        if (actionId === 'watchlist') {
          await openTab('https://www.tradingview.com/watchlists/');
          return;
        }
        if (actionId === 'paper') {
          await openTab('https://www.tradingview.com/paper-trading/');
          return;
        }
        if (actionId === 'connect') {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('brokerage:connect'));
          }
          return;
        }
      }

      if (normalized === 'browse') {
        if (typeof window !== 'undefined') {
          if (actionId === 'url' || actionId === 'search') {
            window.dispatchEvent(new CustomEvent('addressbar:focus'));
          }
          if (actionId === 'ai') {
            window.dispatchEvent(new CustomEvent('ai:prompt', { detail: { prompt: '' } }));
          }
        }
      }
    },
    [normalized, openTab, setMode, setResearchPaneOpen]
  );

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-3xl px-6 py-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-800/70 bg-slate-900/70 px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-slate-300">
          <Icon size={14} className={config.accent} />
          <span className="font-semibold">{config.badge}</span>
        </div>
        <h1 className="text-3xl font-semibold leading-tight text-slate-50">{config.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{config.subtitle}</p>

        {/* Primary CTA for Research Mode */}
        {config.cta && normalized === 'research' && (
          <button
            type="button"
            onClick={() => handleAction('sources')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <Brain size={18} />
            {config.cta.label}
            <ArrowRight size={16} />
          </button>
        )}

        <div className={`grid grid-cols-1 gap-3 ${config.cta ? 'mt-8' : 'mt-8'} md:grid-cols-3`}>
          {config.actions.map(action => (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action.id)}
              className="flex h-full flex-col items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-slate-700 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600/60"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                <Sparkles size={16} className={config.accent} />
                {action.label}
              </div>
              <p className="text-xs text-slate-400">{action.helper}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
