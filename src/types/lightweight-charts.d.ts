declare module 'lightweight-charts' {
  export type UTCTimestamp = number;
  export type PriceScaleOptions = any;
  export type TimeScaleOptions = any;

  export enum ColorType {
    Solid = 0,
  }

  export interface ChartOptions {
    width?: number;
    height?: number;
    layout?: any;
    priceScale?: PriceScaleOptions;
    rightPriceScale?: PriceScaleOptions;
    leftPriceScale?: PriceScaleOptions;
    timeScale?: TimeScaleOptions;
    crosshair?: any;
    grid?: any;
    localization?: any;
    handleScroll?: boolean;
    handleScale?: boolean;
    kineticScroll?: any;
  }

  export interface IChartApi {
    remove(): void;
    resize(width: number, height: number, forceRepaint?: boolean): void;
    applyOptions(options: Partial<ChartOptions>): void;
    options(): ChartOptions;
    addAreaSeries(options?: any): ISeriesApi<'Area'>;
    addBarSeries(options?: any): ISeriesApi<'Bar'>;
    addBaselineSeries(options?: any): ISeriesApi<'Baseline'>;
    addCandlestickSeries(options?: any): ISeriesApi<'Candlestick'>;
    addHistogramSeries(options?: any): ISeriesApi<'Histogram'>;
    addLineSeries(options?: any): ISeriesApi<'Line'>;
    addVolumeProfileSeries(options?: any): ISeriesApi<'VolumeProfile'>;
    timeScale(): ITimeScaleApi;
    priceScale(priceScaleId?: string): IPriceScaleApi;
    removeSeries(series: ISeriesApi<any>): void;
    subscribeClick(param: any, handler: any): void;
    unsubscribeClick(param: any, handler: any): void;
  }

  export interface ISeriesApi<_T extends SeriesType> {
    setData(data: any[]): void;
    updateData(data: any): void;
    setMarkers(markers: any[]): void;
    applyOptions(options: any): void;
    priceToCoordinate(price: number): number | null;
    coordinateToPrice(coordinate: number): number | null;
    remove(): void;
  }

  export type SeriesType = 'Area' | 'Bar' | 'Baseline' | 'Candlestick' | 'Histogram' | 'Line' | 'VolumeProfile';

  export interface ITimeScaleApi {
    scrollToPosition(position: number, animated?: boolean): void;
    scrollToRealTime(): void;
    getVisibleRange(): Range<Time> | null;
    setVisibleRange(range: Range<Time>): void;
    resetTimeScale(): void;
    fitContent(): void;
    scrollToTime(time: Time, animated?: boolean): void;
  }

  export interface IPriceScaleApi {
    applyOptions(options: any): void;
    options(): any;
    width(): number;
  }

  export type Time = UTCTimestamp | string;

  export interface Range<T> {
    from: T;
    to: T;
  }

  export function createChart(container: HTMLElement | string, options?: ChartOptions): IChartApi;
}

