import { WSFactory } from '@openshift-console/dynamic-plugin-sdk/lib/utils/k8s/ws-factory';
import { Config, QueryRangeResponse } from './logs.types';
import { LogQLQuery } from './logql-query';
import { Severity, severityAbbreviations } from './severity';
import { durationFromTimestamp, notEmptyString } from './value-utils';
import {
  cancellableFetch,
  CancellableFetch,
  RequestInitWithTimeout,
} from './cancellable-fetch';

const LOKI_ENDPOINT = '/api/proxy/plugin/logging-view-plugin/backend';

type QueryRangeParams = {
  query: string;
  start: number;
  end: number;
  severity?: Set<Severity>;
  limit?: number;
  config?: Config;
  namespace?: string;
  tenant: string;
};

type HistogramQuerParams = {
  query: string;
  start: number;
  end: number;
  interval: number;
  severity?: Set<Severity>;
  config?: Config;
  namespace?: string;
  tenant: string;
};

const getSeverityFilter = (severity: Set<Severity>): string => {
  if (severity.size === 0) {
    return '';
  }

  const unknownFilter = severity.has('unknown')
    ? 'level="unknown" or level=""'
    : '';

  const severityFilters = Array.from(severity).flatMap((group: Severity) => {
    if (group !== 'unknown') {
      return [severityAbbreviations[group].join('|')];
    }

    return [];
  });

  const levelsfilter =
    severityFilters.length > 0 ? `level=~"${severityFilters.join('|')}"` : '';

  return [unknownFilter, levelsfilter].filter(notEmptyString).join(' or ');
};

const getNamespaceStreamSelector = (namespace?: string): string => {
  if (!namespace) {
    return '';
  }

  return `kubernetes_namespace_name="${namespace}"`;
};

const getFetchConfig = ({
  config,
  tenant,
}: {
  config?: Config;
  tenant: string;
}): { requestInit?: RequestInitWithTimeout; endpoint: string } => {
  if (config && config.useTenantInHeader === true) {
    return {
      requestInit: {
        headers: { 'X-Scope-OrgID': tenant },
      },
      endpoint: LOKI_ENDPOINT,
    };
  }

  return {
    endpoint: `${LOKI_ENDPOINT}/api/logs/v1/${tenant}`,
  };
};

export const executeQueryRange = ({
  query,
  start,
  end,
  severity,
  config,
  limit = 100,
  tenant,
  namespace,
}: QueryRangeParams): CancellableFetch<QueryRangeResponse> => {
  const logQLQuery = new LogQLQuery(query);
  logQLQuery
    .appendSelector(getNamespaceStreamSelector(namespace))
    .appendPipeline(getSeverityFilter(severity));

  const params = {
    query: logQLQuery.toString(),
    start: String(start * 1000000),
    end: String(end * 1000000),
    limit: String(limit),
  };

  const { endpoint, requestInit } = getFetchConfig({ config, tenant });

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
  tenant,
  namespace,
}: HistogramQuerParams): CancellableFetch<QueryRangeResponse> => {
  const intervalString = durationFromTimestamp(interval);

  const logQLQuery = new LogQLQuery(query);
  logQLQuery
    .appendSelector(getNamespaceStreamSelector(namespace))
    .appendPipeline(getSeverityFilter(severity));

  const extendedQuery = logQLQuery.toString();

  const histogramQuery = `sum by (level) (count_over_time(${extendedQuery} [${intervalString}]))`;

  const params = {
    query: histogramQuery,
    start: String(start * 1000000),
    end: String(end * 1000000),
    step: intervalString,
  };

  const { endpoint, requestInit } = getFetchConfig({ config, tenant });

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
  tenant,
  namespace,
}: Omit<QueryRangeParams, 'end'>) => {
  const logQLQuery = new LogQLQuery(query);
  logQLQuery
    .appendSelector(getNamespaceStreamSelector(namespace))
    .appendPipeline(getSeverityFilter(severity));

  const params = {
    query: logQLQuery.toString(),
    start: String(start * 1000000),
    limit: String(limit),
  };

  const { endpoint } = getFetchConfig({ config, tenant });

  const url = `${endpoint}/loki/api/v1/tail?${new URLSearchParams(params)}`;

  return new WSFactory(url, {
    host: 'auto',
    path: url,
    subprotocols: ['json'],
    jsonParse: true,
  });
};
