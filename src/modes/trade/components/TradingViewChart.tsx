import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorType,
  LineStyle,
  createChart,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { CandleData } from '../../../components/trade/TradingChart';

type BaseIndicatorConfig = {
  id: string;
  label: string;
  color: string;
  enabled: boolean;
};

export type SmaIndicatorConfig = BaseIndicatorConfig & {
  type: 'sma';
  period: number;
};

export type EmaIndicatorConfig = BaseIndicatorConfig & {
  type: 'ema';
  period: number;
};

export type RsiIndicatorConfig = BaseIndicatorConfig & {
  type: 'rsi';
  period: number;
  upperBand?: number;
  lowerBand?: number;
};

export type MacdIndicatorConfig = BaseIndicatorConfig & {
  type: 'macd';
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  signalColor: string;
  histogramColor: string;
};

export type IndicatorConfig =
  | SmaIndicatorConfig
  | EmaIndicatorConfig
  | RsiIndicatorConfig
  | MacdIndicatorConfig;

type TradingViewChartProps = {
  symbol: string;
  timeframe: string;
  data?: CandleData[];
  height?: number;
  indicatorConfig?: IndicatorConfig[];
};

type OverlayIndicatorConfig = SmaIndicatorConfig | EmaIndicatorConfig;
type OscillatorIndicatorConfig = RsiIndicatorConfig | MacdIndicatorConfig;

type OverlaySeriesEntry = {
  indicator: OverlayIndicatorConfig;
  values: LineData[];
};

type OscillatorSeriesEntry =
  | {
      variant: 'rsi';
      indicator: RsiIndicatorConfig;
      values: LineData[];
    }
  | {
      variant: 'macd';
      indicator: MacdIndicatorConfig;
      macd: LineData[];
      signal: LineData[];
      histogram: HistogramData[];
    };

const DEFAULT_HEIGHT = 560;

export default function TradingViewChart({
  symbol,
  timeframe,
  data = [],
  height = DEFAULT_HEIGHT,
  indicatorConfig = [],
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const indicatorSeriesRef = useRef<Record<string, ISeriesApi<'Line'>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const overlayIndicators = useMemo(
    () =>
      indicatorConfig.filter(
        (indicator): indicator is OverlayIndicatorConfig =>
          indicator.enabled && isOverlay(indicator)
      ),
    [indicatorConfig]
  );
  const oscillatorIndicators = useMemo(
    () =>
      indicatorConfig.filter(
        (indicator): indicator is OscillatorIndicatorConfig =>
          indicator.enabled && !isOverlay(indicator)
      ),
    [indicatorConfig]
  );

  const overlaySeriesData = useMemo<OverlaySeriesEntry[]>(
    () =>
      overlayIndicators.map(indicator => ({
        indicator,
        values:
          indicator.type === 'sma'
            ? calculateSMA(data, indicator.period)
            : calculateEMA(data, indicator.period),
      })),
    [overlayIndicators, data]
  );

  const oscillatorSeriesData = useMemo<OscillatorSeriesEntry[]>(() => {
    return oscillatorIndicators
      .map(indicator => {
        if (indicator.type === 'rsi') {
          return { variant: 'rsi', indicator, values: calculateRSI(data, indicator.period) };
        }
        if (indicator.type === 'macd') {
          const macdResult = calculateMACD(
            data,
            indicator.fastPeriod,
            indicator.slowPeriod,
            indicator.signalPeriod
          );
          return { variant: 'macd', indicator, ...macdResult };
        }
        return null;
      })
      .filter(Boolean) as OscillatorSeriesEntry[];
  }, [oscillatorIndicators, data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#05070d' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#111828' },
        horzLines: { color: '#111828' },
      },
      width: containerRef.current.clientWidth,
      height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1f2937',
      },
      rightPriceScale: {
        borderColor: '#1f2937',
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#818cf8',
          labelBackgroundColor: '#4c1d95',
        },
        horzLine: {
          color: '#818cf8',
          labelBackgroundColor: '#4c1d95',
        },
      },
    });

    const addCandles = (chart as any).addCandlestickSeries ?? chart.addCandlestickSeries;
    if (typeof addCandles !== 'function') {
      console.error(
        '[TradingViewChart] addCandlestickSeries is unavailable on chart instance',
        chart
      );
      chartRef.current = chart;
      return () => {
        chart.remove();
        chartRef.current = null;
      };
    }

    chartRef.current = chart;
    const series = addCandles({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      indicatorSeriesRef.current = {};
    };
  }, [height]);

  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return;
    setIsLoading(false);

    const chartData = data.map(candle => ({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candleSeriesRef.current.setData(chartData);
  }, [data]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const activeIds = new Set(overlaySeriesData.map(entry => entry.indicator.id));
    Object.entries(indicatorSeriesRef.current).forEach(([id, series]) => {
      if (!activeIds.has(id)) {
        chart.removeSeries(series);
        delete indicatorSeriesRef.current[id];
      }
    });

    overlaySeriesData.forEach(({ indicator, values }) => {
      if (values.length === 0) return;
      let series = indicatorSeriesRef.current[indicator.id];
      if (!series) {
        // Guard: Check if addLineSeries exists
        const addLine = (chart as any).addLineSeries ?? chart.addLineSeries;
        if (typeof addLine !== 'function') {
          console.error('[TradingViewChart] addLineSeries is unavailable on chart instance', chart);
          return;
        }
        series = addLine({
          color: indicator.color,
          lineWidth: 2,
        });
        indicatorSeriesRef.current[indicator.id] = series;
      }
      series.applyOptions({
        color: indicator.color,
        lineWidth: 2,
        lineStyle: indicator.type === 'ema' ? LineStyle.Solid : LineStyle.Solid,
      });
      series.setData(values);
    });
  }, [overlaySeriesData]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#070912] text-white shadow-xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-sm text-gray-400">
        <div className="space-y-0.5">
          <p className="text-lg font-semibold tracking-wide text-white">{symbol}</p>
          <p className="text-xs uppercase tracking-wide text-gray-500">Timeframe {timeframe}</p>
        </div>
        <span className="text-xs">
          {isLoading ? 'Loading chart…' : `${data.length} candles loaded`}
        </span>
      </div>
      <div ref={containerRef} style={{ height }} />

      {oscillatorSeriesData.length > 0 && (
        <div className="space-y-3 border-t border-white/5 bg-black/20 px-4 py-4">
          {oscillatorSeriesData.map(entry => (
            <IndicatorPane key={entry.indicator.id} {...entry} />
          ))}
        </div>
      )}
    </div>
  );
}

type IndicatorPaneProps = OscillatorSeriesEntry;

function IndicatorPane(props: IndicatorPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<Array<ISeriesApi<'Line'>>>([]);
  const histogramRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLinesRef = useRef<{ upper?: IPriceLine; lower?: IPriceLine }>({});
  const height = props.variant === 'rsi' ? 160 : 200;
  const macdIndicator = props.variant === 'macd' ? props.indicator : null;
  const macdSignalColor = macdIndicator?.signalColor;
  const macdHistogramColor = macdIndicator?.histogramColor;
  const rsiIndicator = props.variant === 'rsi' ? props.indicator : null;
  const macdData = props.variant === 'macd' ? props.macd : null;
  const macdSignalData = props.variant === 'macd' ? props.signal : null;
  const macdHistogramData = props.variant === 'macd' ? props.histogram : null;

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#04050a' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#0f172a' },
        horzLines: { color: '#0f172a' },
      },
      width: containerRef.current.clientWidth,
      height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1f2937',
      },
      rightPriceScale: {
        borderColor: '#1f2937',
      },
    });

    chartRef.current = chart;

    // Define handleResize before using it
    function handleResize() {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    }

    // Guard: Check if chart methods exist
    const addLine = (chart as any).addLineSeries ?? chart.addLineSeries;
    const addHistogram = (chart as any).addHistogramSeries ?? chart.addHistogramSeries;

    if (typeof addLine !== 'function') {
      console.error('[TradingViewChart] addLineSeries is unavailable on chart instance', chart);
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        chartRef.current = null;
        lineSeriesRef.current = [];
        histogramRef.current = null;
        priceLinesRef.current = {};
      };
    }

    if (props.variant === 'rsi') {
      const rsiSeries = addLine({
        color: props.indicator.color,
        lineWidth: 2,
      });
      lineSeriesRef.current = [rsiSeries];
      if (props.values.length > 0) {
        rsiSeries.setData(props.values);
      }
    } else {
      const macdSeries = addLine({
        color: props.indicator.color,
        lineWidth: 2,
      });
      const signalSeries = addLine({
        color: macdIndicator?.signalColor ?? props.indicator.color,
        lineWidth: 2,
      });

      // Guard: Check if addHistogramSeries exists
      if (typeof addHistogram !== 'function') {
        console.error(
          '[TradingViewChart] addHistogramSeries is unavailable on chart instance',
          chart
        );
        lineSeriesRef.current = [macdSeries, signalSeries];
        if (props.macd.length > 0) {
          macdSeries.setData(props.macd);
        }
        if (props.signal.length > 0) {
          signalSeries.setData(props.signal);
        }
        return () => {
          window.removeEventListener('resize', handleResize);
          chart.remove();
          chartRef.current = null;
          lineSeriesRef.current = [];
          histogramRef.current = null;
          priceLinesRef.current = {};
        };
      }

      const histogramSeries = addHistogram({
        color: macdIndicator?.histogramColor ?? props.indicator.color,
        base: 0,
      });
      lineSeriesRef.current = [macdSeries, signalSeries];
      histogramRef.current = histogramSeries;

      if (props.macd.length > 0) {
        macdSeries.setData(props.macd);
      }
      if (props.signal.length > 0) {
        signalSeries.setData(props.signal);
      }
      if (props.histogram.length > 0) {
        histogramSeries.setData(props.histogram);
      }
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      lineSeriesRef.current = [];
      histogramRef.current = null;
      priceLinesRef.current = {};
    };
  }, [
    props.indicator.id,
    props.variant,
    props.indicator.color,
    macdSignalColor,
    macdHistogramColor,
    height,
  ]);

  useEffect(() => {
    if (props.variant === 'rsi' && rsiIndicator) {
      const [series] = lineSeriesRef.current;
      if (!series) return;
      if (props.values.length > 0) {
        series.setData(props.values);
      }
      if (priceLinesRef.current.upper && typeof series.removePriceLine === 'function') {
        series.removePriceLine(priceLinesRef.current.upper);
      }
      if (priceLinesRef.current.lower && typeof series.removePriceLine === 'function') {
        series.removePriceLine(priceLinesRef.current.lower);
      }
      if (rsiIndicator.upperBand && typeof series.createPriceLine === 'function') {
        priceLinesRef.current.upper = series.createPriceLine({
          price: rsiIndicator.upperBand,
          color: '#fda4af',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
        });
      }
      if (rsiIndicator.lowerBand && typeof series.createPriceLine === 'function') {
        priceLinesRef.current.lower = series.createPriceLine({
          price: rsiIndicator.lowerBand,
          color: '#bfdbfe',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
        });
      }
    } else {
      const [macdSeries, signalSeries] = lineSeriesRef.current;
      if (macdSeries && macdData && macdData.length > 0) {
        macdSeries.setData(macdData);
      }
      if (signalSeries && macdSignalData && macdSignalData.length > 0) {
        signalSeries.setData(macdSignalData);
      }
      if (histogramRef.current && macdHistogramData && macdHistogramData.length > 0) {
        histogramRef.current.setData(macdHistogramData);
      }
    }
  }, [props, macdData, macdSignalData, macdHistogramData]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3 text-xs text-gray-300 shadow-inner shadow-black/30">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-gray-400">
        <span className="text-sm font-semibold text-white">{props.indicator.label}</span>
        {props.variant === 'rsi' ? (
          <span>
            Period {props.indicator.period} • Bands {props.indicator.lowerBand ?? 30}/
            {props.indicator.upperBand ?? 70}
          </span>
        ) : (
          <span>
            Fast {props.indicator.fastPeriod} / Slow {props.indicator.slowPeriod} / Signal{' '}
            {props.indicator.signalPeriod}
          </span>
        )}
      </div>
      <div ref={containerRef} style={{ height }} />
    </div>
  );
}

function isOverlay(indicator: IndicatorConfig): indicator is OverlayIndicatorConfig {
  return indicator.type === 'sma' || indicator.type === 'ema';
}

function calculateSMA(data: CandleData[], period: number): LineData[] {
  if (!data.length || period <= 1) return [];

  const values: LineData[] = [];
  for (let i = period - 1; i < data.length; i += 1) {
    const window = data.slice(i - period + 1, i + 1);
    const avg = window.reduce((sum, candle) => sum + candle.close, 0) / period;
    values.push({
      time: data[i].time as UTCTimestamp,
      value: Number(avg.toFixed(4)),
    });
  }
  return values;
}

function calculateEMA(data: CandleData[], period: number): LineData[] {
  if (!data.length || period <= 1) return [];

  const closes: Array<number | null> = data.map(candle => candle.close ?? null);
  const emaValues = computeEMA(closes, period);
  const values: LineData[] = [];

  emaValues.forEach((value, idx) => {
    if (value === null) return;
    values.push({
      time: data[idx].time as UTCTimestamp,
      value: Number(value.toFixed(4)),
    });
  });

  return values;
}

function calculateRSI(data: CandleData[], period: number): LineData[] {
  if (data.length <= period) return [];
  const values: LineData[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < data.length; i += 1) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    values.push({
      time: data[i].time as UTCTimestamp,
      value: Number(rsi.toFixed(2)),
    });
  }

  return values;
}

function calculateMACD(
  data: CandleData[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macd: LineData[]; signal: LineData[]; histogram: HistogramData[] } {
  if (data.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  const closes: Array<number | null> = data.map(candle => candle.close ?? null);
  const fastEma = computeEMA(closes, fastPeriod);
  const slowEma = computeEMA(closes, slowPeriod);
  const macdRaw: Array<number | null> = [];

  for (let i = 0; i < data.length; i += 1) {
    const fast = fastEma[i];
    const slow = slowEma[i];
    if (fast === null || slow === null) {
      macdRaw.push(null);
      continue;
    }
    macdRaw.push(fast - slow);
  }

  const signalEma = computeEMA(macdRaw, signalPeriod);

  const macd: LineData[] = [];
  const signal: LineData[] = [];
  const histogram: HistogramData[] = [];

  for (let i = 0; i < data.length; i += 1) {
    const macdValue = macdRaw[i];
    const signalValue = signalEma[i];
    if (macdValue === null || signalValue === null) continue;
    const time = data[i].time as UTCTimestamp;
    macd.push({ time, value: Number(macdValue.toFixed(4)) });
    signal.push({ time, value: Number(signalValue.toFixed(4)) });
    histogram.push({
      time,
      value: Number((macdValue - signalValue).toFixed(4)),
      color: macdValue - signalValue >= 0 ? '#34d399' : '#f87171',
    });
  }

  return { macd, signal, histogram };
}

function computeEMA(values: Array<number | null>, period: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  const multiplier = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === null) continue;

    if (ema === null) {
      const window = values.slice(i - period + 1, i + 1);
      if (window.length < period || window.some(item => item === null)) {
        continue;
      }
      const sum = window.reduce<number>((acc, item) => acc + (item ?? 0), 0);
      ema = sum / period;
    } else {
      ema = value * multiplier + ema * (1 - multiplier);
    }

    result[i] = ema;
  }

  return result;
}
