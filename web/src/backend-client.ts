import { cancellableFetch } from './cancellable-fetch';
import { Config } from './logs.types';

const BACKEND_ENDPOINT = '/api/plugins/logging-view-plugin';

let singletonRequest: Promise<Config> | null = null;
let throttleTimeout: NodeJS.Timeout | null = null;

export const getConfig = async (): Promise<Config> => {
  if (singletonRequest) {
    if (throttleTimeout) {
      clearTimeout(throttleTimeout);
    }

    throttleTimeout = setTimeout(() => {
      singletonRequest = null;
    }, 1000);

    return singletonRequest;
  }

  const { request } = cancellableFetch<Config>(`${BACKEND_ENDPOINT}/config`);

  singletonRequest = request();

  return singletonRequest;
};
