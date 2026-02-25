import { Alert, Form, FormAlert, FormGroup, TextArea } from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LogQLQuery } from '../logql-query';
import { TestIds } from '../test-ids';
import { ExecuteQueryButton } from './execute-query-button';
import './logs-query-input.css';

interface LogsQueryInputProps {
  value: string;
  onChange?: (expression: string) => void;
  onRun?: () => void;
  isDisabled?: boolean;
  invalidQueryErrorMessage?: string | null;
  tenant?: string;
}

export const LogsQueryInput: React.FC<LogsQueryInputProps> = ({
  value = '',
  onChange,
  onRun,
  isDisabled,
  invalidQueryErrorMessage,
  tenant,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [internalValue, setInternalValue] = React.useState(value);
  const [isValid, setIsValid] = React.useState(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      (e.ctrlKey || e.shiftKey || e.metaKey) &&
      e.key === 'Enter' &&
      internalValue.trim().length > 0
    ) {
      onRun?.();
    }
  };

  React.useEffect(() => {
    setInternalValue(value);
    const parsedQuery = new LogQLQuery(value);

    // show invalid message only when query is empty for application tenant,
    // audit and infrastructure don't necessarily need a stream selector
    setIsValid(tenant === 'application' ? parsedQuery.streamSelector.length > 0 : true);
  }, [value, tenant]);

  const handleOnChange = (text: string) => {
    setInternalValue(text);
    onChange?.(text);
  };

  const hasError =
    !isValid || (invalidQueryErrorMessage !== undefined && invalidQueryErrorMessage !== null);

  return (
    <div className="lv-plugin__expression-input" data-test={TestIds.LogsQueryInput}>
      <Form className="lv-plugin__expression-input__form">
        {hasError && (
          <FormAlert>
            <Alert
              variant="danger"
              title={
                !isValid
                  ? t(
                      'Invalid log stream selector. Please select a namespace, pod or container as filter.',
                    )
                  : invalidQueryErrorMessage
              }
              aria-live="polite"
              isInline
            />
          </FormAlert>
        )}
        <FormGroup type="string" fieldId="selection">
          <TextArea
            className="lv-plugin__expression-input__searchInput"
            placeholder="LogQL Query"
            value={internalValue}
            onChange={(_event, text: string) => handleOnChange(text)}
            onKeyDown={handleKeyDown}
            aria-label="LogQL Query"
            validated={hasError ? 'error' : undefined}
          />
        </FormGroup>
      </Form>
      {onRun && (
        <ExecuteQueryButton
          onClick={onRun}
          isDisabled={value === undefined || value.length === 0 || isDisabled}
        />
      )}
    </div>
  );
};
