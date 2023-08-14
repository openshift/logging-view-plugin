import {
  filtersFromQuery,
  getContentPipelineStage,
  getMatcherFromSet,
  getMatchersFromFilters,
  getNamespaceMatcher,
  getSeverityFilterPipelineStage,
  queryFromFilters,
} from '../attribute-filters';
import { AttributeList } from '../components/filters/filter.types';

export const availableAttributes: AttributeList = [
  {
    name: 'Content',
    id: 'content',
    valueType: 'text',
  },
  {
    name: 'Namespaces',
    label: 'kubernetes_namespace_name',
    id: 'namespace',
    options: () =>
      Promise.resolve([
        { option: 'Namespace 1', value: 'namespace-1' },
        { option: 'Namespace 2', value: 'namespace-2' },
      ]),
    valueType: 'checkbox-select',
  },
  {
    name: 'Pods',
    label: 'kubernetes_pod_name',
    id: 'pod',
    options: () =>
      Promise.resolve([
        { option: 'Pod 1', value: 'pod-1' },
        { option: 'Pod 2', value: 'pod-2' },
      ]),
    valueType: 'checkbox-select',
  },
  {
    name: 'Containers',
    label: 'kubernetes_container_name',
    id: 'container',
    options: () =>
      Promise.resolve([
        { option: 'Container 1', value: 'container-1' },
        { value: 'container-2', option: 'Container 2' },
      ]),
    valueType: 'checkbox-select',
  },
];

describe('Attribute filters', () => {
  it('should return matchers from filters', () => {
    [
      {
        filters: {},
        expected: [],
      },
      {
        filters: {
          namespace: new Set(['my-namespace', 'other-namespace']),
        },
        expected: [
          {
            label: 'kubernetes_namespace_name',
            operator: '=~',
            value: '"my-namespace|other-namespace"',
          },
        ],
      },
      {
        filters: {
          namespace: new Set(['my-namespace', 'other-namespace']),
          pod: new Set(['pod-1', 'pod-2']),
          container: new Set(['container-1', 'container-2']),
        },
        expected: [
          {
            label: 'kubernetes_namespace_name',
            operator: '=~',
            value: '"my-namespace|other-namespace"',
          },
          {
            label: 'kubernetes_pod_name',
            operator: '=~',
            value: '"pod-1|pod-2"',
          },
          {
            label: 'kubernetes_container_name',
            operator: '=~',
            value: '"container-1|container-2"',
          },
        ],
      },
    ].forEach(({ filters, expected }) => {
      const matchers = getMatchersFromFilters(filters);
      expect(matchers).toEqual(expected);
    });
  });

  it('should get content pipeline stage from filters', () => {
    [
      {
        filters: {},
        expected: undefined,
      },
      {
        filters: {
          content: new Set(['my search query']),
        },
        expected: { operator: '|=', value: '`my search query`' },
      },
    ].forEach(({ filters, expected }) => {
      const pipeline = getContentPipelineStage(filters);
      expect(pipeline).toEqual(expected);
    });
  });

  test('getSelectorFromSet', () => {
    [
      {
        label: 'test',
        set: new Set<string>(),
        expected: undefined,
      },
      {
        label: 'test',
        set: new Set<string>(['']),
        expected: { label: 'test', operator: '=', value: '""' },
      },
      {
        label: 'test',
        set: new Set(['value']),
        expected: { label: 'test', operator: '=', value: '"value"' },
      },
      {
        label: 'test',
        set: new Set(['value-1', 'value-2']),
        expected: { label: 'test', operator: '=~', value: '"value-1|value-2"' },
      },
    ].forEach(({ set, label, expected }) => {
      const selectors = getMatcherFromSet(label, set);
      expect(selectors).toEqual(expected);
    });
  });

  test('getNamespaceStreamSelector', () => {
    [
      {
        namespace: 'my-namespace',
        expected: {
          label: 'kubernetes_namespace_name',
          operator: '=',
          value: '"my-namespace"',
        },
      },
      {
        namespace: '',
        expected: {
          label: 'kubernetes_namespace_name',
          operator: '=',
          value: '""',
        },
      },
      {
        namespace: undefined,
        expected: undefined,
      },
    ].forEach(({ namespace, expected }) => {
      const selectors = getNamespaceMatcher(namespace);
      expect(selectors).toEqual(expected);
    });
  });

  test('getSeverityFilterPipeline', () => {
    [
      {
        filters: undefined,
        expected: undefined,
      },
      {
        filters: {},
        expected: undefined,
      },
      {
        filters: { severity: undefined },
        expected: undefined,
      },
      {
        filters: {
          severity: new Set(['error']),
        },
        expected: { operator: '|', value: 'level=~"error|err|eror"' },
      },
      {
        filters: {
          severity: new Set(['error', 'info']),
        },
        expected: {
          operator: '|',
          value: 'level=~"error|err|eror|info|inf|information|notice"',
        },
      },
      {
        filters: {
          severity: new Set(['error', 'info', 'unknown']),
        },
        expected: {
          operator: '|',
          value:
            'level="unknown" or level="" or level=~"error|err|eror|info|inf|information|notice"',
        },
      },
      {
        filters: {
          severity: new Set(['unknown']),
        },
        expected: {
          operator: '|',
          value: 'level="unknown" or level=""',
        },
      },
    ].forEach(({ filters, expected }) => {
      const pipeline = getSeverityFilterPipelineStage(filters);
      expect(pipeline).toEqual(expected);
    });
  });

  test('filtersFromQuery', () => {
    [
      {
        query: undefined,
        expectedFilters: {},
      },
      {
        query: '{',
        expectedFilters: {},
      },
      {
        query: '{ foo="var" }',
        expectedFilters: {},
      },
      {
        query: '{ kubernetes_pod_name }',
        expectedFilters: {},
      },
      {
        query: '{ kubernetes_pod_name= }',
        expectedFilters: {},
      },
      {
        query: '{ kubernetes_pod_name=" }',
        expectedFilters: {},
      },
      {
        query: '{ kubernetes_pod_name="a-pod }',
        expectedFilters: {},
      },
      {
        query: '{ kubernetes_pod_name="a-pod" }',
        expectedFilters: { pod: new Set(['a-pod']) },
      },
      {
        query: '{ kubernetes_pod_name=~"a-pod|b-pod" }',
        expectedFilters: { pod: new Set(['a-pod', 'b-pod']) },
      },
      {
        query:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test" } |=`some line content` | other="filter" | level="inf"',
        expectedFilters: {
          pod: new Set(['a-pod', 'b-pod']),
          namespace: new Set(['ns-1', 'ns-2']),
          content: new Set([`some line content`]),
          severity: new Set(['info']),
        },
      },
      {
        query: '{ kubernetes_pod_name=~"a-pod|b-pod", ',
        expectedFilters: {
          pod: new Set(['a-pod', 'b-pod']),
        },
      },
      {
        query: '{ kubernetes_pod_name=~"a-pod|b-pod" } |',
        expectedFilters: {
          pod: new Set(['a-pod', 'b-pod']),
        },
      },
      {
        query: '{ kubernetes_pod_name=~"a-pod|b-pod" } |=',
        expectedFilters: {
          content: new Set(['']),
          pod: new Set(['a-pod', 'b-pod']),
        },
      },
      {
        query: '{ kubernetes_pod_name=~"a-pod|b-pod" } |=`some line',
        expectedFilters: {
          content: new Set(['']),
          pod: new Set(['a-pod', 'b-pod']),
        },
      },
      {
        query: '{ kubernetes_pod_name=~"a-pod|b-pod" } |=`some line` |',
        expectedFilters: {
          content: new Set([`some line`]),
          pod: new Set(['a-pod', 'b-pod']),
        },
      },
      {
        query:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |=`some line content` | other="filter" | level="err|eror" or level="unknown" or level=""',
        expectedFilters: {
          pod: new Set(['a-pod', 'b-pod']),
          namespace: new Set(['ns-1', 'ns-2']),
          container: new Set(['container-1']),
          content: new Set([`some line content`]),
          severity: new Set(['error', 'unknown']),
        },
      },
      {
        query:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |=`some line content` | other="filter" | level',
        expectedFilters: {
          pod: new Set(['a-pod', 'b-pod']),
          namespace: new Set(['ns-1', 'ns-2']),
          container: new Set(['container-1']),
          content: new Set([`some line content`]),
          severity: new Set(),
        },
      },
      {
        query:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |=`"some line content"` | other="filter" | level',
        expectedFilters: {
          pod: new Set(['a-pod', 'b-pod']),
          namespace: new Set(['ns-1', 'ns-2']),
          container: new Set(['container-1']),
          content: new Set([`"some line content"`]),
          severity: new Set(),
        },
      },
      {
        query:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |=`"some-line-content"` | other="filter" | level',
        expectedFilters: {
          pod: new Set(['a-pod', 'b-pod']),
          namespace: new Set(['ns-1', 'ns-2']),
          container: new Set(['container-1']),
          content: new Set([`"some-line-content"`]),
          severity: new Set(),
        },
      },
    ].forEach(({ query, expectedFilters }) => {
      const filters = filtersFromQuery({
        query,
        attributes: availableAttributes,
      });
      expect(filters).toEqual(expectedFilters);
    });
  });

  test('query from filters', () => {
    [
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level="err|eror" or level="unknown" or level=""',
        filters: undefined,
        expectedQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |= "some line content" | other="filter" | level="err|eror" or level="unknown" or level=""',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level="err|eror" or level="unknown" or level=""',
        filters: {},
        expectedQuery: '{ label="test" } | other="filter"',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level="err|eror" or level="unknown" or level=""',
        filters: {
          namespace: new Set(['namespace-3']),
        },
        expectedQuery: '{ kubernetes_namespace_name="namespace-3", label="test" } | other="filter"',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level="err|eror" or level="unknown" or level=""',
        filters: {
          namespace: new Set(['namespace-3', 'namespace-4']),
          severity: new Set(['unknown', 'error']),
        },
        expectedQuery:
          '{ kubernetes_namespace_name=~"namespace-3|namespace-4", label="test" } | other="filter" | level="unknown" or level="" or level=~"error|err|eror"',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" |  level="unknown" or level="" or level=~"err|error|eror"',
        filters: {
          namespace: new Set(['namespace-3', 'namespace-4']),
          content: new Set(['new line filter']),
          severity: new Set(['error', 'unknown']),
        },
        expectedQuery:
          '{ kubernetes_namespace_name=~"namespace-3|namespace-4", label="test" } |= `new line filter` | other="filter" | level="unknown" or level="" or level=~"error|err|eror"',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level=~"err|error|eror" or level="unknown" or level=""',
        filters: {
          namespace: new Set(['namespace-3', 'namespace-4']),
          content: new Set(['new line filter']),
          severity: new Set(['error']),
        },
        expectedQuery:
          '{ kubernetes_namespace_name=~"namespace-3|namespace-4", label="test" } |= `new line filter` | other="filter" | level=~"error|err|eror"',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level=~"err|error|eror" or level="unknown" or level=""',
        filters: {
          namespace: new Set(['namespace-3', 'namespace-4']),
          content: new Set(['new line filter']),
          severity: new Set(['error', 'info']),
          pod: new Set(['some-pod']),
        },
        expectedQuery:
          '{ kubernetes_pod_name="some-pod", kubernetes_namespace_name=~"namespace-3|namespace-4", label="test" } |= `new line filter` | other="filter" | level=~"error|err|eror|info|inf|information|notice"',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level=~"err|error|eror" or level="unknown" or level=""',
        filters: {
          namespace: new Set(['namespace-3', 'namespace-4']),
          content: new Set(['new line filter']),
          severity: new Set<string>(),
          pod: new Set(['some-pod']),
        },
        expectedQuery:
          '{ kubernetes_pod_name="some-pod", kubernetes_namespace_name=~"namespace-3|namespace-4", label="test" } |= `new line filter` | other="filter"',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level=~"err|error|eror" or level="unknown" or level=""',
        filters: {
          namespace: new Set(['namespace-3', 'namespace-4']),
          content: new Set<string>(),
          severity: new Set<string>(),
          pod: new Set(['some-pod']),
        },
        expectedQuery:
          '{ kubernetes_pod_name="some-pod", kubernetes_namespace_name=~"namespace-3|namespace-4", label="test" } | other="filter"',
      },
      {
        initialQuery:
          '{ kubernetes_pod_name=~"a-pod|b-pod", kubernetes_namespace_name=~"ns-1|ns-2", label="test", kubernetes_container_name="container-1" } |="some line content" | other="filter" | level=~"err|error|eror" or level="unknown" or level=""',
        filters: {
          namespace: new Set(['namespace-3', 'namespace-4']),
          content: new Set<string>(),
          severity: new Set<string>(),
          pod: new Set<string>(),
        },
        expectedQuery:
          '{ kubernetes_namespace_name=~"namespace-3|namespace-4", label="test" } | other="filter"',
      },
    ].forEach(({ initialQuery, filters, expectedQuery }) => {
      expect(
        queryFromFilters({
          existingQuery: initialQuery,
          filters,
          attributes: availableAttributes,
        }),
      ).toEqual(expectedQuery);
    });
  });
});
