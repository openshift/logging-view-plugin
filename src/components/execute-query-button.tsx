import { Button, ButtonProps } from '@patternfly/react-core';
import React from 'react';
import { TestIds } from '../test-ids';

export const ExecuteQueryButton: React.FC<ButtonProps> = ({
  onClick,
  isDisabled,
}) => (
  <Button
    variant="primary"
    data-test={TestIds.ExecuteQueryButton}
    onClick={onClick}
    isDisabled={isDisabled}
  >
    Run Query
  </Button>
);
