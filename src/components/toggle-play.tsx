import { Button } from '@patternfly/react-core';
import { PauseIcon, PlayIcon } from '@patternfly/react-icons';
import * as React from 'react';
import './toggle-play.css';

interface TogglePlayProps {
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
}

export const TogglePlay: React.FC<TogglePlayProps> = ({ onClick, active }) => (
  <Button
    variant="plain"
    className={`co-logs-toggle-play ${
      active ? 'co-logs-toggle-play--active' : ''
    }`}
    onClick={onClick}
    aria-label={active ? 'Pause streaming' : 'Start streaming'}
  >
    {active ? <PauseIcon size="sm" /> : <PlayIcon size="sm" />}
  </Button>
);
