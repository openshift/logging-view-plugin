import { Grid, PageSection } from '@patternfly/react-core';
import * as React from 'react';
import { useParams } from 'react-router';
import { Severity } from '../severity';
import { LogsQueryInput } from '../components/logs-query-input';
import { LogsTable } from '../components/logs-table';
import { useLogs } from '../hooks/useLogs';

const LogsDetailPage: React.FunctionComponent = () => {
  const { name: podname } = useParams<{ name: string }>();
  const initialQuery = `{ kubernetes_pod_name = "${podname}" }`;
  const [query, setQuery] = React.useState(initialQuery);
  const [severityFilter, setSeverityFilter] = React.useState<Set<Severity>>(
    new Set(),
  );

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
          severityFilter={severityFilter}
          onStreamingToggle={handleToggleStreaming}
          onSeverityChange={setSeverityFilter}
          onLoadMore={handleLoadMoreData}
          isLoading={isLoadingLogsData}
          isLoadingMore={isLoadingMoreLogsData}
          hasMoreLogsData={hasMoreLogsData}
          error={logsError}
          showStreaming
        >
          <LogsQueryInput value={query} onRun={runQuery} onChange={setQuery} />
        </LogsTable>
      </Grid>
    </PageSection>
  );
};

export default LogsDetailPage;
