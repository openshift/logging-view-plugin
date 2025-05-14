import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogsConfigProvider, useLogsConfig } from '../../hooks/LogsConfigProvider';
import { useLogs } from '../../hooks/useLogs';
import { Rule, TimeRange } from '../../logs.types';
import { getSchema } from '../../value-utils';
import { LogsMetrics } from '../logs-metrics';
import { TimeRangeDropdown } from '../time-range-dropdown';

interface LogsAlertMetricsProps {
  rule?: Rule;
}

const LOKI_TENANT_LABEL_KEY = 'tenantId';

const LogsAlertMetrics: React.FC<LogsAlertMetricsProps> = ({ rule }) => {
  const { t } = useTranslation('plugin__logging-view-plugin');
  const { getLogs, logsData, logsError, isLoadingLogsData } = useLogs();
  const { config } = useLogsConfig();

  const tenant = rule?.labels?.[config.alertingRuleTenantLabelKey ?? LOKI_TENANT_LABEL_KEY];
  const [timeRange, setTimeRange] = React.useState<TimeRange | undefined>();

  useEffect(() => {
    if (rule?.query && tenant) {
      getLogs({ query: rule.query, timeRange, tenant, schema: getSchema(config.schema) });
    }
  }, [rule?.query, timeRange]);

  const tenantError = !tenant
    ? new Error(
        t('Label {{tenantKey}} is required to display the alert metrics', {
          tenantKey: LOKI_TENANT_LABEL_KEY,
        }),
      )
    : undefined;

  return (
    <div className="lv-plugin__alert-metrics__container">
      <div className="lv-plugin__metrics__header">
        <TimeRangeDropdown value={timeRange} onChange={setTimeRange} />
      </div>
      <LogsMetrics
        logsData={logsData}
        error={logsError || tenantError}
        isLoading={isLoadingLogsData}
        timeRange={timeRange}
      />
    </div>
  );
};

const LogsAlertMetricsWrapper: React.FC<LogsAlertMetricsProps> = (props) => {
  return (
    <LogsConfigProvider>
      <LogsAlertMetrics {...props} />
    </LogsConfigProvider>
  );
};

export default LogsAlertMetricsWrapper;
