import { Grid, PageSection } from '@patternfly/react-core';
import * as React from 'react';
import { useParams } from 'react-router';
import { LogsTable } from '../components/logs-table';
import { LogsToolbar } from '../components/logs-toolbar';
import { useLogs } from '../hooks/useLogs';
import { Severity } from '../severity';

const LogsDetailPage: React.FunctionComponent = () => {
  const { name: podname } = useParams<{ name: string }>();
  const initialQuery = `{ kubernetes_pod_name = "${podname}" } | json`;
  const [query, setQuery] = React.useState(initialQuery);
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

  const runQuery = () => {
    getLogs({ query, severityFilter });
  };

  React.useEffect(() => {
    runQuery();
  }, []);

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
            onSeverityChange={setSeverityFilter}
            isStreaming={isStreaming}
            onStreamingToggle={handleToggleStreaming}
            showResources={showResources}
            onShowResourcesToggle={setShowResources}
            enableStreaming
          />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsDetailPage;
