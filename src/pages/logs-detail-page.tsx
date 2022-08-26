import { Grid, PageSection } from '@patternfly/react-core';
import * as React from 'react';
import { useParams } from 'react-router';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { useLogs } from '../hooks/useLogs';
import { Severity } from '../severity';

const DEFAULT_TENANT = 'application';

const getInitialTenantFromNamespace = (namespace?: string): string => {
  if (/^openshift-|^openshift$|^default$|^kube-/.test(namespace)) {
    return 'infrastructure';
  }

  return DEFAULT_TENANT;
};

const LogsDetailPage: React.FunctionComponent = () => {
  const { name: podname, ns: namespace } =
    useParams<{ name: string; ns: string }>();
  const initialQuery = `{ kubernetes_pod_name = "${podname}" } | json`;
  const initialTenant = getInitialTenantFromNamespace(namespace);
  const [query, setQuery] = React.useState(initialQuery);
  const tenant = React.useRef(initialTenant);
  const [severityFilter, setSeverityFilter] = React.useState<Set<Severity>>(
    new Set(),
  );
  const [showResources, setShowResources] = React.useState(false);

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
    toggleStreaming({ query, severityFilter });
  };

  const handleLoadMoreData = (lastTimestamp: number) => {
    if (!isLoadingMoreLogsData) {
      getMoreLogs({ lastTimestamp, query, severityFilter });
    }
  };

  const runQuery = ({
    severityValue,
  }: {
    severityValue?: Set<Severity>;
  } = {}) => {
    getLogs({
      query,
      severityFilter: severityValue ?? severityFilter,
      tenant: tenant.current,
    });
  };

  React.useEffect(() => {
    runQuery();
  }, []);

  const handleSeverityFilterChange = (severityFilterValue: Set<Severity>) => {
    setSeverityFilter(severityFilterValue);
    runQuery({ severityValue: severityFilterValue });
  };

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
            onQueryChange={setQuery}
            onQueryRun={runQuery}
            severityFilter={severityFilter}
            onSeverityChange={handleSeverityFilterChange}
            isStreaming={isStreaming}
            onStreamingToggle={handleToggleStreaming}
            showResources={showResources}
            onShowResourcesToggle={setShowResources}
            enableStreaming
            enableTenantDropdown={false}
            isDisabled={isQueryEmpty}
          />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsDetailPage;
