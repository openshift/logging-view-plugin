jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({ K8sResourceCommon: {} }));
jest.mock('../cancellable-fetch', () => ({ cancellableFetch: jest.fn() }));
jest.mock('../loki-client', () => ({ executeLabelValue: jest.fn(), executeSeries: jest.fn() }));

import { availableDevConsoleAttributes } from '../attribute-filters';
import { cancellableFetch } from '../cancellable-fetch';
import { Option } from '../components/filters/filter.types';
import { executeLabelValue } from '../loki-client';
import { Config, Schema } from '../logs.types';

const mockCancellableFetch = cancellableFetch as jest.Mock;
const mockExecuteLabelValue = executeLabelValue as jest.Mock;

const getNamespaceOptions = async (namespace: string): Promise<string[]> => {
  const attributes = availableDevConsoleAttributes(
    'application',
    {} as Config,
    Schema.viaq,
    namespace,
  );
  const namespaceAttribute = attributes.find((attribute) => attribute.id === 'namespace');
  const optionsFn = namespaceAttribute?.options as () => Promise<Option[]>;
  const options = await optionsFn();
  return options.map((option) => option.value);
};

describe('Developer view namespace options (OU-578)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes namespaces the user has Loki log access to but does not own as a project', async () => {
    // Projects API returns only the owned project...
    mockCancellableFetch.mockReturnValue({
      request: () => Promise.resolve({ items: [{ metadata: { name: 'owned-ns' } }] }),
      abort: jest.fn(),
    });
    // ...while Loki exposes an extra namespace the user has log access to.
    mockExecuteLabelValue.mockReturnValue({
      request: () => Promise.resolve({ data: ['owned-ns', 'granted-ns'] }),
      abort: jest.fn(),
    });

    const values = await getNamespaceOptions('owned-ns');

    expect(values).toContain('owned-ns');
    expect(values).toContain('granted-ns');
  });

  it('still lists projects when the Loki label values query fails', async () => {
    mockCancellableFetch.mockReturnValue({
      request: () => Promise.resolve({ items: [{ metadata: { name: 'owned-ns' } }] }),
      abort: jest.fn(),
    });
    mockExecuteLabelValue.mockReturnValue({
      request: () => Promise.reject(new Error('forbidden')),
      abort: jest.fn(),
    });

    const values = await getNamespaceOptions('owned-ns');

    expect(values).toEqual(['owned-ns']);
  });

  it('includes the active namespace when projects is empty and Loki label values are forbidden', async () => {
    // Pure fine-grained access: no owned projects and the Loki gateway 403s the
    // unscoped label-values request, so only the active namespace remains (OU-578).
    mockCancellableFetch.mockReturnValue({
      request: () => Promise.resolve({ items: [] }),
      abort: jest.fn(),
    });
    mockExecuteLabelValue.mockReturnValue({
      request: () => Promise.reject(new Error("You don't have permission to access this tenant")),
      abort: jest.fn(),
    });

    const values = await getNamespaceOptions('test-1');

    expect(values).toEqual(['test-1']);
  });
});
