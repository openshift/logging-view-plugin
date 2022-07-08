export type MetricValue = Array<number | string>;

export type TimeRange = { start: number; end: number };

export const isStreamsResult = (
  result: MatrixResult | StreamsResult,
): result is StreamsResult =>
  result && (result as StreamsResult).resultType === 'streams';

export const isMatrixResult = (
  result: MatrixResult | StreamsResult,
): result is MatrixResult =>
  result && (result as MatrixResult).resultType === 'matrix';

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
