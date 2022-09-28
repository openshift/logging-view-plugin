import { WSFactory } from '@openshift-console/dynamic-plugin-sdk/lib/utils/k8s/ws-factory';
import {
  cancellableFetch,
  CancellableFetch,
  RequestInitWithTimeout,
} from './cancellable-fetch';
import { LabelMatcher, LogQLQuery, PipelineStage } from './logql-query';
import { Config, QueryRangeResponse } from './logs.types';
import { Severity, severityAbbreviations } from './severity';
import { durationFromTimestamp, notEmptyString } from './value-utils';

const LOKI_ENDPOINT = '/api/proxy/plugin/logging-view-plugin/backend';

type QueryRangeParams = {
  query: string;
  start: number;
  end: number;
  severityFilter?: Set<Severity>;
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
  severityFilter?: Set<Severity>;
  config?: Config;
  namespace?: string;
  tenant: string;
};

const getSeverityFilter = (
  severityFilter?: Set<Severity>,
): PipelineStage | undefined => {
  if (!severityFilter || severityFilter.size === 0) {
    return undefined;
  }

  const unknownFilter = severityFilter.has('unknown')
    ? 'level="unknown" or level=""'
    : '';

  const severityFilters = Array.from(severityFilter).flatMap(
    (group: string | undefined) => {
      if (group === 'unknown' || group === undefined) {
        return [];
      }

      return [severityAbbreviations[group as Severity]];
    },
  );

  const levelsfilter =
    severityFilters.length > 0 ? `level=~"${severityFilters.join('|')}"` : '';

  const filters = [unknownFilter, levelsfilter].filter(notEmptyString);

  return filters.length > 0
    ? { operator: '|', value: filters.join(' or ') }
    : undefined;
};

const getNamespaceSelectorMatcher = (
  namespace?: string,
): LabelMatcher | undefined => {
  if (!namespace) {
    return undefined;
  }

  return {
    label: 'kubernetes_namespace_name',
    operator: '=',
    value: `"${namespace}"`,
  };
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
  severityFilter,
  config,
  limit = 100,
  tenant,
  namespace,
}: QueryRangeParams): CancellableFetch<QueryRangeResponse> => {
  const logQLQuery = new LogQLQuery(query);
  logQLQuery
    .addSelectorMatcher(getNamespaceSelectorMatcher(namespace))
    .addPipelineStage(getSeverityFilter(severityFilter));

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
  severityFilter,
  config,
  tenant,
  namespace,
}: HistogramQuerParams): CancellableFetch<QueryRangeResponse> => {
  const intervalString = durationFromTimestamp(interval);

  const logQLQuery = new LogQLQuery(query);
  logQLQuery
    .addSelectorMatcher(getNamespaceSelectorMatcher(namespace))
    .addPipelineStage(getSeverityFilter(severityFilter));

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
  severityFilter,
  limit = 200,
  config,
  tenant,
  namespace,
}: Omit<QueryRangeParams, 'end'>) => {
  const logQLQuery = new LogQLQuery(query);
  logQLQuery
    .addSelectorMatcher(getNamespaceSelectorMatcher(namespace))
    .addPipelineStage(getSeverityFilter(severityFilter));

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
