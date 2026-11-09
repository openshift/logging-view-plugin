jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({ K8sResourceCommon: {} }));
jest.mock('../cancellable-fetch', () => ({ cancellableFetch: jest.fn() }));
jest.mock('../loki-client', () => ({ executeLabelValue: jest.fn(), executeSeries: jest.fn() }));

import { availableAttributes, availableDevConsoleAttributes } from '../attribute-filters';
import { cancellableFetch } from '../cancellable-fetch';
import {
  AttributeList,
  Filters,
  OnPartialOptions,
  Option,
} from '../components/filters/filter.types';
import { executeLabelValue, executeSeries } from '../loki-client';
import { Config, Schema } from '../logs.types';

const mockCancellableFetch = cancellableFetch as jest.Mock;
const mockExecuteLabelValue = executeLabelValue as jest.Mock;
const mockExecuteSeries = executeSeries as jest.Mock;

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

type OptionsFn = (filters?: Filters, onPartial?: OnPartialOptions) => Promise<Option[]>;
const optionsOf = (attributes: AttributeList, id: string): OptionsFn =>
  attributes.find((attribute) => attribute.id === id)?.options as OptionsFn;

const adminAttributes = () =>
  availableAttributes({
    tenant: 'application',
    config: {} as Config,
    schema: Schema.viaq,
    t: (key) => key,
  });

const podList = (pods: Array<{ name: string; namespace: string; containers?: string[] }>) => ({
  kind: 'PodList',
  items: pods.map(({ name, namespace, containers = [] }) => ({
    metadata: { name, namespace },
    spec: { containers: containers.map((c) => ({ name: c })) },
  })),
});

type PodListResponse = ReturnType<typeof podList>;

describe('Pod and container options progressive loading', () => {
  let k8s: Deferred<PodListResponse>;
  let lokiLabels: Deferred<{ data: string[] }>;
  let lokiSeries: Deferred<{ data: Array<Record<string, string>> }>;

  beforeEach(() => {
    jest.clearAllMocks();
    k8s = deferred();
    lokiLabels = deferred();
    lokiSeries = deferred();
    mockCancellableFetch.mockReturnValue({ request: () => k8s.promise, abort: jest.fn() });
    mockExecuteLabelValue.mockReturnValue({ request: () => lokiLabels.promise, abort: jest.fn() });
    mockExecuteSeries.mockReturnValue({ request: () => lokiSeries.promise, abort: jest.fn() });
  });

  describe('admin view', () => {
    it('reports k8s pods as a partial result while Loki is still pending', async () => {
      const onPartial = jest.fn();
      let settled = false;
      const result = optionsOf(adminAttributes(), 'pod')({}, onPartial).then((options) => {
        settled = true;
        return options;
      });

      k8s.resolve(podList([{ name: 'pod-a', namespace: 'my-app' }]));
      await flush();

      expect(settled).toBe(false);
      expect(onPartial).toHaveBeenCalledTimes(1);
      expect(values(onPartial.mock.calls[0][0])).toEqual(['pod-a']);

      lokiLabels.resolve({ data: ['pod-b', 'pod-a'] });

      expect(values(await result)).toEqual(['pod-a', 'pod-b']);
      expect(onPartial).toHaveBeenCalledTimes(1);
    });

    it('reports Loki pods as a partial result when k8s is slower', async () => {
      const onPartial = jest.fn();
      const result = optionsOf(adminAttributes(), 'pod')({}, onPartial);

      lokiLabels.resolve({ data: ['pod-b'] });
      await flush();

      expect(values(onPartial.mock.calls[0][0])).toEqual(['pod-b']);

      k8s.resolve(podList([{ name: 'pod-a', namespace: 'my-app' }]));

      expect(values(await result)).toEqual(['pod-a', 'pod-b']);
    });

    it('reports Loki series containers as a partial result while k8s is pending', async () => {
      const onPartial = jest.fn();
      const result = optionsOf(adminAttributes(), 'container')({}, onPartial);

      lokiSeries.resolve({
        data: [{ kubernetes_pod_name: 'pod-b', kubernetes_container_name: 'c2' }],
      });
      await flush();

      expect(values(onPartial.mock.calls[0][0])).toEqual(['pod-b / c2']);

      k8s.resolve(podList([{ name: 'pod-a', namespace: 'my-app', containers: ['c1'] }]));

      expect(values(await result)).toEqual(['pod-a / c1', 'pod-b / c2']);
    });

    it('does not report a partial for a rejected source', async () => {
      const onPartial = jest.fn();
      const result = optionsOf(adminAttributes(), 'pod')({}, onPartial);

      lokiLabels.reject(new Error('forbidden'));
      await flush();
      expect(onPartial).not.toHaveBeenCalled();

      k8s.resolve(podList([{ name: 'pod-a', namespace: 'my-app' }]));

      expect(values(await result)).toEqual(['pod-a']);
      expect(onPartial).not.toHaveBeenCalled();
    });
  });

  describe('developer view', () => {
    const devAttributes = () =>
      availableDevConsoleAttributes('application', {} as Config, Schema.viaq, 'my-app');

    it('reports k8s pods as a partial result while Loki is still pending', async () => {
      const onPartial = jest.fn();
      const result = optionsOf(devAttributes(), 'pod')({}, onPartial);

      k8s.resolve(podList([{ name: 'pod-a', namespace: 'my-app' }]));
      await flush();

      expect(values(onPartial.mock.calls[0][0])).toEqual(['pod-a']);

      lokiLabels.resolve({ data: ['pod-b'] });

      expect(values(await result)).toEqual(['pod-a', 'pod-b']);
    });

    it('reports Loki containers as a partial result while k8s is pending', async () => {
      const onPartial = jest.fn();
      const result = optionsOf(devAttributes(), 'container')({}, onPartial);

      lokiLabels.resolve({ data: ['c2'] });
      await flush();

      expect(values(onPartial.mock.calls[0][0])).toEqual(['c2']);

      k8s.resolve(podList([{ name: 'pod-a', namespace: 'my-app', containers: ['c1'] }]));

      expect(values(await result)).toEqual(['c1', 'c2']);
    });
  });
});
