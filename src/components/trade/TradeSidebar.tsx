import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Shield, RefreshCw, Plus } from 'lucide-react';
import { fetchTradeQuote } from '../../core/trade/dataService';
import { useTradeStore } from '../../state/tradeStore';

interface TradeSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function TradeSidebar({ open, onClose }: TradeSidebarProps) {
  const { activeSymbol, setActiveSymbol, watchlist, addToWatchlist, quotes, updateQuote } =
    useTradeStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSymbol, setNewSymbol] = useState('');

  // Debounce quote updates to avoid jitter
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadQuote = async () => {
      setLoading(true);
      setError(null);
      try {
        const quote = await fetchTradeQuote(activeSymbol);
        if (!cancelled) {
          updateQuote(activeSymbol, quote);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load quote');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // Debounce initial load
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadQuote, 100);

    // Real-time updates: Poll every 5 seconds for active trading
    const interval = setInterval(loadQuote, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeSymbol, open, updateQuote]);

  const quote = quotes[activeSymbol];
  const changePositive = (quote?.change || 0) >= 0;

  return (
    <>
      {/* Backdrop for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm sm:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed bottom-0 right-0 top-0 z-40 w-96 max-w-[90vw] transform border-l border-gray-800 bg-gray-900/95 backdrop-blur-xl transition-transform duration-300 will-change-transform sm:max-w-full ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Trade Mode</h2>
              <p className="text-xs text-gray-400">Ghost + VPN enabled for market data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close trade sidebar"
          >
            ✕
          </button>
        </div>

        <div className="h-full space-y-4 overflow-y-auto p-4">
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400">Active Symbol</div>
                <div className="text-2xl font-bold text-white">{activeSymbol}</div>
                {quote && (
                  <div className="mt-2 flex items-center gap-2">
                    {changePositive ? (
                      <TrendingUp size={16} className="text-green-400" />
                    ) : (
                      <TrendingDown size={16} className="text-red-400" />
                    )}
                    <span className={changePositive ? 'text-green-400' : 'text-red-400'}>
                      {quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() =>
                  quotes[activeSymbol] && updateQuote(activeSymbol, quotes[activeSymbol]!)
                }
                className="rounded-lg bg-gray-800 p-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                title="Refresh quote"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="mt-4 h-24">
              {quote ? (
                <Sparkline values={quote.sparkline} positive={changePositive} />
              ) : loading ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-4 w-full animate-pulse rounded bg-gray-700" />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  No data
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-200">Watchlist</span>
              <div className="flex items-center gap-2">
                <input
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="Add symbol"
                  className="w-24 rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white"
                />
                <button
                  onClick={() => {
                    if (!newSymbol) return;
                    addToWatchlist(newSymbol);
                    setActiveSymbol(newSymbol);
                    setNewSymbol('');
                  }}
                  className="rounded bg-blue-500/20 p-1.5 text-blue-300 hover:bg-blue-500/30"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchlist.map(symbol => {
                const quote = quotes[symbol];
                const positive = quote ? quote.change >= 0 : true;
                return (
                  <button
                    key={symbol}
                    onClick={() => setActiveSymbol(symbol)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                      symbol === activeSymbol
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                        : 'border-gray-700 text-gray-300 hover:border-blue-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{symbol}</span>
                      {quote && (
                        <span className={positive ? 'text-green-400' : 'text-red-400'}>
                          {positive ? '+' : ''}
                          {quote.changePercent.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {quote && (
            <div className="space-y-2 rounded-xl border border-gray-700/50 bg-gray-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-200">Sentiment</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    quote.sentiment === 'bullish'
                      ? 'bg-green-500/20 text-green-300'
                      : quote.sentiment === 'bearish'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {quote.sentiment}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
                <div>
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-lg font-semibold text-white">${quote.price.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Volume</div>
                  <div>{quote.volume?.toLocaleString() || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Prev Close</div>
                  <div>${quote.previousClose?.toFixed(2) ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Updated</div>
                  <div>{new Date(quote.updatedAt).toLocaleTimeString()}</div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>
      </div>
    </>
  );
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return (
    <div className="flex h-full w-full items-end gap-[2px]">
      {values.map((value, idx) => {
        const heightPercent = ((value - min) / range) * 100;
        return (
          <div
            key={idx}
            className={`flex-1 rounded-sm ${positive ? 'bg-green-500/60' : 'bg-red-500/60'}`}
            style={{ height: `${heightPercent}%` }}
          />
        );
      })}
    </div>
  );
}
