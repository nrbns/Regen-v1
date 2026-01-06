import React from 'react'
import { isV1ModeEnabled } from '../../config/mvpFeatureFlags'

// Minimal v1-safe Trade panel. Heavy trading UI and real-time integrations are
// deliberately disabled in v1 to reduce attack surface and external dependencies.
export default function TradePanel(): JSX.Element | null {
  if (isV1ModeEnabled()) return null
  return (
    <div className="p-4 text-sm text-slate-300">
      Trade mode is disabled in v1. Experimental trading features are deferred to ROADMAP.md.
    </div>
  )
}

          seriesRef.current.setData(chartData);
        }
      }
    },
  });

  // REAL-TIME PRICE UPDATES (Sub-second latency via SSE) - Fallback
  useEffect(() => {
    if (wsConnected) return;

    const realtimeService = getRealtimeMarketDataService();
    let previousPrice = price;

    const unsubscribe = realtimeService.subscribe(selected.symbol, (update: PriceUpdate) => {
      const newPrice = update.price;
      const delta = newPrice - previousPrice;
      previousPrice = newPrice;

      setPrice(newPrice);
      setChange(Math.abs(delta));
      setChangePercent(update.changePercent || (delta / (previousPrice - delta)) * 100 || 0);
      setIsGreen(delta >= 0);
      setLastPrice(newPrice);
      setLastUpdate(new Date(update.timestamp));
      setConnectionError(null);

      if (update.volume) setVolume(update.volume);
    });

    const fetchInitialQuote = async () => {
      try {
        const { tradeApi } = await import('../../lib/api-client');
        const quote = await tradeApi.getQuote(selected.symbol);
        if (quote && quote.price) {
          previousPrice = quote.price;
          setPrice(quote.price);
          setHigh(quote.high || quote.price);
          setLow(quote.low || quote.price);
          setOpen(quote.open || quote.price);
          setVolume(quote.volume || 0);
        }
      } catch (error) {
        console.debug('[Trade] Initial quote fetch failed, waiting for SSE:', error);
      }
    };

    fetchInitialQuote();

    return () => {
      unsubscribe();
    };
  }, [selected.symbol, wsConnected, price]);

  // Trade signals
  const [_signalHistory, setSignalHistory] = useState<TradeSignal[]>([]);
  const [_sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    const signalService = getTradeSignalService();
    const sseService = getSSESignalService();
    const statusUnsubscribe = sseService.onStatusChange(
      (status: {
        connected: boolean;
        reconnecting: boolean;
        lastConnected?: number;
        reconnectAttempts: number;
        error?: string;
      }) => {
        setSseConnected(status.connected);
      }
    );

    const unsubscribe = signalService.subscribe(selected.symbol, (signal: TradeSignal) => {
      const config = { enableFallback: true, fallbackInterval: 30000, minConfidence: 0.6 };
      const validation = validateSignal(signal, config);

      if (validation.shouldDisplay) {
        toast.info(
          `Signal: ${signal.action} ${selected.name} (${Math.round(signal.confidence * 100)}%)`,
          { duration: 5000 }
        );
        setSignalHistory(prev => [...prev.slice(-9), signal]);
      }
    });

    return () => {
      unsubscribe();
      statusUnsubscribe();
    };
  }, [selected]);

  // REAL TRADINGVIEW CANDLES
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: IChartApi | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let resizeHandler: (() => void) | null = null;

    const initializeChart = () => {
      if (!chartContainerRef.current) return;

      try {
        const container = chartContainerRef.current;
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        chart = createChart(container, {
          layout: {
            background: { type: ColorType.Solid, color: '#000000' },
            textColor: '#ffffff',
          },
          grid: {
            vertLines: { color: '#1e1e1e' },
            horzLines: { color: '#1e1e1e' },
          },
          width,
          height,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: '#374151',
          },
          crosshair: {
            mode: 1,
          },
          rightPriceScale: {
            borderColor: '#374151',
          },
        });

        const addCandles = (chart as any).addCandlestickSeries ?? chart.addCandlestickSeries;
        if (typeof addCandles !== 'function') {
          console.error('[TradePanel] addCandlestickSeries not available');
          chartRef.current = chart;
          return;
        }

        const candlestickSeries = addCandles.call(chart, {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });

        const loadRealCandles = async () => {
          setChartLoading(true);
          try {
            const API_BASE =
              import.meta.env.VITE_API_BASE_URL ||
              import.meta.env.VITE_APP_API_URL ||
              'http://127.0.0.1:4000';
            const symbolKey = selected.symbol.includes(':')
              ? selected.symbol.split(':')[1]
              : selected.symbol;

            try {
              const response = await fetch(`${API_BASE}/api/candles/${symbolKey}`);
              if (response.ok) {
                const data = await response.json();
                if (data.candles && data.candles.length > 0) {
                  const candleData = data.candles.map((c: any) => ({
                    time: Math.floor(c.time / 1000) as any,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close,
                  }));
                  candlestickSeries.setData(candleData);
                  setCandleHistory(data.candles);
                  setChartLoading(false);
                  return;
                }
              }
            } catch {
              console.debug('[Trade] Mock server not available, using fallback');
            }

            const realtimeService = getRealtimeMarketDataService();
            const candles = await realtimeService.getHistoricalCandles(symbolKey, 'D');

            if (candles.length > 0) {
              const candleData = candles.map(c => ({
                time: (c.time / 1000) as any,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
              }));
              candlestickSeries.setData(candleData);
              setCandleHistory(candles);
              setChartLoading(false);
            } else {
              const fallbackData: Array<{
                time: number;
                open: number;
                high: number;
                low: number;
                close: number;
              }> = Array.from({ length: 50 }, (_, i) => {
                const baseDate = new Date();
                baseDate.setDate(baseDate.getDate() - (50 - i));
                const time = Math.floor(baseDate.getTime() / 1000);
                const open = 24800 + Math.random() * 300;
                const close = open + (Math.random() - 0.5) * 400;
                const high = Math.max(open, close) + Math.random() * 100;
                const low = Math.min(open, close) - Math.random() * 100;
                return { time, open, high, low, close };
              });
              candlestickSeries.setData(fallbackData);
              setChartLoading(false);
            }
          } catch (error) {
            console.error('[Trade] Failed to load candles:', error);
            setChartLoading(false);
          }
        };

        loadRealCandles();
        seriesRef.current = candlestickSeries;
        chartRef.current = chart;

        resizeHandler = () => {
          if (chartContainerRef.current && chart) {
            chart.applyOptions({
              width: chartContainerRef.current.clientWidth || 800,
              height: chartContainerRef.current.clientHeight || 600,
            });
          }
        };
        window.addEventListener('resize', resizeHandler);
      } catch (error) {
        console.error('[TradePanel] Error initializing chart:', error);
      }
    };

    const container = chartContainerRef.current;
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      timeoutId = setTimeout(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          initializeChart();
        }
      }, 100);
    } else {
      initializeChart();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (chart) {
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  // Update chart when symbol changes
  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      const loadCandles = async () => {
        try {
          setChartLoading(true);
          const realtimeService = getRealtimeMarketDataService();
          const symbol = selected.symbol.includes(':')
            ? selected.symbol.split(':')[1]
            : selected.symbol;
          const candles = await realtimeService.getHistoricalCandles(symbol, 'D');

          if (candles.length > 0 && seriesRef.current && chartRef.current) {
            const candleData = candles.map(c => ({
              time: (c.time / 1000) as any,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            }));
            seriesRef.current.setData(candleData);
            setCandleHistory(candles);
          }
        } catch (error) {
          console.error('[Trade] Failed to reload candles:', error);
        } finally {
          setChartLoading(false);
        }
      };

      loadCandles();
    }
  }, [selected]);

  // Update orderbook from WebSocket
  useEffect(() => {
    if (wsOrderbook && wsConnected) {
      setOrderBookBids(
        wsOrderbook.bids
          .map((b: any) => ({
            price: b.price,
            quantity: b.size || b.quantity,
          }))
          .sort((a, b) => b.price - a.price)
      );
      setOrderBookAsks(
        wsOrderbook.asks
          .map((a: any) => ({
            price: a.price,
            quantity: a.size || a.quantity,
          }))
          .sort((a, b) => a.price - b.price)
      );
    } else if (!wsConnected) {
      const generateOrderBook = () => {
        const basePrice = price;
        const bids: OrderBookEntry[] = [];
        const asks: OrderBookEntry[] = [];

        for (let i = 0; i < 10; i++) {
          bids.push({
            price: basePrice - (i + 1) * (basePrice * 0.001),
            quantity: Math.floor(Math.random() * 1000) + 100,
          });
          asks.push({
            price: basePrice + (i + 1) * (basePrice * 0.001),
            quantity: Math.floor(Math.random() * 1000) + 100,
          });
        }

        setOrderBookBids(bids.sort((a, b) => b.price - a.price));
        setOrderBookAsks(asks.sort((a, b) => a.price - b.price));
      };

      generateOrderBook();
      const interval = setInterval(generateOrderBook, 2000);
      return () => clearInterval(interval);
    }
  }, [wsOrderbook, wsConnected, price]);

  // Mock trades tape
  useEffect(() => {
    const generateTrade = () => {
      const newTrade: Trade = {
        id: `trade-${Date.now()}`,
        price: price + (Math.random() - 0.5) * (price * 0.002),
        quantity: Math.floor(Math.random() * 500) + 10,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        timestamp: Date.now(),
      };
      setRecentTrades(prev => [...prev.slice(-19), newTrade]);
    };

    const interval = setInterval(generateTrade, 3000);
    return () => clearInterval(interval);
  }, [price]);

  // Track price changes
  useEffect(() => {
    if (price) {
      setLastPrice(price);
      setLastUpdate(new Date());
    }
  }, [price]);

  // Handle connection errors
  useEffect(() => {
    if (!wsConnected && lastPrice === null) {
      setConnectionError(new Error('WebSocket connection not established'));
    } else if (!wsConnected && lastPrice !== null) {
      setConnectionError(new Error('Connection lost - showing cached data'));
    } else {
      setConnectionError(null);
    }
  }, [wsConnected, lastPrice]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-black text-white">
      {/* Single Connection Status Banner - ONE source of truth per UI audit */}
      {!wsConnected && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          <span>
            {wsReconnecting ? '🔄 Reconnecting...' : '🟡 Offline'}
            {lastPrice !== null && ' — Showing cached market data'}
          </span>
        </div>
      )}

      {/* Mode Switcher Header */}
      <div className="sticky top-0 z-30 flex flex-shrink-0 items-center justify-between border-b border-purple-800 bg-black/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h1 className="text-sm font-semibold text-white md:text-lg">Trade Mode</h1>
          {/* Connection status removed from header - single banner above handles it */}
          <button
            onClick={() => setUseTradingView(!useTradingView)}
            className={`ml-4 rounded-lg px-3 py-1 text-xs transition ${
              useTradingView
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
            }`}
            title="Toggle TradingView"
          >
            {useTradingView ? 'Custom Chart' : 'TradingView'}
          </button>
          <VoiceButton
            onResult={async text => {
              trackUserAction(text);
              const parsed = parseResearchVoiceCommand(text);
              if (parsed.isTradeCommand || parsed.action?.type === 'trade') {
                const result = await executeAgenticAction(text, { mode: 'trade' });
                if (result.success) {
                  toast.success('Trade action executed');
                } else {
                  toast.error(result.error || 'Trade action failed');
                }
              } else {
                toast.info(`Voice: ${text}`);
              }
            }}
            small
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/60 p-1">
          <button
            onClick={() => setMode('Browse')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all md:px-3 md:py-1.5 md:text-sm ${
              currentMode === 'Browse'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <Globe size={12} />
            <span className="hidden sm:inline">Browse</span>
          </button>
          <button
            onClick={() => setMode('Research')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all md:px-3 md:py-1.5 md:text-sm ${
              currentMode === 'Research'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Research</span>
          </button>
          <button
            onClick={() => setMode('Trade')}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all md:px-3 md:py-1.5 md:text-sm ${
              currentMode === 'Trade'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            <TrendingUp size={12} />
            <span className="hidden sm:inline">Trade</span>
          </button>
        </div>
      </div>

      {/* Trade-specific AI Actions - Context-aware per UI audit */}
      <div className="z-20 flex-shrink-0 border-b border-gray-800 bg-black/50 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => toast.info("Explain today's move - Coming soon")}
            className="flex-shrink-0 rounded-lg border border-gray-700/50 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-200"
          >
            📈 Explain today's move
          </button>
          <button
            onClick={() => toast.info('Support/Resistance levels - Coming soon')}
            className="flex-shrink-0 rounded-lg border border-gray-700/50 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-200"
          >
            📊 Support / Resistance
          </button>
          <button
            onClick={() => toast.info('Risk summary - Coming soon')}
            className="flex-shrink-0 rounded-lg border border-gray-700/50 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-200"
          >
            ⚠️ Risk summary
          </button>
          <button
            onClick={() => toast.info('What changed since yesterday - Coming soon')}
            className="flex-shrink-0 rounded-lg border border-gray-700/50 bg-gray-800/60 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-200"
          >
            🔄 What changed?
          </button>
        </div>
      </div>

      {/* Market Selector - Reduced saturation per UI audit (less visually loud) */}
      <div className="z-20 flex-shrink-0 bg-gradient-to-r from-purple-800/60 to-pink-800/60 p-3 md:p-4">
        <div className="scrollbar-hide flex gap-2 overflow-x-auto md:gap-3">
          {markets.map(m => {
            const isActive = selected.symbol === m.symbol;
            const pct = isActive ? changePercent : undefined;
            const isUp = (pct || 0) >= 0;
            return (
              <button
                key={m.symbol}
                onClick={() => setSelected(m)}
                className={`flex flex-shrink-0 items-center gap-3 whitespace-nowrap rounded-full px-4 py-2 font-bold transition-all md:px-6 md:py-3 ${
                  isActive ? 'scale-110 bg-white/30 shadow-2xl' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {m.exchange === 'NSE' && <IndianRupee className="h-3 w-3 md:h-4 md:w-4" />}
                {m.exchange === 'Crypto' && <Bitcoin className="h-3 w-3 md:h-4 md:w-4" />}
                {(m.exchange === 'NYSE' || m.exchange === 'NASDAQ' || m.exchange === 'Forex') && (
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                )}
                <span className="text-xs md:text-sm">{m.name}</span>
                <span className="text-[11px] opacity-80 md:text-xs">
                  {isActive ? (
                    <>
                      {m.currency}
                      {price.toLocaleString()} •
                      <span className={isUp ? 'text-green-200' : 'text-red-200'}>
                        {isUp ? ' ▲' : ' ▼'} {Math.abs(changePercent).toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-100/80">cached</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Price Display */}
      <div className="z-10 flex-shrink-0 border-b border-gray-800 p-4 md:p-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-black md:text-7xl">{selected.name}</h1>
            <div
              className={`mt-2 text-3xl font-bold md:mt-4 md:text-6xl ${isGreen ? 'text-green-400' : 'text-red-400'}`}
            >
              {selected.currency}
              {price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              <span className="ml-3 text-xl md:ml-6 md:text-4xl">
                {isGreen ? '↑' : '↓'} {change.toFixed(2)} ({changePercent.toFixed(2)}%)
              </span>
            </div>
            {lastUpdate && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 md:text-sm">
                <Activity className="h-3 w-3" />
                Last update: {lastUpdate.toLocaleTimeString()}
                {wsConnected && <span className="text-green-400">● Live</span>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-left text-sm text-gray-400 md:text-right md:text-base">
            <div>
              <div className="text-xs text-gray-500">Open</div>
              <div className="text-sm font-semibold text-white">
                {selected.currency}
                {open.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">High</div>
              <div className="text-sm font-semibold text-green-400">
                {selected.currency}
                {high.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Low</div>
              <div className="text-sm font-semibold text-red-400">
                {selected.currency}
                {low.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Volume</div>
              <div className="text-sm font-semibold text-white">{volume.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid flex-1 grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Chart Area - Visually Dominant per UI audit */}
        <div className="col-span-12 flex flex-col lg:col-span-8">
          {useTradingView ? (
            <div className="relative h-[420px] w-full overflow-hidden rounded-lg border border-[#222] bg-[#030303]">
              <BrowserView
                url={`https://in.tradingview.com/chart/?symbol=${selected.symbol.replace(':', '')}`}
                mode="trade"
                className="h-full"
              />
              <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-gray-700 bg-black/70 px-4 py-2 text-xs backdrop-blur md:text-sm">
                Live TradingView • {selected.symbol}
              </div>
            </div>
          ) : (
            <div
              ref={chartContainerRef}
              className="relative h-[420px] min-h-[420px] w-full overflow-hidden rounded-lg border border-[#222] bg-[#030303]"
              style={{ minHeight: '420px', height: '420px' }}
            >
              {/* Chart Container - Fixed layout, never reflows per UI audit */}
              {chartLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                    <span className="text-sm text-gray-400">Loading chart data...</span>
                  </div>
                </div>
              )}
              <div className="absolute left-4 top-4 z-10 flex items-center gap-3 rounded-lg border border-gray-700 bg-black/70 px-4 py-2 text-xs backdrop-blur md:text-sm">
                <ChartTypeSelector selectedType={chartType} onTypeChange={setChartType} />
                {wsConnected && <span className="text-green-400">● Live</span>}
              </div>
            </div>
          )}

          {/* Trades Tape */}
          <div className="mt-4">
            <TradesTape trades={recentTrades} symbol={selected.name} />
          </div>
        </div>

        {/* Right Sidebar - Secondary, visually quieter */}
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-3">
          {/* Order Book */}
          <OrderBook
            bids={orderBookBids}
            asks={orderBookAsks}
            onPriceClick={(price, _side) => {
              // Just show price info, no order placement
              toast.info(`Price: ${selected.currency}${price.toLocaleString()}`);
            }}
          />

          {/* Technical Indicators */}
          <TechnicalIndicators
            indicators={indicators}
            onToggle={id => {
              setIndicators(prev =>
                prev.map(ind => (ind.id === id ? { ...ind, enabled: !ind.enabled } : ind))
              );
            }}
            onAdd={type => {
              const newIndicator: Indicator = {
                id: `indicator-${Date.now()}`,
                type,
                name: type.toUpperCase(),
                enabled: true,
                color: type === 'rsi' ? '#fb923c' : type === 'macd' ? '#60a5fa' : '#a78bfa',
                period: type === 'rsi' ? 14 : type === 'sma' || type === 'ema' ? 20 : undefined,
              };
              setIndicators(prev => [...prev, newIndicator]);
            }}
            onRemove={id => {
              setIndicators(prev => prev.filter(ind => ind.id !== id));
            }}
          />

          {/* Drawing Tools */}
          <ChartDrawingTools
            selectedTool={drawingTool}
            onToolSelect={setDrawingTool}
            shapes={drawingShapes}
            onShapeAdd={shape => {
              setDrawingShapes(prev => [...prev, shape]);
            }}
            onShapeRemove={id => {
              setDrawingShapes(prev => prev.filter(s => s.id !== id));
            }}
            onShapeUpdate={(id, updates) => {
              setDrawingShapes(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
            }}
          />

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                <BarChart3 className="h-3 w-3" />
                High
              </div>
              <div className="text-sm font-semibold text-green-400">
                {selected.currency}
                {high.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                <BarChart3 className="h-3 w-3" />
                Low
              </div>
              <div className="text-sm font-semibold text-red-400">
                {selected.currency}
                {low.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                <Activity className="h-3 w-3" />
                Open
              </div>
              <div className="text-sm font-semibold text-white">
                {selected.currency}
                {open.toLocaleString()}
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                <Activity className="h-3 w-3" />
                Volume
              </div>
              <div className="text-sm font-semibold text-white">{volume.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <TradeStagehandIntegration />
    </div>
  );
}
