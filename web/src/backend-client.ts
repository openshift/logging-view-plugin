import { cancellableFetch } from './cancellable-fetch';
import { Config, SchemaConfig } from './logs.types';

const BACKEND_ENDPOINT = '/api/plugins/logging-view-plugin';

let singletonRequest: Promise<Config> | null = null;
let throttleTimeout: NodeJS.Timeout | null = null;

export const defaultConfig: Config = {
  isStreamingEnabledInDefaultPage: false,
  logsLimit: 100,
  schema: SchemaConfig.viaq,
};

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

  try {
    const { request } = cancellableFetch<Config>(`${BACKEND_ENDPOINT}/config`);

    singletonRequest = request();
    const config = await singletonRequest;

    return config;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching logging plugin configuration', e);

    return Promise.resolve(defaultConfig);
  }
};
