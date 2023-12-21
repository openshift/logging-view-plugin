import { Button } from '@patternfly/react-core';
import React from 'react';
import './toggle-button.css';

export interface ToggleButtonProps {
  isToggled: boolean;
  isDisabled?: boolean;
  onToggle?: (isToggled: boolean) => void;
  toggledIcon?: React.ReactElement;
  untoggledIcon?: React.ReactElement;
  toggledText: string;
  untoggledText: string;
  'data-test'?: string;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({
  isToggled,
  toggledIcon,
  untoggledIcon,
  onToggle,
  toggledText,
  untoggledText,
  isDisabled,
  'data-test': dataTest,
}) => {
  const icon = isToggled ? toggledIcon : untoggledIcon;
  const text = isToggled ? toggledText : untoggledText;

  const handleToggle = () => {
    onToggle?.(!isToggled);
  };

  return (
    <Button
      type="button"
      className="co-logs-toggle-button"
      onClick={handleToggle}
      variant="link"
      data-test={dataTest}
      isDisabled={isDisabled}
    >
      {icon ?? null} {text}
    </Button>
  );
};
