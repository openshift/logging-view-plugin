import chartGrayColor from '@patternfly/react-tokens/dist/esm/chart_color_black_200';
import chartBlueColor from '@patternfly/react-tokens/dist/esm/chart_color_blue_200';
import chartTealColor from '@patternfly/react-tokens/dist/esm/chart_color_teal_200';
import chartYellowColor from '@patternfly/react-tokens/dist/esm/chart_color_yellow_200';
import chartGreenColor from '@patternfly/react-tokens/dist/esm/chart_color_green_200';
import chartPurpleColor from '@patternfly/react-tokens/dist/esm/chart_color_purple_200';
import chartRedColor from '@patternfly/react-tokens/dist/esm/chart_color_red_orange_100';

export type Severity =
  | 'critical'
  | 'error'
  | 'warning'
  | 'info'
  | 'debug'
  | 'trace'
  | 'unknown'
  | 'other';

export const severityAbbreviations: Record<Severity, Array<string>> = {
  critical: ['critical', 'emerg', 'fatal', 'alert', 'crit'],
  error: ['error', 'err', 'eror'],
  debug: ['debug', 'dbug'],
  info: ['info', 'inf', 'information', 'notice'],
  trace: ['trace'],
  warning: ['warn', 'warning'],
  unknown: ['unknown'],
  other: [''],
};

export const severityFromString = (
  severityText: string | undefined | null,
): Severity | undefined => {
  for (const [group, abbreviations] of Object.entries(severityAbbreviations)) {
    if (severityText && abbreviations.includes(severityText)) {
      return group as Severity;
    }
  }

  return undefined;
};

export const isSeverity = (value: string): value is Severity =>
  Object.keys(severityAbbreviations).includes(value);

export const getSeverityColor = (severity: Severity): string => {
  switch (severity) {
    case 'critical':
      return chartPurpleColor.value;
      break;
    case 'error':
      return chartRedColor.value;
      break;
    case 'warning':
      return chartYellowColor.value;
      break;
    case 'info':
      return chartGreenColor.value;
      break;
    case 'debug':
      return chartBlueColor.value;
      break;
    case 'trace':
      return chartTealColor.value;
      break;
    default:
      return chartGrayColor.value;
  }
};

export const severityFiltersFromParams = (params: string | null): Set<Severity> => {
  const severityFilters: Array<Severity> =
    params
      ?.split(',')
      .map((s) => s.trim())
      .filter(isSeverity) ?? [];

  return severityFilters.length > 0 ? new Set(severityFilters) : new Set();
};
