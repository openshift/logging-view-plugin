import { DEFAULT_SCHEMA, Schema, SchemaConfig } from './logs.types';

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

export const padLeadingZero = (value: number, length = 2): string =>
  String(value).padStart(length, '0');

const DEFAULT_TENANT = 'application';

export const getInitialTenantFromNamespace = (namespace?: string): string => {
  if (namespace && namespaceBelongsToInfrastructureTenant(namespace)) {
    return 'infrastructure';
  }

  return DEFAULT_TENANT;
};

export const namespaceBelongsToInfrastructureTenant = (namespace: string): boolean =>
  /^openshift-|^openshift$|^default$|^kube-/.test(namespace);

export const capitalize = (str?: string): string => {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getSchema = (value: string | null | undefined | SchemaConfig): Schema => {
  switch (value) {
    case Schema.otel:
    case SchemaConfig.otel:
      return Schema.otel;
    case Schema.viaq:
    case SchemaConfig.viaq:
      return Schema.viaq;

    default:
      return DEFAULT_SCHEMA;
  }
};
