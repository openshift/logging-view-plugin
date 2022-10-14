import { Grid, PageSection } from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router';
import {
  availablePodAttributes,
  filtersFromQuery,
  queryFromFilters,
} from '../attribute-filters';
import { AttributeList, Filters } from '../components/filters/filter.types';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { useDebounce } from '../hooks/useDebounce';
import { useLogs } from '../hooks/useLogs';
import { useURLState } from '../hooks/useURLState';

const DEFAULT_TENANT = 'application';

const getInitialTenantFromNamespace = (namespace?: string): string => {
  if (namespace && /^openshift-|^openshift$|^default$|^kube-/.test(namespace)) {
    return 'infrastructure';
  }

  return DEFAULT_TENANT;
};

const LogsDetailPage: React.FunctionComponent = () => {
  const { name: podname, ns: namespace } =
    useParams<{ name: string; ns: string }>();
  const defaultQuery = `{ kubernetes_pod_name = "${podname}" } | json`;

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
  } = useURLState({
    defaultQuery,
    attributes: attributesForPod,
  });
  const debouncedInputQuery = useDebounce(query);
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
    getLogs({ query, tenant: tenant.current });
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
  }, [debouncedInputQuery]);

  const isQueryEmpty = query === '';

  return (
    <PageSection>
      <Grid hasGutter>
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
