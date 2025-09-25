import { SchemaConfig } from '../logs.types';
import { getFetchConfig } from '../loki-client';

jest.mock('@openshift-console/dynamic-plugin-sdk');

describe('Loki Client', () => {
  it('should generate a valid config', () => {
    [
      {
        config: {
          config: undefined,
          tenant: 'application',
          logsLimit: 100,
          schema: SchemaConfig.viaq,
        },
        expectedFetchConfig: {
          endpoint: '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/application',
          requestInit: { timeout: undefined },
        },
      },
      {
        config: {
          config: { useTenantInHeader: true, logsLimit: 100, schema: SchemaConfig.viaq },
          tenant: 'application',
        },
        expectedFetchConfig: {
          endpoint: '/api/proxy/plugin/logging-view-plugin/backend',
          requestInit: { headers: { 'X-Scope-OrgID': 'application' } },
        },
      },
      {
        config: {
          config: { useTenantInHeader: false, logsLimit: 100, schema: SchemaConfig.viaq },
          tenant: 'infrastructure',
        },
        expectedFetchConfig: {
          endpoint: '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/infrastructure',
          requestInit: { timeout: undefined },
        },
      },
      {
        config: {
          config: {
            useTenantInHeader: false,
            logsLimit: 100,
            timeout: 2,
            schema: SchemaConfig.viaq,
          },
          tenant: 'infrastructure',
        },
        expectedFetchConfig: {
          endpoint: '/api/proxy/plugin/logging-view-plugin/backend/api/logs/v1/infrastructure',
          requestInit: { timeout: 2000 },
        },
      },
    ].forEach(({ config, expectedFetchConfig }) => {
      expect(getFetchConfig(config)).toEqual(expectedFetchConfig);
    });
  });
});
