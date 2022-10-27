/**
 * Converts a value into a string with scale prefix
 * @example
 * valueWithScalePrefix(1000) // 1k
 * valueWithScalePrefix(1000000) // 1M
 * valueWithScalePrefix(2340) // 2.3k
 */
export const valueWithScalePrefix = (value: number): string => {
  return value >= 1000000
    ? `${(value / 1000000).toFixed(Math.round(value / 1000000) === value / 1000000 ? 0 : 1)}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(Math.round(value / 1000) === value / 1000 ? 0 : 1)}k`
    : String(value);
};

export const notEmptyString = (value: string | undefined): value is string =>
  value !== undefined && value.length > 0;

export const notUndefined = <T>(value: T | undefined): value is T => value !== undefined;

const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;
const w = d * 7;
export const units: Record<string, number> = { w, d, h, m, s };

/**
 * Converts a timesamp into a string in prometheus duration format `[0-9]+[smhdwy]`
 * https://prometheus.io/docs/prometheus/latest/querying/basics/#time-durations
 */
export const durationFromTimestamp = (timestamp: number): string => {
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    return '';
  }
  let remaining = timestamp;
  let str = '';
  for (const [unit, factor] of Object.entries(units)) {
    const n = Math.floor(remaining / factor);
    if (n > 0) {
      str += `${n}${unit} `;
      remaining -= n * factor;
    }
  }
  return str.trim();
};

export const millisecondsFromDuration = (duration: string): number => {
  try {
    const parts = duration
      .trim()
      .split(/\s+/)
      .map((p) => p.match(/^(\d+)([wdhms])$/));
    return parts.reduce((sum, p) => {
      if (p && p.length >= 3) {
        const digit = p[1];
        const unit = p[2];

        return sum + parseInt(digit, 10) * units[unit];
      }
      return sum;
    }, 0);
  } catch (ignored) {
    // Invalid duration format
    return 0;
  }
};

const getPart = (
  parts: Intl.DateTimeFormatPart[],
  type: 'day' | 'hour' | 'minute' | 'month' | 'second' | 'year',
) => parts.find((p) => p.type === type)?.value || '';

export const formatDate = (timestamp: number): string => {
  const parts = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(timestamp);
  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}`;
};
export const formatTime = (timestamp: number, includeSeconds = false): string => {
  const parts = new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    hourCycle: 'h24',
    minute: '2-digit',
    second: 'numeric',
  }).formatToParts(timestamp);
  const seconds = includeSeconds ? `:${getPart(parts, 'second')}` : '';
  return `${getPart(parts, 'hour')}:${getPart(parts, 'minute')}${seconds}`;
};

export const trim = (value: string): string => value.trim();
