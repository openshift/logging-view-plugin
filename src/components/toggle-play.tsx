import { Button } from '@patternfly/react-core';
import { PauseIcon, PlayIcon } from '@patternfly/react-icons';
import React from 'react';
import { TestIds } from '../test-ids';
import './toggle-play.css';

interface TogglePlayProps {
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  isDisabled?: boolean;
}

export const TogglePlay: React.FC<TogglePlayProps> = ({
  onClick,
  active,
  isDisabled = false,
}) => (
  <Button
    variant="plain"
    className={`co-logs-toggle-play ${
      active ? 'co-logs-toggle-play--active' : ''
    }`}
    onClick={onClick}
    aria-label={active ? 'Pause streaming' : 'Start streaming'}
    isDisabled={isDisabled}
    data-test={TestIds.ToogleStreamingButton}
  >
    {active ? <PauseIcon size="sm" /> : <PlayIcon size="sm" />}
  </Button>
);
