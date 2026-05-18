import { ResourceLink, RowProps, TableColumn } from '@openshift-console/dynamic-plugin-sdk';
import { Split, SplitItem } from '@patternfly/react-core';
import { ISortBy, SortByDirection, Td, ThProps } from '@patternfly/react-table';
import React, { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom-v5-compat';
import { DateFormat, dateToFormat } from '../date-utils';
import {
  Direction,
  isStreamsResult,
  LogTableData,
  QueryRangeResponse,
  Resource,
  Schema,
  StreamLogData,
} from '../logs.types';
import { parseName, parseResources, ResourceLabel } from '../parse-resources';
import { severityFromString } from '../severity';
import { TestIds } from '../test-ids';
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
  timezone?: string;
  hasNamespaceFilter?: boolean;
  schema: Schema;
}

type TableCellValue = string | number | Resource | Array<Resource>;

const isJSONObject = (value: string): boolean => {
  const trimmedValue = value.trim();

  return trimmedValue.startsWith('{') && trimmedValue.endsWith('}');
};

const streamToTableData = (stream: StreamLogData, timezone?: string): Array<LogTableData> => {
  const values = stream.values;

  return values.map((value) => {
    const logValue = String(value[1]);
    const message = isJSONObject(logValue) ? stream.stream['message'] || logValue : logValue;
    const timestamp = parseFloat(String(value[0]));
    const time = timestamp / 1e6;
    const formattedTime = dateToFormat(time, DateFormat.Full, timezone);
    const severity = parseName(stream.stream, ResourceLabel.Severity);
    const namespace = parseName(stream.stream, ResourceLabel.Namespace);
    const podName = parseName(stream.stream, ResourceLabel.Pod);

    return {
      time: formattedTime,
      timestamp,
      message,
      severity: severityFromString(severity) ?? 'other',
      data: stream.stream,
      resources: parseResources(stream.stream),
      namespace,
      podName,
      type: 'log',
      // index is 0 here to match the type, but it will be recalculated when flattening the array
      logIndex: 0,
    };
  });
};

const aggregateStreamLogData = (
  response?: QueryRangeResponse,
  timezone?: string,
): Array<LogTableData> => {
  // TODO check timestamp aggregation for streams
  // TODO check if display matrix data is required

  const data = response?.data;
  if (isStreamsResult(data)) {
    return data.result
      .flatMap((stream) => streamToTableData(stream, timezone))
      .map((log, index) => ({ ...log, logIndex: index }));
  }

  return [];
};

const getSeverityClass = (severity: string) => {
  return severity ? `lv-plugin__table__severity-${severity}` : '';
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
      className: 'lv-plugin__table__expand',
    },
  },
  {
    id: 'date',
    title: 'Date',
    props: {
      className: 'lv-plugin__table__time lv-plugin__table__time-header',
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
  expandedItemsRef: React.MutableRefObject<Set<number>>;
  handleRowToggle: (e: React.MouseEvent, rowIndex: number) => void;
  showResources: boolean;
  colSpan?: number;
};

const TableRow = ({ expandedItemsRef, handleRowToggle, showResources, colSpan }: TableRowProps) => {
  return function TableRowComponent({ obj, activeColumnIDs }: RowProps<LogTableData>) {
    const isExpanded = expandedItemsRef.current.has(obj.logIndex);

    return obj.type === 'log' ? (
      <>
        <Td
          expand={{ isExpanded, onToggle: handleRowToggle, rowIndex: obj.logIndex }}
          className="lv-plugin__table__expand"
          id="expand"
        />
        <TableData id="date" activeColumnIDs={activeColumnIDs} className="lv-plugin__table__time">
          {obj.time}
        </TableData>
        <TableData
          id="message"
          activeColumnIDs={activeColumnIDs}
          className="lv-plugin__table__message"
        >
          <div>{obj.message}</div>
          {showResources && (
            <Split className="lv-plugin__table__resources" hasGutter>
              {obj.resources?.map((resource) => (
                <ResourceLinkList key={resource.kind} resource={resource} data={obj} />
              ))}
            </Split>
          )}
        </TableData>
      </>
    ) : isExpanded ? (
      <TableData
        className="lv-plugin__table__details"
        id="expand"
        activeColumnIDs={activeColumnIDs}
        colSpan={colSpan}
      >
        <LogDetail data={obj.data} />
      </TableData>
    ) : null;
  };
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
  timezone,
  hasNamespaceFilter,
  schema,
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());
  const expandedItemsRef = React.useRef(expandedItems);
  expandedItemsRef.current = expandedItems;
  const [prevChildrenCount, setPrevChildrenCount] = React.useState(0);
  const [sortBy, setSortBy] = React.useState<ISortBy>({
    index: 1,
    direction: direction === 'backward' ? 'desc' : 'asc',
  });
  const tableData: Array<LogTableData> = React.useMemo(() => {
    const logsTableData = aggregateStreamLogData(logsData, timezone);

    const logsTableDataWithExpanded = logsTableData.flatMap((row) => [
      row,
      { ...row, type: 'expand' as const },
    ]);

    return logsTableDataWithExpanded;
  }, [logsData, timezone]);

  useEffect(() => {
    setPrevChildrenCount(React.Children.count(children));
  }, [children]);

  const handleRowToggle = useCallback((_event: React.MouseEvent, rowIndex: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  }, []);

  const getSortParams = useCallback(
    (columnIndex: number): ThProps['sort'] => {
      if (columnIndex === 0) {
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

  const prevLogsDataRef = React.useRef(logsData);
  if (logsData !== prevLogsDataRef.current) {
    const prevData = prevLogsDataRef.current;
    prevLogsDataRef.current = logsData;

    const dataChanged =
      !prevData ||
      !logsData ||
      isStreaming ||
      prevData.data?.result?.length !== logsData.data?.result?.length;

    if (expandedItems.size > 0 && dataChanged) {
      setExpandedItems(new Set());
    }
  }

  const sortedData = React.useMemo(() => {
    const dataCopy = [...tableData];
    if (sortBy.index !== undefined && columns[sortBy.index]) {
      const { sort } = columns[sortBy.index];
      if (sort && typeof sort === 'function') {
        return sort(
          dataCopy,
          sortBy.direction === 'asc' ? SortByDirection.asc : SortByDirection.desc,
        );
      }
    }

    return dataCopy.sort((a, b) => numericComparator(a.timestamp, b.timestamp, -1));
  }, [tableData, sortBy]);

  const dataIsEmpty = sortedData.length === 0;

  const handleLoadMore = () => {
    onLoadMore?.(tableData[tableData.length - 1].timestamp / 1e6);
  };

  const RowComponent = React.useMemo(
    () =>
      TableRow({
        expandedItemsRef,
        handleRowToggle,
        showResources,
        colSpan: columns.length,
      }),
    [handleRowToggle, showResources],
  );

  const getRowClassName = useCallback((row: LogTableData) => {
    const expanded = expandedItemsRef.current.has(row.logIndex);
    let expandedClass = '';
    if (expanded) {
      expandedClass =
        row.type === 'log'
          ? 'lv-plugin__table__row--expanded'
          : 'lv-plugin__table__row--expanded-details';
    }
    return `lv-plugin__table__row ${getSeverityClass(row.severity)} ${expandedClass}`;
  }, []);

  return (
    <div data-test={TestIds.LogsTable} className="lv-plugin__table">
      {showStats && <StatsTable logsData={logsData} />}
      {children}

      <VirtualizedLogsTable
        data={sortedData}
        Row={RowComponent}
        columns={columns}
        getSortParams={getSortParams}
        getRowClassName={getRowClassName}
        error={error}
        isLoading={isLoading}
        isStreaming={isStreaming}
        dataIsEmpty={dataIsEmpty}
        hasMoreLogsData={hasMoreLogsData}
        onLoadMore={handleLoadMore}
        isLoadingMore={isLoadingMore}
        shouldResize={showStats || React.Children.count(children) != prevChildrenCount}
        hasNamespaceFilter={hasNamespaceFilter}
        schema={schema}
        expandedItems={expandedItems}
        showResources={showResources}
      />
    </div>
  );
};
