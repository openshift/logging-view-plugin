import { Button, Icon } from '@patternfly/react-core';
import { PauseIcon, PlayIcon } from '@patternfly/react-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TestIds } from '../test-ids';
import './toggle-play.css';

interface TogglePlayProps {
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  isDisabled?: boolean;
}

export const TogglePlay: React.FC<TogglePlayProps> = ({ onClick, active, isDisabled = false }) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  return (
    <Button
      icon={
        active ? (
          <Icon size="sm">
            <PauseIcon />
          </Icon>
        ) : (
          <Icon size="sm">
            <PlayIcon />
          </Icon>
        )
      }
      variant="plain"
      className={`co-logs-toggle-play ${active ? 'co-logs-toggle-play--active' : ''}`}
      onClick={onClick}
      aria-label={active ? t('Pause streaming') : t('Start streaming')}
      isDisabled={isDisabled}
      data-test={TestIds.ToogleStreamingButton}
    />
  );
};
