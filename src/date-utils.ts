import { TimeRangeNumber } from './logs.types';
import { padLeadingZero } from './value-utils';

export enum DateFormat {
  TimeShort,
  TimeMed,
  TimeFull,
  DateMed,
  Full,
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  year: 'numeric',
  second: 'numeric',
  hour12: false,
});

const isDateValid = (date: Date | number) => {
  if (typeof date === 'number') {
    return !isNaN(date);
  } else if (date instanceof Date) {
    return !isNaN(date.getTime());
  }

  return false;
};

export const dateToFormat = (date: Date | number, format: DateFormat): string => {
  if (isDateValid(date)) {
    const dateObject = new Date(date);
    const hours = padLeadingZero(dateObject.getHours());
    const minutes = padLeadingZero(dateObject.getMinutes());
    const seconds = padLeadingZero(dateObject.getSeconds());

    switch (format) {
      case DateFormat.TimeShort:
        return `${hours}:${minutes}`;
      case DateFormat.TimeMed:
        return `${hours}:${minutes}:${seconds}`;
      case DateFormat.DateMed: {
        const month = padLeadingZero(dateObject.getMonth() + 1);
        const dayOfTheMonth = padLeadingZero(dateObject.getDate());

        return `${dateObject.getFullYear()}-${month}-${dayOfTheMonth}`;
      }
      case DateFormat.TimeFull: {
        const fractionalSeconds = padLeadingZero(dateObject.getMilliseconds(), 3);

        return `${hours}:${minutes}:${seconds}.${fractionalSeconds}`;
      }
      case DateFormat.Full: {
        const fractionalSeconds = padLeadingZero(dateObject.getMilliseconds(), 3);

        return `${dateTimeFormatter.format(date)}.${fractionalSeconds}`;
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
