import { useEffect, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingChartProps {
  symbol: string;
  timeframe: string;
  data?: CandleData[];
  onTimeframeChange?: (timeframe: string) => void;
  height?: number;
}

const timeframes = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1h' },
  { value: '240', label: '4h' },
  { value: '1D', label: '1D' },
];

export default function TradingChart({
  symbol,
  timeframe,
  data,
  onTimeframeChange,
  height = 500,
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: '#171717' },
        textColor: '#d4d4d4',
      },
      grid: {
        vertLines: { color: '#262626' },
        horzLines: { color: '#262626' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#404040',
      },
      rightPriceScale: {
        borderColor: '#404040',
      },
    });

    chartRef.current = chart;

    // Create candlestick series
    const addSeries = chart.addCandlestickSeries ?? (chart as any).addCandlestickSeries;

    if (typeof addSeries !== 'function') {
      console.error(
        '[TradingChart] addCandlestickSeries is not available on chart instance',
        chart
      );
      return () => {
        chart.remove();
      };
    }

    const candlestickSeries = addSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !data || data.length === 0) return;

    setIsLoading(false);

    // Convert data to chart format
    const chartData = data.map(candle => ({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    seriesRef.current.setData(chartData);
  }, [data]);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900">
      {/* Chart Header */}
      <div className="flex items-center justify-between border-b border-neutral-700 p-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{symbol}</h3>
          <div className="flex gap-1">
            {timeframes.map(tf => (
              <button
                key={tf.value}
                onClick={() => onTimeframeChange?.(tf.value)}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  timeframe === tf.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-neutral-400">
          {isLoading ? 'Loading...' : `${data?.length || 0} candles`}
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} style={{ height: `${height}px` }} />
    </div>
  );
}
