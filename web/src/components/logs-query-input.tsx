import { Form, FormGroup, TextArea } from '@patternfly/react-core';
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
}

export const LogsQueryInput: React.FC<LogsQueryInputProps> = ({ value = '', onChange, onRun }) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [internalValue, setInternalValue] = React.useState(value);
  const [isValid, setIsValid] = React.useState(true);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && internalValue.trim().length > 0) {
      onRun?.();
    }
  };

  React.useEffect(() => {
    setInternalValue(value);
    const parsedQuery = new LogQLQuery(value);

    setIsValid(parsedQuery.streamSelector.length > 0);
  }, [value]);

  const handleOnChange = (text: string) => {
    setInternalValue(text);
    onChange?.(text);
  };

  return (
    <div className="co-logs-expression-input" data-test={TestIds.LogsQueryInput}>
      <Form className="co-logs-expression-input__form">
        <FormGroup
          type="string"
          helperTextInvalid={`${t(
            'Invalid log stream selector. Please select a namespace, pod or container as filter, or add a log stream selector like: ',
          )} { log_type =~ ".+" } | json`}
          fieldId="selection"
          validated={!isValid ? 'error' : undefined}
        >
          <TextArea
            className="co-logs-expression-input__searchInput"
            placeholder="LogQL Query"
            value={internalValue}
            onChange={handleOnChange}
            onKeyDown={handleKeyDown}
            aria-label="LogQL Query"
            validated={!isValid ? 'error' : undefined}
          />
        </FormGroup>
      </Form>
      {onRun && (
        <ExecuteQueryButton
          onClick={onRun}
          isDisabled={value === undefined || value.length === 0}
        />
      )}
    </div>
  );
};
