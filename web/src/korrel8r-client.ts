import { cancellableFetch, RequestInitWithTimeout } from './cancellable-fetch';
import { GoalsRequest, Korrel8rResponse } from './korrel8r.types';
import { Config } from './logs.types';

const KORREL8R_ENDPOINT = '/api/proxy/plugin/logging-view-plugin/korrel8r';

export const getFetchConfig = ({
  config,
}: {
  config?: Config;
}): { requestInit?: RequestInitWithTimeout; endpoint: string } => {
  return {
    requestInit: {
      timeout: config?.timeout ? config.timeout * 1000 : undefined,
    },
    endpoint: KORREL8R_ENDPOINT,
  };
};

export const listGoals = ({
  config,
  goalsRequest,
}: {
  config?: Config;
  goalsRequest: GoalsRequest;
}) => {
  const { endpoint, requestInit } = getFetchConfig({ config });

  const requestData = { ...requestInit, method: 'POST', body: JSON.stringify(goalsRequest) };

  return cancellableFetch<Korrel8rResponse>(`${endpoint}/api/v1alpha1/lists/goals`, requestData);
};
