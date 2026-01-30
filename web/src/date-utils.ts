import { TimeRangeNumber } from './logs.types';
import { padLeadingZero } from './value-utils';

export enum DateFormat {
  TimeShort,
  TimeMed,
  TimeFull,
  DateMed,
  Full,
}

const createDateTimeFormatter = (timezone?: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    year: 'numeric',
    second: 'numeric',
    hour12: false,
    timeZone: timezone,
  });

const isDateValid = (date: Date | number) => {
  if (typeof date === 'number') {
    return !isNaN(date);
  } else if (date instanceof Date) {
    return !isNaN(date.getTime());
  }

  return false;
};

/**
 * Extracts time parts (hours, minutes, seconds, milliseconds) for a given
 * date in a specific timezone. Uses Intl.DateTimeFormat to get timezone-aware values.
 */
const getTimePartsInTimezone = (
  date: Date,
  timezone?: string,
): { hours: string; minutes: string; seconds: string; milliseconds: string } => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

  return {
    hours: getPart('hour'),
    minutes: getPart('minute'),
    seconds: getPart('second'),
    milliseconds: padLeadingZero(date.getMilliseconds(), 3),
  };
};

/**
 * Extracts date parts (year, month, day) for a given date in a specific timezone.
 */
const getDatePartsInTimezone = (
  date: Date,
  timezone?: string,
): { year: string; month: string; day: string } => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
};

export const dateToFormat = (
  date: Date | number,
  format: DateFormat,
  timezone?: string,
): string => {
  if (isDateValid(date)) {
    const dateObject = new Date(date);
    const { hours, minutes, seconds, milliseconds } = getTimePartsInTimezone(dateObject, timezone);

    switch (format) {
      case DateFormat.TimeShort:
        return `${hours}:${minutes}`;
      case DateFormat.TimeMed:
        return `${hours}:${minutes}:${seconds}`;
      case DateFormat.DateMed: {
        const { year, month, day } = getDatePartsInTimezone(dateObject, timezone);
        return `${year}-${month}-${day}`;
      }
      case DateFormat.TimeFull: {
        return `${hours}:${minutes}:${seconds}.${milliseconds}`;
      }
      case DateFormat.Full: {
        const dateTimeFormatter = createDateTimeFormatter(timezone);
        return `${dateTimeFormatter.format(date)}.${milliseconds}`;
      }
    }
  }

  return 'invalid date';
};

export const getTimeFormatFromTimeRange = (timeRange: TimeRangeNumber): DateFormat =>
  getTimeFormatFromInterval(timeRange.end - timeRange.start);

export const getTimeFormatFromInterval = (interval: number): DateFormat => {
  if (interval <= 60 * 1000) {
    return DateFormat.TimeFull;
  } else if (interval < 30 * 60 * 1000) {
    return DateFormat.TimeMed;
  }

  return DateFormat.TimeShort;
};

export const getBrowserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
