import { TimeRangeNumber } from './logs.types';
import { padLeadingZero } from './value-utils';

export enum DateFormat {
  TimeShort,
  TimeMed,
  TimeFull,
  DateMed,
  Full,
}

export const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  year: 'numeric',
  second: 'numeric',
});

export const timeShortFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: 'numeric',
});

export const timeMedFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: 'numeric',
  hour12: false,
});

const dateMedFormatter = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getPart = (
  parts: Intl.DateTimeFormatPart[],
  type: 'day' | 'hour' | 'minute' | 'month' | 'second' | 'year',
) => parts.find((p) => p.type === type)?.value || '';

export const dateToFormat = (date: Date | number, format: DateFormat): string => {
  switch (format) {
    case DateFormat.TimeShort:
      return timeShortFormatter.format(date);
      break;
    case DateFormat.TimeMed:
      return timeMedFormatter.format(date);
      break;
    case DateFormat.DateMed: {
      const parts = dateMedFormatter.formatToParts(date);
      return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}`;
    }
    case DateFormat.TimeFull: {
      const fractionalSeconds =
        typeof date === 'number' ? Math.floor(date % 1000) : date.getMilliseconds();
      const parts = timeMedFormatter.formatToParts(date);
      const hours = parseInt(getPart(parts, 'hour'), 10);
      const clampedHours = !isNaN(hours) ? padLeadingZero(hours >= 24 ? 0 : hours) : '';

      return `${clampedHours}:${getPart(parts, 'minute')}:${getPart(
        parts,
        'second',
      )}.${fractionalSeconds}`;
    }
    case DateFormat.Full:
      {
        const fractionalSeconds =
          typeof date === 'number' ? Math.floor(date % 1000) : date.getMilliseconds();
        return `${dateTimeFormatter.format(date)}.${fractionalSeconds}`;
      }
      break;
  }
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
