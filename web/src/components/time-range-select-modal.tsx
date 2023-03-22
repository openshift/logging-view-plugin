import {
  Alert,
  Button,
  DatePicker,
  Modal,
  ModalBoxBody,
  ModalVariant,
} from '@patternfly/react-core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DateFormat, dateToFormat } from '../date-utils';
import { TimeRange } from '../logs.types';
import { TestIds } from '../test-ids';
import { defaultTimeRange, numericTimeRange } from '../time-range';
import { padLeadingZero } from '../value-utils';
import { PrecisionTimePicker } from './precision-time-picker';
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
  const { t } = useTranslation('plugin__logging-view-plugin');

  const initialRangeNumber = numericTimeRange(initialRange ?? defaultTimeRange());
  const [startDate, setStartDate] = React.useState<string>(
    dateToFormat(initialRangeNumber.start, DateFormat.DateMed),
  );
  const [startTime, setStartTime] = React.useState<string>(
    dateToFormat(initialRangeNumber.start, DateFormat.TimeFull),
  );
  const [endDate, setEndDate] = React.useState<string>(
    dateToFormat(initialRangeNumber.end, DateFormat.DateMed),
  );
  const [endTime, setEndTime] = React.useState<string>(
    dateToFormat(initialRangeNumber.end, DateFormat.TimeFull),
  );
  const [isRangeValid, setIsRangeValid] = React.useState(false);

  const isRangeSelected = startDate && startTime && endDate && endTime;

  React.useEffect(() => {
    if (isRangeSelected) {
      const start = `${startDate}T${startTime}`;
      const end = `${endDate}T${endTime}`;

      setIsRangeValid(Date.parse(start) < Date.parse(end));
    } else {
      setIsRangeValid(false);
    }
  }, [startDate, endDate, startTime, endTime, isRangeSelected]);

  const handleSelectRange = () => {
    if (isRangeSelected) {
      const start = `${startDate}T${startTime}`;
      const end = `${endDate}T${endTime}`;

      onSelectRange?.({ start: Date.parse(start), end: Date.parse(end) });
    }
  };

  const handleStartTimeChange = (
    _time: string,
    hours?: number,
    minutes?: number,
    seconds?: number,
  ) => {
    if (
      hours !== undefined &&
      hours !== null &&
      minutes !== undefined &&
      minutes !== null &&
      seconds !== undefined &&
      seconds !== null
    ) {
      setStartTime(
        `${padLeadingZero(hours)}:${padLeadingZero(minutes)}:${padLeadingZero(seconds)}`,
      );
    } else {
      setIsRangeValid(false);
    }
  };

  const handleEndTimeChange = (
    _time: string,
    hour?: number,
    minutes?: number,
    seconds?: number,
  ) => {
    if (
      hour !== undefined &&
      hour !== null &&
      minutes !== undefined &&
      minutes !== null &&
      seconds !== undefined &&
      seconds !== null
    ) {
      setEndTime(`${padLeadingZero(hour)}:${padLeadingZero(minutes)}:${padLeadingZero(seconds)}`);
    } else {
      setIsRangeValid(false);
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
      aria-label="date-time-picker-modal"
      data-test={TestIds.TimeRangeSelectModal}
      footer={
        <div className="co-logs-time-range-modal__footer">
          <Button
            key="confirm"
            variant="primary"
            onClick={handleSelectRange}
            isDisabled={!isRangeSelected || !isRangeValid}
            data-test={TestIds.TimeRangeDropdownSaveButton}
          >
            {t('Save')}
          </Button>
          <Button key="cancel" variant="secondary" onClick={onClose}>
            {t('Cancel')}
          </Button>
        </div>
      }
    >
      <ModalBoxBody
        className="co-logs-time-range-modal__body"
        data-test={TestIds.TimeRangeSelectModal}
      >
        <div>
          <label>{t('From')}</label>
          <div className="co-logs-time-range-modal__field">
            <DatePicker onChange={setStartDate} value={startDate} />
            <PrecisionTimePicker time={startTime} onChange={handleStartTimeChange} />
          </div>
        </div>
        <div>
          <label>{t('To')}</label>
          <div className="co-logs-time-range-modal__field">
            <DatePicker onChange={setEndDate} value={endDate} />
            <PrecisionTimePicker time={endTime} onChange={handleEndTimeChange} />
          </div>
          {!isRangeValid && (
            <Alert
              className="co-logs-time-range-modal__error"
              variant="danger"
              isInline
              isPlain
              title={t('Invalid date range')}
            />
          )}
        </div>
      </ModalBoxBody>
    </Modal>
  );
};
