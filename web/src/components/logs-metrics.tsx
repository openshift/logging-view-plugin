import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLegendTooltip,
  ChartLine,
  ChartThemeColor,
  createContainer,
  getThemeColors,
} from '@patternfly/react-charts';
import { Alert } from '@patternfly/react-core';
import { InnerScrollContainer, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DateFormat, dateToFormat, getTimeFormatFromTimeRange } from '../date-utils';
import { useRefWidth } from '../hooks/useRefWidth';
import { QueryRangeResponse, TimeRange, isMatrixResult } from '../logs.types';
import { TestIds } from '../test-ids';
import { defaultTimeRange, intervalFromTimeRange, numericTimeRange } from '../time-range';
import { CenteredContainer } from './centered-container';
import './logs-metrics.css';
import { formatValue } from './value-formatter';

const colors = getThemeColors(ChartThemeColor.multiUnordered).line?.colorScale;

type MetricsData = {
  name: string;
  labels: Record<string, string>;
  data: Array<{ name: string; x: number; y: number }>;
};
type Domain = [number, number];
interface LogsMetricsProps {
  logsData?: QueryRangeResponse;
  timeRange?: TimeRange;
  isLoading?: boolean;
  error?: unknown;
  height?: number;
  displayLegendTable?: boolean;
  timezone?: string;
}

const GRAPH_HEIGHT = 250;

const matrixToMetricsData = ({
  response,
  timeRange,
}: {
  response?: QueryRangeResponse;
  timeRange: TimeRange;
}): {
  data: Array<MetricsData> | undefined;
  xDomain: Domain;
  yDomain: Domain;
} => {
  if (!response) {
    return { data: undefined, xDomain: [0, 1], yDomain: [0, 1] };
  }

  if (!isMatrixResult(response.data)) {
    return { data: undefined, xDomain: [0, 1], yDomain: [0, 1] };
  }

  const numericTimeRangeValue = numericTimeRange(timeRange);

  const values = response.data.result;
  const xDomain: Domain = [numericTimeRangeValue.start, numericTimeRangeValue.end];
  const yDomain: Domain = [Number.MAX_VALUE, Number.MIN_VALUE];

  const data = values.map((value) => {
    const seriesName = JSON.stringify(value.metric);
    const seriesLabels = value.metric;

    return {
      name: seriesName,
      labels: seriesLabels,
      data: value.values.map((coordinate) => {
        const time = parseInt(String(coordinate[0])) * 1000;

        if (time < xDomain[0]) {
          xDomain[0] = time;
        }
        if (time > xDomain[1]) {
          xDomain[1] = time;
        }

        const y = parseFloat(String(coordinate[1]));

        if (y < yDomain[0]) {
          yDomain[0] = y;
        }
        if (y > yDomain[1]) {
          yDomain[1] = y;
        }

        return { x: time, y, name: seriesName, labels: seriesLabels };
      }),
    };
  });

  return { data, xDomain, yDomain };
};

const CursorVoronoiContainer = createContainer('voronoi', 'cursor');

export const LogsMetrics: React.FC<LogsMetricsProps> = ({
  logsData,
  isLoading,
  error,
  timeRange,
  height = GRAPH_HEIGHT,
  displayLegendTable = false,
  timezone,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [containerRef, width] = useRefWidth();
  const [timeRangeValue, setTimeRangeValue] = React.useState(numericTimeRange(timeRange));
  const { data, xDomain, yDomain } = React.useMemo(
    () => matrixToMetricsData({ response: logsData, timeRange: timeRange ?? defaultTimeRange() }),
    [logsData],
  );

  React.useEffect(() => {
    setTimeRangeValue(numericTimeRange(timeRange));
  }, [timeRange]);

  const toolTipData = React.useMemo(
    () =>
      data?.map((series) => ({
        childName: series.name,
        name: displayLegendTable ? undefined : series.name,
      })),
    [data],
  );

  const { legendTableData, legendTableColumns } = React.useMemo(() => {
    const tableData: Array<{ childName: string; labels: Record<string, string> }> = [];
    const columns = new Set<string>();

    if (data) {
      for (const metricsData of data) {
        tableData.push({
          childName: metricsData.name,
          labels: metricsData.labels,
        });

        for (const label in metricsData.labels) {
          columns.add(label);
        }
      }
    }

    return { legendTableData: tableData, legendTableColumns: Array.from(columns) };
  }, [data]);

  const intervalValue = intervalFromTimeRange(timeRangeValue);

  const dataIsEmpty = data ? data?.length === 0 : false;

  return (
    <div ref={containerRef} data-test={TestIds.LogsMetrics}>
      {error ? (
        <CenteredContainer>
          <Alert
            variant="danger"
            isInline
            isPlain
            title={(error as Error).message || String(error)}
          />
        </CenteredContainer>
      ) : isLoading ? (
        <CenteredContainer>{t('Loading...')}</CenteredContainer>
      ) : dataIsEmpty ? (
        <CenteredContainer>
          <Alert variant="warning" isInline isPlain title={t('No datapoints found')} />
        </CenteredContainer>
      ) : data ? (
        <div>
          <Chart
            containerComponent={
              <CursorVoronoiContainer
                cursorDimension="x"
                activateData={false}
                labels={({ datum }: { datum: { y: number } }) => datum.y}
                labelComponent={
                  <ChartLegendTooltip
                    legendData={toolTipData}
                    title={(datum) =>
                      dateToFormat(
                        datum.x ?? 0,
                        getTimeFormatFromTimeRange(timeRangeValue),
                        timezone,
                      )
                    }
                  />
                }
                constrainToVisibleArea
                mouseFollowTooltips
                voronoiPadding={0}
              />
            }
            height={height}
            width={width}
            name="alert metrics"
            scale={{ x: 'time', y: 'linear' }}
            themeColor={ChartThemeColor.multiUnordered}
            padding={{
              bottom: 40,
              left: 100,
              right: 20,
              top: 10,
            }}
            domainPadding={{ x: [30, 25] }}
            domain={{ x: xDomain, y: yDomain }}
          >
            <ChartAxis
              tickCount={60}
              fixLabelOverlap
              tickFormat={(tick: number) =>
                dateToFormat(
                  tick,
                  intervalValue < 60 * 1000 ? DateFormat.TimeMed : DateFormat.TimeShort,
                  timezone,
                )
              }
            />
            <ChartAxis dependentAxis showGrid tickFormat={formatValue} />
            <ChartGroup>
              {data.map((series) => (
                <ChartLine name={series.name} key={series.name} data={series.data} />
              ))}
            </ChartGroup>
          </Chart>
          {displayLegendTable && (
            <InnerScrollContainer>
              <Table variant="compact" aria-label="alert metrics">
                <Thead>
                  <Tr>
                    <Th isStickyColumn stickyMinWidth="20px" style={{ width: '20px' }}></Th>
                    {legendTableColumns.map((column) => (
                      <Th modifier="nowrap" key={column}>
                        {column}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {legendTableData?.map((series, index) => (
                    <Tr key={series.childName}>
                      <Th isStickyColumn stickyMinWidth="20px" style={{ width: '20px' }}>
                        <div
                          className="lv-plugin__metrics-legent-table-color"
                          style={{ backgroundColor: colors?.[index] }}
                        />
                      </Th>
                      {legendTableColumns.map((column) => (
                        <Td key={`${column}-${index}`}>{series.labels[column]}</Td>
                      ))}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </InnerScrollContainer>
          )}
        </div>
      ) : (
        <CenteredContainer>
          <Alert variant="danger" isInline isPlain title={t('Invalid data')} />
        </CenteredContainer>
      )}
    </div>
  );
};
