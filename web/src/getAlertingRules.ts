import { RulesResponse } from './logs.types';
import { getRules } from './loki-client';

const abortControllers: Map<string, null | (() => void)> = new Map();

export const getAlertingRules = async (tenants: Array<string>) => {
  const rulesResponses = await Promise.allSettled(
    tenants.map((tenant) => {
      if (abortControllers.has(tenant)) {
        abortControllers.get(tenant)?.();
      }

      const { abort, request } = getRules({ tenant });
      abortControllers.set(tenant, abort);

      return request();
    }),
  );

  const mergedRules: RulesResponse = rulesResponses
    .flatMap((response) =>
      response.status === 'fulfilled' && response.value.status === 'success'
        ? [response.value]
        : [],
    )
    .reduce(
      (acc, rules) => {
        acc.data.groups = acc.data.groups.concat(rules.data.groups);

        return acc;
      },
      { data: { groups: [] }, status: 'success' } as RulesResponse,
    );

  return mergedRules;
};
