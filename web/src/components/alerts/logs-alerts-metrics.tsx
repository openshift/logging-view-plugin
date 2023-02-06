import { Alert } from '@patternfly/react-core';
import React, { useEffect } from 'react';
import { useLogs } from '../../hooks/useLogs';
import { Rule, TimeRange } from '../../logs.types';
import { CenteredContainer } from '../centered-container';
import { LogsMetrics } from '../logs-metrics';
import { TimeRangeDropdown } from '../time-range-dropdown';
import './logs-alerts-metrics.css';

interface LogsAlertMetricsProps {
  rule?: Rule;
}

const LOKI_TENANT_LABEL_KEY = 'tenantId';

const LogsAlertMetrics: React.FC<LogsAlertMetricsProps> = ({ rule }) => {
  const { getLogs, logsData, logsError, isLoadingLogsData, config } = useLogs();

  const tenant = rule?.labels?.[config.lokiTenanLabelKey ?? LOKI_TENANT_LABEL_KEY];
  const [timeRange, setTimeRange] = React.useState<TimeRange | undefined>();

  useEffect(() => {
    if (rule?.query && tenant) {
      getLogs({ query: rule.query, timeRange, tenant });
    }
  }, [rule?.query, timeRange]);

  return (
    <div className="co-logs-alert-metrics__container">
      <div className="co-logs-metrics__header">
        <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
      </div>
      {tenant ? (
        <LogsMetrics
          logsData={logsData}
          error={logsError}
          isLoading={isLoadingLogsData}
          timeRange={timeRange}
        />
      ) : (
        <CenteredContainer>
          <Alert
            className="co-logs-metrics__error"
            variant="danger"
            isInline
            isPlain
            title={`label '${LOKI_TENANT_LABEL_KEY} is required to display the alert metrics`}
          />
        </CenteredContainer>
      )}
    </div>
  );
};

export default LogsAlertMetrics;
