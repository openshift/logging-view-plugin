/**
 * Converts a value into a string with scale prefix
 * @example
 * valueWithScalePrefix(1000) // 1k
 * valueWithScalePrefix(1000000) // 1M
 * valueWithScalePrefix(2340) // 2.3k
 */
export const valueWithScalePrefix = (value: number): string => {
  return value >= 1000000
    ? `${(value / 1000000).toFixed(
        Math.round(value / 1000000) === value / 1000000 ? 0 : 1,
      )}M`
    : value >= 1000
    ? `${(value / 1000).toFixed(
        Math.round(value / 1000) === value / 1000 ? 0 : 1,
      )}k`
    : String(value);
};

export const notEmptyString = (value: string): value is string =>
  value.length > 0;

const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;
const w = d * 7;
const units = { w, d, h, m, s };

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
