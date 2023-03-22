import { Button, ButtonProps } from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TestIds } from '../test-ids';

export const ExecuteQueryButton: React.FC<ButtonProps> = ({ onClick, isDisabled }) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  return (
    <Button
      variant="primary"
      data-test={TestIds.ExecuteQueryButton}
      onClick={onClick}
      isDisabled={isDisabled}
    >
      {t('Run Query')}
    </Button>
  );
};
