jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({ K8sResourceCommon: {} }));
jest.mock('../cancellable-fetch', () => ({ cancellableFetch: jest.fn() }));
jest.mock('../loki-client', () => ({ executeLabelValue: jest.fn(), executeSeries: jest.fn() }));

import { availableAttributes, availableDevConsoleAttributes } from '../attribute-filters';
import { cancellableFetch } from '../cancellable-fetch';
import { Option } from '../components/filters/filter.types';
import { executeLabelValue } from '../loki-client';
import { Config } from '../logs.types';

const mockCancellableFetch = cancellableFetch as jest.Mock;
const mockExecuteLabelValue = executeLabelValue as jest.Mock;

const getNamespaceOptionsFn = (namespace?: string): (() => Promise<Option[]>) => {
  const attributes = availableDevConsoleAttributes('application', {} as Config, namespace);
  const namespaceAttribute = attributes.find((attribute) => attribute.id === 'namespace');
  return namespaceAttribute?.options as () => Promise<Option[]>;
};

const getNamespaceOptions = async (namespace: string): Promise<string[]> => {
  const options = await getNamespaceOptionsFn(namespace)();
  return options.map((option) => option.value);
};

const getAdminNamespaceOptionsFn = (): (() => Promise<Option[]>) => {
  const attributes = availableAttributes('application', {} as Config);
  const namespaceAttribute = attributes.find((attribute) => attribute.id === 'namespace');
  return namespaceAttribute?.options as () => Promise<Option[]>;
};

const getAdminNamespaceOptions = async (): Promise<string[]> => {
  const options = await getAdminNamespaceOptionsFn()();
  return options.map((option) => option.value);
};

describe('Developer view namespace options', () => {
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

  it('surfaces the error when both sources fail and there is no seed namespace', async () => {
    // Admin logs view passes no seed. A total enumeration failure must reject so
    // the caller can show an error, not resolve to a silent empty dropdown.
    mockCancellableFetch.mockReturnValue({
      request: () => Promise.reject(new Error('projects forbidden')),
      abort: jest.fn(),
    });
    mockExecuteLabelValue.mockReturnValue({
      request: () => Promise.reject(new Error('loki forbidden')),
      abort: jest.fn(),
    });

    await expect(getNamespaceOptionsFn()()).rejects.toThrow('projects forbidden');
  });
});

describe('Admin view namespace options', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockResourceByEndpoint = ({
    projects,
    namespaces,
  }: {
    projects: () => Promise<unknown>;
    namespaces: () => Promise<unknown>;
  }) => {
    mockCancellableFetch.mockImplementation((endpoint: string) => ({
      request: endpoint.includes('project.openshift.io') ? projects : namespaces,
      abort: jest.fn(),
    }));
  };

  it('lists projects when the cluster-scoped namespaces list is forbidden', async () => {
    // The real bug: a namespace-restricted user cannot list cluster-scoped
    // namespaces (403), but the projects API returns the namespaces they own.
    mockResourceByEndpoint({
      projects: () => Promise.resolve({ items: [{ metadata: { name: 'test-11' } }] }),
      namespaces: () => Promise.reject(new Error('namespaces is forbidden')),
    });
    mockExecuteLabelValue.mockReturnValue({
      request: () => Promise.reject(new Error('loki forbidden')),
      abort: jest.fn(),
    });

    const values = await getAdminNamespaceOptions();

    expect(values).toEqual(['test-11']);
  });

  it('merges namespaces from the projects API, the k8s namespaces API and Loki labels', async () => {
    mockResourceByEndpoint({
      projects: () => Promise.resolve({ items: [{ metadata: { name: 'ns-from-projects' } }] }),
      namespaces: () =>
        Promise.resolve({ kind: 'NamespaceList', items: [{ metadata: { name: 'ns-from-k8s' } }] }),
    });
    mockExecuteLabelValue.mockReturnValue({
      request: () => Promise.resolve({ data: ['ns-from-loki'] }),
      abort: jest.fn(),
    });

    const values = await getAdminNamespaceOptions();

    expect(values).toContain('ns-from-projects');
    expect(values).toContain('ns-from-k8s');
    expect(values).toContain('ns-from-loki');
  });
});
