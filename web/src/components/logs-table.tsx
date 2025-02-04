import { ResourceLink, RowProps, TableColumn } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Split,
  SplitItem,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { ISortBy, SortByDirection, Td, ThProps } from '@patternfly/react-table';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DateFormat, dateToFormat } from '../date-utils';
import { useKorrel8r } from '../hooks/useKorrel8r';
import { listGoals } from '../korrel8r-client';
import { Korrel8rResponse } from '../korrel8r.types';
import {
  Direction,
  isStreamsResult,
  LogTableData,
  QueryRangeResponse,
  Resource,
  StreamLogData,
} from '../logs.types';
import { severityFromString } from '../severity';
import { TestIds } from '../test-ids';
import { notUndefined } from '../value-utils';
import { LogDetail } from './log-detail';
import './logs-table.css';
import { StatsTable } from './stats-table';
import { TableData, VirtualizedLogsTable } from './virtualized-logs-table';

interface LogsTableProps {
  logsData?: QueryRangeResponse;
  isLoading?: boolean;
  hasMoreLogsData?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: (lastTimestamp: number) => void;
  onSortByDate?: (direction?: Direction) => void;
  direction?: Direction;
  showResources?: boolean;
  showStats?: boolean;
  isStreaming?: boolean;
  error?: unknown;
}

type TableCellValue = string | number | Resource | Array<Resource>;

const isJSONObject = (value: string): boolean => {
  const trimmedValue = value.trim();

  return trimmedValue.startsWith('{') && trimmedValue.endsWith('}');
};

const parseResources = (data: Record<string, string>): Array<Resource> => {
  const container = data['kubernetes_container_name']
    ? {
        kind: 'Container',
        name: data['kubernetes_container_name'],
      }
    : undefined;
  const namespace = data['kubernetes_namespace_name']
    ? {
        kind: 'Namespace',
        name: data['kubernetes_namespace_name'],
      }
    : undefined;
  const pod = data['kubernetes_pod_name']
    ? {
        kind: 'Pod',
        name: data['kubernetes_pod_name'],
      }
    : undefined;

  return [namespace, pod, container].filter(notUndefined);
};

const streamToTableData = (stream: StreamLogData): Array<LogTableData> => {
  const values = stream.values;

  return values.map((value) => {
    const logValue = String(value[1]);
    const message = isJSONObject(logValue) ? stream.stream['message'] || logValue : logValue;
    const timestamp = parseFloat(String(value[0]));
    const time = timestamp / 1e6;
    const formattedTime = dateToFormat(time, DateFormat.Full);

    return {
      time: formattedTime,
      timestamp,
      message,
      severity: severityFromString(stream.stream.level) ?? 'other',
      data: stream.stream,
      resources: parseResources(stream.stream),
      namespace: stream.stream['kubernetes_namespace_name'],
      podName: stream.stream['kubernetes_pod_name'],
      type: 'log',
      // index is 0 here to match the type, but it will be recalculated when flattening the array
      logIndex: 0,
    };
  });
};

const aggregateStreamLogData = (response?: QueryRangeResponse): Array<LogTableData> => {
  // TODO check timestamp aggregation for streams
  // TODO check if display matrix data is required

  const data = response?.data;
  if (isStreamsResult(data)) {
    return data.result
      .flatMap(streamToTableData)
      .map((log, index) => ({ ...log, logIndex: index }));
  }

  return [];
};

const getSeverityClass = (severity: string) => {
  return severity ? `co-logs-table__severity-${severity}` : '';
};

// sort with an appropriate numeric comparator for big floats
const numericComparator = <T extends TableCellValue>(
  a: T,
  b: T,
  directionMultiplier: number,
): number => (a < b ? -1 : a > b ? 1 : 0) * directionMultiplier;

const columns: Array<TableColumn<LogTableData>> = [
  {
    id: 'expand',
    title: ' ',
    props: {
      className: 'co-logs-table__expand',
    },
  },
  {
    id: 'date',
    title: 'Date',
    props: {
      className: 'co-logs-table__time co-logs-table__time-header',
    },
    sort: (data, sortDirection) =>
      data.sort((a, b) =>
        numericComparator(a.timestamp, b.timestamp, sortDirection === 'asc' ? 1 : -1),
      ),
  },
  {
    id: 'message',
    title: 'Message',
    sort: (data, sortDirection) =>
      data.sort((a, b) => {
        const messageA = a.message;
        const messageB = b.message;

        return (
          (messageA < messageB ? -1 : messageA > messageB ? 1 : 0) *
          (sortDirection === 'asc' ? 1 : -1)
        );
      }),
  },
];

const ResourceLinkList: React.FC<{
  resource: Resource;
  data: LogTableData;
}> = ({ resource, data }) => {
  if (resource.kind === 'Container') {
    if (!data.podName) {
      return null;
    }

    return (
      <SplitItem>
        <Link to={`/k8s/ns/${data.namespace}/pods/${data.podName}/containers/${resource.name}`}>
          <ResourceLink
            kind={resource.kind}
            name={resource.name}
            namespace={data.namespace}
            linkTo={false}
          />
        </Link>
      </SplitItem>
    );
  }

  return (
    <SplitItem>
      <ResourceLink kind={resource.kind} name={resource.name} namespace={data.namespace} />
    </SplitItem>
  );
};

type TableRowProps = {
  expandedItems: Set<number>;
  handleRowToggle: (e: React.MouseEvent, rowIndex: number) => void;
  showResources: boolean;
  colSpan?: number;
  isKorrel8rReachable?: boolean;
};

const TableRow = ({
  expandedItems,
  handleRowToggle,
  showResources,
  colSpan,
  isKorrel8rReachable,
}: TableRowProps) => {
  return function TableRowComponent({ obj, activeColumnIDs }: RowProps<LogTableData>) {
    const isExpanded = expandedItems.has(obj.logIndex);

    return obj.type === 'log' ? (
      <>
        <Td
          expand={{ isExpanded, onToggle: handleRowToggle, rowIndex: obj.logIndex }}
          className="co-logs-table__expand"
          id="expand"
        />
        <TableData id="date" activeColumnIDs={activeColumnIDs} className="co-logs-table__time">
          {obj.time}
        </TableData>
        <TableData
          id="message"
          activeColumnIDs={activeColumnIDs}
          className="co-logs-table__message"
        >
          <div>{obj.message}</div>
          {showResources && (
            <Split className="co-logs-table__resources" hasGutter>
              {obj.resources?.map((resource) => (
                <ResourceLinkList key={resource.kind} resource={resource} data={obj} />
              ))}
            </Split>
          )}
        </TableData>
        {isKorrel8rReachable && (
          <TableData
            id="correlation"
            activeColumnIDs={activeColumnIDs}
            className="co-logs-table__correlation"
          >
            <MetricsLink
              container={obj.data.kubernetes_container_name}
              logType={obj.data.log_type}
              namespace={obj.data.kubernetes_namespace_name}
              pod={obj.data.kubernetes_pod_name}
            />
          </TableData>
        )}
      </>
    ) : isExpanded ? (
      <TableData
        className="co-logs-table__details"
        id="expand"
        activeColumnIDs={activeColumnIDs}
        colSpan={colSpan}
      >
        <LogDetail data={obj.data} />
      </TableData>
    ) : null;
  };
};

type MetricsLinkProps = {
  container: string;
  logType: string;
  namespace: string;
  pod: string;
};

const MetricsLink: React.FC<MetricsLinkProps> = ({ container, logType, namespace, pod }) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [correlationFound, setCorrelationFound] = React.useState<boolean | undefined>(undefined);

  const queryLabels = React.useMemo(() => {
    const labels: string[] = [];
    if (container) {
      labels.push(`kubernetes_container_name="${container}"`);
    }
    if (namespace) {
      labels.push(`kubernetes_namespace_name="${namespace}"`);
    }
    if (pod) {
      labels.push(`kubernetes_pod_name="${pod}"`);
    }

    return labels;
  }, [container, namespace, pod]);

  // We require a log type and at least one search label value to get related metrics
  const canFetchCorrelation = !!logType && queryLabels.length > 0;

  const checkForMetrics = React.useCallback(() => {
    setError(undefined);
    setCorrelationFound(undefined);

    if (canFetchCorrelation) {
      setIsLoading(true);

      const { request } = listGoals({
        goalsRequest: {
          start: {
            class: `log:${logType}`,
            queries: [`log:${logType}:{${queryLabels.join(',')}}`],
          },
          goals: ['metric:metric'],
        },
      });

      request()
        .then((response: Korrel8rResponse) => {
          setIsLoading(false);

          const metricGoalFound = response.some((goal) => {
            if (goal?.class === 'metric:metric') {
              // Use the first goal query that has results and a query
              const query = goal?.queries?.find((q) => q?.count > 0 && q?.query)?.query;

              if (query) {
                // Strip korrel8r class off the beginning of the query string
                const promQL = query.replace(/^metric:metric:/, '');

                const metricsUrl = new URL(window.location.href);

                const params = new URLSearchParams();
                params.set('query0', promQL);
                metricsUrl.pathname = '/monitoring/query-browser';
                metricsUrl.search = params.toString();

                // open the metrics page in a new tab
                window.open(metricsUrl, '_blank');

                // Exit early (ignore any remaining goals)
                return true;
              }
            }
          });

          setCorrelationFound(metricGoalFound);
        })
        .catch((err) => {
          setIsLoading(false);
          setError(err);
          // eslint-disable-next-line no-console
          console.warn('Error fetching korrel8r goals: ', err);
        });
    }
  }, [container, logType, namespace, pod]);

  return canFetchCorrelation ? (
    <Flex flexWrap={{ default: 'nowrap' }} alignContent={{ default: 'alignContentCenter' }}>
      <FlexItem>
        <Button
          variant="link"
          onClick={checkForMetrics}
          isLoading={isLoading}
          disabled={isLoading}
          isInline
        >
          {isLoading ? t('Correlating') : t('Metrics')}
        </Button>
      </FlexItem>
      {error && (
        <FlexItem>
          <Alert variant="danger" isInline isPlain title={t('Error fetching related metrics')} />
        </FlexItem>
      )}
      {correlationFound === false && (
        <FlexItem>
          <Text component={TextVariants.p}>{t('No correlation found')}</Text>
        </FlexItem>
      )}
    </Flex>
  ) : null;
};

export const LogsTable: React.FC<LogsTableProps> = ({
  logsData,
  isLoading,
  isLoadingMore,
  onLoadMore,
  onSortByDate,
  hasMoreLogsData,
  showResources = false,
  showStats = false,
  direction,
  isStreaming,
  children,
  error,
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());
  const [prevChildrenCount, setPrevChildrenCount] = React.useState(0);
  const [sortBy, setSortBy] = React.useState<ISortBy>({
    index: 1,
    direction: direction === 'backward' ? 'desc' : 'asc',
  });
  const { isKorrel8rReachable } = useKorrel8r();
  const tableData: Array<LogTableData> = React.useMemo(() => {
    const logsTableData = aggregateStreamLogData(logsData);

    const logsTableDataWithExpanded = logsTableData.flatMap((row) => [
      row,
      { ...row, type: 'expand' as const },
    ]);

    return logsTableDataWithExpanded;
  }, [logsData]);

  const columnWithCorrelation = useMemo(() => {
    if (!isKorrel8rReachable) {
      return columns;
    }
    return columns.concat({
      id: 'correlation',
      title: 'Correlation',
      props: {
        className: 'co-logs-table__correlation',
      },
    });
  }, [isKorrel8rReachable]);

  useEffect(() => {
    setPrevChildrenCount(React.Children.count(children));
  }, [children]);

  const handleRowToggle = (_event: React.MouseEvent, rowIndex: number) => {
    if (expandedItems.has(rowIndex)) {
      expandedItems.delete(rowIndex);
      setExpandedItems(new Set(expandedItems));
    } else {
      setExpandedItems(new Set(expandedItems.add(rowIndex)));
    }
  };

  const getSortParams = useCallback(
    (columnIndex: number): ThProps['sort'] => {
      if (!columnWithCorrelation[columnIndex]?.sort) {
        return undefined;
      }

      return {
        sortBy,
        onSort: (_event, index, tableSortDirection) => {
          setExpandedItems(new Set());
          setSortBy({ index, direction: tableSortDirection, defaultDirection: 'desc' });

          if (index == 1) {
            // Sort results calling the backend if the column is the date column
            onSortByDate?.(
              tableSortDirection === undefined
                ? undefined
                : tableSortDirection === 'desc'
                ? 'backward'
                : 'forward',
            );
          }
        },
        columnIndex,
      };
    },
    [sortBy, onSortByDate],
  );

  const sortedData = React.useMemo(() => {
    setExpandedItems(new Set());

    if (sortBy.index !== undefined && columns[sortBy.index]) {
      const { sort } = columns[sortBy.index];
      if (sort && typeof sort === 'function') {
        return sort(
          tableData,
          sortBy.direction === 'asc' ? SortByDirection.asc : SortByDirection.desc,
        );
      }
    }

    return tableData.sort((a, b) => numericComparator(a.timestamp, b.timestamp, -1));
  }, [tableData, columns, sortBy]);

  const dataIsEmpty = sortedData.length === 0;

  const handleLoadMore = () => {
    onLoadMore?.(tableData[tableData.length - 1].timestamp / 1e6);
  };

  return (
    <div data-test={TestIds.LogsTable} className="co-logs-table">
      {showStats && <StatsTable logsData={logsData} />}
      {children}

      <VirtualizedLogsTable
        data={sortedData}
        Row={TableRow({
          expandedItems,
          handleRowToggle,
          showResources,
          colSpan: columnWithCorrelation.length,
          isKorrel8rReachable,
        })}
        columns={columnWithCorrelation}
        getSortParams={getSortParams}
        getRowClassName={(row) =>
          `co-logs-table__row ${getSeverityClass(row.severity)} ${
            expandedItems.has(row.logIndex)
              ? row.type === 'log'
                ? 'co-logs-table__row--expanded'
                : 'co-logs-table__row--expanded-details'
              : ''
          }`
        }
        error={error}
        isLoading={isLoading}
        isStreaming={isStreaming}
        dataIsEmpty={dataIsEmpty}
        hasMoreLogsData={hasMoreLogsData}
        onLoadMore={handleLoadMore}
        isLoadingMore={isLoadingMore}
        shouldResize={showStats || React.Children.count(children) != prevChildrenCount}
      />
    </div>
  );
};
