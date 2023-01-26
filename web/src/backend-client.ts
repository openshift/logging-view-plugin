import { cancellableFetch } from './cancellable-fetch';
import { Config } from './logs.types';

const BACKEND_ENDPOINT = '/api/plugins/logging-view-plugin';

let configAbort: null | (() => void) = null;

export const getConfig = async (): Promise<Config> => {
  const { abort, request } = cancellableFetch<Config>(`${BACKEND_ENDPOINT}/config`);

  if (configAbort) {
    configAbort();
  }

  configAbort = abort;

  return request();
};
