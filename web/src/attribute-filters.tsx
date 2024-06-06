import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { getInitialTenantFromNamespace, notEmptyString, notUndefined } from './value-utils';
import { cancellableFetch } from './cancellable-fetch';
import { AttributeList, Filters, Option } from './components/filters/filter.types';
import { LogQLQuery, LabelMatcher, PipelineStage } from './logql-query';
import { Severity, severityAbbreviations, severityFromString } from './severity';
import { executeLabelValue } from './loki-client';
import { Config } from './logs.types';

const RESOURCES_ENDPOINT = '/api/kubernetes/api/v1';

type K8sResource = K8sResourceCommon & {
  spec?: { containers: Array<{ name: string }> };
};

type K8sResourceListResponse = {
  kind: string;
  apiVersion: string;
  metadata: {
    resourceVersion: string;
    continue: string;
    remainingItemCount: number;
  };
  items: Array<K8sResource>;
};

type ResourceOptionMapper = (resource: K8sResource) => Option | Array<Option>;

const resourceAbort: Record<string, null | (() => void)> = {};

const projectsDataSource = () => async (): Promise<Array<{ option: string; value: string }>> => {
  const { request, abort } = cancellableFetch<K8sResourceListResponse>(
    `/api/kubernetes/apis/project.openshift.io/v1/projects`,
  );

  if (resourceAbort.projects) {
    resourceAbort.projects();
  }

  resourceAbort.projects = abort;

  const response = await request();

  return response.items
    .map((project) => ({
      option: project?.metadata?.name ?? '',
      value: project?.metadata?.name ?? '',
    }))
    .filter(({ value }) => notEmptyString(value));
};

const lokiLabelValuesDataSource =
  ({
    config,
    query,
    labelName,
    tenant,
  }: {
    config: Config;
    query?: string;
    labelName: string;
    tenant: string;
  }) =>
  async (): Promise<Array<{ option: string; value: string }>> => {
    const { abort, request } = executeLabelValue({ query, labelName, tenant, config });

    if (resourceAbort.lokiLabels) {
      resourceAbort.lokiLabels();
    }

    resourceAbort.lokiLabels = abort;

    const response = await request();

    const uniqueValues = new Set<string>(response.data);
    const sortedValues = Array.from(uniqueValues).sort();

    return sortedValues
      .map((label) => ({
        option: label,
        value: label,
      }))
      .filter(({ value }) => notEmptyString(value));
  };

const resourceDataSource =
  ({
    resource,
    namespace,
    mapper = (resourceToMap) => ({
      option: resourceToMap?.metadata?.name ?? '',
      value: resourceToMap?.metadata?.name ?? '',
    }),
  }: {
    resource: 'pods' | 'namespaces' | string;
    namespace?: string;
    mapper?: ResourceOptionMapper;
  }) =>
  async (): Promise<Array<{ option: string; value: string }>> => {
    const endpoint = namespace
      ? `${RESOURCES_ENDPOINT}/namespaces/${namespace}/${resource}`
      : `${RESOURCES_ENDPOINT}/${resource}`;

    const { request, abort } = cancellableFetch<K8sResourceListResponse>(endpoint);

    const abortFunction = resourceAbort[resource];
    if (abortFunction) {
      abortFunction();
    }

    resourceAbort[resource] = abort;

    const response = await request();

    const kind = response.kind;
    let listItems: Array<K8sResource> = [];

    switch (kind) {
      case 'Pod':
        listItems = [response];
        break;
      case 'NamespaceList':
      case 'PodList':
        listItems = response.items;
        break;
    }

    return listItems.flatMap(mapper).filter(({ value }) => notEmptyString(value));
  };

// The logs-page and the logs-dev-page both need a default set of attributes to pass
// to queryFromFilters and filtersFromQuery which only need id and label
export const initialAvailableAttributes: AttributeList = [
  {
    name: 'Namespaces',
    label: 'kubernetes_namespace_name',
    id: 'namespace',
    valueType: 'checkbox-select',
  },
  {
    name: 'Pods',
    label: 'kubernetes_pod_name',
    id: 'pod',
    valueType: 'checkbox-select',
  },
  {
    name: 'Containers',
    label: 'kubernetes_container_name',
    id: 'container',
    valueType: 'checkbox-select',
  },
];

export const availableAttributes = (tenant: string, config: Config): AttributeList => [
  {
    name: 'Content',
    id: 'content',
    valueType: 'text',
  },
  {
    name: 'Namespaces',
    label: 'kubernetes_namespace_name',
    id: 'namespace',
    options: resourceDataSource({ resource: 'namespaces' }),
    valueType: 'checkbox-select',
  },
  {
    name: 'Pods',
    label: 'kubernetes_pod_name',
    id: 'pod',
    options: lokiLabelValuesDataSource({
      config,
      tenant,
      labelName: 'kubernetes_pod_name',
    }),
    valueType: 'checkbox-select',
  },
  {
    name: 'Containers',
    label: 'kubernetes_container_name',
    id: 'container',
    options: resourceDataSource({
      resource: 'pods',
      mapper: (resource) =>
        resource?.spec?.containers.map((container) => ({
          option: `${resource?.metadata?.name} / ${container.name}`,
          value: container.name,
        })) ?? [],
    }),
    valueType: 'checkbox-select',
  },
];

export const availableDevConsoleAttributes = (tenant: string, config: Config): AttributeList => [
  {
    name: 'Content',
    id: 'content',
    valueType: 'text',
  },
  {
    name: 'Namespaces',
    label: 'kubernetes_namespace_name',
    id: 'namespace',
    options: projectsDataSource(),
    valueType: 'checkbox-select',
  },
  {
    name: 'Pods',
    label: 'kubernetes_pod_name',
    id: 'pod',
    options: lokiLabelValuesDataSource({
      config,
      tenant,
      labelName: 'kubernetes_pod_name',
    }),
    valueType: 'checkbox-select',
  },
  {
    name: 'Containers',
    label: 'kubernetes_container_name',
    id: 'container',
    options: lokiLabelValuesDataSource({
      config,
      tenant,
      labelName: 'kubernetes_container_name',
    }),
    valueType: 'checkbox-select',
  },
];

export const availablePodAttributes = (
  namespace: string,
  podId: string,
  config: Config,
): AttributeList => [
  {
    name: 'Content',
    id: 'content',
    valueType: 'text',
  },
  {
    name: 'Containers',
    label: 'kubernetes_container_name',
    id: 'container',
    options: lokiLabelValuesDataSource({
      config,
      query: `{ kubernetes_pod_name="${podId}" }`,
      labelName: 'kubernetes_container_name',
      tenant: getInitialTenantFromNamespace(namespace),
    }),
    valueType: 'checkbox-select',
  },
];

export const queryFromFilters = ({
  existingQuery,
  filters,
  attributes,
  tenant,
}: {
  existingQuery: string;
  filters?: Filters;
  attributes: AttributeList;
  tenant?: string;
}): string => {
  const query = new LogQLQuery(existingQuery);

  if (!filters) {
    return query.toString();
  }

  if (tenant) {
    query.addSelectorMatcher({ label: 'log_type', operator: '=', value: `"${tenant}"` });
  }

  const contentPipelineStage = getContentPipelineStage(filters);

  if (contentPipelineStage) {
    query.removePipelineStage({ operator: '|=' }).addPipelineStage(contentPipelineStage, {
      placement: 'start',
    });
  }

  if (filters?.content === undefined || filters.content.size === 0) {
    query.removePipelineStage({ operator: '|=' });
  }

  const severityPipelineStage = getSeverityFilterPipelineStage(filters);

  if (severityPipelineStage) {
    query.removePipelineStage({}, { matchLabel: 'level' }).addPipelineStage(severityPipelineStage, {
      placement: 'end',
    });
  }

  if (filters?.severity === undefined || filters.severity.size === 0) {
    query.removePipelineStage({}, { matchLabel: 'level' });
  }

  query.addSelectorMatcher(getMatchersFromFilters(filters));

  attributes.forEach(({ id, label }) => {
    if (label) {
      const filterValue = filters?.[id];
      if (filterValue === undefined || filterValue.size === 0) {
        query.removeSelectorMatcher({ label });
      }
    }
  });

  return query.toString();
};

const removeQuotes = (value?: string) => (value ? value.replace(/"/g, '') : '');
const removeBacktick = (value?: string) => (value ? value.replace(/`/g, '') : '');

export const filtersFromQuery = ({
  query,
  attributes,
}: {
  query?: string;
  attributes: AttributeList;
}): Filters => {
  const filters: Filters = {};
  const logQLQuery = new LogQLQuery(query ?? '');

  for (const { label, id } of attributes) {
    if (label && label.length > 0) {
      for (const selector of logQLQuery.streamSelector) {
        if (selector.label === label && selector.value) {
          filters[id] = new Set(selector.value.split('|').map(removeQuotes));
        }
      }
    }
  }

  for (const pipelineStage of logQLQuery.pipeline) {
    if (
      pipelineStage.operator === '|' &&
      pipelineStage.labelsInFilter?.every(({ label }) => label === 'level') &&
      !filters.severity
    ) {
      const severityValues: Array<Severity> = pipelineStage.labelsInFilter
        .flatMap(({ value }) => (value ? value.split('|') : []))
        .map(removeQuotes)
        .map(severityFromString)
        .filter(notUndefined);
      filters.severity = new Set(severityValues);
    } else if (pipelineStage.operator === '|=' && !filters.content) {
      filters.content = new Set([removeBacktick(pipelineStage.value)]);
    }
  }

  return filters;
};

export const getNamespaceMatcher = (namespace?: string): LabelMatcher | undefined => {
  if (namespace === undefined) {
    return undefined;
  }

  return {
    label: 'kubernetes_namespace_name',
    operator: '=',
    value: `"${namespace}"`,
  };
};

const isK8sValueARegex = (value: string) => {
  // Regex to test if a string contains a regex matching a k8s name value
  const testRegex = /[{}()[\]^$*+?|/\\]|\.[*+?]/;
  return testRegex.test(value);
};

export const queryWithNamespace = ({ query, namespace }: { query: string; namespace?: string }) => {
  const logQLQuery = new LogQLQuery(query ?? '');

  logQLQuery.addSelectorMatcher(getNamespaceMatcher(namespace));

  return logQLQuery.toString();
};

export const getK8sMatcherFromSet = (
  label: string,
  values: Set<string>,
): LabelMatcher | undefined => {
  const valuesArray = Array.from(values);
  if (valuesArray.length === 0) {
    return undefined;
  }

  if (valuesArray.length === 1) {
    const value = valuesArray[0];

    return {
      label,
      operator: isK8sValueARegex(value) ? '=~' : '=',
      value: `"${value}"`,
    };
  }

  return {
    label,
    operator: '=~',
    value: `"${valuesArray.join('|')}"`,
  };
};

export const getMatchersFromFilters = (filters?: Filters): Array<LabelMatcher> => {
  if (!filters) {
    return [];
  }

  const matchers: Array<LabelMatcher | undefined> = [];

  for (const key of Object.keys(filters)) {
    const value = filters[key];
    if (value) {
      switch (key) {
        case 'namespace':
          matchers.push(getK8sMatcherFromSet('kubernetes_namespace_name', value));
          break;
        case 'pod':
          matchers.push(getK8sMatcherFromSet('kubernetes_pod_name', value));
          break;
        case 'container':
          matchers.push(getK8sMatcherFromSet('kubernetes_container_name', value));
          break;
      }
    }
  }

  return matchers.filter(notUndefined);
};

export const getContentPipelineStage = (filters?: Filters): PipelineStage | undefined => {
  if (!filters) {
    return undefined;
  }

  const content = filters.content;

  if (!content) {
    return undefined;
  }

  const [textValue] = content;

  if (textValue === undefined) {
    return undefined;
  }

  return { operator: '|=', value: `\`${textValue}\`` };
};

export const getSeverityFilterPipelineStage = (filters?: Filters): PipelineStage | undefined => {
  if (!filters) {
    return undefined;
  }

  const severity = filters.severity;

  if (!severity) {
    return undefined;
  }

  const unknownFilter = severity.has('unknown') ? 'level="unknown" or level=""' : '';

  const severityFilters = Array.from(severity).flatMap((group: string | undefined) => {
    if (group === 'unknown' || group === undefined) {
      return [];
    }

    return severityAbbreviations[group as Severity];
  });

  const levelsfilter = severityFilters.length > 0 ? `level=~"${severityFilters.join('|')}"` : '';

  const allFilters = [unknownFilter, levelsfilter].filter(notEmptyString);

  return allFilters.length > 0 ? { operator: '|', value: allFilters.join(' or ') } : undefined;
};
