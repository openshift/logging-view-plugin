export enum DateFormat {
  TimeShort,
  TimeMed,
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
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

export const dateToFormat = (
  date: Date | number,
  format: DateFormat,
): string => {
  switch (format) {
    case DateFormat.TimeShort:
      return timeShortFormatter.format(date);
      break;
    case DateFormat.TimeMed:
      return timeMedFormatter.format(date);
      break;
    case DateFormat.Full:
      {
        const fractionalSeconds =
          typeof date === 'number'
            ? Math.floor(date % 1000)
            : date.getMilliseconds();
        return `${dateTimeFormatter.format(date)}.${fractionalSeconds}`;
      }
      break;
  }
};
