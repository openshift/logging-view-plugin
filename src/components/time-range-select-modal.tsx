import {
  Button,
  DatePicker,
  Modal,
  ModalBoxBody,
  ModalVariant,
  TimePicker,
} from '@patternfly/react-core';
import React from 'react';
import { TimeRange } from '../logs.types';
import { TestIds } from '../test-ids';
import { defaultTimeRange, numericTimeRange } from '../time-range';
import { formatDate, formatTime } from '../value-utils';
import './time-range-select-modal.css';

interface TimeRangeSelectModal {
  onClose: () => void;
  onSelectRange?: (timeRange: TimeRange) => void;
  initialRange?: TimeRange;
}

export const INTERVAL_AUTO_KEY = 'AUTO';

export const TimeRangeSelectModal: React.FC<TimeRangeSelectModal> = ({
  onClose,
  onSelectRange,
  initialRange,
}) => {
  const initialRangeNumber = numericTimeRange(initialRange ?? defaultTimeRange());
  const [startDate, setStartDate] = React.useState<string>(formatDate(initialRangeNumber.start));
  const [startTime, setStartTime] = React.useState<string>(formatTime(initialRangeNumber.start));
  const [endDate, setEndDate] = React.useState<string>(formatDate(initialRangeNumber.end));
  const [endTime, setEndTime] = React.useState<string>(formatTime(initialRangeNumber.end));

  const isRangeSelected = startDate && startTime && endDate && endTime;

  const handleSelectRange = () => {
    if (isRangeSelected) {
      const start = `${startDate}T${startTime}:00`;
      const end = `${endDate}T${endTime}:00`;

      onSelectRange?.({ start: Date.parse(start), end: Date.parse(end) });
    }
  };

  const handleStartTimeChange = (_time: string, hour?: number, minute?: number) => {
    if (hour && minute) {
      setStartTime(`${hour}:${minute}`);
    }
  };
  const handleEndTimeChange = (_time: string, hour?: number, minute?: number) => {
    if (hour && minute) {
      setEndTime(`${hour}:${minute}`);
    }
  };

  return (
    <Modal
      id="date-time-picker-modal"
      className="modal-dialog co-logs-time-range-modal"
      variant={ModalVariant.small}
      title="Custom time range"
      position="top"
      isOpen
      onEscapePress={onClose}
      onClose={onClose}
      showClose={false}
      hasNoBodyWrapper={true}
      data-test={TestIds.TimeRangeSelectModal}
      footer={
        <div className="co-logs-time-range-modal__footer">
          <Button
            key="confirm"
            variant="primary"
            onClick={handleSelectRange}
            isDisabled={!isRangeSelected}
            data-test={TestIds.TimeRangeDropdownSaveButton}
          >
            Save
          </Button>
          <Button key="cancel" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <ModalBoxBody
        className="co-logs-time-range-modal__body"
        data-test={TestIds.TimeRangeSelectModal}
      >
        <div>
          <label>From</label>
          <div className="co-logs-time-range-modal__field">
            <DatePicker onChange={setStartDate} value={startDate} />
            <TimePicker
              menuAppendTo="inline"
              is24Hour
              onChange={handleStartTimeChange}
              time={startTime}
            />
          </div>
        </div>
        <div>
          <label>To</label>
          <div className="co-logs-time-range-modal__field">
            <DatePicker onChange={setEndDate} value={endDate} />
            <TimePicker
              menuAppendTo="inline"
              is24Hour
              onChange={handleEndTimeChange}
              time={endTime}
            />
          </div>
        </div>
      </ModalBoxBody>
    </Modal>
  );
};
