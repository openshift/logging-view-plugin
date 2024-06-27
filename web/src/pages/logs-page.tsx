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
import {
  availableAttributes,
  initialAvailableAttributes,
  filtersFromQuery,
  queryFromFilters,
} from '../attribute-filters';
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
import { CenteredContainer } from '../components/centered-container';

const LogsPage: React.FC = () => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [isHistogramVisible, setIsHistogramVisible] = React.useState(false);
  const {
    query,
    setQueryInURL,
    tenant,
    setTenantInURL,
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
  } = useURLState({ attributes: initialAvailableAttributes });

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
    getLogs({ query: queryToUse ?? query, tenant, timeRange, direction });

    if (isHistogramVisible) {
      getHistogram({ query: queryToUse ?? query, tenant, timeRange });
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

  const updateQuery = (selectedFilters?: Filters, selectedTenant?: string): string => {
    if ((!selectedFilters || Object.keys(selectedFilters).length === 0) && !selectedTenant) {
      const defaultQuery = defaultQueryFromTenant();

      setQueryInURL(defaultQuery);

      return defaultQuery;
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
    () => (tenant ? availableAttributes(tenant, config) : []),
    [tenant, config],
  );

  const handleRefreshClick = () => {
    runQuery();
  };

  React.useEffect(() => {
    const queryToUse = updateQuery(filters, tenant);

    runQuery({ queryToUse });
  }, [timeRange, isHistogramVisible, direction, tenant]);

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
          onTenantSelect={setTenantInURL}
          tenant={tenant}
          isStreaming={isStreaming}
          onStreamingToggle={handleToggleStreaming}
          enableStreaming={config.isStreamingEnabledInDefaultPage}
          showResources={areResourcesShown}
          showStats={areStatsShown}
          onShowResourcesToggle={setShowResourcesInURL}
          onShowStatsToggle={setShowStatsInURL}
          isDisabled={isQueryEmpty}
          attributeList={attributeList}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {isLoadingLogsData ? (
          <CenteredContainer>{t('Loading Stats...')}</CenteredContainer>
        ) : areStatsShown ? (
          <Flex>
            <table>
              <tr>
                <div>Summary</div>
                <tr>
                  Bytes Processed Per Second <td>0 MB/s</td>
                </tr>
                <tr>
                  Execution Time <td>0 s</td>
                </tr>
                <tr>
                  Lines Processed Per Second <td>0</td>
                </tr>
                <tr>
                  Queue Time <td>0 s</td>
                </tr>
                <tr>
                  Total Bytes Processed <td>0 MB/s</td>
                </tr>
                <tr>
                  Total Lines Processed <td>0 </td>
                </tr>
              </tr>
              <div>Ingester</div>
              <tr>
                <tr>
                  Compressed Bytes <td>0 MB</td>
                </tr>
                <tr>
                  Decompressed Bytes <td>0 MB</td>
                </tr>
                <tr>
                  Decompressed Lines <td>0 </td>
                </tr>
                <tr>
                  Head Chunk Bytes <td>0 B</td>
                </tr>
                <tr>
                  Head Chunk Lines <td>0 </td>
                </tr>
                <tr>
                  Total Batches<td>0 </td>
                </tr>
                <tr>
                  Total Chunks Matched <td>0 </td>
                </tr>
                <tr>
                  Total Dupilcated <td>0 </td>
                </tr>
                <tr>
                  Total Lines Sent <td> 0</td>
                </tr>
                <tr>
                  Total Reached <td>0 </td>
                </tr>
              </tr>
              <div>Store</div>
              <tr>
                <tr>
                  Compressed Bytes<td>0 MB</td>
                </tr>
                <tr>
                  Decompressed Bytes<td>0 MB</td>
                </tr>
                <tr>
                  Decompressed Lines<td>0 </td>
                </tr>
                <tr>
                  Chunks Download Time<td>0 s</td>
                </tr>
                <tr>
                  Total Chunks Ref<td>0 </td>
                </tr>
                <tr>
                  Total Chunks Downloaded<td>0 </td>
                </tr>
                <tr>
                  Total Duplicates<td>0 </td>
                </tr>
              </tr>
            </table>
          </Flex>
        ) : null}

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
            showResources={areResourcesShown}
            // Should this be where logic is held?
            showStats={areStatsShown}
            direction={direction}
            isStreaming={isStreaming}
            error={logsError}
          />
        )}
      </Grid>
    </PageSection>
  );
};

export default LogsPage;
