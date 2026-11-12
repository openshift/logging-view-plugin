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

const getNamespaceOptionsFn = (namespace?: string): (() => Promise<Option[]>) => {
  const attributes = availableDevConsoleAttributes(
    'application',
    {} as Config,
    Schema.viaq,
    namespace,
  );
  const namespaceAttribute = attributes.find((attribute) => attribute.id === 'namespace');
  return namespaceAttribute?.options as () => Promise<Option[]>;
};

const getNamespaceOptions = async (namespace: string): Promise<string[]> => {
  const options = await getNamespaceOptionsFn(namespace)();
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

describe('Namespace options progressive loading', () => {
  type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: Error) => void };
  const deferred = <T>(): Deferred<T> => {
    let resolve!: (v: T) => void;
    let reject!: (e: Error) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const values = (options: Option[]) => options.map((option) => option.value);

  type OptionsFn = (filters?: unknown, onPartial?: (o: Option[]) => void) => Promise<Option[]>;

  const setup = (namespace?: string) => {
    const projects = deferred<{ items: Array<{ metadata: { name: string } }> }>();
    const loki = deferred<{ data: string[] }>();
    mockCancellableFetch.mockReturnValue({ request: () => projects.promise, abort: jest.fn() });
    mockExecuteLabelValue.mockReturnValue({ request: () => loki.promise, abort: jest.fn() });
    const optionsFn = getNamespaceOptionsFn(namespace) as unknown as OptionsFn;
    return { projects, loki, optionsFn };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports projects as a partial result while Loki is still pending', async () => {
    const { projects, loki, optionsFn } = setup();
    const onPartial = jest.fn();
    let settled = false;

    const result = optionsFn(undefined, onPartial).then((options) => {
      settled = true;
      return options;
    });

    projects.resolve({ items: [{ metadata: { name: 'owned-ns' } }] });
    await flush();

    expect(settled).toBe(false);
    expect(onPartial).toHaveBeenCalledTimes(1);
    expect(values(onPartial.mock.calls[0][0])).toEqual(['owned-ns']);

    loki.resolve({ data: ['granted-ns', 'owned-ns'] });

    expect(values(await result)).toEqual(['granted-ns', 'owned-ns']);
    // the final list is delivered through the promise, not as another partial
    expect(onPartial).toHaveBeenCalledTimes(1);
  });

  it('reports Loki namespaces as a partial result when projects is slower', async () => {
    const { projects, loki, optionsFn } = setup();
    const onPartial = jest.fn();

    const result = optionsFn(undefined, onPartial);

    loki.resolve({ data: ['granted-ns'] });
    await flush();

    expect(values(onPartial.mock.calls[0][0])).toEqual(['granted-ns']);

    projects.resolve({ items: [{ metadata: { name: 'owned-ns' } }] });

    expect(values(await result)).toEqual(['granted-ns', 'owned-ns']);
  });

  it('reports the seed namespace immediately', () => {
    const { optionsFn } = setup('test-1');
    const onPartial = jest.fn();

    optionsFn(undefined, onPartial);

    expect(onPartial).toHaveBeenCalledTimes(1);
    expect(values(onPartial.mock.calls[0][0])).toEqual(['test-1']);
  });

  it('does not report a partial for a rejected source', async () => {
    const { projects, loki, optionsFn } = setup();
    const onPartial = jest.fn();

    const result = optionsFn(undefined, onPartial);

    loki.reject(new Error('forbidden'));
    await flush();
    expect(onPartial).not.toHaveBeenCalled();

    projects.resolve({ items: [{ metadata: { name: 'owned-ns' } }] });

    expect(values(await result)).toEqual(['owned-ns']);
    expect(onPartial).not.toHaveBeenCalled();
  });
});
