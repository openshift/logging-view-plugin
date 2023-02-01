import {
  HelperText,
  HelperTextItem,
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  Popper,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import React from 'react';
import { useBoolean } from '../hooks/useBoolean';
import { padLeadingZero } from '../value-utils';
import './precision-time-picker.css';

interface PrecisionTimePickerProps {
  time: string;
  onChange?: (time: string, hours?: number, minutes?: number, seconds?: number) => void;
}

const validTimeStringRegex = /^\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

const parseTimeString = (
  time: string,
): { hours: number; minutes: number; seconds: number } | null => {
  if (!validTimeStringRegex.test(time)) {
    return null;
  }

  const parts = time.split(':');

  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    hours = hours >= 24 ? 0 : hours;
    const minutes = parseInt(parts[1], 10);
    const seconds = parts.length >= 3 ? parseFloat(parts[2]) : 0;

    if (!isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)) {
      return { hours, minutes, seconds };
    }
  }

  return null;
};

const timeMenuItemsBuilder: () => Array<string> = () => {
  const items = [];

  for (let hours = 0; hours < 24; hours++) {
    for (let minutes = 0; minutes < 60; minutes += 30) {
      items.push(`${padLeadingZero(hours)}:${padLeadingZero(minutes)}`);
    }
  }

  return items;
};

const timeMenuItems = timeMenuItemsBuilder();

export const PrecisionTimePicker: React.FC<PrecisionTimePickerProps> = ({ onChange, time }) => {
  const [value, setValue] = React.useState(time);
  const [isValid, setIsvalid] = React.useState(true);
  const { value: isMenuOpen, setTrue: openMenu, setFalse: closeMenu } = useBoolean(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const handleValueChange = (changedValue: string) => {
    setValue(changedValue);
    const parsedTime = parseTimeString(changedValue);

    if (parsedTime) {
      setIsvalid(true);
      onChange?.(changedValue, parsedTime.hours, parsedTime.minutes, parsedTime.seconds);
    } else {
      setIsvalid(false);
      onChange?.(changedValue, undefined, undefined, undefined);
    }

    closeMenu();
  };

  const onDocumentClick = (event: MouseEvent | undefined) => {
    if (
      inputRef.current !== event?.target &&
      !menuRef.current?.contains(event?.target as HTMLElement)
    ) {
      closeMenu();
    }
  };

  const handleMenuSelect = (_?: React.MouseEvent, itemId?: string | number) => {
    if (itemId && typeof itemId === 'string') {
      handleValueChange(itemId);
    }
  };

  const popper = (
    <Menu
      id="time-select-menu"
      onSelect={handleMenuSelect}
      className="co-logs-time-picker__time-options"
      ref={menuRef}
    >
      <MenuContent>
        <MenuList>
          {timeMenuItems.map((item, index) => (
            <MenuItem key={index} onClick={() => handleValueChange(item)} ref={null} itemID={item}>
              {item}
            </MenuItem>
          ))}
        </MenuList>
      </MenuContent>
    </Menu>
  );

  const trigger = (
    <div>
      <TextInput
        value={value}
        onFocus={openMenu}
        type="text"
        iconVariant="clock"
        onChange={handleValueChange}
        aria-label="Precision time picker"
        isRequired
        validated={isValid ? undefined : ValidatedOptions.error}
        className="co-logs-time-picker__input"
        ref={inputRef}
      />
      {!isValid && (
        <HelperText className="co-logs-time-picker__error">
          <HelperTextItem variant="error">Invalid time format</HelperTextItem>
        </HelperText>
      )}
    </div>
  );

  return (
    <Popper
      trigger={trigger}
      popper={popper}
      isVisible={isMenuOpen}
      onDocumentClick={onDocumentClick}
    />
  );
};
