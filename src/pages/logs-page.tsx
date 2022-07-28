import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  Flex,
  FormGroup,
  Grid,
  PageSection,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { useHistory, useLocation } from 'react-router';
import { LogsToolbar } from '../components/logs-toolbar';
import { LogsHistogram } from '../components/logs-histogram';
import { LogsTable } from '../components/logs-table';
import { useLogs } from '../hooks/useLogs';
import { useQueryParams } from '../hooks/useQueryParams';
import { isSeverity, Severity } from '../severity';
import { TestIds } from '../test-ids';
import { timeRangeOptions } from '../time-range-options';

const DEFAULT_TIME_RANGE = '1h';

const refreshIntervalOptions = [
  { key: 'OFF_KEY', name: 'Refresh off', delay: 0 },
  { key: '15s', name: '15 seconds', delay: 15 * 1000 },
  { key: '30s', name: '30 seconds', delay: 30 * 1000 },
  { key: '1m', name: '1 minute', delay: 60 * 1000 },
  { key: '5m', name: '5 minutes', delay: 5 * 60 * 1000 },
  { key: '15m', name: '15 minutes', delay: 15 * 60 * 1000 },
  { key: '30m', name: '30 minutes', delay: 30 * 60 * 1000 },
  { key: '1h', name: '1 hour', delay: 60 * 60 * 1000 },
  { key: '2h', name: '2 hours', delay: 2 * 60 * 60 * 1000 },
  { key: '1d', name: '1 day', delay: 24 * 60 * 60 * 1000 },
];

interface RefreshIntervalDropdownProps {
  onRefresh?: () => void;
}

const RefreshIntervalDropdown: React.FC<RefreshIntervalDropdownProps> = ({
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
  const [delay, setDelay] = React.useState<number>(0);
  const timer = React.useRef<NodeJS.Timer | null>(null);

  const clearTimer = () => {
    if (timer) {
      clearInterval(timer.current);
    }
  };

  const handleSelectedValue = (index: number) => () => {
    setIsOpen(false);
    setSelectedIndex(index);
    const selectedDelay = refreshIntervalOptions[index].delay;
    setDelay(selectedDelay);
  };

  const restartTimer = (callRefreshImmediately = true) => {
    clearTimer();

    if (delay !== 0) {
      if (callRefreshImmediately) {
        onRefresh?.();
      }
      timer.current = setInterval(() => onRefresh?.(), delay);
    }

    return () => clearTimer();
  };

  React.useEffect(() => restartTimer(), [delay]);

  // Avoid calling refresh immediately when onRefresh callback has changed
  React.useEffect(() => restartTimer(false), [onRefresh]);

  const toggleIsOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <FormGroup
      fieldId="logs-refresh-interval"
      data-test={TestIds.RefreshIntervalDropdown}
    >
      <Dropdown
        dropdownItems={refreshIntervalOptions.map(({ key, name }, index) => (
          <DropdownItem
            componentID={key}
            onClick={handleSelectedValue(index)}
            key={key}
          >
            {name}
          </DropdownItem>
        ))}
        isOpen={isOpen}
        toggle={
          <DropdownToggle onToggle={toggleIsOpen}>
            {refreshIntervalOptions[selectedIndex].name}
          </DropdownToggle>
        }
      />
    </FormGroup>
  );
};

interface TimeRangeDropdownProps {
  initialValue?: string;
  onChange?: (offset: number) => void;
}

const TimeRangeDropdown: React.FC<TimeRangeDropdownProps> = ({
  onChange,
  initialValue,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(
    timeRangeOptions.findIndex((option) => option.key === initialValue) ?? 1,
  );

  const handleSelectedValue = (index: number) => () => {
    setIsOpen(false);
    setSelectedIndex(index);

    const span = timeRangeOptions[index].span;
    onChange?.(span);
  };

  const toggleIsOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <FormGroup fieldId="logs-time-range" data-test={TestIds.TimeRangeDropdown}>
      <Dropdown
        dropdownItems={timeRangeOptions.map(({ key, name }, index) => (
          <DropdownItem
            componentID={key}
            onClick={handleSelectedValue(index)}
            key={key}
          >
            {name}
          </DropdownItem>
        ))}
        isOpen={isOpen}
        toggle={
          <DropdownToggle onToggle={toggleIsOpen}>
            {timeRangeOptions[selectedIndex].name}
          </DropdownToggle>
        }
      />
    </FormGroup>
  );
};

const QUERY_PARAM_KEY = 'q';
const TENANT_PARAM_KEY = 'tenant';
const SEVERITY_FILTER_PARAM_KEY = 'severity';
const DEFAULT_QUERY = '{ kubernetes_host =~ ".+" }';
const DEFAULT_TENANT = 'application';

const severityFiltersFromParams = (params: string | null): Set<Severity> => {
  const severityFilters: Array<Severity> =
    params
      ?.split(',')
      .map((s) => s.trim())
      .filter(isSeverity) ?? [];

  return severityFilters.length > 0 ? new Set(severityFilters) : new Set();
};

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

  const runQuery = (
    queryToRun?: string,
    severityToConsider?: Set<Severity>,
    tenantToConsider?: string,
  ) => {
    getLogs({
      query: queryToRun ?? query,
      severityFilter: severityToConsider ?? severityFilter,
      tenant: tenantToConsider ?? tenant,
    });
    getHistogram({
      query: queryToRun ?? query,
      severityFilter: severityToConsider ?? severityFilter,
      tenant: tenantToConsider ?? tenant,
    });
  };

  const handleRefreshClick = () => {
    runQuery();
  };

  React.useEffect(() => {
    return history.listen((location) => {
      const urlParams = new URLSearchParams(location.search);
      const newQuery = urlParams.get(QUERY_PARAM_KEY) ?? DEFAULT_QUERY;
      const newTenant = urlParams.get(TENANT_PARAM_KEY) ?? DEFAULT_TENANT;
      const newSeverityFilter = severityFiltersFromParams(
        urlParams.get(SEVERITY_FILTER_PARAM_KEY),
      );

      setQuery(newQuery);
      setTenant(newTenant);
      setSeverityFilter(newSeverityFilter);

      runQuery(newQuery, newSeverityFilter, newTenant);
    });
  }, [history]);

  React.useEffect(() => {
    runQuery();
  }, []);

  const setTenantInURL = (tenant: string) => {
    queryParams.set(TENANT_PARAM_KEY, tenant);
    history.push(`${location.pathname}?${queryParams.toString()}`);
  };

  return (
    <PageSection>
      <Grid hasGutter>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <Title headingLevel="h1" size="lg">
            Logs
          </Title>
          <Flex>
            <TimeRangeDropdown
              initialValue={DEFAULT_TIME_RANGE}
              onChange={setTimeSpan}
            />
            <RefreshIntervalDropdown onRefresh={runQuery} />
            <Tooltip content={<div>Refresh</div>}>
              <Button
                onClick={handleRefreshClick}
                aria-label="Refresh"
                variant="primary"
                data-test={TestIds.SyncButton}
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
          />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsPage;
