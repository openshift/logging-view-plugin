import { getAlertingRules } from './getAlertingRules';

const getPlatformAlertingRules = () => getAlertingRules(['infrastructure', 'audit']);

export default getPlatformAlertingRules;
