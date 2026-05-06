import { ChartBarIcon, CompressIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import { ToggleButton } from './toggle-button';
import { FC } from 'react';

interface ToggleHistogramButtonProps {
  isToggled: boolean;
  isDisabled?: boolean;
  onToggle?: (isToggled: boolean) => void;
}

export const ToggleHistogramButton: FC<ToggleHistogramButtonProps> = (props) => {
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
