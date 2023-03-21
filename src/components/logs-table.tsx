import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { Alert, Split, SplitItem } from '@patternfly/react-core';
import {
  ExpandableRowContent,
  ISortBy,
  TableComposable,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';
import React from 'react';
import { Link } from 'react-router-dom';
import { notUndefined } from '../value-utils';
import { DateFormat, dateToFormat } from '../date-utils';
import { isStreamsResult, QueryRangeResponse, StreamLogData } from '../logs.types';
import { severityFromString } from '../severity';
import { TestIds } from '../test-ids';
import { CenteredContainer } from './centered-container';
import { LogDetail } from './log-detail';
import './logs-table.css';
import { ErrorMessage } from './error-message';

interface LogsTableProps {
  logsData?: QueryRangeResponse;
  isLoading?: boolean;
  hasMoreLogsData?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: (lastTimestamp: number) => void;
  onSortByDate?: (direction?: 'forward' | 'backward') => void;
  showResources?: boolean;
  isStreaming?: boolean;
  error?: unknown;
}

type Resource = {
  kind: string;
  name: string;
};

type TableCellValue = string | number | Resource | Array<Resource>;

type LogsTableColumn = {
  title: string;
  isDisabled?: boolean;
  isSelected?: boolean;
  sort?: <T extends TableCellValue>(a: T, b: T, directionMultiplier: number) => number;
  value: (row: LogTableData) => TableCellValue;
};

type LogTableData = {
  time: string;
  timestamp: number;
  severity: string;
  namespace?: string;
  podName?: string;
  resources?: Array<Resource>;
  message: string;
  data: Record<string, string>;
};

type LogRowProps = {
  data: LogTableData;
  title: string;
  showResources: boolean;
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
    const message = String(stream.stream['message'] || value[1]);
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
    };
  });
};

const aggregateStreamLogData = (response?: QueryRangeResponse): Array<LogTableData> => {
  // TODO check timestamp aggregation for streams
  // TODO check if display matrix data is required

  const data = response?.data;
  if (isStreamsResult(data)) {
    return data.result.flatMap(streamToTableData);
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

const columns: Array<LogsTableColumn> = [
  {
    title: 'Date',
    isDisabled: true,
    isSelected: true,
    value: (row: LogTableData) => row.timestamp,
    sort: numericComparator,
  },
  {
    title: 'Message',
    isDisabled: true,
    isSelected: true,
    value: (row: LogTableData) => row.message,
  },
];

const getRowClassName = (index: number): string => {
  switch (index) {
    case 0:
      return 'co-logs-table__time';
    case 1:
      return 'co-logs-table__message';
  }

  return '';
};

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

const LogRow: React.FC<LogRowProps> = ({ data, title, showResources }) => {
  switch (title) {
    case 'Date':
      return <>{data.time}</>;
    case 'Message':
      return (
        <>
          <div className="co-logs-table__message">{data.message}</div>
          {showResources && (
            <Split className="co-logs-table__resources" hasGutter>
              {data.resources?.map((resource) => (
                <ResourceLinkList key={resource.kind} resource={resource} data={data} />
              ))}
            </Split>
          )}
        </>
      );
    case 'Resources':
      return (
        <>
          {data.resources?.map((resource) => (
            <ResourceLink
              key={resource.name}
              kind={resource.kind}
              name={resource.name}
              namespace={data.namespace}
            />
          ))}
        </>
      );
    case 'Namespace': {
      const namespace = data.namespace;
      return namespace ? <ResourceLink key={namespace} kind="Namespace" name={namespace} /> : null;
    }
  }

  return null;
};

export const LogsTable: React.FC<LogsTableProps> = ({
  logsData,
  isLoading,
  isLoadingMore,
  onLoadMore,
  onSortByDate,
  hasMoreLogsData,
  showResources = false,
  isStreaming,
  children,
  error,
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = React.useState<ISortBy>({
    index: 0,
    direction: 'desc',
  });
  const tableData = React.useMemo(() => aggregateStreamLogData(logsData), [logsData]);

  const handleRowToggle = (_event: React.MouseEvent, rowIndex: number) => {
    if (expandedItems.has(rowIndex)) {
      expandedItems.delete(rowIndex);
      setExpandedItems(new Set(expandedItems));
    } else {
      setExpandedItems(new Set(expandedItems.add(rowIndex)));
    }
  };

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy,
    onSort: (_event, index, direction) => {
      setExpandedItems(new Set());
      setSortBy({ index, direction, defaultDirection: 'desc' });
      onSortByDate?.(
        direction === undefined ? undefined : direction === 'desc' ? 'backward' : 'forward',
      );
    },
    columnIndex,
  });

  const sortedData = React.useMemo(() => {
    if (sortBy.index !== undefined && columns[sortBy.index]) {
      const { sort, value } = columns[sortBy.index];
      if (sort) {
        return tableData.sort((a, b) =>
          sort(value(a), value(b), sortBy.direction === 'asc' ? 1 : -1),
        );
      }
    }

    setExpandedItems(new Set());

    return tableData.sort((a, b) => numericComparator(a.timestamp, b.timestamp, -1));
  }, [tableData, columns, sortBy]);

  const dataIsEmpty = sortedData.length === 0;

  let rowIndex = 0;

  const handleLoadMore = () => {
    onLoadMore?.(tableData[tableData.length - 1].timestamp / 1e6);
  };

  return (
    <div data-test={TestIds.LogsTable}>
      {children}
      <TableComposable
        aria-label="Logs Table"
        variant="compact"
        className="co-logs-table"
        isStriped
        isExpandable
      >
        <Thead>
          <Tr>
            <Th></Th>
            <Th></Th>
            {columns.map((column, index) => (
              <Th sort={column.sort ? getSortParams(index) : undefined} key={column.title}>
                {column.title}
              </Th>
            ))}
          </Tr>
        </Thead>

        {error ? (
          <Tbody>
            <Tr className="co-logs-table__row-info">
              <Td colSpan={columns.length + 2} key="error-row">
                <div className="co-logs-table__row-error">
                  <ErrorMessage error={error} />
                </div>
              </Td>
            </Tr>
          </Tbody>
        ) : isStreaming ? (
          <Tbody>
            <Tr className="co-logs-table__row-info">
              <Td colSpan={columns.length + 2} key="streaming-row">
                <div className="co-logs-table__row-streaming">
                  <Alert variant="info" isInline isPlain title="Streaming Logs..." />
                </div>
              </Td>
            </Tr>
          </Tbody>
        ) : isLoading ? (
          <Tbody>
            <Tr className="co-logs-table__row-info">
              <Td colSpan={columns.length + 2} key="loading-row">
                Loading...
              </Td>
            </Tr>
          </Tbody>
        ) : (
          dataIsEmpty && (
            <Tbody>
              <Tr className="co-logs-table__row-info">
                <Td colSpan={columns.length + 2} key="data-empty-row">
                  <CenteredContainer>
                    <Alert variant="warning" isInline isPlain title="No datapoints found" />
                  </CenteredContainer>
                </Td>
              </Tr>
            </Tbody>
          )
        )}

        {!isLoading &&
          sortedData.map((value, index) => {
            const isExpanded = expandedItems.has(rowIndex);
            const severityClass = getSeverityClass(value.severity);

            const parentRow = (
              <Tr
                key={`${value.timestamp}-${rowIndex}`}
                className={`co-logs-table__row ${severityClass} ${
                  isExpanded ? 'co-logs-table__row-parent-expanded' : ''
                }`}
              >
                <Td expand={{ isExpanded, onToggle: handleRowToggle, rowIndex }} />

                {columns.map((column, index) => {
                  const content = (
                    <LogRow data={value} title={column.title} showResources={showResources} />
                  );

                  return content ? (
                    <Td key={`col-${column.title}-row-${index}`} className={getRowClassName(index)}>
                      {content}
                    </Td>
                  ) : null;
                })}
              </Tr>
            );

            const childRow = isExpanded ? (
              <Tr
                className={`co-logs-table__row ${severityClass} co-logs-table__row-child-expanded`}
                isExpanded={true}
                key={`${value.timestamp}-${rowIndex}-child`}
              >
                <Td colSpan={columns.length + 2}>
                  <ExpandableRowContent>
                    <LogDetail data={value.data} />
                  </ExpandableRowContent>
                </Td>
              </Tr>
            ) : null;

            // Expanded elements create an additional row in the table
            rowIndex += isExpanded ? 2 : 1;

            return (
              <Tbody isExpanded={isExpanded} key={index}>
                {parentRow}
                {childRow}
              </Tbody>
            );
          })}

        {!isLoading && hasMoreLogsData && (
          <Tbody>
            <Tr
              className="co-logs-table__row-info co-logs-table__row-more-data"
              onClick={handleLoadMore}
            >
              <Td colSpan={columns.length + 2} key="more-data-row">
                More data available, {isLoadingMore ? 'loading...' : 'click to load'}
              </Td>
            </Tr>
          </Tbody>
        )}
      </TableComposable>
    </div>
  );
};
