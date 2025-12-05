import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import * as LightweightCharts from 'lightweight-charts';
const timeframes = [
    { value: '1', label: '1m' },
    { value: '5', label: '5m' },
    { value: '15', label: '15m' },
    { value: '60', label: '1h' },
    { value: '240', label: '4h' },
    { value: '1D', label: '1D' },
];
export default function TradingChart({ symbol, timeframe, data, onTimeframeChange, height = 500 }) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        if (!chartContainerRef.current)
            return;
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
        const addSeries = chart.addCandlestickSeries ?? chart.addCandlestickSeries;
        if (typeof addSeries !== 'function') {
            console.error('[TradingChart] addCandlestickSeries is not available on chart instance', chart);
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
        if (!seriesRef.current || !data || data.length === 0)
            return;
        setIsLoading(false);
        // Convert data to chart format
        const chartData = data.map((candle) => ({
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        }));
        seriesRef.current.setData(chartData);
    }, [data]);
    // Mock data generator for demo (remove when real data is available)
    useEffect(() => {
        if (!data || data.length === 0) {
            // Generate mock data
            const mockData = [];
            const now = Math.floor(Date.now() / 1000);
            let price = 150;
            for (let i = 100; i >= 0; i--) {
                const change = (Math.random() - 0.5) * 2;
                price += change;
                const open = price;
                const close = price + (Math.random() - 0.5) * 1;
                const high = Math.max(open, close) + Math.random() * 0.5;
                const low = Math.min(open, close) - Math.random() * 0.5;
                mockData.push({
                    time: (now - i * 60),
                    open,
                    high,
                    low,
                    close,
                    volume: Math.floor(Math.random() * 1000000),
                });
            }
            if (seriesRef.current) {
                const chartData = mockData.map((candle) => ({
                    time: candle.time,
                    open: candle.open,
                    high: candle.high,
                    low: candle.low,
                    close: candle.close,
                }));
                seriesRef.current.setData(chartData);
                setIsLoading(false);
            }
        }
    }, [symbol, timeframe]);
    return (_jsxs("div", { className: "bg-neutral-900 rounded-lg border border-neutral-700 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-3 border-b border-neutral-700", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h3", { className: "font-semibold text-lg", children: symbol }), _jsx("div", { className: "flex gap-1", children: timeframes.map((tf) => (_jsx("button", { onClick: () => onTimeframeChange?.(tf.value), className: `px-2 py-1 text-xs rounded transition-colors ${timeframe === tf.value
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`, children: tf.label }, tf.value))) })] }), _jsx("div", { className: "text-sm text-neutral-400", children: isLoading ? 'Loading...' : `${data?.length || 0} candles` })] }), _jsx("div", { ref: chartContainerRef, style: { height: `${height}px` } })] }));
}
