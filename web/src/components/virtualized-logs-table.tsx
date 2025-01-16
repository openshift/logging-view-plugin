import { RowProps, TableColumn } from '@openshift-console/dynamic-plugin-sdk';
import { Alert } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, ThProps, Tr } from '@patternfly/react-table';
import { VirtualTableBody } from '@patternfly/react-virtualized-extension';
import { Scroll } from '@patternfly/react-virtualized-extension/dist/esm/components/Virtualized/types';
import classNames from 'classnames';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoSizer, CellMeasurer, CellMeasurerCache, WindowScroller } from 'react-virtualized';
import { MeasuredCellParent } from 'react-virtualized/dist/es/CellMeasurer';
import { LogTableData } from '../logs.types';
import { CenteredContainer } from './centered-container';
import { ErrorMessage } from './error-message';

interface VirtualizedLogsTableProps<D> {
  Row: React.ComponentType<RowProps<D>>;
  data: Array<D>;
  columns: TableColumn<D>[];
  getSortParams: (index: number) => ThProps['sort'];
  error?: unknown | Error;
  isStreaming?: boolean;
  isLoading?: boolean;
  dataIsEmpty?: boolean;
  getRowClassName?: (obj: D) => string;
  hasMoreLogsData?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  shouldResize?: boolean;
  csvData?: string;
}

export type TableRowProps = {
  id: React.ReactText;
  index: number;
  title?: string;
  trKey: string;
  style: object;
  className?: string;
};

type RowMemoProps<T> = RowProps<T> & {
  Row: React.ComponentType<RowProps<T>>;
  isScrolling: boolean;
  style: React.CSSProperties;
};

const RowMemo = React.memo(
  ({ Row, isScrolling: _isScrolling, style: _style, ...props }: RowMemoProps<LogTableData>) => (
    <Row {...props} />
  ),
  (_, nextProps) => {
    if (nextProps.isScrolling) {
      return true;
    }

    return false;
  },
);
RowMemo.displayName = 'RowMemo';

export type TableDataProps = {
  id: string;
  activeColumnIDs: Set<string>;
  className?: string;
  colSpan?: number;
};

export const TableData: React.FC<TableDataProps> = ({
  className,
  id,
  activeColumnIDs,
  children,
  colSpan,
}) =>
  activeColumnIDs.has(id) || id === '' ? (
    <Td data-label={id} className={className} colSpan={colSpan} role="gridcell">
      {children}
    </Td>
  ) : null;
TableData.displayName = 'TableData';

type VirtualizedTableBodyProps<D, R = unknown> = {
  Row: React.ComponentType<RowProps<D, R>>;
  data: D[];
  height: number;
  isScrolling: boolean;
  onChildScroll: (params: Scroll) => void;
  columns: TableColumn<D>[];
  scrollTop: number;
  width: number;
  rowData?: R;
  getRowId?: (obj: D) => string;
  getRowTitle?: (obj: D) => string;
  getRowClassName?: (obj: D) => string;
  scrollToIndex?: number;
};

const TableRow: React.FC<TableRowProps> = ({ id, index, trKey, style, className, ...props }) => {
  return (
    <Tr
      {...props}
      data-id={id}
      data-index={index}
      data-test-rows="resource-row"
      data-key={trKey}
      style={style}
      className={classNames('pf-c-table__tr', className)}
      role="row"
    />
  );
};
TableRow.displayName = 'TableRow';

const VirtualizedTableBody = ({
  Row,
  height,
  isScrolling,
  onChildScroll,
  data,
  columns,
  scrollTop,
  width,
  rowData,
  getRowId,
  getRowTitle,
  getRowClassName,
  scrollToIndex,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
VirtualizedTableBodyProps<LogTableData, any>) => {
  const cellMeasurementCache = new CellMeasurerCache({
    fixedWidth: true,
    minHeight: 1,
    keyMapper: (rowIndex) => rowIndex,
  });

  const activeColumnIDs = React.useMemo(() => new Set(columns.map((c) => c.id)), [columns]);

  const rowRenderer = ({
    index,
    isVisible,
    key,
    style,
    parent,
  }: {
    index: number;
    isVisible: boolean;
    key: string;
    style: React.CSSProperties;
    parent: MeasuredCellParent;
  }) => {
    const rowArgs = {
      obj: data[index],
      activeColumnIDs,
      rowData,
      index,
    };

    // do not render non visible elements (this excludes overscan)
    if (!isVisible) {
      return null;
    }

    return (
      <CellMeasurer
        cache={cellMeasurementCache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        <TableRow
          id={getRowId?.(rowArgs.obj) ?? key}
          index={index}
          trKey={key}
          style={style}
          title={getRowTitle?.(rowArgs.obj)}
          className={getRowClassName?.(rowArgs.obj)}
        >
          <RowMemo Row={Row} {...rowArgs} style={style} isScrolling={isScrolling} />
        </TableRow>
      </CellMeasurer>
    );
  };

  return (
    <VirtualTableBody
      autoHeight
      className="pf-c-table pf-m-compact pf-m-border-rows pf-c-virtualized pf-c-window-scroller"
      deferredMeasurementCache={cellMeasurementCache}
      rowHeight={cellMeasurementCache.rowHeight}
      height={height || 0}
      isScrolling={isScrolling}
      onScroll={onChildScroll}
      overscanRowCount={10}
      columns={columns}
      rows={data}
      rowCount={data.length}
      rowRenderer={rowRenderer}
      scrollTop={scrollTop}
      width={width}
      scrollToIndex={scrollToIndex}
    />
  );
};

type WithScrollContainerProps = {
  children: (scrollContainer: HTMLElement) => React.ReactElement | null;
};

const isHTMLElement = (n: Node): n is HTMLElement => {
  return n.nodeType === Node.ELEMENT_NODE;
};

export const getParentScrollableElement = (node: HTMLElement) => {
  let parentNode: Node | undefined = node;
  while (parentNode) {
    if (isHTMLElement(parentNode)) {
      let overflow = parentNode.style?.overflow;
      if (!overflow.includes('scroll') && !overflow.includes('auto')) {
        overflow = window.getComputedStyle(parentNode).overflow;
      }
      if (overflow.includes('scroll') || overflow.includes('auto')) {
        return parentNode;
      }
    }
    parentNode = parentNode.parentNode ?? undefined;
  }
  return undefined;
};

export const WithScrollContainer: React.FC<WithScrollContainerProps> = ({ children }) => {
  const [scrollContainer, setScrollContainer] = React.useState<HTMLElement>();
  const ref = React.useCallback((node) => {
    if (node) {
      setScrollContainer(getParentScrollableElement(node));
    }
  }, []);
  return scrollContainer ? children(scrollContainer) : <span ref={ref} />;
};

export const VirtualizedLogsTable = ({
  Row,
  data,
  columns,
  getSortParams,
  getRowClassName,
  error,
  isStreaming,
  isLoading,
  isLoadingMore,
  dataIsEmpty,
  hasMoreLogsData,
  onLoadMore,
  shouldResize,
}: VirtualizedLogsTableProps<LogTableData>) => {
  const { t } = useTranslation('plugin__logging-view-plugin');
  const colSpan = columns.length + 3;
  const scrollerRef = React.useRef<WindowScroller>(null);
  const [scrollToIndex, setScrollToIndex] = React.useState<number | undefined>(undefined);

  useEffect(() => {
    scrollerRef.current?.updatePosition();
  }, [shouldResize]);

  return (
    <div className="co-logs-virtualized-table">
      <Table aria-label="Logs Table" variant="compact" className="co-logs-table" isStriped>
        <Thead>
          <Tr>
            {columns.map(({ title, props }, columnIndex) => {
              const sortParams = getSortParams(columnIndex);
              return (
                <Th
                  sort={sortParams}
                  key={title}
                  className="co-logs-table__row-header"
                  {...(props ?? {})}
                >
                  {title}
                </Th>
              );
            })}
          </Tr>
        </Thead>
        {error ? (
          <Tbody>
            <Tr className="co-logs-table__row-info">
              <Td colSpan={colSpan} key="error-row">
                <div className="co-logs-table__row-error">
                  <ErrorMessage error={error} />
                </div>
              </Td>
            </Tr>
          </Tbody>
        ) : isStreaming ? (
          <Tbody>
            <Tr className="co-logs-table__row-info">
              <Td colSpan={colSpan} key="streaming-row">
                <div className="co-logs-table__row-streaming">
                  <Alert variant="info" isInline isPlain title={t('Streaming Logs...')} />
                </div>
              </Td>
            </Tr>
          </Tbody>
        ) : isLoading ? (
          <Tbody>
            <Tr className="co-logs-table__row-info">
              <Td colSpan={colSpan} key="loading-row">
                {t('Loading...')}
              </Td>
            </Tr>
          </Tbody>
        ) : (
          dataIsEmpty && (
            <Tbody>
              <Tr className="co-logs-table__row-info">
                <Td colSpan={colSpan} key="data-empty-row">
                  <CenteredContainer>
                    <Alert variant="warning" isInline isPlain title={t('No datapoints found')} />
                  </CenteredContainer>
                </Td>
              </Tr>
            </Tbody>
          )
        )}

        <WithScrollContainer>
          {(scrollContainer) => (
            <WindowScroller scrollElement={scrollContainer} ref={scrollerRef}>
              {({ height, isScrolling, registerChild, onChildScroll, scrollTop }) => (
                <AutoSizer disableHeight>
                  {({ width }) => (
                    <div ref={registerChild}>
                      <VirtualizedTableBody
                        columns={columns}
                        data={data}
                        height={height}
                        isScrolling={isScrolling}
                        onChildScroll={onChildScroll}
                        Row={Row}
                        scrollTop={scrollTop}
                        width={width}
                        getRowClassName={getRowClassName}
                        scrollToIndex={scrollToIndex}
                      />
                    </div>
                  )}
                </AutoSizer>
              )}
            </WindowScroller>
          )}
        </WithScrollContainer>

        {!isLoading && hasMoreLogsData && (
          <Tbody>
            <Tr
              className="co-logs-table__row-info co-logs-table__row-more-data"
              onClick={() => {
                setScrollToIndex(data.length - 1);
                onLoadMore?.();
              }}
            >
              <Td colSpan={colSpan} key="more-data-row">
                {t('More data available')}, {isLoadingMore ? t('Loading...') : t('Click to load')}
              </Td>
            </Tr>
          </Tbody>
        )}
      </Table>
    </div>
  );
};
