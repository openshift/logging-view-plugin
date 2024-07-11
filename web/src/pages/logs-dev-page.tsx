import { Button, Card, CardBody, Flex, Grid, PageSection, Tooltip } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import {
  availableDevConsoleAttributes,
  initialAvailableAttributes,
  filtersFromQuery,
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
import { ToggleHistogramButton } from '../components/toggle-histogram-button';
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

  const {
    query,
    setQueryInURL,
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
  } = useURLState({ attributes: initialAvailableAttributes, defaultTenant: tenant });

  const {
    histogramData,
    histogramError,
    isLoadingLogsData,
    isLoadingMoreLogsData,
    isLoadingHistogramData,
    isStreaming,
    logsData,
    logsError,
    getLogs,
    getMoreLogs,
    hasMoreLogsData,
    getHistogram,
    toggleStreaming,
    config,
  } = useLogs();

  const handleToggleStreaming = () => {
    toggleStreaming({ query });
  };

  const handleLoadMoreData = (lastTimestamp: number) => {
    if (!isLoadingMoreLogsData) {
      getMoreLogs({ lastTimestamp, query });
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
    });

    if (isHistogramVisible) {
      getHistogram({ query: queryToUse ?? query, timeRange, tenant });
    }
  };

  const handleFiltersChange = (selectedFilters?: Filters) => {
    setFilters(selectedFilters);
    updateQuery(selectedFilters, tenant);
  };

  const handleQueryChange = (queryFromInput: string) => {
    setQueryInURL(queryFromInput);

    const updatedFilters = filtersFromQuery({
      query: queryFromInput,
      attributes: initialAvailableAttributes,
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
        existingQuery: defaultQueryFromTenant(selectedTenant),
        filters: { namespace: new Set(namespace ? [namespace] : []) },
        attributes: initialAvailableAttributes,
        tenant: selectedTenant,
      });

      setQueryInURL(updatedQuery);

      return updatedQuery;
    } else {
      const updatedQuery = queryFromFilters({
        existingQuery: query,
        filters: selectedFilters,
        attributes: initialAvailableAttributes,
        tenant: selectedTenant,
      });

      setQueryInURL(updatedQuery);

      return updatedQuery;
    }
  };

  const attributeList = React.useMemo(
    () =>
      namespace
        ? availableDevConsoleAttributes(getInitialTenantFromNamespace(namespace), config)
        : [],
    [namespace, config],
  );

  React.useEffect(() => {
    tenant = getInitialTenantFromNamespace(namespace);

    const queryToUse = updateQuery(filters, tenant);

    runQuery({ queryToUse });
  }, [timeRange, isHistogramVisible, direction]);

  React.useEffect(() => {
    tenant = getInitialTenantFromNamespace(namespace);

    const filtersWithNamespace = filters ?? {};

    filtersWithNamespace['namespace'] = new Set(namespace ? [namespace] : []);
    const queryToUse = updateQuery(filtersWithNamespace, tenant);

    runQuery({ queryToUse });
  }, [namespace]);

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
            />
            <RefreshIntervalDropdown onRefresh={runQuery} isDisabled={isRunQueryDisabled} />
            <Tooltip content={<div>Refresh</div>}>
              <Button
                onClick={handleRefreshClick}
                aria-label="Refresh"
                variant="primary"
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
          />
        )}

        <LogsToolbar
          query={query}
          onQueryChange={handleQueryChange}
          onQueryRun={runQuery}
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
          attributeList={attributeList}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {isLoadingLogsData ? (
          <CenteredContainer>{t('Loading...')}</CenteredContainer>
        ) : resultIsMetric ? (
          <Card>
            <CardBody>
              <LogsMetrics
                logsData={logsData}
                timeRange={timeRange}
                isLoading={isLoadingLogsData}
                error={logsError}
                height={350}
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
          />
        )}
      </Grid>
    </PageSection>
  );
};

export default LogsDevPage;
