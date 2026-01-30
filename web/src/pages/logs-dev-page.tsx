import { Button, Card, CardBody, Flex, Grid, PageSection, Tooltip } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom-v5-compat';
import {
  availableDevConsoleAttributes,
  filtersFromQuery,
  initialAvailableAttributes,
  queryFromFilters,
} from '../attribute-filters';
import { CenteredContainer } from '../components/centered-container';
import { Filters } from '../components/filters/filter.types';
import { LogsHistogram } from '../components/logs-histogram';
import { LogsMetrics } from '../components/logs-metrics';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { RefreshIntervalDropdown } from '../components/refresh-interval-dropdown';
import { TimeRangeDropdown } from '../components/time-range-dropdown';
import { TimezoneDropdown } from '../components/timezone-dropdown';
import { ToggleHistogramButton } from '../components/toggle-histogram-button';
import { downloadCSV } from '../download-csv';
import { LogsConfigProvider, useLogsConfig } from '../hooks/LogsConfigProvider';
import { useLogs } from '../hooks/useLogs';
import { defaultQueryFromTenant, useURLState } from '../hooks/useURLState';
import { Direction, isMatrixResult } from '../logs.types';
import { TestIds } from '../test-ids';
import { getInitialTenantFromNamespace } from '../value-utils';

/*
This comment creates an entry in the translations catalogue for console extensions

t('plugin__logging-view-plugin~Logs')

*/

interface LogsDevPageProps {
  ns?: string;
}

const LogsDevPage: React.FC<LogsDevPageProps> = ({ ns: namespaceFromProps }) => {
  const { t } = useTranslation('plugin__logging-view-plugin');
  const { ns: namespaceFromParams } = useParams<{ ns: string }>();
  const namespace = namespaceFromParams || namespaceFromProps;
  const [isHistogramVisible, setIsHistogramVisible] = React.useState(false);
  let tenant = getInitialTenantFromNamespace(namespace);

  const { config, configLoaded } = useLogsConfig();

  const {
    histogramData,
    histogramError,
    isLoadingLogsData,
    isLoadingMoreLogsData,
    isLoadingHistogramData,
    isStreaming,
    logsData,
    logsError,
    volumeData,
    isLoadingVolumeData,
    volumeError,
    showVolumeGraph,
    getLogs,
    getVolume,
    getMoreLogs,
    hasMoreLogsData,
    getHistogram,
    toggleStreaming,
  } = useLogs();

  const {
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
    timeRange,
    interval,
    direction,
    setDirectionInURL,
    timezone,
    setTimezoneInURL,
    attributes,
  } = useURLState({
    defaultTenant: tenant,
    getAttributes: ({ config: c, schema: s }) =>
      availableDevConsoleAttributes(getInitialTenantFromNamespace(namespace), c, s),
    attributesDependencies: [namespace],
  });

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

  const runQuery = ({ queryToUse }: { queryToUse?: string } = {}) => {
    getLogs({
      query: queryToUse ?? query,
      timeRange,
      direction,
      tenant,
      schema,
    });

    if (isHistogramVisible) {
      getHistogram({ query: queryToUse ?? query, timeRange, tenant, schema });
    }
  };

  const runVolume = () => {
    getVolume({ query, tenant, namespace, timeRange, schema });
  };

  const handleFiltersChange = (selectedFilters?: Filters) => {
    setFilters(selectedFilters);
    updateQuery(selectedFilters, tenant);
  };

  const handleQueryChange = (queryFromInput: string) => {
    setQueryInURL(queryFromInput);

    const updatedFilters = filtersFromQuery({
      query: queryFromInput,
      attributes: initialAvailableAttributes(schema),
      schema: schema,
    });

    setFilters(updatedFilters);
  };

  const handleRefreshClick = () => {
    runQuery();
  };

  const updateQuery = (selectedFilters?: Filters, selectedTenant?: string): string => {
    const hasNoSelectedfilters = !selectedFilters || Object.keys(selectedFilters).length === 0;

    if (hasNoSelectedfilters) {
      const updatedQuery = queryFromFilters({
        existingQuery: defaultQueryFromTenant({ tenant: selectedTenant, schema }),
        filters: { namespace: new Set(namespace ? [namespace] : []) },
        attributes: initialAvailableAttributes(schema),
        tenant: selectedTenant,
        schema,
      });

      setQueryInURL(updatedQuery);

      return updatedQuery;
    } else {
      const updatedQuery = queryFromFilters({
        existingQuery: query,
        filters: selectedFilters,
        attributes: initialAvailableAttributes(schema),
        tenant: selectedTenant,
        schema,
      });

      setQueryInURL(updatedQuery);

      return updatedQuery;
    }
  };

  React.useEffect(() => {
    if (!configLoaded) {
      return;
    }

    tenant = getInitialTenantFromNamespace(namespace);

    const queryToUse = updateQuery(filters, tenant);

    runQuery({ queryToUse });
  }, [timeRange, isHistogramVisible, direction, configLoaded]);

  React.useEffect(() => {
    if (!configLoaded) {
      return;
    }

    tenant = getInitialTenantFromNamespace(namespace);

    const filtersWithNamespace = filters ?? {};

    filtersWithNamespace['namespace'] = new Set(namespace ? [namespace] : []);
    const queryToUse = updateQuery(filtersWithNamespace, tenant);

    runQuery({ queryToUse });
  }, [namespace, configLoaded]);

  const isQueryEmpty = query === '';
  const isNamespaceFilterEmpty =
    filters?.['namespace'] === undefined || filters['namespace'].size === 0;
  const isRunQueryDisabled = isQueryEmpty || isNamespaceFilterEmpty;

  const resultIsMetric = isMatrixResult(logsData?.data);

  React.useEffect(() => {
    if (resultIsMetric) {
      setIsHistogramVisible(false);
    }
  }, [resultIsMetric]);

  return (
    <PageSection>
      <Grid hasGutter>
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
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
              isDisabled={isRunQueryDisabled}
              timezone={timezone}
            />
            {config.showTimezoneSelector && (
              <TimezoneDropdown
                value={timezone}
                onChange={setTimezoneInURL}
                isDisabled={isQueryEmpty}
              />
            )}
            <RefreshIntervalDropdown onRefresh={runQuery} isDisabled={isRunQueryDisabled} />
            <Tooltip content={<div>Refresh</div>}>
              <Button
                onClick={handleRefreshClick}
                aria-label="Refresh"
                variant="secondary"
                data-test={TestIds.SyncButton}
                isDisabled={isRunQueryDisabled}
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
          invalidQueryErrorMessage={
            isNamespaceFilterEmpty ? t('Please select a namespace') : undefined
          }
          isStreaming={isStreaming}
          onStreamingToggle={handleToggleStreaming}
          enableStreaming={config.isStreamingEnabledInDefaultPage}
          showResources={areResourcesShown}
          onShowResourcesToggle={setShowResourcesInURL}
          showStats={areStatsShown}
          onShowStatsToggle={setShowStatsInURL}
          enableTenantDropdown={false}
          isDisabled={isRunQueryDisabled}
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
            onLoadMore={handleLoadMoreData}
            onSortByDate={handleSortByDate}
            isLoading={isLoadingLogsData}
            isLoadingMore={isLoadingMoreLogsData}
            hasMoreLogsData={hasMoreLogsData}
            direction={direction}
            showResources={areResourcesShown}
            showStats={areStatsShown}
            isStreaming={isStreaming}
            error={logsError}
            timezone={timezone}
          />
        )}
      </Grid>
    </PageSection>
  );
};

const LogsDevPageWrapper: React.FC<LogsDevPageProps> = (props) => {
  return (
    <LogsConfigProvider>
      <LogsDevPage {...props} />
    </LogsConfigProvider>
  );
};

export default LogsDevPageWrapper;
