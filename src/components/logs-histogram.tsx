import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartLegendTooltip,
  ChartLegendTooltipProps,
  ChartStack,
  ChartVoronoiContainer,
  getResizeObserver,
} from '@patternfly/react-charts';
import { Alert, Card, CardBody } from '@patternfly/react-core';
import * as React from 'react';
import { TestIds } from '../test-ids';
import { DateFormat, dateToFormat } from '../date-utils';
import {
  isMatrixResult,
  MetricValue,
  QueryRangeResponse,
  TimeRange,
} from '../logs.types';
import { getSeverityColor, Severity, severityAbbreviations } from '../severity';
import { valueWithScalePrefix } from '../value-utils';
import { CenteredContainer } from './centered-container';
import './logs-histogram.css';

const GRAPH_HEIGHT = 130;
const LEFT_PADDING = 50;
const BOTTOM_PADDING = 50;
const TOP_PADDING = 10;

const SORTED_CHART_GROUPS: Array<Severity> = [
  'critical',
  'error',
  'warning',
  'debug',
  'info',
  'trace',
  'unknown',
];

type ChartData = {
  x: number;
  y: number;
  name: string;
  time: string;
  label: string;
};

type HistogramChartData = Record<Severity, Array<ChartData>>;
type HistogramData = Record<Severity, Array<MetricValue>>;

interface LogHistogramProps {
  histogramData?: QueryRangeResponse;
  timeRange: TimeRange;
  interval?: number;
  isLoading?: boolean;
  error?: unknown;
}

const resultHasAbreviation = (
  result: Record<string, string>,
  abbreviation: Array<string>,
): boolean => result.level && abbreviation.includes(result.level);

const aggregateMetricsLogData = (
  response?: QueryRangeResponse,
): HistogramData => {
  const histogramData: HistogramData = {
    critical: [],
    error: [],
    warning: [],
    info: [],
    debug: [],
    trace: [],
    unknown: [],
  };

  if (isMatrixResult(response?.data)) {
    for (const logData of response.data.result) {
      let logDataIngroup = false;
      for (const [group, abbreviations] of Object.entries(
        severityAbbreviations,
      )) {
        if (resultHasAbreviation(logData.metric, abbreviations)) {
          histogramData[group as Severity].push(...logData.values);
          logDataIngroup = true;
          break;
        }
      }

      if (!logDataIngroup) {
        histogramData.unknown.push(...logData.values);
      }
    }
  }

  return histogramData;
};

const metricValueToChartData = (
  group: Severity,
  value: Array<MetricValue>,
  interval: number,
): Array<ChartData> =>
  value.map((metric) => {
    const time = parseFloat(String(metric[0])) * 1000;
    const formattedTime = dateToFormat(
      time,
      interval < 60 * 1000 ? DateFormat.TimeMed : DateFormat.TimeShort,
    );

    return {
      x: time,
      y: parseInt(String(metric[1]), 10),
      name: group,
      time: formattedTime,
      label: `${formattedTime} ${group}: ${metric[1]}`,
    };
  });

const getChartsData = (
  data: HistogramData,
  interval: number,
): HistogramChartData => {
  const charts: HistogramChartData = {} as HistogramChartData;

  Object.keys(data).forEach((group: Severity) => {
    charts[group] = metricValueToChartData(group, data[group], interval);
  });

  return charts;
};

const tickCountFromTimeRange = (
  timeRange: TimeRange,
  interval: number,
): number => Math.ceil((timeRange.end - timeRange.start) / interval);

const HistogramTooltip: React.FC<ChartLegendTooltipProps> = ({ ...props }) => {
  const {
    center: { x },
    height,
  } = props;

  if (x === undefined && height === undefined) {
    return null;
  }

  return (
    <>
      <ChartLegendTooltip
        {...props}
        title={(datum: ChartData) => datum.time}
        constrainToVisibleArea
      />
      <line
        className="co-logs-histogram__tooltip-line"
        x1={x}
        x2={x}
        y1={TOP_PADDING}
        y2={height - BOTTOM_PADDING}
      />
    </>
  );
};

export const LogsHistogram: React.FC<LogHistogramProps> = ({
  histogramData,
  timeRange,
  isLoading,
  error,
  interval = 60 * 1000,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number>(0);

  const handleResize = () => {
    if (containerRef.current?.clientWidth) {
      setWidth(containerRef.current.clientWidth);
    }
  };

  React.useEffect(() => {
    const observer = containerRef.current
      ? getResizeObserver(containerRef.current, handleResize)
      : undefined;
    return () => observer?.();
  }, []);

  const groupsCharts = React.useMemo(() => {
    if (!histogramData || histogramData.data.result.length === 0) {
      return { ticks: [], charts: null, availableGroups: [] };
    }

    const data = aggregateMetricsLogData(histogramData);
    const chartsData = getChartsData(data, interval);

    const tickCount = tickCountFromTimeRange(timeRange, interval);

    const availableGroups = SORTED_CHART_GROUPS.filter(
      (group: Severity) =>
        chartsData && chartsData[group] && chartsData[group].length > 0,
    );

    const charts = availableGroups.map((group: Severity, index: number) => (
      <ChartBar
        key={`${group}-${index}`}
        data={chartsData[group]}
        name={group}
        barWidth={(width / tickCount) * 0.8}
        style={{ data: { fill: getSeverityColor(group) } }}
        labelComponent={<g />}
      />
    ));

    return {
      charts,
      availableGroups,
    };
  }, [histogramData, timeRange, interval, width]);

  const legendData = React.useMemo(
    () =>
      groupsCharts.availableGroups.map((group) => ({
        name: group,
        childName: group,
        symbol: { fill: getSeverityColor(group) },
      })),
    [groupsCharts.availableGroups],
  );

  const dataIsEmpty = histogramData?.data.result.length === 0;

  return (
    <Card data-test={TestIds.LogsHistogram}>
      <CardBody>
        <div ref={containerRef} style={{ height: GRAPH_HEIGHT }}>
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
          ) : dataIsEmpty ? (
            <CenteredContainer>
              <Alert
                variant="warning"
                isInline
                isPlain
                title="No datapoints found"
              />
            </CenteredContainer>
          ) : histogramData ? (
            <Chart
              height={GRAPH_HEIGHT}
              padding={{
                top: TOP_PADDING,
                bottom: BOTTOM_PADDING,
                left: LEFT_PADDING,
                right: 20,
              }}
              domain={{
                x: [timeRange.start, timeRange.end],
              }}
              scale={{ x: 'time', y: 'linear' }}
              containerComponent={
                <ChartVoronoiContainer
                  activateData={false}
                  labels={({ datum }: { datum: ChartData }) =>
                    `${datum.y !== null ? datum.y : 'no data'}`
                  }
                  labelComponent={<HistogramTooltip legendData={legendData} />}
                  voronoiDimension="x"
                  voronoiPadding={0}
                />
              }
              width={width}
              domainPadding={{ x: 30, y: 10 }}
            >
              <ChartAxis
                tickCount={60}
                fixLabelOverlap
                tickFormat={(tick: number) =>
                  dateToFormat(
                    tick,
                    interval < 60 * 1000
                      ? DateFormat.TimeMed
                      : DateFormat.TimeShort,
                  )
                }
              />
              <ChartAxis
                tickCount={2}
                dependentAxis
                tickFormat={valueWithScalePrefix}
              />
              <ChartStack>{groupsCharts.charts}</ChartStack>
            </Chart>
          ) : (
            <div>No data</div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
