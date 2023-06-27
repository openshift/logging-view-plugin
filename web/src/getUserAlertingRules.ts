import { getAlertingRules } from './getAlertingRules';

const getUserAlertingRules = (namespace?: string) => getAlertingRules(['application'], namespace);

export default getUserAlertingRules;
