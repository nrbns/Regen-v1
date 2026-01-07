import { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, Loader2, AlertCircle, BookOpen } from 'lucide-react';
import { useDebounce } from '../../utils/useDebounce';
import { searchTradingSymbols, type SymbolResult } from '../../services/tradingSymbols';
import { tradeToResearch } from '../../core/agents/handoff';
import { toast } from 'react-hot-toast';

type SymbolSearchProps = {
  activeSymbol: string;
  recentSymbols: string[];
  onSelect(symbol: string): void;
};

export default function SymbolSearch({ activeSymbol, recentSymbols, onSelect }: SymbolSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    let cancelled = false;
    const runSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setError(null);
        return;
      }
      setIsSearching(true);
      setError(null);
      try {
        const matches = await searchTradingSymbols(debouncedQuery);
        if (!cancelled) {
          setResults(matches);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to search symbols');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };
    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const displayRecent = useMemo(() => {
    return recentSymbols
      .filter(symbol => symbol.toLowerCase() !== activeSymbol.toLowerCase())
      .slice(0, 5);
  }, [recentSymbols, activeSymbol]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#090b12] p-4 text-sm text-white shadow-inner shadow-black/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-indigo-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-200">
            Symbol search
          </h3>
        </div>
        {activeSymbol && (
          <button
            onClick={async () => {
              const result = await tradeToResearch(
                activeSymbol,
                'fundamentals and recent news',
                'auto'
              );
              if (result.success) {
                toast.success(`Researching ${activeSymbol}...`);
              } else {
                toast.error(result.error || 'Failed to start research');
              }
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title={`Research ${activeSymbol} in Research mode`}
          >
            <BookOpen size={12} />
            Research
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <input
          type="text"
          value={query}
          placeholder="Search stocks or crypto (e.g. NVDA, BTC)..."
          onChange={event => setQuery(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/60"
        />
        {isSearching && (
          <Loader2 size={16} className="absolute right-3 top-2.5 animate-spin text-indigo-300" />
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {displayRecent.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-400">
            <TrendingUp size={12} />
            Recent symbols
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {displayRecent.map(symbol => (
              <button
                key={symbol}
                type="button"
                onClick={e => {
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                  onSelect(symbol);
                }}
                onMouseDown={e => {
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                }}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-200 hover:border-indigo-400/60 hover:text-white"
                style={{ zIndex: 10011, isolation: 'isolate' }}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      {debouncedQuery && (
        <div className="space-y-2">
          {results.length === 0 && !isSearching && !error ? (
            <div className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400">
              No matches found. Try another symbol or exchange.
            </div>
          ) : (
            results.slice(0, 6).map(result => {
              const isActive = result.symbol.toLowerCase() === activeSymbol.toLowerCase();
              return (
                <button
                  key={result.symbol}
                  type="button"
                  onClick={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    onSelect(result.symbol);
                  }}
                  onMouseDown={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-100'
                      : 'border-white/10 bg-white/5 hover:border-indigo-400/50'
                  }`}
                  style={{ zIndex: 10011, isolation: 'isolate' }}
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{result.symbol}</span>
                    <span className="text-xs uppercase text-gray-400">{result.type}</span>
                  </div>
                  <p className="truncate text-xs text-gray-400">{result.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {result.exchange}
                    {result.region ? ` • ${result.region}` : ''}
                    {result.currency ? ` • ${result.currency}` : ''}
                  </p>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
