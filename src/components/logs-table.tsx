import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  Checkbox,
  Select,
  SelectOption,
  SelectOptionObject,
  SelectVariant,
  Split,
  SplitItem,
  Toolbar,
  ToolbarChip,
  ToolbarChipGroup,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
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
import * as React from 'react';
import { TestIds } from '../test-ids';
import { DateFormat, dateToFormat } from '../date-utils';
import {
  isStreamsResult,
  QueryRangeResponse,
  StreamLogData,
} from '../logs.types';
import { Severity, severityFromString } from '../severity';
import { CenteredContainer } from './centered-container';
import { LogDetail } from './log-detail';
import './logs-table.css';
import { TogglePlay } from './toggle-play';

interface LogsTableProps {
  logsData?: QueryRangeResponse;
  showStreaming?: boolean;
  isStreaming?: boolean;
  severityFilter?: Set<Severity>;
  isLoading?: boolean;
  hasMoreLogsData?: boolean;
  isLoadingMore?: boolean;
  onStreamingToggle?: (e: React.MouseEvent) => void;
  onSeverityChange?: (severityFilter: Set<Severity>) => void;
  onLoadMore?: (lastTimestamp: number) => void;
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
  sort?: <T extends TableCellValue>(
    a: T,
    b: T,
    directionMultiplier: number,
  ) => number;
  value: (row: LogTableData) => TableCellValue;
};

type LogTableData = {
  time: string;
  timestamp: number;
  severity: string;
  namespace?: string;
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
  const container = {
    kind: 'Container',
    name: data['kubernetes_container_name'],
  };
  const namespace = {
    kind: 'Namespace',
    name: data['kubernetes_namespace_name'],
  };
  const pod = {
    kind: 'Pod',
    name: data['kubernetes_pod_name'],
  };

  return [namespace, pod, container];
};

const streamToTableData = (stream: StreamLogData): Array<LogTableData> => {
  const values = stream.values;

  return values.map((value) => {
    const message = String(value[1]);
    const timestamp = parseFloat(String(value[0]));
    const time = timestamp / 1e6;
    const formattedTime = dateToFormat(time, DateFormat.Full);

    return {
      time: formattedTime,
      timestamp,
      message,
      severity: severityFromString(stream.stream.level),
      data: stream.stream,
      resources: parseResources(stream.stream),
      namespace: stream.stream['kubernetes_namespace_name'],
    };
  });
};

const aggregateStreamLogData = (
  response?: QueryRangeResponse,
): Array<LogTableData> => {
  // TODO check timestamp aggregation for streams
  // TODO check if display matrix data is required
  if (isStreamsResult(response?.data)) {
    return response.data.result.flatMap(streamToTableData);
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
                <SplitItem key={resource.name}>
                  <ResourceLink
                    kind={resource.kind}
                    name={resource.name}
                    namespace={data.namespace}
                  />
                </SplitItem>
              ))}
            </Split>
          )}
        </>
      );
    case 'Resources':
      return (
        <>
          {data.resources.map((resource) => (
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
      return namespace ? (
        <ResourceLink key={namespace} kind="Namespace" name={namespace} />
      ) : null;
    }
  }

  return null;
};

const availableSeverityFilters: Array<Severity> = [
  'critical',
  'error',
  'warning',
  'debug',
  'info',
  'trace',
  'unknown',
];

export const LogsTable: React.FC<LogsTableProps> = ({
  logsData,
  isStreaming,
  onStreamingToggle,
  severityFilter,
  onSeverityChange,
  isLoading,
  isLoadingMore,
  children,
  onLoadMore,
  hasMoreLogsData,
  showStreaming = false,
  error,
}) => {
  const [expandedItems, setExpandedItems] = React.useState<Set<number>>(
    new Set(),
  );
  const [showResources, setShowResources] = React.useState(false);
  const [isSeverityExpanded, setIsSeverityExpanded] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<ISortBy>({
    index: 0,
    direction: 'desc',
  });
  const tableData = React.useMemo(
    () => aggregateStreamLogData(logsData),
    [logsData],
  );

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

    return tableData.sort((a, b) =>
      numericComparator(a.timestamp, b.timestamp, -1),
    );
  }, [tableData, columns, sortBy]);

  const onDeleteSeverityFilter = (
    _category: string | ToolbarChipGroup,
    chip: string | ToolbarChip,
  ) => {
    severityFilter.delete(chip.toString() as Severity);
    onSeverityChange?.(new Set(severityFilter));
  };

  const onDeleteSeverityGroup = () => {
    onSeverityChange(new Set());
  };

  const onSeverityToggle = () => {
    setIsSeverityExpanded(!isSeverityExpanded);
  };

  const onSeveritySelect = (
    _: React.MouseEvent | React.ChangeEvent,
    value: string | SelectOptionObject,
  ) => {
    const severityValue = value.toString() as Severity;
    if (severityFilter.has(severityValue)) {
      severityFilter.delete(severityValue);
    } else {
      severityFilter.add(severityValue);
    }

    onSeverityChange?.(new Set(severityFilter));
  };

  const dataIsEmpty = sortedData.length === 0;

  let rowIndex = 0;

  const handleLoadMore = () => {
    onLoadMore?.(tableData[tableData.length - 1].timestamp / 1e6);
  };

  return (
    <div data-test={TestIds.LogsTable}>
      <Toolbar isSticky clearAllFilters={onDeleteSeverityGroup}>
        <ToolbarContent>
          <ToolbarGroup alignment={{ default: 'alignLeft' }}>
            <ToolbarItem>{children}</ToolbarItem>
          </ToolbarGroup>

          <ToolbarGroup variant="filter-group">
            <ToolbarFilter
              chips={Array.from(severityFilter)}
              deleteChip={onDeleteSeverityFilter}
              deleteChipGroup={onDeleteSeverityGroup}
              categoryName="Severity"
            >
              <Select
                variant={SelectVariant.checkbox}
                aria-label="Severity"
                onToggle={onSeverityToggle}
                onSelect={onSeveritySelect}
                selections={Array.from(severityFilter)}
                isOpen={isSeverityExpanded}
                placeholderText="Severity"
              >
                {availableSeverityFilters.map((severity) => (
                  <SelectOption key={severity} value={severity} />
                ))}
              </Select>
            </ToolbarFilter>
          </ToolbarGroup>

          <ToolbarGroup variant="icon-button-group">
            <ToolbarItem>
              <Checkbox
                label="Show Resources"
                isChecked={showResources}
                onChange={setShowResources}
                aria-label="checkbox for showing resources names"
                id="showResourcesCheckbox"
              />
            </ToolbarItem>
          </ToolbarGroup>

          {showStreaming && (
            <ToolbarGroup alignment={{ default: 'alignRight' }}>
              <TogglePlay active={isStreaming} onClick={onStreamingToggle} />
            </ToolbarGroup>
          )}
        </ToolbarContent>
      </Toolbar>

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
              <Th
                sort={column.sort ? getSortParams(index) : undefined}
                key={column.title}
              >
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
                  <Alert
                    variant="danger"
                    isInline
                    isPlain
                    title={(error as Error).message || String(error)}
                  />
                </div>
              </Td>
            </Tr>
          </Tbody>
        ) : isStreaming ? (
          <Tbody>
            <Tr className="co-logs-table__row-info">
              <Td colSpan={columns.length + 2} key="streaming-row">
                <div className="co-logs-table__row-streaming">
                  <Alert
                    variant="info"
                    isInline
                    isPlain
                    title="Streaming Logs..."
                  />
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
                    <Alert
                      variant="warning"
                      isInline
                      isPlain
                      title="No datapoints found"
                    />
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
                <Td
                  expand={{ isExpanded, onToggle: handleRowToggle, rowIndex }}
                />

                {columns.map((column, index) => {
                  const content = (
                    <LogRow
                      data={value}
                      title={column.title}
                      showResources={showResources}
                    />
                  );

                  return content ? (
                    <Td
                      key={`col-${column.title}-row-${index}`}
                      className={getRowClassName(index)}
                    >
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
                More data available,{' '}
                {isLoadingMore ? 'loading...' : 'click to load'}
              </Td>
            </Tr>
          </Tbody>
        )}
      </TableComposable>
    </div>
  );
};
