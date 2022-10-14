import { TextArea } from '@patternfly/react-core';
import React from 'react';
import { TestIds } from '../test-ids';
import { ExecuteQueryButton } from './execute-query-button';
import './logs-query-input.css';

interface LogsQueryInputProps {
  value: string;
  onChange?: (expression: string) => void;
  onRun?: () => void;
}

export const LogsQueryInput: React.FC<LogsQueryInputProps> = ({ value = '', onChange, onRun }) => {
  const [internalValue, setInternalValue] = React.useState(value);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRun?.();
    }
  };

  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleOnChange = (text: string) => {
    setInternalValue(text);
    onChange?.(text);
  };

  return (
    <div className="co-logs-expression-input" data-test={TestIds.LogsQueryInput}>
      <TextArea
        className="co-logs-expression-input__searchInput"
        placeholder="LogQL Query"
        value={internalValue}
        onChange={handleOnChange}
        onKeyDown={handleKeyDown}
        aria-label="LogQL Query"
      />
      {onRun && (
        <ExecuteQueryButton
          onClick={onRun}
          isDisabled={value === undefined || value.length === 0}
        />
      )}
    </div>
  );
};
