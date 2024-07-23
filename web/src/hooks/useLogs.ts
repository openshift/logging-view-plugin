import { WSFactory } from '@openshift-console/dynamic-plugin-sdk/lib/utils/k8s/ws-factory';
import React from 'react';
import { getConfig } from '../backend-client';
import {
  Config,
  Direction,
  isMatrixResult,
  isStreamsResult,
  QueryRangeResponse,
  TimeRange,
} from '../logs.types';
import { connectToTailSocket, executeHistogramQuery, executeQueryRange } from '../loki-client';
import { intervalFromTimeRange, numericTimeRange, timeRangeFromDuration } from '../time-range';
import { millisecondsFromDuration } from '../value-utils';

const DEFAULT_TIME_SPAN = '1h';
const STREAMING_MAX_LOGS_LIMIT = 1e3;

const defaultConfig: Config = {
  isStreamingEnabledInDefaultPage: false,
  logsLimit: 100,
};

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
  configLoaded: boolean;
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

const hasMoreLogs = (response: QueryRangeResponse | undefined, limit: number): boolean => {
  if (response === undefined) return false;

  return (
    response?.data.result
      .map((result) => result.values.length)
      .reduce((sum, count) => sum + count, 0) >= limit
  );
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
        hasMoreLogsData: hasMoreLogs(action.payload.logsData, state.config.logsLimit),
      };
    case 'moreLogsResponse':
      return {
        ...state,
        isLoadingMoreLogsData: false,
        logsData: appendData(state.logsData, action.payload.logsData),
        hasMoreLogsData: hasMoreLogs(action.payload.logsData, state.config.logsLimit),
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
        configLoaded: true,
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
  const lastExecutionTime = React.useRef<{ logs?: number; histogram?: number }>({
    logs: undefined,
    histogram: undefined,
  });
  const currentDirection = React.useRef<Direction>('backward');
  const logsAbort = React.useRef<() => void | undefined>();
  const histogramAbort = React.useRef<() => void | undefined>();
  const ws = React.useRef<WSFactory | null>();

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
      configLoaded,
    },
    dispatch,
  ] = React.useReducer(reducer, {
    isLoadingHistogramData: false,
    isLoadingLogsData: false,
    isLoadingMoreLogsData: false,
    hasMoreLogsData: false,
    isStreaming: false,
    config: defaultConfig,
    configLoaded: false,
  });

  const fetchConfig = React.useCallback(async () => {
    if (!configLoaded) {
      try {
        const configData = await getConfig();
        const mergedConfig = { ...defaultConfig, ...configData };
        dispatch({ type: 'setConfig', payload: { config: mergedConfig } });

        currentConfig.current = mergedConfig;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Error fetching configuration', e);
      }
    }

    return currentConfig.current;
  }, [configLoaded]);

  const getMoreLogs = async ({
    lastTimestamp,
    query,
    namespace,
    direction,
  }: {
    lastTimestamp: number;
    query: string;
    namespace?: string;
    direction?: Direction;
  }) => {
    if (query.length === 0) {
      dispatch({ type: 'logsError', payload: { error: new Error('Query is empty') } });
      return;
    }

    try {
      currentQuery.current = query;
      currentTime.current = Date.now();
      currentDirection.current = direction ?? currentDirection.current;

      const oneHourMilliseconds = millisecondsFromDuration('1h');

      let start = lastTimestamp - oneHourMilliseconds;
      let end = lastTimestamp - 1;

      if (currentDirection.current === 'forward') {
        start = lastTimestamp + 1;
        end = lastTimestamp + oneHourMilliseconds;
      }

      dispatch({ type: 'moreLogsRequest' });

      if (logsAbort.current) {
        logsAbort.current();
      }

      await fetchConfig();

      const { request, abort } = executeQueryRange({
        query,
        start,
        end,
        config: currentConfig.current,
        tenant: currentTenant.current,
        namespace,
        direction: currentDirection.current,
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
    direction,
  }: {
    query: string;
    tenant?: string;
    timeRange?: TimeRange;
    namespace?: string;
    direction?: Direction;
  }) => {
    if (query.length === 0) {
      dispatch({ type: 'logsError', payload: { error: new Error('Query is empty') } });
      return;
    }

    // Throttle requests
    if (lastExecutionTime.current.logs && Date.now() - lastExecutionTime.current.logs < 50) {
      return;
    }

    try {
      currentQuery.current = query;
      currentTenant.current = tenant ?? currentTenant.current;
      currentTime.current = Date.now();
      lastExecutionTime.current.logs = Date.now();
      currentTimeRange.current = timeRange ?? currentTimeRange.current;
      currentDirection.current = direction ?? currentDirection.current;

      const { start, end } = numericTimeRange(currentTimeRange.current);

      dispatch({ type: 'logsRequest' });

      if (logsAbort.current) {
        logsAbort.current();
      }

      await fetchConfig();

      const { request, abort } = executeQueryRange({
        query,
        start,
        end,
        config: currentConfig.current,
        tenant: currentTenant.current,
        namespace,
        direction: currentDirection.current,
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

    if (ws.current) {
      ws.current.destroy();
    }

    dispatch({ type: 'startStreaming' });

    ws.current = connectToTailSocket({
      query,
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
              stats: { ingester: {}, querier: {}, summary: {} },
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
    if (query.length === 0) {
      dispatch({ type: 'histogramError', payload: { error: new Error('Query is empty') } });
      return;
    }

    // Throttle histogram requests
    if (
      lastExecutionTime.current.histogram &&
      Date.now() - lastExecutionTime.current.histogram < 50
    ) {
      return;
    }

    try {
      currentQuery.current = query;
      currentTenant.current = tenant ?? currentTenant.current;
      currentTime.current = Date.now();
      lastExecutionTime.current.histogram = Date.now();
      currentTimeRange.current = timeRange ?? currentTimeRange.current;

      // TODO split on multiple/parallel queries for long timespans and concat results
      dispatch({ type: 'histogramRequest' });

      if (histogramAbort.current) {
        histogramAbort.current();
      }

      const { start, end } = numericTimeRange(currentTimeRange.current);

      await fetchConfig();

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
