declare module 'lightweight-charts' {
  export type UTCTimestamp = number;
  export type Time = UTCTimestamp | string;

  export enum ColorType {
    Solid = 'solid',
  }

  export enum LineStyle {
    Solid = 0,
    Dotted = 1,
    Dashed = 2,
  }

  export type SeriesType = 'Area' | 'Bar' | 'Baseline' | 'Candlestick' | 'Histogram' | 'Line';

  export interface LineData {
    time: UTCTimestamp;
    value: number;
  }

  export interface HistogramData {
    time: UTCTimestamp;
    value: number;
    color?: string;
  }

  export interface CandleData {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
  }

  export interface ChartOptions {
    width?: number;
    height?: number;
    layout?: {
      background?: { type: ColorType; color: string };
      textColor?: string;
    };
    grid?: any;
    timeScale?: {
      timeVisible?: boolean;
      secondsVisible?: boolean;
      borderColor?: string;
    };
    rightPriceScale?: {
      borderColor?: string;
    };
    crosshair?: any;
  }

  export interface CreatePriceLineOptions {
    price: number;
    color?: string;
    lineWidth?: number;
    lineStyle?: LineStyle;
    axisLabelVisible?: boolean;
  }

  export interface IPriceLine {
    applyOptions(options: CreatePriceLineOptions): void;
  }

  export interface ISeriesApi<_TSeriesType extends SeriesType> {
    setData(data: any[]): void;
    updateData(data: any): void;
    setMarkers(markers: any[]): void;
    applyOptions(options: any): void;
    remove(): void;
    createPriceLine?(options: CreatePriceLineOptions): IPriceLine;
    removePriceLine?(line: IPriceLine): void;
  }

  export interface ITimeScaleApi {
    scrollToTime(time: Time, animated?: boolean): void;
    scrollToPosition(position: number, animated?: boolean): void;
    fitContent(): void;
  }

  export interface IChartApi {
    remove(): void;
    resize(width: number, height: number, forceRepaint?: boolean): void;
    applyOptions(options: Partial<ChartOptions>): void;
    options(): ChartOptions;
    timeScale(): ITimeScaleApi;
    addCandlestickSeries(options?: any): ISeriesApi<'Candlestick'>;
    addLineSeries(options?: any): ISeriesApi<'Line'>;
    addHistogramSeries(options?: any): ISeriesApi<'Histogram'>;
    removeSeries(series: ISeriesApi<SeriesType>): void;
  }

  export function createChart(container: HTMLElement | string, options?: ChartOptions): IChartApi;
  export const LightweightCharts: {
    createChart: typeof createChart;
    ColorType: typeof ColorType;
  };
}
