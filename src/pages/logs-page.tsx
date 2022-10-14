import { Button, Flex, Grid, PageSection, Title, Tooltip } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { availableAttributes, filtersFromQuery, queryFromFilters } from '../attribute-filters';
import { Filters } from '../components/filters/filter.types';
import { LogsHistogram } from '../components/logs-histogram';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { RefreshIntervalDropdown } from '../components/refresh-interval-dropdown';
import { TimeRangeDropdown } from '../components/time-range-dropdown';
import { useDebounce } from '../hooks/useDebounce';
import { useLogs } from '../hooks/useLogs';
import { useURLState } from '../hooks/useURLState';
import { TestIds } from '../test-ids';

const LogsPage: React.FC = () => {
  const {
    query,
    setQueryInURL,
    tenant,
    setTenantInURL,
    areResourcesShown,
    setShowResourcesInURL,
    filters,
    setFilters,
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
    setTimeSpan,
    timeRange,
    interval,
    toggleStreaming,
    config,
  } = useLogs();

  const debouncedInputQuery = useDebounce(query);

  const handleToggleStreaming = () => {
    toggleStreaming({ query });
  };

  const handleLoadMoreData = (lastTimestamp: number) => {
    if (!isLoadingMoreLogsData) {
      getMoreLogs({ lastTimestamp, query });
    }
  };

  const runQuery = ({
    tenantToConsider,
  }: {
    tenantToConsider?: string;
  } = {}) => {
    getLogs({ query, tenant: tenantToConsider ?? tenant });
    getHistogram({ query, tenant: tenantToConsider ?? tenant });
  };

  const handleRefreshClick = () => {
    runQuery();
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

  const handleTenantChange = (newTenant: string) => {
    setTenantInURL(newTenant);
    runQuery({ tenantToConsider: newTenant });
  };

  React.useEffect(() => {
    runQuery();
  }, [debouncedInputQuery]);

  const isQueryEmpty = query === '';

  return (
    <PageSection>
      <Grid hasGutter>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <Title headingLevel="h1" size="lg">
            Logs
          </Title>
          <Flex>
            <TimeRangeDropdown onChange={setTimeSpan} isDisabled={isQueryEmpty} />
            <RefreshIntervalDropdown onRefresh={runQuery} isDisabled={isQueryEmpty} />
            <Tooltip content={<div>Refresh</div>}>
              <Button
                onClick={handleRefreshClick}
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

        <LogsHistogram
          histogramData={histogramData}
          timeRange={timeRange}
          interval={interval}
          isLoading={isLoadingHistogramData}
          error={histogramError}
        />

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
            onTenantSelect={handleTenantChange}
            tenant={tenant}
            isStreaming={isStreaming}
            onStreamingToggle={handleToggleStreaming}
            enableStreaming={config.isStreamingEnabledInDefaultPage}
            showResources={areResourcesShown}
            onShowResourcesToggle={setShowResourcesInURL}
            isDisabled={isQueryEmpty}
            attributeList={availableAttributes}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsPage;
