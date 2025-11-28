import { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { toast } from '../../utils/toast';
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  Bot,
  RefreshCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet2,
  Download,
} from 'lucide-react';
import { exportChartAsImage } from '../../utils/chartExport';

type CandlePoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const API_BASE = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:4000';
const WATCHLIST = ['NIFTY', 'BANKNIFTY', 'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS'];
const TIMEFRAMES = [
  { id: '1D', label: '1D', range: '1d', interval: '5m', seconds: 300 },
  { id: '5D', label: '5D', range: '5d', interval: '15m', seconds: 900 },
  { id: '1M', label: '1M', range: '1mo', interval: '60m', seconds: 3600 },
  { id: '6M', label: '6M', range: '6mo', interval: '1d', seconds: 86400 },
  { id: '1Y', label: '1Y', range: '1y', interval: '1d', seconds: 86400 },
];

const MOCK_POSITIONS = [
  { symbol: 'RELIANCE.NS', qty: 40, avg: 2885.5, pnl: 2.8 },
  { symbol: 'TCS.NS', qty: 20, avg: 4042.2, pnl: -1.1 },
  { symbol: 'HDFCBANK.NS', qty: 30, avg: 1580.4, pnl: 0.7 },
];

export default function TradePanel() {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [symbol, setSymbol] = useState('NIFTY');
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[0]);
  const [candles, setCandles] = useState<CandlePoint[]>([]);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [previousClose, setPreviousClose] = useState<number | null>(null);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'disconnected'>(
    'connecting'
  );
  const [orderQty, setOrderQty] = useState(25);
  const [orderPrice, setOrderPrice] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [alerts, setAlerts] = useState<
    { id: string; price: number; direction: 'above' | 'below' }[]
  >([
    { id: '1', price: 22500, direction: 'above' },
    { id: '2', price: 21350, direction: 'below' },
  ]);

  const priceChange = useMemo(() => {
    if (livePrice == null || previousClose == null) return { abs: 0, pct: 0 };
    const abs = livePrice - previousClose;
    return { abs, pct: (abs / previousClose) * 100 };
  }, [livePrice, previousClose]);

  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#030711' },
        textColor: '#e2e8f0',
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      grid: {
        vertLines: { color: 'rgba(30,41,59,0.4)' },
        horzLines: { color: 'rgba(30,41,59,0.4)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(51,65,85,0.6)',
      },
      timeScale: {
        borderColor: 'rgba(51,65,85,0.6)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candles.length) return;
    const last = candles[candles.length - 1];
    setLivePrice(last.close);
    if (candles.length > 1) {
      setPreviousClose(candles[candles.length - 2].close);
    }
    if (orderPrice === '') {
      setOrderPrice(Number(last.close.toFixed(2)));
    }
  }, [candles, orderPrice]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadHistorical() {
      try {
        const params = new URLSearchParams({
          range: timeframe.range,
          interval: timeframe.interval,
        });
        const response = await fetch(
          `${API_BASE}/stock/historical/${encodeURIComponent(symbol)}?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const points: CandlePoint[] = payload?.candles || [];
        setCandles(points);
        seriesRef.current?.setData(points);
        chartRef.current?.timeScale().fitContent();
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('[Trade] loadHistorical error', error);
        toast.error('Unable to load historical data');
      }
    }

    loadHistorical();
    return () => controller.abort();
  }, [symbol, timeframe]);

  useEffect(() => {
    setStreamStatus('connecting');
    const streamUrl = `${API_BASE}/stock/stream/${encodeURIComponent(symbol)}`;
    const source = new EventSource(streamUrl);

    source.onopen = () => setStreamStatus('live');
    source.onerror = () => {
      setStreamStatus('disconnected');
      source.close();
    };

    source.onmessage = event => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (!payload.price || !payload.timestamp) return;
        setLivePrice(payload.price);
        setCandles(prev => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];
          const incomingTime = Math.floor(payload.timestamp / 1000);
          const isSameBucket = incomingTime - last.time <= timeframe.seconds;
          const nextPoint: CandlePoint = {
            time: isSameBucket ? last.time : incomingTime,
            open: isSameBucket ? last.open : last.close,
            high: Math.max(payload.price, last.high),
            low: Math.min(payload.price, last.low),
            close: payload.price,
            volume: payload.volume ?? 0,
          };
          const updated = isSameBucket
            ? [...prev.slice(0, -1), nextPoint]
            : [...prev, nextPoint].slice(-600);
          // Update chart with new data
          if (seriesRef.current) {
            if (isSameBucket) {
              // Update last candle - using type assertion for update method
              (seriesRef.current as any).update(nextPoint);
            } else {
              // Add new candle - set all data
              seriesRef.current.setData(updated);
            }
          }
          return updated;
        });
      } catch (error) {
        console.warn('[Trade] stream parse error', error);
      }
    };

    return () => source.close();
  }, [symbol, timeframe]);

  const handleOrder = (side: 'BUY' | 'SELL') => {
    if (livePrice == null) {
      toast.error('Live price unavailable');
      return;
    }
    const executionPrice = orderPrice === '' ? livePrice : Number(orderPrice);
    toast.success(`${side} order sent: ${orderQty} ${symbol} @ ₹${executionPrice.toFixed(2)}`);
    setNotes('');
  };

  const addAlert = () => {
    if (orderPrice === '') return;
    setAlerts(prev => [
      ...prev,
      {
        id: String(Date.now()),
        price: Number(orderPrice),
        direction: 'above',
      },
    ]);
    toast.success('Price alert added');
  };

  const isUp = priceChange.pct >= 0;

  const watchlistView = useMemo(() => {
    return WATCHLIST.map((ticker, index) => {
      if (ticker === symbol && livePrice != null) {
        return { symbol: ticker, price: livePrice, change: priceChange.pct };
      }
      const base = 1500 + index * 120;
      const swing = Math.sin(Date.now() / 60000 + index) * 40;
      const pseudoPrice = Math.round((base + swing) * 100) / 100;
      const pseudoChange = Math.sin(Date.now() / 300000 + index) * 1.2;
      return { symbol: ticker, price: pseudoPrice, change: pseudoChange };
    });
  }, [symbol, livePrice, priceChange]);

  const totalPnL = useMemo(
    () => MOCK_POSITIONS.reduce((sum, position) => sum + position.pnl, 0),
    []
  );

  const aiInsight = useMemo(
    () => ({
      title: `${symbol} liquidity pulse`,
      summary:
        'Volatility creeping higher as FIIs add exposure. Consider scaling entries in tranches with 0.75% risk per leg. Momentum bias stays bullish while price holds above VWAP.',
    }),
    [symbol]
  );

  return (
    <div className="flex h-full flex-col bg-[#020617] text-slate-100">
      <header className="border-b border-slate-800 bg-[#040b1d]/80 backdrop-blur">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {WATCHLIST.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setSymbol(symbol)}
                className="rounded-full border border-slate-700/60 p-2 text-slate-300 hover:border-slate-500 hover:text-white"
                title="Refresh data"
              >
                <RefreshCcw size={16} />
              </button>
              <button
                onClick={async () => {
                  if (!chartRef.current) {
                    toast.error('Chart not ready');
                    return;
                  }
                  try {
                    toast.loading('Exporting chart...');
                    await exportChartAsImage(
                      chartRef.current,
                      `${symbol}-${timeframe.id}-${Date.now()}.png`
                    );
                    toast.dismiss();
                    toast.success('Chart exported successfully!');
                  } catch (error) {
                    toast.dismiss();
                    toast.error('Failed to export chart');
                    console.error('[Trade] Export error:', error);
                  }
                }}
                className="rounded-full border border-slate-700/60 p-2 text-slate-300 hover:border-slate-500 hover:text-white"
                title="Export chart as image"
              >
                <Download size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map(frame => (
                <button
                  key={frame.id}
                  onClick={() => setTimeframe(frame)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    timeframe.id === frame.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {frame.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {livePrice ? `₹${livePrice.toFixed(2)}` : '--'}
            </div>
            <div
              className={`flex items-center justify-end text-sm ${
                isUp ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span className="ml-1">
                {priceChange.abs.toFixed(2)} ({priceChange.pct.toFixed(2)}%)
              </span>
            </div>
            <div className="text-xs text-slate-400">Data: {streamStatus.toUpperCase()}</div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <section className="relative flex-1 overflow-hidden">
          <div ref={chartContainerRef} className="h-[420px] lg:h-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]" />
          <div className="absolute right-4 top-4 rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Live status</span>
              <span
                className={`text-xs font-semibold ${
                  streamStatus === 'live' ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {streamStatus.toUpperCase()}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Finnhub websocket ticks + Yahoo Finance history blend.
            </p>
          </div>
        </section>

        <aside className="w-full border-t border-slate-800 bg-[#050b16] p-4 lg:w-[360px] lg:border-l lg:border-t-0 lg:max-h-full lg:overflow-y-auto">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Order ticket</p>
                  <p className="text-lg font-semibold text-white">{symbol}</p>
                </div>
                <Wallet2 size={20} className="text-indigo-300" />
              </div>
              <div className="space-y-3">
                <label className="text-xs text-slate-400">
                  Price
                  <input
                    type="number"
                    value={orderPrice}
                    onChange={e =>
                      setOrderPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Market"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={orderQty}
                    onChange={e => setOrderQty(Math.max(1, Number(e.target.value)))}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Notes
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Stop @ 0.8%, partial exit @ VWAP..."
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOrder('BUY')}
                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => handleOrder('SELL')}
                    className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-rose-950 hover:bg-rose-400"
                  >
                    Sell
                  </button>
                </div>
                <button
                  onClick={addAlert}
                  className="w-full rounded-xl border border-indigo-500/40 px-4 py-2 text-xs font-semibold text-indigo-200 hover:border-indigo-400"
                >
                  <span className="inline-flex items-center gap-2">
                    <BellRing size={14} />
                    Add price alert
                  </span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                Watchlist
                <Sparkles size={16} className="text-indigo-300" />
              </div>
              <div className="space-y-2">
                {watchlistView.map(row => (
                  <button
                    key={row.symbol}
                    onClick={() => setSymbol(row.symbol)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-left text-sm hover:border-indigo-500/60"
                  >
                    <div>
                      <p className="font-semibold text-white">{row.symbol}</p>
                      <p className="text-xs text-slate-500">₹{row.price.toFixed(2)}</p>
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        row.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {row.change >= 0 ? '+' : ''}
                      {row.change.toFixed(2)}%
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                Positions
                <TrendingUp
                  size={16}
                  className={totalPnL >= 0 ? 'text-emerald-300' : 'text-rose-300'}
                />
              </div>
              <div className="space-y-2">
                {MOCK_POSITIONS.map(position => (
                  <div
                    key={position.symbol}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-white">{position.symbol}</p>
                      <p className="text-xs text-slate-500">
                        {position.qty} @ ₹{position.avg.toFixed(2)}
                      </p>
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        position.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {position.pnl >= 0 ? '+' : ''}
                      {position.pnl.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <Bot size={14} />
                AI Assistant
              </div>
              <p className="text-sm font-semibold text-white">{aiInsight.title}</p>
              <p className="mt-2 text-xs text-slate-300">{aiInsight.summary}</p>
              <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                <Sparkles size={14} />
                Generate plan
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                Alerts
                <TrendingDown size={16} className="text-amber-300" />
              </div>
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-200">
                      {alert.direction === 'above' ? '▲' : '▼'} ₹{alert.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500">pending</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 flex gap-3 border-t border-slate-800 bg-[#050b16] p-3 lg:hidden">
        <button
          onClick={() => handleOrder('BUY')}
          className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-base font-semibold text-emerald-950"
        >
          Buy
        </button>
        <button
          onClick={() => handleOrder('SELL')}
          className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-base font-semibold text-rose-950"
        >
          Sell
        </button>
      </div>
    </div>
  );
}
