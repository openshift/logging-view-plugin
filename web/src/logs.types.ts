export type Config = {
  useTenantInHeader?: boolean;
  isStreamingEnabledInDefaultPage?: boolean;
  alertingRuleTenantLabelKey?: string;
  alertingRuleNamespaceLabelKey?: string;
  timeout?: number;
  logsLimit: number;
};

export type MetricValue = Array<number | string>;

export type TimeRangeText = { start: string; end: string };
export type TimeRangeNumber = { start: number; end: number };
export type TimeRange = TimeRangeText | TimeRangeNumber;
export type Direction = 'forward' | 'backward';

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

type Chunk = Record<string, number>;
type Store = Record<string, number> & { chunk?: Chunk };
type Ingester = Record<string, number> & { store?: Store };
type Querier = Record<string, number> & { store?: Store };

export type QueryRangeResponse<T = MatrixResult | StreamsResult> = {
  status: string;
  data: T & {
    stats: {
      ingester?: Ingester;
      querier?: Querier;
      summary?: Record<string, number>;
    };
  };
};

export type Rule = {
  query?: string;
  labels?: Record<string, string>;
};

export type RulesResponse = {
  status: string;
  data: {
    groups: Array<{
      rules: Array<Rule>;
    }>;
  };
};

export type LabelValueResponse = {
  data: Array<string>;
};
