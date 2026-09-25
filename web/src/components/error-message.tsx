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
import { getForbiddenKind } from './error-message-utils';
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

const SelectNamespacePrompt: React.FC<{ t: TFunction; schema: Schema }> = ({ t, schema }) => (
  <Suggestion>
    <p>
      {t(
        'You may have access to view logs in specific namespaces but not cluster-wide. Use the namespace filter or the query input, in the example below, to scope your query to namespaces you have access to.',
      )}
    </p>
    <p>
      <CodeBlock>
        <CodeBlockCode id="select-namespace-code-content">
          {queryWithNamespaceCode(schema)}
        </CodeBlockCode>
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
  const forbiddenKind = getForbiddenKind(status, hasNamespaceFilter);
  const isForbidden = forbiddenKind !== 'none';
  // Unscoped 403: prompt to select a namespace instead of the forbidden error (OU-578).
  const isSelectNamespacePrompt = forbiddenKind === 'no-namespace';

  if (status !== undefined) {
    switch (status) {
      case 502:
        title = t('This plugin requires Loki Operator and LokiStack to be running in the cluster');
        errorMessage = 'cannot connect to LokiStack';
        break;
      case 403:
        if (isSelectNamespacePrompt) {
          // Alert title renders from errorMessage, so set the translated string here.
          errorMessage = t('Select a namespace to view logs');
          title = errorMessage;
        } else {
          title = t('Missing permissions to get logs in this namespace');
          errorMessage = 'forbidden';
        }
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
    if (isSelectNamespacePrompt) {
      return <SelectNamespacePrompt t={t} schema={schema} />;
    }
    return <ForbiddenWithNamespace t={t} />;
  }, [isForbidden, isSelectNamespacePrompt, t, schema]);

  const hasSuggestions = (suggestions && suggestions.length > 0) || forbiddenSuggestion;
  // The prompt is informational, not a permission failure.
  const variant = isSelectNamespacePrompt ? 'info' : isForbidden ? 'warning' : 'danger';
  // The prompt's call to action is already in the Alert title; skip the duplicate heading.
  const helpText = isSelectNamespacePrompt ? null : title;

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
          {helpText ? <Text component={TextVariants.p}>{helpText}</Text> : null}

          {forbiddenSuggestion}
          {suggestions}
        </TextContent>
      ) : null}
    </>
  );
};
