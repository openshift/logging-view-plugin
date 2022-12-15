import { Button, Flex, Grid, PageSection, Tooltip } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { useParams } from 'react-router';
import {
  availableAttributes,
  availableDevConsoleAttributes,
  filtersFromQuery,
  queryFromFilters,
} from '../attribute-filters';
import { Filters } from '../components/filters/filter.types';
import { LogsHistogram } from '../components/logs-histogram';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { RefreshIntervalDropdown } from '../components/refresh-interval-dropdown';
import { TimeRangeDropdown } from '../components/time-range-dropdown';
import { ToggleHistogramButton } from '../components/toggle-histogram-button';
import { useLogs } from '../hooks/useLogs';
import { useURLState } from '../hooks/useURLState';
import { Direction } from '../logs.types';
import { TestIds } from '../test-ids';

const LogsDevPage: React.FunctionComponent = () => {
  const { ns: namespace } = useParams<{ ns: string }>();
  const [isHistogramVisible, setIsHistogramVisible] = React.useState(false);

  const {
    query,
    setQueryInURL,
    areResourcesShown,
    setShowResourcesInURL,
    filters,
    setFilters,
    setTimeRangeInURL,
    timeRange,
    interval,
    direction,
    setDirectionInURL,
  } = useURLState({ attributes: availableAttributes });

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
    toggleStreaming({ query, namespace });
  };

  const handleLoadMoreData = (lastTimestamp: number) => {
    if (!isLoadingMoreLogsData) {
      getMoreLogs({ lastTimestamp, query, namespace });
    }
  };

  const handleSortByDate = (directionValue?: Direction) => {
    setDirectionInURL(directionValue);
  };

  const runQuery = () => {
    getLogs({ query, namespace, timeRange, direction });

    if (isHistogramVisible) {
      getHistogram({ query, namespace, timeRange });
    }
  };

  const handleFiltersChange = (filters?: Filters) => {
    setFilters(filters);

    const updatedQuery = queryFromFilters({
      existingQuery: query,
      filters,
      attributes: availableAttributes,
    });

    setQueryInURL(updatedQuery);
  };

  const handleQueryChange = (queryFromInput: string) => {
    setQueryInURL(queryFromInput);

    const updatedFilters = filtersFromQuery({
      query: queryFromInput,
      attributes: availableAttributes,
    });

    setFilters(updatedFilters);
  };

  React.useEffect(() => {
    runQuery();
  }, [timeRange, isHistogramVisible, namespace, direction]);

  const isQueryEmpty = query === '';

  return (
    <PageSection>
      <Grid hasGutter>
        <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
          <Flex>
            <ToggleHistogramButton
              isToggled={isHistogramVisible}
              onToggle={() => setIsHistogramVisible(!isHistogramVisible)}
              data-test={TestIds.ToggleHistogramButton}
            />
            <TimeRangeDropdown
              value={timeRange}
              onChange={setTimeRangeInURL}
              isDisabled={isQueryEmpty}
            />
            <RefreshIntervalDropdown onRefresh={runQuery} />
            <Tooltip content={<div>Refresh</div>}>
              <Button
                onClick={runQuery}
                aria-label="Refresh"
                variant="primary"
                data-test={TestIds.SyncButton}
                isDisabled={isQueryEmpty}
              >
                <SyncAltIcon />
              </Button>
            </Tooltip>
          </Flex>
        </Flex>

        {isHistogramVisible && (
          <LogsHistogram
            histogramData={histogramData}
            timeRange={timeRange}
            interval={interval}
            isLoading={isLoadingHistogramData}
            error={histogramError}
            onChangeTimeRange={setTimeRangeInURL}
          />
        )}

        <LogsTable
          logsData={logsData}
          onLoadMore={handleLoadMoreData}
          onSortByDate={handleSortByDate}
          isLoading={isLoadingLogsData}
          isLoadingMore={isLoadingMoreLogsData}
          hasMoreLogsData={hasMoreLogsData}
          showResources={areResourcesShown}
          isStreaming={isStreaming}
          error={logsError}
        >
          <LogsToolbar
            query={query}
            onQueryChange={handleQueryChange}
            onQueryRun={runQuery}
            isStreaming={isStreaming}
            onStreamingToggle={handleToggleStreaming}
            enableStreaming={config.isStreamingEnabledInDefaultPage}
            showResources={areResourcesShown}
            onShowResourcesToggle={setShowResourcesInURL}
            enableTenantDropdown={false}
            isDisabled={isQueryEmpty}
            attributeList={availableDevConsoleAttributes}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsDevPage;
