import {
  Button,
  Flex,
  Grid,
  PageSection,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import React from 'react';
import { useHistory, useLocation } from 'react-router';
import { LogsHistogram } from '../components/logs-histogram';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { RefreshIntervalDropdown } from '../components/refresh-interval-dropdown';
import { TimeRangeDropdown } from '../components/time-range-dropdown';
import { useLogs } from '../hooks/useLogs';
import { useQueryParams } from '../hooks/useQueryParams';
import { Severity, severityFiltersFromParams } from '../severity';
import { TestIds } from '../test-ids';

const QUERY_PARAM_KEY = 'q';
const TENANT_PARAM_KEY = 'tenant';
const SEVERITY_FILTER_PARAM_KEY = 'severity';
const DEFAULT_QUERY = '{ log_type =~ ".+" } | json';
const DEFAULT_TENANT = 'application';

const LogsPage: React.FunctionComponent = () => {
  const queryParams = useQueryParams();
  const history = useHistory();
  const location = useLocation();

  const initialQuery = queryParams.get(QUERY_PARAM_KEY) ?? DEFAULT_QUERY;
  const initialTenant = queryParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;
  const initialSeverity = severityFiltersFromParams(
    queryParams.get(SEVERITY_FILTER_PARAM_KEY),
  );
  const [query, setQuery] = React.useState(initialQuery);
  const [showResources, setShowResources] = React.useState(false);
  const [severityFilter, setSeverityFilter] = React.useState(initialSeverity);
  const [tenant, setTenant] = React.useState(initialTenant);

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

  const handleToggleStreaming = () => {
    toggleStreaming({ query, severityFilter });
  };

  const handleLoadMoreData = (lastTimestamp: number) => {
    if (!isLoadingMoreLogsData) {
      getMoreLogs({ lastTimestamp, query, severityFilter });
    }
  };

  const setQueryInURL = () => {
    queryParams.set(QUERY_PARAM_KEY, query);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const setSeverityInURL = (newSeverityFilter: Set<Severity>) => {
    if (newSeverityFilter.size === 0) {
      queryParams.delete(SEVERITY_FILTER_PARAM_KEY);
    } else {
      queryParams.set(
        SEVERITY_FILTER_PARAM_KEY,
        Array.from(newSeverityFilter).join(','),
      );
    }
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const runQuery = ({
    queryValue,
    severityValue,
    tenantValue,
  }: {
    queryValue?: string;
    severityValue?: Set<Severity>;
    tenantValue?: string;
  } = {}) => {
    getLogs({
      query: queryValue ?? query,
      severityFilter: severityValue ?? severityFilter,
      tenant: tenantValue ?? tenant,
    });
    getHistogram({
      query: queryValue ?? query,
      severityFilter: severityValue ?? severityFilter,
      tenant: tenantValue ?? tenant,
    });
  };

  const handleRefreshClick = () => {
    runQuery();
  };

  React.useEffect(() => {
    return history.listen((location) => {
      const urlParams = new URLSearchParams(location.search);
      const queryValue = urlParams.get(QUERY_PARAM_KEY) ?? DEFAULT_QUERY;
      const tenantValue = urlParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;
      const severityValue = severityFiltersFromParams(
        urlParams.get(SEVERITY_FILTER_PARAM_KEY),
      );

      setQuery(queryValue);
      setTenant(tenantValue);
      setSeverityFilter(severityValue);

      runQuery({ queryValue, severityValue, tenantValue });
    });
  }, [history]);

  React.useEffect(() => {
    runQuery();
  }, []);

  const setTenantInURL = (tenant: string) => {
    queryParams.set(TENANT_PARAM_KEY, tenant);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  const isQueryEmpty = query === '';

  return (
    <PageSection>
      <Grid hasGutter>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <Title headingLevel="h1" size="lg">
            Logs
          </Title>
          <Flex>
            <TimeRangeDropdown
              onChange={setTimeSpan}
              isDisabled={isQueryEmpty}
            />
            <RefreshIntervalDropdown
              onRefresh={runQuery}
              isDisabled={isQueryEmpty}
            />
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
          showResources={showResources}
          isStreaming={isStreaming}
          error={logsError}
        >
          <LogsToolbar
            query={query}
            onQueryChange={setQuery}
            onQueryRun={setQueryInURL}
            onTenantSelect={setTenantInURL}
            tenant={tenant}
            severityFilter={severityFilter}
            onSeverityChange={setSeverityInURL}
            isStreaming={isStreaming}
            onStreamingToggle={handleToggleStreaming}
            enableStreaming={config.isStreamingEnabledInDefaultPage}
            showResources={showResources}
            onShowResourcesToggle={setShowResources}
            isDisabled={isQueryEmpty}
          />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsPage;
