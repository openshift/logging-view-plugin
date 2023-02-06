import {
  Chart,
  ChartAxis,
  ChartGroup,
  ChartLegendTooltip,
  ChartLine,
  ChartThemeColor,
  createContainer,
} from '@patternfly/react-charts';
import { Alert } from '@patternfly/react-core';
import React from 'react';
import { DateFormat, dateToFormat, getTimeFormatFromTimeRange } from '../date-utils';
import { useRefWidth } from '../hooks/useRefWidth';
import { isMatrixResult, QueryRangeResponse, TimeRange } from '../logs.types';
import { TestIds } from '../test-ids';
import { intervalFromTimeRange, numericTimeRange } from '../time-range';
import { CenteredContainer } from './centered-container';

type MetricsData = { name: string; data: Array<{ name: string; x: number; y: number }> };
type Domain = [number, number];
interface LogsMetricsProps {
  logsData?: QueryRangeResponse;
  timeRange?: TimeRange;
  isLoading?: boolean;
  error?: unknown;
}

const GRAPH_HEIGHT = 250;

const matrixToMetricsData = (
  response?: QueryRangeResponse,
): { data: Array<MetricsData> | undefined; xDomain: Domain; yDomain: Domain } => {
  if (!response) {
    return { data: undefined, xDomain: [0, 1], yDomain: [0, 1] };
  }

  if (!isMatrixResult(response.data)) {
    return { data: undefined, xDomain: [0, 1], yDomain: [0, 1] };
  }

  const values = response.data.result;
  const xDomain: Domain = [Number.MAX_VALUE, Number.MIN_VALUE];
  const yDomain: Domain = [Number.MAX_VALUE, Number.MIN_VALUE];

  const data = values.map((value) => {
    const seriesName = JSON.stringify(value.metric);

    return {
      name: seriesName,
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

        return { x: time, y, name: seriesName };
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
}) => {
  const [containerRef, width] = useRefWidth();
  const [timeRangeValue, setTimeRangeValue] = React.useState(numericTimeRange(timeRange));
  const { data, xDomain, yDomain } = React.useMemo(() => matrixToMetricsData(logsData), [logsData]);

  React.useEffect(() => {
    setTimeRangeValue(numericTimeRange(timeRange));
  }, [timeRange]);

  const legendData = data?.map((series) => ({ childName: series.name, name: series.name }));
  const intervalValue = intervalFromTimeRange(timeRangeValue);

  return (
    <div ref={containerRef} style={{ height: GRAPH_HEIGHT }} data-test={TestIds.LogsMetrics}>
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
        <CenteredContainer>Loading...</CenteredContainer>
      ) : data ? (
        <Chart
          containerComponent={
            <CursorVoronoiContainer
              cursorDimension="x"
              activateData={false}
              labels={({ datum }: { datum: { y: number } }) => datum.y}
              labelComponent={
                <ChartLegendTooltip
                  legendData={legendData}
                  title={(datum: { x: number }) =>
                    dateToFormat(datum.x, getTimeFormatFromTimeRange(timeRangeValue))
                  }
                />
              }
              constrainToVisibleArea
              mouseFollowTooltips
              voronoiPadding={0}
            />
          }
          legendData={data.map((series) => ({ name: series.name }))}
          height={GRAPH_HEIGHT}
          width={width}
          name="alert metrics"
          scale={{ x: 'time', y: 'linear' }}
          themeColor={ChartThemeColor.multiUnordered}
          padding={{
            bottom: 40,
            left: 65,
            right: 10,
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
              )
            }
          />
          <ChartAxis dependentAxis showGrid />
          <ChartGroup>
            {data.map((series) => (
              <ChartLine name={series.name} key={series.name} data={series.data} />
            ))}
          </ChartGroup>
        </Chart>
      ) : (
        <CenteredContainer>
          <Alert variant="danger" isInline isPlain title="Invalid data" />
        </CenteredContainer>
      )}
    </div>
  );
};
