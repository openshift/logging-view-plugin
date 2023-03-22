import { Dropdown, DropdownItem, DropdownToggle, FormGroup } from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TestIds } from '../test-ids';

const STORED_REFRESH_INTERVAL_KEY = 'logging-view-plugin.refresh-interval';

const refreshIntervalOptions = [
  { key: 'OFF_KEY', name: 'Refresh off', delay: 0 },
  { key: '15s', name: '15 seconds', delay: 15 * 1000 },
  { key: '30s', name: '30 seconds', delay: 30 * 1000 },
  { key: '1m', name: '1 minute', delay: 60 * 1000 },
  { key: '5m', name: '5 minutes', delay: 5 * 60 * 1000 },
  { key: '15m', name: '15 minutes', delay: 15 * 60 * 1000 },
  { key: '30m', name: '30 minutes', delay: 30 * 60 * 1000 },
  { key: '1h', name: '1 hour', delay: 60 * 60 * 1000 },
  { key: '2h', name: '2 hours', delay: 2 * 60 * 60 * 1000 },
  { key: '1d', name: '1 day', delay: 24 * 60 * 60 * 1000 },
];

interface RefreshIntervalDropdownProps {
  onRefresh?: () => void;
  isDisabled?: boolean;
}

export const RefreshIntervalDropdown: React.FC<RefreshIntervalDropdownProps> = ({
  onRefresh,
  isDisabled = false,
}) => {
  const { t } = useTranslation('plugin__logging-view-plugin');

  const [storedRefreshInterval, setStoredRefreshInterval] = useLocalStorage<{ interval: string }>(
    STORED_REFRESH_INTERVAL_KEY,
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(
    storedRefreshInterval && !isNaN(parseInt(storedRefreshInterval.interval, 10))
      ? parseInt(storedRefreshInterval.interval, 10)
      : 0,
  );
  const [delay, setDelay] = React.useState<number>(0);
  const timer = React.useRef<NodeJS.Timer | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
    }
  };

  const handleSelectedValue = (index: number) => () => {
    setIsOpen(false);
    setSelectedIndex(index);
    const selectedDelay = refreshIntervalOptions[index].delay;
    setDelay(selectedDelay);
    setStoredRefreshInterval({ interval: index.toString(10) });
  };

  const restartTimer = (callRefreshImmediately = true) => {
    clearTimer();

    if (delay !== 0) {
      if (callRefreshImmediately) {
        onRefresh?.();
      }
      timer.current = setInterval(() => onRefresh?.(), delay);
    }

    return () => clearTimer();
  };

  React.useEffect(() => restartTimer(), [delay]);

  // Avoid calling refresh immediately when onRefresh callback has changed
  React.useEffect(() => restartTimer(false), [onRefresh]);

  const toggleIsOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <FormGroup fieldId="logs-refresh-interval" data-test={TestIds.RefreshIntervalDropdown}>
      <Dropdown
        disabled={isDisabled}
        dropdownItems={refreshIntervalOptions.map(({ key, name }, index) => (
          <DropdownItem componentID={key} onClick={handleSelectedValue(index)} key={key}>
            {
              /*
                t('plugin__logging-view-plugin~Refresh off')
                t('plugin__logging-view-plugin~15 seconds')
                t('plugin__logging-view-plugin~30 seconds')
                t('plugin__logging-view-plugin~1 minute')
                t('plugin__logging-view-plugin~5 minutes')
                t('plugin__logging-view-plugin~15 minutes')
                t('plugin__logging-view-plugin~30 minutes')
                t('plugin__logging-view-plugin~1 hour')
                t('plugin__logging-view-plugin~2 hours')
                t('plugin__logging-view-plugin~1 day')
              */
              t(name)
            }
          </DropdownItem>
        ))}
        isOpen={isOpen}
        toggle={
          <DropdownToggle isDisabled={isDisabled} onToggle={toggleIsOpen}>
            {refreshIntervalOptions[selectedIndex].name}
          </DropdownToggle>
        }
      />
    </FormGroup>
  );
};
