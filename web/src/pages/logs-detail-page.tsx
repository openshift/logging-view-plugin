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
import { Direction, isMatrixResult } from '../logs.types';
import { TestIds } from '../test-ids';
import { getInitialTenantFromNamespace } from '../value-utils';
import { CenteredContainer } from '../components/centered-container';
import { LogsMetrics } from '../components/logs-metrics';

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
  const defaultQuery = `{ kubernetes_pod_name = "${podname}" } | json`;
  const [isHistogramVisible, setIsHistogramVisible] = React.useState(false);

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
    config,
  } = useLogs();

  const attributesForPod: AttributeList = React.useMemo(
    () => (namespace && podname ? availablePodAttributes(namespace, podname, config) : []),
    [podname, config],
  );

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
    interval,
    timeRange,
    direction,
    setDirectionInURL,
  } = useURLState({
    defaultQuery,
    attributes: attributesForPod,
  });
  const initialTenant = getInitialTenantFromNamespace(namespace);
  const tenant = React.useRef(initialTenant);

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

  const runQuery = () => {
    getLogs({ query, tenant: tenant.current, namespace, timeRange, direction });

    if (isHistogramVisible) {
      getHistogram({ query, tenant: tenant.current, namespace, timeRange });
    }
  };

  const handleFiltersChange = (selectedFilters?: Filters) => {
    setFilters(selectedFilters);

    if (!selectedFilters || Object.keys(selectedFilters).length === 0) {
      setQueryInURL(defaultQuery);
    } else {
      const updatedQuery = queryFromFilters({
        existingQuery: query,
        filters: selectedFilters,
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
  }, [timeRange, isHistogramVisible, direction]);

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
            />
            <RefreshIntervalDropdown onRefresh={runQuery} isDisabled={isQueryEmpty} />
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
          isStreaming={isStreaming}
          onStreamingToggle={handleToggleStreaming}
          showResources={areResourcesShown}
          onShowResourcesToggle={setShowResourcesInURL}
          showStats={areStatsShown}
          onShowStatsToggle={setShowStatsInURL}
          enableStreaming
          enableTenantDropdown={false}
          isDisabled={isQueryEmpty}
          attributeList={attributesForPod}
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
          />
        )}
      </Grid>
    </PageSection>
  );
};

export default LogsDetailPage;
