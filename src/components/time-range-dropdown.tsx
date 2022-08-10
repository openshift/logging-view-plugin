import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
  FormGroup,
} from '@patternfly/react-core';
import React from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TestIds } from '../test-ids';
import { timeRangeOptions } from '../time-range-options';

const DEFAULT_TIME_RANGE = '1h';
const STORED_TIME_RANGE_KEY = 'logging-view-plugin.time-range';

interface TimeRangeDropdownProps {
  initialValue?: string;
  onChange?: (offset: number) => void;
  isDisabled?: boolean;
}

export const TimeRangeDropdown: React.FC<TimeRangeDropdownProps> = ({
  onChange,
  initialValue = DEFAULT_TIME_RANGE,
  isDisabled = false,
}) => {
  const [storedTimeRange, setStoredTimeRange] = useLocalStorage(
    STORED_TIME_RANGE_KEY,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(
    [
      timeRangeOptions.findIndex((option) => option.key === storedTimeRange),
      timeRangeOptions.findIndex((option) => option.key === initialValue),
      1,
    ].filter((index) => index >= 0)[0],
  );

  const handleSelectedValue = (index: number) => () => {
    setIsOpen(false);
    setSelectedIndex(index);

    const span = timeRangeOptions[index].span;
    onChange?.(span);
    setStoredTimeRange(timeRangeOptions[index].key);
  };

  const toggleIsOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <FormGroup fieldId="logs-time-range" data-test={TestIds.TimeRangeDropdown}>
      <Dropdown
        disabled={isDisabled}
        dropdownItems={timeRangeOptions.map(({ key, name }, index) => (
          <DropdownItem
            componentID={key}
            onClick={handleSelectedValue(index)}
            key={key}
          >
            {name}
          </DropdownItem>
        ))}
        isOpen={isOpen}
        toggle={
          <DropdownToggle isDisabled={isDisabled} onToggle={toggleIsOpen}>
            {timeRangeOptions[selectedIndex].name}
          </DropdownToggle>
        }
      />
    </FormGroup>
  );
};
