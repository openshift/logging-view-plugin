import { WSFactory } from '@openshift-console/dynamic-plugin-sdk/lib/utils/k8s/ws-factory';
import { Config, QueryRangeResponse } from './logs.types';
import { Severity, severityAbbreviations } from './severity';
import { durationFromTimestamp, notEmptyString } from './value-utils';

const LOKI_ENDPOINT = '/api/proxy/plugin/logging-view-plugin/backend';

type QueryRangeParams = {
  query: string;
  start: number;
  end: number;
  severity?: Set<Severity>;
  limit?: number;
  config?: Config;
};

type HistogramQuerParams = {
  query: string;
  start: number;
  end: number;
  interval: number;
  severity?: Set<Severity>;
  config?: Config;
};

const getSeverityFilter = (severity: Set<Severity>): string => {
  const severityFilters = Array.from(severity).map((group: Severity) => {
    if (group === 'unknown') {
      return '^$';
    }

    return severityAbbreviations[group].join('|');
  });

  return `level=~"${severityFilters.join('|')}"`;
};

class TimeoutError extends Error {
  constructor(url: string, ms: number) {
    super(`Request: ${url} timed out after ${ms}ms.`);
  }
}

type CancellableFetch<T> = { request: () => Promise<T>; abort: () => void };

type RequestInitWithTimeout = RequestInit & { timeout?: number };

const cancellableFetch = <T>(
  url: string,
  init?: RequestInitWithTimeout,
): CancellableFetch<T> => {
  const abortController = new AbortController();
  const abort = () => abortController.abort();

  const fetchPromise = fetch(url, {
    ...init,
    headers: { ...init?.headers, Accept: 'application/json' },
    signal: abortController.signal,
  }).then(async (response) => {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }
    return response.json();
  });

  const timeout = init?.timeout ?? 30 * 1000;

  if (timeout <= 0) {
    return { request: () => fetchPromise, abort };
  }

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    setTimeout(
      () => reject(new TimeoutError(url.toString(), timeout)),
      timeout,
    );
  });

  const request = () => Promise.race([fetchPromise, timeoutPromise]);

  return { request, abort };
};

const getFetchConfig = (
  config?: Config,
): { requestInit?: RequestInitWithTimeout; endpoint: string } => {
  if (config && config.useTenantInHeader) {
    return {
      requestInit: {
        headers: { 'X-Scope-OrgID': 'application' },
      },
      endpoint: LOKI_ENDPOINT,
    };
  }

  return {
    endpoint: `${LOKI_ENDPOINT}/api/logs/v1/application`,
  };
};

export const executeQueryRange = ({
  query,
  start,
  end,
  severity,
  config,
  limit = 100,
}: QueryRangeParams): CancellableFetch<QueryRangeResponse> => {
  const severityFilterExpression =
    severity.size > 0 ? getSeverityFilter(severity) : '';

  const pipelineArray = [severityFilterExpression].filter(notEmptyString);
  const pipeline =
    pipelineArray.length > 0 ? `| ${pipelineArray.join(' | ')}` : '';
  const queryWithFilters = `${query} ${pipeline}`;

  const params = {
    query: queryWithFilters,
    start: String(start * 1000000),
    end: String(end * 1000000),
    limit: String(limit),
  };

  const { endpoint, requestInit } = getFetchConfig(config);

  return cancellableFetch<QueryRangeResponse>(
    `${endpoint}/loki/api/v1/query_range?${new URLSearchParams(params)}`,
    requestInit,
  );
};

export const executeHistogramQuery = ({
  query,
  start,
  end,
  interval,
  severity,
  config,
}: HistogramQuerParams): CancellableFetch<QueryRangeResponse> => {
  const intervalString = durationFromTimestamp(interval);
  const severityFilterExpression =
    severity.size > 0 ? `${getSeverityFilter(severity)}` : '';

  // TODO parse query to adjust intervals and clean pipeline
  const pipelineArray = [severityFilterExpression].filter(notEmptyString);

  const pipeline =
    pipelineArray.length > 0 ? `| ${pipelineArray.join(' | ')}` : '';

  const histogramQuery = `sum by (level) (count_over_time(${query} ${pipeline} [${intervalString}]))`;

  const params = {
    query: histogramQuery,
    start: String(start * 1000000),
    end: String(end * 1000000),
    step: intervalString,
  };

  const { endpoint, requestInit } = getFetchConfig(config);

  return cancellableFetch<QueryRangeResponse>(
    `${endpoint}/loki/api/v1/query_range?${new URLSearchParams(params)}`,
    requestInit,
  );
};

export const connectToTailSocket = ({
  query,
  start,
  severity,
  limit = 200,
  config,
}: Omit<QueryRangeParams, 'end'>) => {
  const severityFilterExpression =
    severity.size > 0 ? getSeverityFilter(severity) : '';

  const pipelineArray = [severityFilterExpression].filter(notEmptyString);
  const pipeline =
    pipelineArray.length > 0 ? `| ${pipelineArray.join(' | ')}` : '';
  const queryWithFilters = `${query} ${pipeline}`;

  const params = {
    query: queryWithFilters,
    start: String(start * 1000000),
    limit: String(limit),
  };

  const { endpoint } = getFetchConfig(config);

  const url = `${endpoint}/loki/api/v1/tail?${new URLSearchParams(params)}`;

  return new WSFactory(url, {
    host: 'auto',
    path: url,
    subprotocols: ['json'],
    jsonParse: true,
  });
};
