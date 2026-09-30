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
import { capitalize, notUndefined } from '../value-utils';
import { ForbiddenKind, getForbiddenKind } from './error-message-utils';
import './error-message.css';

interface ErrorMessageProps {
  error: unknown | Error;
  hasNamespaceFilter?: boolean;
  tenant?: string;
}

const roleCode = `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: view-application-logs
  namespace: <project-name>
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-logging-application-view
subjects:
- kind: User
  name: <testuser>
  apiGroup: rbac.authorization.k8s.io
`;

const auditRoleCode = `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: view-audit-logs
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-logging-audit-view
subjects:
- kind: User
  name: <testuser>
  apiGroup: rbac.authorization.k8s.io
`;

const queryWithNamespaceCode = `{ kubernetes_namespace_name = "<namespace>"}`;

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

const AuditForbidden: React.FC<{ t: TFunction }> = ({ t }) => (
  <Suggestion>
    <p>{t('You do not have permission to view audit logs.')}</p>
    <p>{t('Ask your administrator to grant you the audit logs role')}:</p>
    <p>
      <CodeBlock>
        <CodeBlockCode id="audit-role-code-content">{auditRoleCode}</CodeBlockCode>
      </CodeBlock>
    </p>
  </Suggestion>
);

const SelectNamespacePrompt: React.FC<{ t: TFunction }> = ({ t }) => (
  <Suggestion>
    <p>
      {t(
        'You may have access to view logs in specific namespaces but not cluster-wide. Use the namespace filter or the query input, in the example below, to scope your query to namespaces you have access to.',
      )}
    </p>
    <p>
      <CodeBlock>
        <CodeBlockCode id="select-namespace-code-content">{queryWithNamespaceCode}</CodeBlockCode>
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
  forbidden: (
    <Suggestion>
      <p>{t('Make sure you have the required role to get application logs in this namespace.')}</p>
      <p>{t('Ask your administrator to grant you this role')}:</p>
      <p>
        <CodeBlock>
          <CodeBlockCode id="code-content">{roleCode}</CodeBlockCode>
        </CodeBlock>
      </p>
    </Suggestion>
  ),
});

type ForbiddenPresentation = {
  errorMessage: string;
  helpText: string | null;
  variant: 'info' | 'warning';
  suggestion: React.ReactElement;
};

const forbiddenPresentation = (
  kind: Exclude<ForbiddenKind, 'none'>,
  t: TFunction,
): ForbiddenPresentation => {
  switch (kind) {
    case 'no-namespace':
      return {
        errorMessage: t('Select a namespace to view logs'),
        helpText: null,
        variant: 'info',
        suggestion: <SelectNamespacePrompt t={t} />,
      };
    case 'audit':
      return {
        errorMessage: 'forbidden',
        helpText: t('Missing permissions to get audit logs'),
        variant: 'warning',
        suggestion: <AuditForbidden t={t} />,
      };
    case 'namespace-selected':
      return {
        errorMessage: 'forbidden',
        helpText: t('Missing permissions to get logs in this namespace'),
        variant: 'warning',
        suggestion: <ForbiddenWithNamespace t={t} />,
      };
  }
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  hasNamespaceFilter,
  tenant,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const status = isFetchError(error) ? error.status : undefined;
  const forbiddenKind = getForbiddenKind(status, hasNamespaceFilter, tenant);
  const forbidden = forbiddenKind !== 'none' ? forbiddenPresentation(forbiddenKind, t) : null;

  let errorMessage = (error as Error).message || String(error);
  let helpText: string | null = t(
    'You may consider the following query changes to avoid this error',
  );
  let variant: 'danger' | 'warning' | 'info' = 'danger';

  if (status === 502) {
    helpText = t('This plugin requires Loki Operator and LokiStack to be running in the cluster');
    errorMessage = 'cannot connect to LokiStack';
  } else if (forbidden) {
    errorMessage = forbidden.errorMessage;
    helpText = forbidden.helpText;
    variant = forbidden.variant;
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

  const hasSuggestions = (suggestions && suggestions.length > 0) || forbidden;

  return (
    <>
      <Alert
        className="co-logs-error_message"
        variant={variant}
        isInline
        isPlain
        title={capitalize(errorMessage)}
      />

      {hasSuggestions ? (
        <TextContent>
          {helpText ? <Text component={TextVariants.p}>{helpText}</Text> : null}

          {forbidden?.suggestion}
          {suggestions}
        </TextContent>
      ) : null}
    </>
  );
};
