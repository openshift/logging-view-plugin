import { DateFormat, dateToFormat } from '../date-utils';

const mockDate = new Date('2023-02-22T08:38:36Z');
const mockDateWithMillis = new Date('2023-02-22T08:38:36.001Z');
const mockDateWithValuesUnderTen = new Date('2023-02-02T08:08:06.001Z');
const invalidDate = new Date('2023-02-22T24:38:36.001Z');

describe('date utils', () => {
  it('should format a date correctly', () => {
    [
      { format: DateFormat.DateMed, output: '2023-02-22' },
      { format: DateFormat.Full, output: 'Feb 22, 2023, 08:38:36.000' },
      { format: DateFormat.TimeFull, output: '08:38:36.000' },
      { format: DateFormat.TimeMed, output: '08:38:36' },
      { format: DateFormat.TimeShort, output: '08:38' },
    ].forEach(({ format, output }) => {
      expect(dateToFormat(mockDate, format)).toEqual(output);
    });
  });

  it('should format a date with milliseconds correctly', () => {
    [
      { format: DateFormat.DateMed, output: '2023-02-22' },
      { format: DateFormat.Full, output: 'Feb 22, 2023, 08:38:36.001' },
      { format: DateFormat.TimeFull, output: '08:38:36.001' },
      { format: DateFormat.TimeMed, output: '08:38:36' },
      { format: DateFormat.TimeShort, output: '08:38' },
    ].forEach(({ format, output }) => {
      expect(dateToFormat(mockDateWithMillis, format)).toEqual(output);
    });
  });

  it('should format a date with values lower than 10 correctly', () => {
    [
      { format: DateFormat.DateMed, output: '2023-02-02' },
      { format: DateFormat.Full, output: 'Feb 2, 2023, 08:08:06.001' },
      { format: DateFormat.TimeFull, output: '08:08:06.001' },
      { format: DateFormat.TimeMed, output: '08:08:06' },
      { format: DateFormat.TimeShort, output: '08:08' },
    ].forEach(({ format, output }) => {
      expect(dateToFormat(mockDateWithValuesUnderTen, format)).toEqual(output);
    });
  });

  it('should return invalid date when the date is invalid', () => {
    expect(dateToFormat(invalidDate, DateFormat.DateMed)).toEqual('invalid date');
  });
});
