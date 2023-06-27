import { getAlertingRules } from './getAlertingRules';

const getPlatformAlertingRules = (namespace?: string) =>
  getAlertingRules(['infrastructure', 'audit'], namespace);

export default getPlatformAlertingRules;
