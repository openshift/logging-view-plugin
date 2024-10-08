import {
  Action,
  Alert,
  ExtensionHook,
  useActivePerspective,
} from '@openshift-console/dynamic-plugin-sdk';
import { ListIcon } from '@patternfly/react-icons';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { listGoals } from '../korrel8r-client';
import { Korrel8rResponse } from '../korrel8r.types';
import { LogQLQuery } from '../logql-query';
import { useParams } from 'react-router-dom';

type LogActionsExtensionOptions = {
  alert?: Alert;
};

const useLogActionsExtension: ExtensionHook<Array<Action>, LogActionsExtensionOptions> = (
  options,
) => {
  const { t } = useTranslation('plugin__logging-view-plugin');
  const [actions, setActions] = React.useState<Action[]>([]);
  const [perspective] = useActivePerspective();
  const { ns: activeNamespace } = useParams<{ ns: string }>();

  const alertingRuleName = options.alert?.rule.name;

  useEffect(() => {
    if (alertingRuleName) {
      const alertNamespace = options.alert?.labels?.namespace;
      const alertPod = options.alert?.labels?.pod;
      const alertContainer = options.alert?.labels?.container;

      const alertQuery: Record<string, string> = { alertname: alertingRuleName };

      if (alertNamespace) {
        alertQuery.namespace = alertNamespace;
      }

      if (alertPod) {
        alertQuery.pod = alertPod;
      }

      if (alertContainer) {
        alertQuery.container = alertContainer;
      }

      const { request, abort } = listGoals({
        goalsRequest: {
          start: {
            class: 'alert:alert',
            queries: [`alert:alert:${JSON.stringify(alertQuery)}`],
          },
          goals: ['log:application', 'log:audit', 'log:infrastructure'],
        },
      });

      request()
        .then((response: Korrel8rResponse) => {
          response.some((goal) => {
            let tenant: string | undefined;
            if (goal?.class === 'log:application') {
              tenant = 'application';
            } else if (goal?.class === 'log:audit') {
              tenant = 'audit';
            } else if (goal?.class === 'log:infrastructure') {
              tenant = 'infrastructure';
            }

            // Use the first goal query that has results and a logQL query
            const query = goal?.queries?.find((q) => q?.count > 0 && q?.query)?.query;

            if (query && tenant) {
              // Strip korrel8r class off the beginning of the query string
              const logQL = query.replace(/^log:(application|audit|infrastructure):/, '');

              // Add a json pipeline stage to the query
              const parsedQuery = new LogQLQuery(logQL);
              parsedQuery.addPipelineStage({
                operator: '|',
                value: 'json',
              });

              const params = new URLSearchParams();
              params.set('q', parsedQuery.toString());
              params.set('tenant', tenant);
              let href;

              if (perspective === 'dev') {
                const namespaceToUse = alertNamespace || activeNamespace;
                href = `/dev-monitoring/ns/${namespaceToUse}/logs?${params.toString()}`;
              } else {
                href = `/monitoring/logs?${params.toString()}`;
              }

              setActions([
                {
                  id: 'link-to-logs',
                  label: (
                    <>
                      <ListIcon /> {t('See related logs')}
                    </>
                  ),
                  cta: { href },
                },
              ]);

              // Exit early (ignore any remaining goals)
              return true;
            }
          });
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.warn('Error fetching korrel8r goals: ', error);
        });

      return () => {
        abort();
      };
    }
  }, [alertingRuleName]);

  return [actions, true, null];
};

export default useLogActionsExtension;
