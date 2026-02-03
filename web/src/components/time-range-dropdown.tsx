import {
  Dropdown,
  DropdownItem,
  DropdownList,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
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
import { useTranslation } from 'react-i18next';

const DEFAULT_DURATION_KEY = '1h';
const STORED_TIME_RANGE_KEY = 'logging-view-plugin.time-range';

interface TimeRangeDropdownProps {
  value?: TimeRange;
  onChange?: (timeRange: TimeRange) => void;
  isDisabled?: boolean;
  timezone?: string;
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
  timezone,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

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
          timezone={timezone}
        />
      )}
      <FormGroup fieldId="logs-time-range" data-test={TestIds.TimeRangeDropdown}>
        <Dropdown
          isOpen={isOpen}
          onSelect={() => setIsOpen(false)}
          onOpenChange={(isOpenVal: boolean) => setIsOpen(isOpenVal)}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              isDisabled={isDisabled}
              ref={toggleRef}
              onClick={toggleIsOpen}
              isExpanded={isOpen}
            >
              {timeRangeOptions[selectedIndex].key === CUSTOM_TIME_RANGE_KEY && timeRangeValue
                ? formatTimeRange(timeRangeValue, timezone)
                : timeRangeOptions[selectedIndex].name}
            </MenuToggle>
          )}
        >
          <DropdownList>
            {timeRangeOptions.map(({ key, name }, index) => (
              <DropdownItem ouiaId={key} onClick={handleSelectedValue(index)} key={key}>
                {
                  /*
                    t('plugin__logging-view-plugin~Custom time range')
                    t('plugin__logging-view-plugin~Last 5 minutes')
                    t('plugin__logging-view-plugin~Last 15 minutes')
                    t('plugin__logging-view-plugin~Last 30 minutes')
                    t('plugin__logging-view-plugin~Last 1 hour')
                    t('plugin__logging-view-plugin~Last 2 hours')
                    t('plugin__logging-view-plugin~Last 6 hours')
                    t('plugin__logging-view-plugin~Last 12 hours')
                    t('plugin__logging-view-plugin~Last 1 day')
                    t('plugin__logging-view-plugin~Last 2 days')
                    t('plugin__logging-view-plugin~Last 1 week')
                    t('plugin__logging-view-plugin~Last 2 weeks')
                  */
                  t(`plugin__logging-view-plugin~${name}`)
                }
              </DropdownItem>
            ))}
          </DropdownList>
        </Dropdown>
      </FormGroup>
    </>
  );
};
