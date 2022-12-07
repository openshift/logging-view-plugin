import { Button, Flex, Grid, PageSection, Title, Tooltip } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { useParams } from 'react-router';
import { availablePodAttributes, filtersFromQuery, queryFromFilters } from '../attribute-filters';
import { AttributeList, Filters } from '../components/filters/filter.types';
import { LogsHistogram } from '../components/logs-histogram';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { RefreshIntervalDropdown } from '../components/refresh-interval-dropdown';
import { TimeRangeDropdown } from '../components/time-range-dropdown';
import { ToggleHistogramButton } from '../components/toggle-histogram-button';
import { useLogs } from '../hooks/useLogs';
import { useURLState } from '../hooks/useURLState';
import { TestIds } from '../test-ids';

const DEFAULT_TENANT = 'application';

const getInitialTenantFromNamespace = (namespace?: string): string => {
  if (namespace && /^openshift-|^openshift$|^default$|^kube-/.test(namespace)) {
    return 'infrastructure';
  }

  return DEFAULT_TENANT;
};

const LogsDetailPage: React.FunctionComponent = () => {
  const { name: podname, ns: namespace } = useParams<{ name: string; ns: string }>();
  const defaultQuery = `{ kubernetes_pod_name = "${podname}" } | json`;
  const [isHistogramVisible, setIsHistogramVisible] = React.useState(false);

  const attributesForPod: AttributeList = React.useMemo(
    () => availablePodAttributes(namespace, podname),
    [podname],
  );

  const {
    query,
    setQueryInURL,
    areResourcesShown,
    setShowResourcesInURL,
    filters,
    setFilters,
    setTimeRangeInURL,
    interval,
    timeRange,
  } = useURLState({
    defaultQuery,
    attributes: attributesForPod,
  });
  const initialTenant = getInitialTenantFromNamespace(namespace);
  const tenant = React.useRef(initialTenant);

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
    getHistogram,
    histogramData,
    isLoadingHistogramData,
    histogramError,
  } = useLogs();

  const handleToggleStreaming = () => {
    toggleStreaming({ query });
  };

  const handleLoadMoreData = (lastTimestamp: number) => {
    if (!isLoadingMoreLogsData) {
      getMoreLogs({ lastTimestamp, query });
    }
  };

  const runQuery = () => {
    getLogs({ query, tenant: tenant.current, namespace, timeRange });

    if (isHistogramVisible) {
      getHistogram({ query, tenant: tenant.current, namespace, timeRange });
    }
  };

  const handleFiltersChange = (filters?: Filters) => {
    setFilters(filters);

    if (!filters || Object.keys(filters).length === 0) {
      setQueryInURL(defaultQuery);
    } else {
      const updatedQuery = queryFromFilters({
        existingQuery: query,
        filters,
        attributes: attributesForPod,
      });
      setQueryInURL(updatedQuery);
    }
  };

  const handleQueryChange = (queryFromInput: string) => {
    setQueryInURL(queryFromInput);

    const updatedFilters = filtersFromQuery({
      query: queryFromInput,
      attributes: attributesForPod,
    });

    setFilters(updatedFilters);
  };

  React.useEffect(() => {
    runQuery();
  }, [timeRange, isHistogramVisible]);

  const isQueryEmpty = query === '';

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
          isStreaming={isStreaming}
          onLoadMore={handleLoadMoreData}
          isLoading={isLoadingLogsData}
          isLoadingMore={isLoadingMoreLogsData}
          hasMoreLogsData={hasMoreLogsData}
          error={logsError}
        >
          <LogsToolbar
            query={query}
            onQueryChange={handleQueryChange}
            onQueryRun={runQuery}
            isStreaming={isStreaming}
            onStreamingToggle={handleToggleStreaming}
            showResources={areResourcesShown}
            onShowResourcesToggle={setShowResourcesInURL}
            enableStreaming
            enableTenantDropdown={false}
            isDisabled={isQueryEmpty}
            attributeList={attributesForPod}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsDetailPage;
