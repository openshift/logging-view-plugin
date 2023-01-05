import { ChartBarIcon, CompressIcon } from '@patternfly/react-icons';
import React from 'react';
import { ToggleButton } from './toggle-button';

interface ToggleButtonProps {
  isToggled: boolean;
  onToggle?: (isToggled: boolean) => void;
}

export const ToggleHistogramButton: React.FC<ToggleButtonProps> = (props) => (
  <ToggleButton
    toggledIcon={<CompressIcon />}
    untoggledIcon={<ChartBarIcon />}
    toggledText="Hide Histogram"
    untoggledText="Show Histogram"
    {...props}
  />
);
