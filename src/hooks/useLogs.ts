import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { WSFactory } from '@openshift-console/dynamic-plugin-sdk/lib/utils/k8s/ws-factory';
import React from 'react';
import {
  Config,
  isMatrixResult,
  isStreamsResult,
  QueryRangeResponse,
  TimeRange,
} from '../logs.types';
import { connectToTailSocket, executeHistogramQuery, executeQueryRange } from '../loki-client';
import { intervalFromTimeRange, numericTimeRange, timeRangeFromDuration } from '../time-range';
import { millisecondsFromDuration } from '../value-utils';

const DEFAULT_TIME_SPAN = '1h';
const QUERY_LOGS_LIMIT = 100;
const STREAMING_MAX_LOGS_LIMIT = 1e3;

type RawConfig = { data: { config: string } };

const defaultConfig: Config = {
  isStreamingEnabledInDefaultPage: false,
};

const isRawConfig = (obj: unknown): obj is RawConfig =>
  obj !== null && (obj as RawConfig).data && typeof (obj as RawConfig).data.config === 'string';

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

type State = {
  isLoadingHistogramData: boolean;
  histogramData?: QueryRangeResponse;
  histogramError?: unknown;
  isLoadingLogsData: boolean;
  isLoadingMoreLogsData: boolean;
  logsData?: QueryRangeResponse;
  logsError?: unknown;
  hasMoreLogsData?: boolean;
  isStreaming: boolean;
  config: Config;
};

type Action =
  | {
      type: 'histogramRequest';
    }
  | {
      type: 'histogramResponse';
      payload: { histogramData: QueryRangeResponse };
    }
  | {
      type: 'logsRequest';
    }
  | {
      type: 'moreLogsRequest';
    }
  | {
      type: 'logsResponse';
      payload: { logsData: QueryRangeResponse };
    }
  | {
      type: 'startStreaming';
    }
  | {
      type: 'pauseStreaming';
    }
  | {
      type: 'streamingResponse';
      payload: { logsData: QueryRangeResponse };
    }
  | {
      type: 'moreLogsResponse';
      payload: { logsData: QueryRangeResponse };
    }
  | {
      type: 'logsError';
      payload: { error: unknown };
    }
  | {
      type: 'histogramError';
      payload: { error: unknown };
    }
  | {
      type: 'setConfig';
      payload: { config: Config };
    };

const appendData = (
  response?: QueryRangeResponse,
  nextResponse?: QueryRangeResponse,
  limit?: number,
): QueryRangeResponse | undefined => {
  if (
    response &&
    nextResponse &&
    ((isMatrixResult(response.data) && isMatrixResult(nextResponse.data)) ||
      (isStreamsResult(response.data) && isStreamsResult(nextResponse.data)))
  ) {
    const result = [...response.data.result, ...nextResponse.data.result];
    const limitedTailResult = limit ? result.slice(-limit) : result;

    return {
      ...response,
      data: {
        ...response.data,
        result: limitedTailResult,
      } as QueryRangeResponse['data'],
    };
  }

  return response ? response : nextResponse;
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'histogramRequest':
      return {
        ...state,
        isLoadingHistogramData: true,
        histogramData: undefined,
        histogramError: undefined,
      };

    case 'histogramResponse':
      return {
        ...state,
        isLoadingHistogramData: false,
        histogramData: action.payload.histogramData,
      };
    case 'histogramError':
      return {
        ...state,
        isLoadingHistogramData: false,
        histogramError: action.payload.error,
      };
    case 'logsRequest':
      return {
        ...state,
        isLoadingLogsData: true,
        logsData: undefined,
        logsError: undefined,
        hasMoreLogsData: false,
        isStreaming: false,
      };
    case 'startStreaming':
      return {
        ...state,
        logsData: undefined,
        logsError: undefined,
        hasMoreLogsData: false,
        isStreaming: true,
      };
    case 'pauseStreaming':
      return {
        ...state,
        isStreaming: false,
        logsError: undefined,
      };
    case 'streamingResponse':
      return {
        ...state,
        logsData: appendData(state.logsData, action.payload.logsData, STREAMING_MAX_LOGS_LIMIT),
        hasMoreLogsData: false,
      };
    case 'moreLogsRequest':
      return {
        ...state,
        isLoadingMoreLogsData: true,
        logsError: undefined,
      };
    case 'logsResponse':
      return {
        ...state,
        isLoadingLogsData: false,
        logsData: action.payload.logsData,
        hasMoreLogsData:
          action.payload.logsData.data.result
            .map((result) => result.values.length)
            .reduce((sum, count) => sum + count, 0) >= QUERY_LOGS_LIMIT,
      };
    case 'moreLogsResponse':
      return {
        ...state,
        isLoadingMoreLogsData: false,
        logsData: appendData(state.logsData, action.payload.logsData),
        hasMoreLogsData:
          action.payload.logsData.data.result
            .map((result) => result.values.length)
            .reduce((sum, count) => sum + count, 0) >= QUERY_LOGS_LIMIT,
      };
    case 'logsError':
      return {
        ...state,
        isLoadingLogsData: false,
        isLoadingMoreLogsData: false,
        logsError: action.payload.error,
      };
    case 'setConfig':
      return {
        ...state,
        config: action.payload.config,
      };

    default:
      return state;
  }
};

const defaultTimeRange = (): TimeRange => timeRangeFromDuration(DEFAULT_TIME_SPAN);

type UseLogOptions = { initialTimeRange?: TimeRange; initialTenant?: string } | undefined;

export const useLogs = (
  { initialTimeRange = defaultTimeRange(), initialTenant = 'application' }: UseLogOptions = {
    initialTimeRange: defaultTimeRange(),
    initialTenant: 'application',
  },
) => {
  const currentQuery = React.useRef<string | undefined>();
  const currentConfig = React.useRef<Config>(defaultConfig);
  const currentTenant = React.useRef<string>(initialTenant);
  const currentTimeRange = React.useRef<TimeRange>(initialTimeRange);
  const currentTime = React.useRef<number>(Date.now());
  const logsAbort = React.useRef<() => void | undefined>();
  const histogramAbort = React.useRef<() => void | undefined>();
  const ws = React.useRef<WSFactory | null>();
  const [configData, configLoaded, configError] = useK8sWatchResource({
    namespace: 'logging-view',
    name: 'logging-view-config',
    kind: 'ConfigMap',
  });

  const [
    {
      logsData,
      histogramData,
      isLoadingHistogramData,
      isLoadingLogsData,
      isLoadingMoreLogsData,
      histogramError,
      logsError,
      hasMoreLogsData,
      isStreaming,
      config,
    },
    dispatch,
  ] = React.useReducer(reducer, {
    isLoadingHistogramData: false,
    isLoadingLogsData: false,
    isLoadingMoreLogsData: false,
    hasMoreLogsData: false,
    isStreaming: false,
    config: defaultConfig,
  });

  React.useEffect(() => {
    if (!configError && configLoaded) {
      try {
        if (isRawConfig(configData)) {
          const parsedConfig = JSON.parse(configData.data.config);
          const mergedConfig = { ...defaultConfig, ...parsedConfig };
          dispatch({ type: 'setConfig', payload: { config: mergedConfig } });
          currentConfig.current = mergedConfig;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Error parsing configuration from ConfigMap', e);
      }
    }
  }, [configLoaded, configError, configData]);

  const getMoreLogs = async ({
    lastTimestamp,
    query,
    namespace,
  }: {
    lastTimestamp: number;
    query: string;
    namespace?: string;
  }) => {
    try {
      currentQuery.current = query;
      currentTime.current = Date.now();

      const start = lastTimestamp - millisecondsFromDuration('1h');

      dispatch({ type: 'moreLogsRequest' });

      if (logsAbort.current) {
        logsAbort.current();
      }

      const { request, abort } = executeQueryRange({
        query,
        start,
        end: lastTimestamp,
        limit: QUERY_LOGS_LIMIT,
        config: currentConfig.current,
        tenant: currentTenant.current,
        namespace,
      });

      logsAbort.current = abort;

      const queryResponse = await request();

      dispatch({
        type: 'moreLogsResponse',
        payload: { logsData: queryResponse },
      });
    } catch (error) {
      if (!isAbortError(error)) {
        dispatch({ type: 'logsError', payload: { error } });
      }
    }
  };

  const getLogs = async ({
    query,
    tenant,
    timeRange,
    namespace,
  }: {
    query: string;
    tenant?: string;
    timeRange?: TimeRange;
    namespace?: string;
  }) => {
    try {
      currentQuery.current = query;
      currentTenant.current = tenant ?? currentTenant.current;
      currentTime.current = Date.now();
      currentTimeRange.current = timeRange ?? currentTimeRange.current;

      const { start, end } = numericTimeRange(currentTimeRange.current);

      dispatch({ type: 'logsRequest' });

      if (logsAbort.current) {
        logsAbort.current();
      }

      const { request, abort } = executeQueryRange({
        query,
        start,
        end,
        limit: QUERY_LOGS_LIMIT,
        config: currentConfig.current,
        tenant: currentTenant.current,
        namespace,
      });

      logsAbort.current = abort;

      const queryResponse = await request();

      dispatch({ type: 'logsResponse', payload: { logsData: queryResponse } });
    } catch (error) {
      if (!isAbortError(error)) {
        dispatch({ type: 'logsError', payload: { error } });
      }
    }
  };

  const pauseTailLog = () => {
    if (ws.current) {
      ws.current.destroy();
    }

    dispatch({ type: 'pauseStreaming' });
  };

  const startTailLog = ({
    query,
    tenant,
    namespace,
  }: {
    query: string;
    tenant?: string;
    namespace?: string;
  }) => {
    currentQuery.current = query;
    currentTenant.current = tenant ?? currentTenant.current;
    currentTime.current = Date.now();

    const start = millisecondsFromDuration('1h');

    if (ws.current) {
      ws.current.destroy();
    }

    dispatch({ type: 'startStreaming' });

    ws.current = connectToTailSocket({
      query,
      start,
      tenant: currentTenant.current,
      namespace,
    });

    ws.current.onerror((error) => {
      const errorMessage = (error as ErrorEvent).message ?? 'WebSocket error';
      dispatch({
        type: 'logsError',
        payload: { error: errorMessage },
      });
    });

    ws.current.onmessage((data) => {
      dispatch({
        type: 'streamingResponse',
        payload: {
          logsData: {
            status: 'success',
            data: {
              stats: { ingester: {}, store: {}, summary: {} },
              resultType: 'streams',
              result: data.streams,
            },
          },
        },
      });
    });
  };

  const toggleStreaming = ({
    query,
    tenant,
    namespace,
  }: {
    query: string;
    tenant?: string;
    namespace?: string;
  }) => {
    currentQuery.current = query;
    currentTenant.current = tenant ?? currentTenant.current;

    if (isStreaming) {
      pauseTailLog();
    } else {
      startTailLog({ query, tenant, namespace });
    }
  };

  const getHistogram = async ({
    query,
    tenant,
    timeRange,
    namespace,
  }: {
    query: string;
    tenant?: string;
    timeRange?: TimeRange;
    namespace?: string;
  }) => {
    try {
      currentQuery.current = query;
      currentTenant.current = tenant ?? currentTenant.current;
      currentTime.current = Date.now();
      currentTimeRange.current = timeRange ?? currentTimeRange.current;

      // TODO split on multiple/parallel queries for long timespans and concat results
      dispatch({ type: 'histogramRequest' });

      if (histogramAbort.current) {
        histogramAbort.current();
      }

      const { start, end } = numericTimeRange(currentTimeRange.current);

      const { request, abort } = executeHistogramQuery({
        query,
        start,
        end,
        interval: intervalFromTimeRange(currentTimeRange.current),
        config: currentConfig.current,
        tenant: currentTenant.current,
        namespace,
      });

      histogramAbort.current = abort;

      const histogramResponse = await request();

      dispatch({
        type: 'histogramResponse',
        payload: { histogramData: histogramResponse },
      });
    } catch (error) {
      if (!isAbortError(error)) {
        dispatch({ type: 'histogramError', payload: { error } });
      }
    }
  };

  return {
    logsData,
    isLoadingLogsData,
    isLoadingMoreLogsData,
    isStreaming,
    histogramData,
    isLoadingHistogramData,
    getLogs,
    getMoreLogs,
    hasMoreLogsData,
    logsError,
    getHistogram,
    histogramError,
    toggleStreaming,
    config,
  };
};
