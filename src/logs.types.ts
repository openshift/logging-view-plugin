export type Config = {
  useTenantInHeader?: boolean;
  isStreamingEnabledInDefaultPage?: boolean;
  timeout?: number;
};

export type MetricValue = Array<number | string>;

export type TimeRangeText = { start: string; end: string };
export type TimeRangeNumber = { start: number; end: number };
export type TimeRange = TimeRangeText | TimeRangeNumber;
export type Direction = undefined | 'forward' | 'backward';

export const timeRangeIsText = (value: TimeRange): value is TimeRangeText =>
  typeof value.end === 'string' && typeof value.start === 'string';
export const timeRangeIsNumber = (value: TimeRange): value is TimeRangeNumber =>
  typeof value.end === 'number' && typeof value.start === 'number';

export const isStreamsResult = (
  result: MatrixResult | StreamsResult | undefined,
): result is StreamsResult =>
  result !== undefined && (result as StreamsResult).resultType === 'streams';

export const isMatrixResult = (
  result: MatrixResult | StreamsResult | undefined,
): result is MatrixResult =>
  result !== undefined && (result as MatrixResult).resultType === 'matrix';

export interface MetricLogData {
  metric: Record<string, string>;
  values: Array<MetricValue>;
}

export interface StreamLogData {
  stream: Record<string, string>;
  values: Array<MetricValue>;
}

export interface MatrixResult {
  resultType: 'matrix';
  result: Array<MetricLogData>;
}

export interface StreamsResult {
  resultType: 'streams';
  result: Array<StreamLogData>;
}

export type QueryRangeResponse<T = MatrixResult | StreamsResult> = {
  status: string;
  data: T & {
    stats: {
      ingester: Record<string, number>;
      store: Record<string, number>;
      summary: Record<string, number>;
    };
  };
};
