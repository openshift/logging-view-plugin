import {
  Alert,
  CodeBlock,
  CodeBlockCode,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import React from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { isFetchError } from '../cancellable-fetch';
import { Schema } from '../logs.types';
import { getStreamLabelsFromSchema, ResourceLabel } from '../parse-resources';
import { capitalize, notUndefined } from '../value-utils';
import './error-message.css';

interface ErrorMessageProps {
  error: unknown | Error;
  hasNamespaceFilter?: boolean;
  schema: Schema;
}

const roleCode = `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: view-application-logs
  namespace: <namespace>
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-logging-application-view
subjects:
- kind: User
  name: <testuser>
  apiGroup: rbac.authorization.k8s.io
`;

const queryWithNamespaceCode = (schema: Schema) =>
  `{ ${getStreamLabelsFromSchema(schema)[ResourceLabel.Namespace]} = "<namespace>"}`;

const Suggestion: React.FC = ({ children }) => (
  <Text component={TextVariants.small}>{children}</Text>
);

const ForbiddenWithNamespace: React.FC<{ t: TFunction }> = ({ t }) => (
  <Suggestion>
    <p>{t('You do not have permission to view logs in the selected namespace.')}</p>
    <p>
      {t(
        'Try selecting a different namespace that you have access to, or ask your administrator to grant you the required role',
      )}
      :
    </p>
    <p>
      <CodeBlock>
        <CodeBlockCode id="role-code-content">{roleCode}</CodeBlockCode>
      </CodeBlock>
    </p>
  </Suggestion>
);

const ForbiddenWithoutNamespace: React.FC<{ t: TFunction; schema: Schema }> = ({ t, schema }) => (
  <Suggestion>
    <p>
      <strong>{t('Try selecting a specific namespace')}</strong>
      {' - '}
      {t('you may have access to view logs in specific namespaces but not cluster-wide.')}
    </p>
    <p>
      {t(
        'Use the namespace filter or the query input, in the example below, to scope your query to namespaces you have access to.',
      )}
    </p>
    <p>
      <CodeBlock>
        <CodeBlockCode id="namespace-code-content">{queryWithNamespaceCode(schema)}</CodeBlockCode>
      </CodeBlock>
    </p>
    <p>
      {t(
        'If you still see this error after selecting a namespace, ask your administrator to grant you the required role',
      )}
      :
    </p>
    <p>
      <CodeBlock>
        <CodeBlockCode id="code-content">{roleCode}</CodeBlockCode>
      </CodeBlock>
    </p>
  </Suggestion>
);

const messages: (t: TFunction) => Record<string, React.ReactElement> = (t) => ({
  'max entries limit': (
    <>
      <Suggestion>{t('Select a smaller time range to reduce the number of results')}</Suggestion>
      <Suggestion>
        {t('Select a namespace, pod, or container filter to improve the query performance')}
      </Suggestion>
      <Suggestion>
        {t('Increase Loki &quot;max_entries_limit_per_query&quot; entry in configuration file')}
      </Suggestion>
    </>
  ),
  'deadline exceeded,maximum of series': (
    <>
      <Suggestion>{t('Select a smaller time range to reduce the number of results')}</Suggestion>
      <Suggestion>
        {t('Select a namespace, pod, or container filter to improve the query performance')}
      </Suggestion>
    </>
  ),
  'too many outstanding requests': (
    <>
      <Suggestion>{t('Select a smaller time range to reduce the number of results')}</Suggestion>
      <Suggestion>
        {t('Select a namespace, pod, or container filter to improve the query performance')}
      </Suggestion>
      <Suggestion>
        {t(
          "Ensure Loki config contains 'parallelise_shardable_queries: true' and 'max_outstanding_requests_per_tenant: 2048'",
        )}
      </Suggestion>
    </>
  ),
  'time range exceeds,maximum resolution': (
    <>
      <Suggestion>{t('Reduce the time range to decrease the number of results')}</Suggestion>
      <Suggestion>
        {t('Increase Loki &quot;max_query_length&quot; entry in configuration file')}
      </Suggestion>
    </>
  ),
  'cannot connect to LokiStack': (
    <Suggestion>{t('Make sure you have an instance of LokiStack running')}</Suggestion>
  ),
  'input size too long': (
    <Suggestion>{t('Select a namespace filter to improve the query performance')}</Suggestion>
  ),
});

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  hasNamespaceFilter,
  schema,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  let errorMessage = (error as Error).message || String(error);
  let title = t('You may consider the following query changes to avoid this error');
  const status = isFetchError(error) ? error.status : undefined;
  const isForbidden = status === 403;

  if (status !== undefined) {
    switch (status) {
      case 502:
        title = t('This plugin requires Loki Operator and LokiStack to be running in the cluster');
        errorMessage = 'cannot connect to LokiStack';
        break;
      case 403:
        title = hasNamespaceFilter
          ? t('Missing permissions to get logs in this namespace')
          : t('Missing permissions to get logs');
        errorMessage = 'forbidden';
        break;
    }
  }

  const suggestions = React.useMemo(() => {
    const translatedMessages = messages(t);

    return Object.keys(translatedMessages)
      .map((messageKey) => {
        const errorKeys = messageKey.split(',');
        const hasErrorKey = errorKeys.some((key) => errorMessage.includes(key));
        return hasErrorKey ? translatedMessages[messageKey] : undefined;
      })
      .filter(notUndefined);
  }, [errorMessage, t]);

  const forbiddenSuggestion = React.useMemo(() => {
    if (!isForbidden) return null;
    return hasNamespaceFilter ? (
      <ForbiddenWithNamespace t={t} />
    ) : (
      <ForbiddenWithoutNamespace t={t} schema={schema} />
    );
  }, [isForbidden, hasNamespaceFilter, t, schema]);

  const hasSuggestions = (suggestions && suggestions.length > 0) || forbiddenSuggestion;
  const variant = isForbidden ? 'warning' : 'danger';

  return (
    <>
      <Alert
        className="lv-plugin__error_message"
        variant={variant}
        isInline
        isPlain
        title={capitalize(errorMessage)}
      />

      {hasSuggestions ? (
        <TextContent>
          <Text component={TextVariants.p}>{title}</Text>

          {forbiddenSuggestion}
          {suggestions}
        </TextContent>
      ) : null}
    </>
  );
};
