import { ChartBarIcon, CompressIcon } from '@patternfly/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToggleButton } from './toggle-button';

interface ToggleHistogramButtonProps {
  isToggled: boolean;
  isDisabled?: boolean;
  onToggle?: (isToggled: boolean) => void;
}

export const ToggleHistogramButton: React.FC<ToggleHistogramButtonProps> = (props) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  return (
    <ToggleButton
      toggledIcon={<CompressIcon />}
      untoggledIcon={<ChartBarIcon />}
      toggledText={t('Hide Histogram')}
      untoggledText={t('Show Histogram')}
      {...props}
    />
  );
};
