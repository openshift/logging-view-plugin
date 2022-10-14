import { Dropdown, DropdownItem, DropdownToggle, FormGroup } from '@patternfly/react-core';
import React from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TimeRange } from '../logs.types';
import { TestIds } from '../test-ids';
import {
  CUSTOM_TIME_RANGE_KEY,
  formatTimeRange,
  timeOptionKeyFromRange,
  timeRangeFromDuration,
  timeRangeOptions,
} from '../time-range';
import { TimeRangeSelectModal } from './time-range-select-modal';

const DEFAULT_DURATION_KEY = '1h';
const STORED_TIME_RANGE_KEY = 'logging-view-plugin.time-range';

interface TimeRangeDropdownProps {
  value?: TimeRange;
  onChange?: (timeRange: TimeRange) => void;
  isDisabled?: boolean;
}

const getSelectedOptionIndex = ({
  storedTimeRange,
  timeRangeValue,
}: {
  storedTimeRange?: TimeRange | null;
  timeRangeValue?: TimeRange;
}): number => {
  let durationKey: string | undefined;

  if (timeRangeValue) {
    durationKey = timeOptionKeyFromRange(timeRangeValue);
  }

  if (storedTimeRange) {
    durationKey = timeOptionKeyFromRange(storedTimeRange);
  }

  if (!durationKey) {
    durationKey = DEFAULT_DURATION_KEY;
  }

  return timeRangeOptions.findIndex((option) => option.key === durationKey) ?? 1;
};

export const TimeRangeDropdown: React.FC<TimeRangeDropdownProps> = ({
  onChange,
  value,
  isDisabled = false,
}) => {
  const [isTimeRangeModalOpen, setIsTimeRangeModalOpen] = React.useState(false);
  const [storedTimeRange, setStoredTimeRange] = useLocalStorage<TimeRange>(STORED_TIME_RANGE_KEY);

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(
    getSelectedOptionIndex({ storedTimeRange, timeRangeValue: value }),
  );

  React.useEffect(() => {
    setSelectedIndex(getSelectedOptionIndex({ timeRangeValue: value }));
  }, [value]);

  const handleSelectedValue = (index: number) => () => {
    setIsOpen(false);

    const { key } = timeRangeOptions[index];

    if (key === CUSTOM_TIME_RANGE_KEY) {
      setIsTimeRangeModalOpen(true);
    } else {
      setSelectedIndex(index);
      const timeRange = timeRangeFromDuration(timeRangeOptions[index].key);
      onChange?.(timeRange);
      setStoredTimeRange(timeRange);
    }
  };

  const handleCustomRangeSelected = (customRange: TimeRange) => {
    setSelectedIndex(0);
    setIsTimeRangeModalOpen(false);
    onChange?.(customRange);
    setStoredTimeRange(customRange);
  };

  const toggleIsOpen = () => {
    setIsOpen(!isOpen);
  };

  const handleCloseModal = () => {
    setIsTimeRangeModalOpen(false);
  };

  const timeRangeValue = value ?? storedTimeRange ?? undefined;

  return (
    <>
      {isTimeRangeModalOpen && (
        <TimeRangeSelectModal
          onClose={handleCloseModal}
          onSelectRange={handleCustomRangeSelected}
          initialRange={timeRangeValue}
        />
      )}
      <FormGroup fieldId="logs-time-range" data-test={TestIds.TimeRangeDropdown}>
        <Dropdown
          disabled={isDisabled}
          dropdownItems={timeRangeOptions.map(({ key, name }, index) => (
            <DropdownItem componentID={key} onClick={handleSelectedValue(index)} key={key}>
              {name}
            </DropdownItem>
          ))}
          isOpen={isOpen}
          toggle={
            <DropdownToggle isDisabled={isDisabled} onToggle={toggleIsOpen}>
              {timeRangeOptions[selectedIndex].key === CUSTOM_TIME_RANGE_KEY && timeRangeValue
                ? formatTimeRange(timeRangeValue)
                : timeRangeOptions[selectedIndex].name}
            </DropdownToggle>
          }
        />
      </FormGroup>
    </>
  );
};
