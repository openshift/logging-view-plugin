export const timeRangeOptions = [
  // TODO allow custom time range with calendar selector
  // { key: 'CUSTOM', name: 'Custom time range' },
  {
    key: '5m',
    name: 'Last 5 minutes',
    span: 5 * 60 * 1000,
    interval: 15 * 1000,
  },
  {
    key: '15m',
    name: 'Last 15 minutes',
    span: 15 * 60 * 1000,
    interval: 30 * 1000,
  },
  {
    key: '30m',
    name: 'Last 30 minutes',
    span: 30 * 60 * 1000,
    interval: 60 * 1000,
  },
  { key: '1h', name: 'Last 1 hour', span: 60 * 60 * 1000, interval: 60 * 1000 },
  {
    key: '2h',
    name: 'Last 2 hours',
    span: 2 * 60 * 60 * 1000,
    interval: 60 * 1000,
  },
  {
    key: '6h',
    name: 'Last 6 hours',
    span: 6 * 60 * 60 * 1000,
    interval: 5 * 60 * 1000,
  },
  {
    key: '12h',
    name: 'Last 12 hours',
    span: 12 * 60 * 60 * 1000,
    interval: 10 * 60 * 1000,
  },
  {
    key: '1d',
    name: 'Last 1 day',
    span: 24 * 60 * 60 * 1000,
    interval: 15 * 60 * 1000,
  },
  {
    key: '2d',
    name: 'Last 2 days',
    span: 2 * 24 * 60 * 60 * 1000,
    interval: 30 * 60 * 1000,
  },
  {
    key: '1w',
    name: 'Last 1 week',
    span: 7 * 24 * 60 * 60 * 1000,
    interval: 60 * 60 * 1000,
  },
  {
    key: '2w',
    name: 'Last 2 weeks',
    span: 14 * 24 * 60 * 60 * 1000,
    interval: 60 * 60 * 1000,
  },
];
