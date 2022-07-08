import chartGrayColor from '@patternfly/react-tokens/dist/esm/chart_color_black_200';
import chartBlueColor from '@patternfly/react-tokens/dist/esm/chart_color_blue_200';
import chartCyanColor from '@patternfly/react-tokens/dist/esm/chart_color_cyan_200';
import chartYellowColor from '@patternfly/react-tokens/dist/esm/chart_color_gold_200';
import chartGreenColor from '@patternfly/react-tokens/dist/esm/chart_color_green_200';
import chartPurpleColor from '@patternfly/react-tokens/dist/esm/chart_color_purple_200';
import chartRedColor from '@patternfly/react-tokens/dist/esm/chart_color_red_100';

export type Severity =
  | 'critical'
  | 'error'
  | 'warning'
  | 'info'
  | 'debug'
  | 'trace'
  | 'unknown';

export const severityAbbreviations: Record<Severity, Array<string>> = {
  critical: ['emerg', 'fatal', 'alert', 'crit', 'critical'],
  error: ['err', 'error', 'eror'],
  debug: ['debug', 'dbug'],
  info: ['inf', 'info', 'information', 'notice'],
  trace: ['trace'],
  warning: ['warn', 'warning'],
  unknown: [],
};

export const severityFromString = (
  severityText: string | undefined | null,
): Severity => {
  for (const [group, abbreviations] of Object.entries(severityAbbreviations)) {
    if (abbreviations.includes(severityText)) {
      return group as Severity;
    }
  }

  return 'unknown';
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
      return chartCyanColor.value;
      break;
    default:
      return chartGrayColor.value;
  }
};
