import { Button, ButtonProps } from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import { TestIds } from '../test-ids';
import { FC } from 'react';

export const ExecuteQueryButton: FC<ButtonProps> = ({ onClick, isDisabled }) => {
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
