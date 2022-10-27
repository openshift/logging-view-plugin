import { Button, Flex, Grid, PageSection, Title, Tooltip } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { useParams } from 'react-router';
import { availableAttributes, filtersFromQuery, queryFromFilters } from '../attribute-filters';
import { Filters } from '../components/filters/filter.types';
import { LogsHistogram } from '../components/logs-histogram';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { RefreshIntervalDropdown } from '../components/refresh-interval-dropdown';
import { TimeRangeDropdown } from '../components/time-range-dropdown';
import { ToggleHistogramButton } from '../components/toggle-histogram-button';
import { useDebounce } from '../hooks/useDebounce';
import { useLogs } from '../hooks/useLogs';
import { useURLState } from '../hooks/useURLState';
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
  } = useURLState({ attributes: availableAttributes });

  const debouncedInputQuery = useDebounce(query);

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

  const runQuery = () => {
    getLogs({ query, namespace, timeRange });

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
  }, [debouncedInputQuery, timeRange, isHistogramVisible]);

  return (
    <PageSection>
      <Grid hasGutter>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <Title headingLevel="h1" size="lg">
            Logs
          </Title>
          <Flex>
            <ToggleHistogramButton
              isToggled={isHistogramVisible}
              onToggle={() => setIsHistogramVisible(!isHistogramVisible)}
              data-test={TestIds.ToggleHistogramButton}
            />
            <TimeRangeDropdown onChange={setTimeRangeInURL} />
            <RefreshIntervalDropdown onRefresh={runQuery} />
            <Tooltip content={<div>Refresh</div>}>
              <Button
                onClick={runQuery}
                aria-label="Refresh"
                variant="primary"
                data-test={TestIds.SyncButton}
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
          />
        )}

        <LogsTable
          logsData={logsData}
          onLoadMore={handleLoadMoreData}
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
            attributeList={availableAttributes}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsDevPage;
