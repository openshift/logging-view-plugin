import {
  durationFromTimestamp,
  notEmptyString,
  millisecondsFromDuration,
  valueWithScalePrefix,
  capitalize,
} from '../value-utils';

describe('value utils', () => {
  it('should add the propoer prefix to the value', () => {
    expect(valueWithScalePrefix(90)).toBe('90');
    expect(valueWithScalePrefix(1000)).toBe('1k');
    expect(valueWithScalePrefix(1000000)).toBe('1M');
    expect(valueWithScalePrefix(1100000)).toBe('1.1M');
    expect(valueWithScalePrefix(2340)).toBe('2.3k');
  });

  it('should create a duration value from a timestamp', () => {
    expect(durationFromTimestamp(1000)).toBe('1s');
    expect(durationFromTimestamp(60000)).toBe('1m');
    expect(durationFromTimestamp(6730000000)).toBe('11w 21h 26m 40s');
    expect(durationFromTimestamp(-1)).toBe('');
  });

  it('should return milliseconds of a duration', () => {
    expect(millisecondsFromDuration('1s')).toBe(1000);
    expect(millisecondsFromDuration('1m')).toBe(60000);
    expect(millisecondsFromDuration('11w 21h 26m 40s')).toBe(6730000000);
    expect(millisecondsFromDuration('-1')).toBe(0);
    expect(millisecondsFromDuration('1x')).toBe(0);
  });

  it('should validate a notEmptyString', () => {
    expect(notEmptyString('foo')).toBe(true);
    expect(notEmptyString('')).toBe(false);
    expect(notEmptyString(undefined)).toBe(false);
  });

  it('should capitalize a string', () => {
    expect(capitalize('foo')).toBe('Foo');
    expect(capitalize('')).toBe('');
    expect(capitalize('123')).toBe('123');
    expect(capitalize()).toBe('');
  });
});
