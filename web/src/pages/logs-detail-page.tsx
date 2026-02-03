import {
  Button,
  Card,
  CardBody,
  Flex,
  Grid,
  PageSection,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import { availablePodAttributes, filtersFromQuery, queryFromFilters } from '../attribute-filters';
import { CenteredContainer } from '../components/centered-container';
import { Filters } from '../components/filters/filter.types';
import { LogsHistogram } from '../components/logs-histogram';
import { LogsMetrics } from '../components/logs-metrics';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { RefreshIntervalDropdown } from '../components/refresh-interval-dropdown';
import { TimeRangeDropdown } from '../components/time-range-dropdown';
import { ToggleHistogramButton } from '../components/toggle-histogram-button';
import { downloadCSV } from '../download-csv';
import { LogsConfigProvider, useLogsConfig } from '../hooks/LogsConfigProvider';
import { useLogs } from '../hooks/useLogs';
import { useURLState } from '../hooks/useURLState';
import { Direction, isMatrixResult, Schema } from '../logs.types';
import { getStreamLabelsFromSchema, ResourceLabel } from '../parse-resources';
import { TestIds } from '../test-ids';
import { getInitialTenantFromNamespace } from '../value-utils';
import { TimezoneDropdown } from '../components/timezone-dropdown';

/*
This comment creates an entry in the translations catalogue for console extensions

t('plugin__logging-view-plugin~Aggregated Logs')

*/

interface LogsDetailPageProps {
  ns?: string;
  name?: string;
}

const LogsDetailPage: React.FC<LogsDetailPageProps> = ({
  ns: namespaceFromProps,
  name: podNameFromProps,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const { name: podnameFromParams, ns: namespaceFromParams } =
    useParams<{ name: string; ns: string }>();
  const namespace = namespaceFromParams || namespaceFromProps;
  const podname = podnameFromParams || podNameFromProps;
  const [isHistogramVisible, setIsHistogramVisible] = React.useState(false);

  const { config, configLoaded } = useLogsConfig();

  const {
    isLoadingLogsData,
    isLoadingMoreLogsData,
    isStreaming,
    logsData,
    logsError,
    getLogs,
    getMoreLogs,
    hasMoreLogsData,
    toggleStreaming,
    getVolume,
    volumeData,
    isLoadingVolumeData,
    volumeError,
    showVolumeGraph,
    getHistogram,
    histogramData,
    isLoadingHistogramData,
    histogramError,
  } = useLogs();

  const {
    initialQuery,
    query,
    setQueryInURL,
    schema,
    setSchemaInURL,
    areResourcesShown,
    setShowResourcesInURL,
    areStatsShown,
    setShowStatsInURL,
    filters,
    setFilters,
    setTimeRangeInURL,
    interval,
    timeRange,
    direction,
    setDirectionInURL,
    timezone,
    setTimezoneInURL,
    attributes,
  } = useURLState({
    getDefaultQuery: ({ schema: s }) => {
      const labelMatchers = getStreamLabelsFromSchema(s);
      const podLabel = labelMatchers[ResourceLabel.Pod];

      return `{ ${podLabel} = "${podname}" }${s == Schema.viaq ? ' | json' : ''}`;
    },
    getAttributes: ({ config: c, schema: s }) => {
      if (namespace && podname) {
        return availablePodAttributes(namespace, podname, c, s);
      }
    },
    attributesDependencies: [namespace, podname],
  });

  const initialTenant = getInitialTenantFromNamespace(namespace);
  const tenant = React.useRef(initialTenant);

  const handleToggleStreaming = () => {
    toggleStreaming({ query, schema });
  };

  const handleLoadMoreData = (lastTimestamp: number) => {
    if (!isLoadingMoreLogsData) {
      getMoreLogs({ lastTimestamp, query, namespace, direction, schema });
    }
  };

  const handleSortByDate = (directionValue?: Direction) => {
    setDirectionInURL(directionValue);
  };

  const runQuery = () => {
    getLogs({ query, tenant: tenant.current, namespace, timeRange, direction, schema });

    if (isHistogramVisible) {
      getHistogram({ query, tenant: tenant.current, namespace, timeRange, schema });
    }
  };

  const runVolume = () => {
    getVolume({ query, tenant: tenant.current, namespace, timeRange, schema });
  };

  const handleFiltersChange = (selectedFilters?: Filters) => {
    setFilters(selectedFilters);

    if (!selectedFilters || Object.keys(selectedFilters).length === 0) {
      setQueryInURL(initialQuery);
    } else {
      const updatedQuery = queryFromFilters({
        existingQuery: query,
        filters: selectedFilters,
        attributes,
        schema,
      });
      setQueryInURL(updatedQuery);
    }
  };

  const handleQueryChange = (queryFromInput: string) => {
    setQueryInURL(queryFromInput);

    const updatedFilters = filtersFromQuery({
      query: queryFromInput,
      attributes,
      schema,
    });

    setFilters(updatedFilters);
  };

  React.useEffect(() => {
    if (!configLoaded) {
      return;
    }

    runQuery();
  }, [timeRange, isHistogramVisible, direction, configLoaded]);

  const isQueryEmpty = query === '';

  const resultIsMetric = isMatrixResult(logsData?.data);

  React.useEffect(() => {
    if (resultIsMetric) {
      setIsHistogramVisible(false);
    }
  }, [resultIsMetric]);

  return (
    <PageSection>
      <Grid hasGutter>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <Title headingLevel="h1" size="lg">
            {t('Logs')}
          </Title>
          <Flex>
            <ToggleHistogramButton
              isToggled={isHistogramVisible}
              onToggle={() => setIsHistogramVisible(!isHistogramVisible)}
              data-test={TestIds.ToggleHistogramButton}
              isDisabled={resultIsMetric}
            />
            <TimeRangeDropdown
              value={timeRange}
              onChange={setTimeRangeInURL}
              isDisabled={isQueryEmpty}
              timezone={timezone}
            />
            {config.showTimezoneSelector && (
              <TimezoneDropdown
                value={timezone}
                onChange={setTimezoneInURL}
                isDisabled={isQueryEmpty}
              />
            )}
            <RefreshIntervalDropdown onRefresh={runQuery} isDisabled={isQueryEmpty} />
            <Tooltip content={<div>Refresh</div>}>
              <Button
                onClick={runQuery}
                aria-label="Refresh"
                variant="secondary"
                data-test={TestIds.SyncButton}
              >
                <SyncAltIcon />
              </Button>
            </Tooltip>
          </Flex>
        </Flex>

        {isHistogramVisible && !resultIsMetric && (
          <LogsHistogram
            histogramData={histogramData}
            timeRange={timeRange}
            interval={interval}
            isLoading={isLoadingHistogramData}
            error={histogramError}
            onChangeTimeRange={setTimeRangeInURL}
            timezone={timezone}
          />
        )}

        <LogsToolbar
          query={query}
          onQueryChange={handleQueryChange}
          onQueryRun={runQuery}
          onVolumeRun={runVolume}
          isStreaming={isStreaming}
          onStreamingToggle={handleToggleStreaming}
          showResources={areResourcesShown}
          onShowResourcesToggle={setShowResourcesInURL}
          showStats={areStatsShown}
          onShowStatsToggle={setShowStatsInURL}
          enableStreaming
          enableTenantDropdown={false}
          isDisabled={isQueryEmpty}
          attributeList={attributes}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onDownloadCSV={() => downloadCSV(logsData)}
          schema={schema}
          onSchemaSelect={setSchemaInURL}
        />

        {isLoadingLogsData ? (
          <CenteredContainer>{t('Loading...')}</CenteredContainer>
        ) : showVolumeGraph ? (
          <Card>
            <CardBody>
              <LogsMetrics
                logsData={volumeData}
                timeRange={timeRange}
                isLoading={isLoadingVolumeData}
                error={volumeError}
                height={350}
                timezone={timezone}
                displayLegendTable
              />
            </CardBody>
          </Card>
        ) : resultIsMetric ? (
          <Card>
            <CardBody>
              <LogsMetrics
                logsData={logsData}
                timeRange={timeRange}
                isLoading={isLoadingLogsData}
                error={logsError}
                height={350}
                timezone={timezone}
                displayLegendTable
              />
            </CardBody>
          </Card>
        ) : (
          <LogsTable
            logsData={logsData}
            isStreaming={isStreaming}
            onLoadMore={handleLoadMoreData}
            onSortByDate={handleSortByDate}
            isLoading={isLoadingLogsData}
            isLoadingMore={isLoadingMoreLogsData}
            hasMoreLogsData={hasMoreLogsData}
            showResources={areResourcesShown}
            showStats={areStatsShown}
            direction={direction}
            error={logsError}
            timezone={timezone}
          />
        )}
      </Grid>
    </PageSection>
  );
};

const LogsDetailPageWrapper: React.FC<LogsDetailPageProps> = (props) => {
  return (
    <LogsConfigProvider>
      <LogsDetailPage {...props} />
    </LogsConfigProvider>
  );
};

export default LogsDetailPageWrapper;
