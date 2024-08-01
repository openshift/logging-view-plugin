import { WSFactory } from '@openshift-console/dynamic-plugin-sdk/lib/utils/k8s/ws-factory';
import { queryWithNamespace } from './attribute-filters';
import { CancellableFetch, cancellableFetch, RequestInitWithTimeout } from './cancellable-fetch';
import {
  Config,
  Direction,
  LabelValueResponse,
  QueryRangeResponse,
  VolumeRangeResponse,
  RulesResponse,
} from './logs.types';
import { durationFromTimestamp } from './value-utils';

const LOKI_ENDPOINT = '/api/proxy/plugin/logging-view-plugin/backend';

type QueryRangeParams = {
  query: string;
  start: number;
  end: number;
  config?: Config;
  namespace?: string;
  tenant: string;
  direction?: Direction;
};

type VolumeRangeParams = {
  query: string;
  start: number;
  end: number;
  config?: Config;
  namespace?: string;
  tenant: string;
  targetLabels?: string;
};

type HistogramQuerParams = {
  query: string;
  start: number;
  end: number;
  interval: number;
  config?: Config;
  namespace?: string;
  tenant: string;
};

type LokiTailQueryParams = {
  query: string;
  delay_for?: string;
  limit?: number;
  start?: number;
  config?: Config;
  namespace?: string;
  tenant: string;
};

export const getFetchConfig = ({
  config,
  tenant,
}: {
  config?: Config;
  tenant: string;
  endpoint?: string;
}): { requestInit?: RequestInitWithTimeout; endpoint: string } => {
  if (config && config.useTenantInHeader === true) {
    return {
      requestInit: {
        headers: { 'X-Scope-OrgID': tenant },
        timeout: config?.timeout ? config.timeout * 1000 : undefined,
      },
      endpoint: LOKI_ENDPOINT,
    };
  }

  return {
    requestInit: {
      timeout: config?.timeout ? config.timeout * 1000 : undefined,
    },
    endpoint: `${LOKI_ENDPOINT}/api/logs/v1/${tenant}`,
  };
};

export const executeLabelValue = ({
  query,
  labelName,
  config,
  tenant,
}: {
  query?: string;
  labelName: string;
  config?: Config;
  tenant: string;
}): CancellableFetch<LabelValueResponse> => {
  const { endpoint, requestInit } = getFetchConfig({ config, tenant });

  const params: Record<string, string> = {};

  if (query) {
    params.query = query;
  }

  return cancellableFetch<LabelValueResponse>(
    `${endpoint}/loki/api/v1/label/${labelName}/values?${new URLSearchParams(params)}`,
    requestInit,
  );
};

export const executeQueryRange = ({
  query,
  start,
  end,
  config,
  tenant,
  namespace,
  direction,
}: QueryRangeParams): CancellableFetch<QueryRangeResponse> => {
  const extendedQuery = queryWithNamespace({
    query,
    namespace,
  });

  const params: Record<string, string> = {
    query: extendedQuery,
    start: String(start * 1000000),
    end: String(end * 1000000),
    limit: String(config?.logsLimit ?? 100),
  };

  if (direction) {
    params.direction = direction;
  }

  const { endpoint, requestInit } = getFetchConfig({ config, tenant });

  return cancellableFetch<QueryRangeResponse>(
    `${endpoint}/loki/api/v1/query_range?${new URLSearchParams(params)}`,
    requestInit,
  );
};

export const executeVolumeRange = ({
  query,
  start,
  end,
  config,
  tenant,
  namespace,
}: VolumeRangeParams): CancellableFetch<VolumeRangeResponse> => {
  const extendedQuery = queryWithNamespace({
    query,
    namespace,
  });

  const params: Record<string, string> = {
    query: extendedQuery,
    start: String(start * 1000000),
    end: String(end * 1000000),
  };

  const { endpoint, requestInit } = getFetchConfig({ config, tenant });

  return cancellableFetch<VolumeRangeResponse>(
    `${endpoint}/loki/api/v1/index/volume_range?${new URLSearchParams(params)}`,
    requestInit,
  );
};

export const executeHistogramQuery = ({
  query,
  start,
  end,
  interval,
  config,
  tenant,
  namespace,
}: HistogramQuerParams): CancellableFetch<QueryRangeResponse> => {
  const intervalString = durationFromTimestamp(interval);

  const extendedQuery = queryWithNamespace({
    query,
    namespace,
  });

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

export const connectToTailSocket = ({ query, config, tenant, namespace }: LokiTailQueryParams) => {
  const extendedQuery = queryWithNamespace({
    query,
    namespace,
  });

  const params = {
    query: extendedQuery,
    limit: String(config?.logsLimit ?? 200),
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

export const getRules = ({
  config,
  tenant,
  namespace,
}: {
  config?: Config;
  tenant: string;
  namespace?: string;
}) => {
  const { endpoint, requestInit } = getFetchConfig({
    config,
    tenant,
  });

  let url = `${endpoint}/prometheus/api/v1/rules`;

  const alertingRulesNamespaceLabelKey =
    config?.alertingRuleNamespaceLabelKey || 'kubernetes_namespace_name';

  if (namespace) {
    url = `${url}?${alertingRulesNamespaceLabelKey}=${namespace}`;
  }

  return cancellableFetch<RulesResponse>(url, requestInit);
};
