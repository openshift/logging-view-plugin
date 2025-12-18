import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { cancellableFetch } from './cancellable-fetch';
import { Attribute, AttributeList, Filters, Option } from './components/filters/filter.types';
import { LabelMatcher, LogQLQuery, PipelineStage } from './logql-query';
import { Config, Schema, SeriesResponse } from './logs.types';
import { executeLabelValue, executeSeries } from './loki-client';
import { getStreamLabelsFromSchema, ResourceLabel } from './parse-resources';
import { Severity, severityAbbreviations, severityFromString } from './severity';
import {
  getInitialTenantFromNamespace,
  namespaceBelongsToInfrastructureTenant,
  notEmptyString,
  notUndefined,
} from './value-utils';

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
type ResourceOptionFilter = (resource: K8sResource) => boolean;

const resourceAbort: Record<string, null | (() => void)> = {};

const projectsDataSource =
  (filter?: ResourceOptionFilter) =>
  async (): Promise<Array<{ option: string; value: string }>> => {
    const { request, abort } = cancellableFetch<K8sResourceListResponse>(
      `/api/kubernetes/apis/project.openshift.io/v1/projects`,
    );

    if (resourceAbort.projects) {
      resourceAbort.projects();
    }

    resourceAbort.projects = abort;

    const response = await request();

    const filteredItems = filter ? response.items.filter(filter) : response.items;

    return filteredItems
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

const lokiSeriesDataSource =
  ({
    config,
    match,
    tenant,
    mapper,
  }: {
    config: Config;
    match: Array<string>;
    tenant: string;
    mapper: (data: SeriesResponse) => Array<{ option: string; value: string }>;
  }) =>
  async (): Promise<Array<{ option: string; value: string }>> => {
    const { abort, request } = executeSeries({ match, tenant, config });

    if (resourceAbort.lokiSeries) {
      resourceAbort.lokiSeries();
    }

    resourceAbort.lokiSeries = abort;

    const response = await request();

    return mapper(response).filter(({ value }) => notEmptyString(value));
  };

const resourceDataSource =
  ({
    resource,
    namespace,
    mapper = (resourceToMap) => ({
      option: resourceToMap?.metadata?.name ?? '',
      value: resourceToMap?.metadata?.name ?? '',
    }),
    filter,
  }: {
    resource: 'pods' | 'namespaces' | string;
    namespace?: string;
    mapper?: ResourceOptionMapper;
    filter?: ResourceOptionFilter;
  }) =>
  async (): Promise<Array<{ option: string; value: string }>> => {
    const endpoint = namespace
      ? `${RESOURCES_ENDPOINT}/namespaces/${namespace}/${resource}`
      : `${RESOURCES_ENDPOINT}/${resource}`;

    const { request, abort } = cancellableFetch<K8sResourceListResponse>(endpoint);

    const abortKey = namespace ? `${resource}-${namespace}` : resource;

    const abortFunction = resourceAbort[abortKey];
    if (abortFunction) {
      abortFunction();
    }

    resourceAbort[abortKey] = abort;

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

    const filteredItems = filter ? listItems.filter(filter) : listItems;

    return filteredItems.flatMap(mapper).filter(({ value }) => notEmptyString(value));
  };

const getAttributeLabels = (schema: Schema) => {
  const labels = getStreamLabelsFromSchema(schema);
  const namespaceLabel = labels[ResourceLabel.Namespace];
  const podLabel = labels[ResourceLabel.Pod];
  const containerLabel = labels[ResourceLabel.Container];
  return { namespaceLabel, podLabel, containerLabel };
};

// The logs-page and the logs-dev-page both need a default set of attributes to pass
// to queryFromFilters and filtersFromQuery which only need id and label
export const initialAvailableAttributes = (schema: Schema): AttributeList => {
  const labels = getStreamLabelsFromSchema(schema);
  const namespaceLabel = labels[ResourceLabel.Namespace];
  const podLabel = labels[ResourceLabel.Pod];
  const containerLabel = labels[ResourceLabel.Container];

  return [
    {
      name: 'Namespaces',
      label: namespaceLabel,
      id: 'namespace',
      valueType: 'checkbox-select',
    },
    {
      name: 'Pods',
      label: podLabel,
      id: 'pod',
      valueType: 'checkbox-select',
    },
    {
      name: 'Containers',
      label: containerLabel,
      id: 'container',
      valueType: 'checkbox-select',
    },
  ];
};

export const availableAttributes = ({
  tenant,
  config,
  schema,
}: {
  tenant: string;
  config: Config;
  schema: Schema;
}): AttributeList => {
  const { namespaceLabel, podLabel, containerLabel } = getAttributeLabels(schema);

  const contentAttribute: Attribute = {
    name: 'Content',
    id: 'content',
    valueType: 'text',
  };

  // When tenant is audit, only the content attribute is available
  if (tenant === 'audit') {
    return [contentAttribute];
  }

  return [
    contentAttribute,
    {
      name: 'Namespaces',
      label: namespaceLabel,
      id: 'namespace',
      options: resourceDataSource({
        resource: 'namespaces',
        filter: (resource) => {
          switch (tenant) {
            case 'infrastructure':
              return namespaceBelongsToInfrastructureTenant(resource.metadata?.name || '');
            case 'application':
              return !namespaceBelongsToInfrastructureTenant(resource.metadata?.name || '');
          }

          return true;
        },
      }),
      valueType: 'checkbox-select',
    },
    {
      name: 'Pods',
      label: podLabel,
      id: 'pod',
      options: (filters) => {
        const selectedNamespaces = filters?.namespace ? Array.from(filters.namespace) : undefined;

        return getPodAttributeOptions(tenant, config, schema, selectedNamespaces)();
      },
      valueType: 'checkbox-select',
    },
    {
      name: 'Containers',
      label: containerLabel,
      id: 'container',
      options: (filters) => {
        const selectedNamespaces = filters?.namespace ? Array.from(filters.namespace) : undefined;

        return getContainerAttributeOptions(tenant, config, schema, selectedNamespaces)();
      },
      expandSelection: (selections) => {
        const podSelections = new Set<string>();
        const containerSelections = new Set<string>();

        for (const container of selections.values()) {
          if (container.includes(' / ')) {
            const [pod, containerName] = container.split(' / ');
            podSelections.add(pod);
            containerSelections.add(containerName);
          } else {
            containerSelections.add(container);
          }
        }

        return new Map([
          ['pod', podSelections],
          ['container', containerSelections],
        ]);
      },
      isItemSelected: (value, filters) => {
        if (!value.includes('/')) {
          return filters?.container?.has(value) ?? false;
        }

        const parts = value.split(' / ');
        if (parts.length !== 2) {
          return false;
        }

        const [pod, container] = parts;

        if (
          (!filters.pod || filters.pod.size === 0) &&
          filters.container &&
          filters.container.size > 0
        ) {
          return filters.container.has(container);
        }

        if (
          !filters.pod ||
          filters.pod.size === 0 ||
          !filters.container ||
          filters.container.size === 0
        ) {
          return false;
        }

        return filters.pod.has(pod) && filters.container.has(container);
      },
      valueType: 'checkbox-select',
    },
  ];
};

export const availableDevConsoleAttributes = (
  tenant: string,
  config: Config,
  schema: Schema,
): AttributeList => {
  const { namespaceLabel, podLabel, containerLabel } = getAttributeLabels(schema);

  const contentAttribute: Attribute = {
    name: 'Content',
    id: 'content',
    valueType: 'text',
  };

  // When tenant is audit, only the content attribute is available
  if (tenant === 'audit') {
    return [contentAttribute];
  }

  return [
    contentAttribute,
    {
      name: 'Namespaces',
      label: namespaceLabel,
      id: 'namespace',
      options: projectsDataSource((resource) => {
        switch (tenant) {
          case 'infrastructure':
            return namespaceBelongsToInfrastructureTenant(resource.metadata?.name || '');
          case 'application':
            return !namespaceBelongsToInfrastructureTenant(resource.metadata?.name || '');
        }

        return true;
      }),
      valueType: 'checkbox-select',
    },
    {
      name: 'Pods',
      label: podLabel,
      id: 'pod',
      options: lokiLabelValuesDataSource({
        config,
        tenant,
        labelName: podLabel,
      }),
      valueType: 'checkbox-select',
    },
    {
      name: 'Containers',
      label: containerLabel,
      id: 'container',
      options: lokiLabelValuesDataSource({
        config,
        tenant,
        labelName: containerLabel,
      }),
      valueType: 'checkbox-select',
    },
  ];
};

export const availablePodAttributes = (
  namespace: string,
  podId: string,
  config: Config,
  schema: Schema,
): AttributeList => {
  const streamLabels = getStreamLabelsFromSchema(schema);
  const namespaceLabel = streamLabels[ResourceLabel.Namespace];
  const podLabel = streamLabels[ResourceLabel.Pod];
  const containerLabel = streamLabels[ResourceLabel.Container];

  return [
    {
      name: 'Content',
      id: 'content',
      valueType: 'text',
    },
    {
      name: 'Pods',
      label: podLabel,
      id: 'pod',
      options: lokiLabelValuesDataSource({
        config,
        query: `{ ${namespaceLabel}="${namespace}" }`,
        labelName: podLabel,
        tenant: getInitialTenantFromNamespace(namespace),
      }),
      valueType: 'checkbox-select',
    },
    {
      name: 'Containers',
      label: containerLabel,
      id: 'container',
      options: lokiLabelValuesDataSource({
        config,
        query: `{ ${podLabel}="${podId}" }`,
        labelName: containerLabel,
        tenant: getInitialTenantFromNamespace(namespace),
      }),
      valueType: 'checkbox-select',
    },
  ];
};

export const queryFromFilters = ({
  existingQuery,
  filters,
  attributes,
  tenant,
  schema,
  addJSONParser,
}: {
  existingQuery: string;
  filters?: Filters;
  attributes: AttributeList;
  tenant?: string;
  schema: Schema;
  addJSONParser?: boolean;
}): string => {
  const query = new LogQLQuery(existingQuery);

  const streamLabels = getStreamLabelsFromSchema(schema);
  const tenantLabel = streamLabels[ResourceLabel.LogType];
  const severityLabel = streamLabels[ResourceLabel.Severity];

  if (!filters) {
    return query.toString();
  }

  if (tenant) {
    query.addSelectorMatcher({
      label: tenantLabel,
      operator: '=',
      value: `"${tenant}"`,
    });
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

  const severityPipelineStage = getSeverityFilterPipelineStage({ filters, schema });

  if (severityPipelineStage) {
    query
      .removePipelineStage({}, { matchLabel: `${severityLabel}` })
      .addPipelineStage(severityPipelineStage, {
        placement: 'end',
      });
  }

  if (filters?.severity === undefined || filters.severity.size === 0) {
    query.removePipelineStage({}, { matchLabel: `${severityLabel}` });
  }

  query.addSelectorMatcher(getMatchersFromFilters({ filters, schema }));

  attributes.forEach(({ id, label }) => {
    if (label) {
      const filterValue = filters?.[id];
      if (filterValue === undefined || filterValue.size === 0) {
        query.removeSelectorMatcher({ label });
      }
    }
  });

  // Remove the tenant label matcher if the query has other selectors
  if (tenant && query.streamSelector.filter((a) => a.label !== tenantLabel).length > 0) {
    query.removeSelectorMatcher({ label: tenantLabel });
  }

  if (schema === Schema.viaq && !!addJSONParser) {
    query.addPipelineStage({ operator: '| json' }, { placement: 'start' });
  }

  return query.toString();
};

const removeQuotes = (value?: string) => (value ? value.replace(/"/g, '') : '');
const removeBacktick = (value?: string) => (value ? value.replace(/`/g, '') : '');

export const filtersFromQuery = ({
  query,
  attributes,
  schema,
}: {
  query?: string;
  attributes: AttributeList;
  schema: Schema.viaq | Schema.otel;
}): Filters => {
  const filters: Filters = {};
  const logQLQuery = new LogQLQuery(query ?? '');

  const streamLabels = getStreamLabelsFromSchema(schema);
  const severityLabel = streamLabels[ResourceLabel.Severity];

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
      pipelineStage.labelsInFilter?.every(({ label }) => label === `${severityLabel}`) &&
      !filters.severity
    ) {
      const severityValues: Array<Severity> = pipelineStage.labelsInFilter
        .flatMap(({ value }) => (value ? value.split('|') : []))
        .map(removeQuotes)
        .map(severityFromString)
        .filter(notUndefined);
      if (severityValues.length > 0) {
        filters.severity = new Set(severityValues);
      }
    } else if (pipelineStage.operator === '|=' && !filters.content) {
      filters.content = new Set([removeBacktick(pipelineStage.value)]);
    }
  }

  return filters;
};

export const getNamespaceMatcher = ({
  namespace,
  schema,
}: {
  namespace?: string;
  schema: Schema;
}): LabelMatcher | undefined => {
  if (namespace === undefined) {
    return undefined;
  }

  const streamLabels = getStreamLabelsFromSchema(schema);
  const namespaceLabel = streamLabels[ResourceLabel.Namespace];

  return {
    label: namespaceLabel,
    operator: '=',
    value: `"${namespace}"`,
  };
};

const isK8sValueARegex = (value: string) => {
  // Regex to test if a string contains a regex matching a k8s name value
  const testRegex = /[{}()[\]^$*+?|/\\]|\.[*+?]/;
  return testRegex.test(value);
};

export const queryWithNamespace = ({
  query,
  namespace,
  schema,
}: {
  query: string;
  namespace?: string;
  schema: Schema;
}) => {
  const logQLQuery = new LogQLQuery(query ?? '');

  logQLQuery.addSelectorMatcher(getNamespaceMatcher({ namespace, schema }));

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

export const getMatchersFromFilters = ({
  filters,
  schema,
}: {
  filters?: Filters;
  schema: Schema;
}): Array<LabelMatcher> => {
  if (!filters) {
    return [];
  }

  const matchers: Array<LabelMatcher | undefined> = [];
  const labels = getStreamLabelsFromSchema(schema);
  const namespaceLabel = labels[ResourceLabel.Namespace];
  const podLabel = labels[ResourceLabel.Pod];
  const containerLabel = labels[ResourceLabel.Container];

  for (const key of Object.keys(filters)) {
    const value = filters[key];
    if (value) {
      switch (key) {
        case 'namespace':
          matchers.push(getK8sMatcherFromSet(namespaceLabel, value));
          break;
        case 'pod':
          matchers.push(getK8sMatcherFromSet(podLabel, value));
          break;
        case 'container':
          matchers.push(getK8sMatcherFromSet(containerLabel, value));
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

export const getSeverityFilterPipelineStage = ({
  filters,
  schema,
}: {
  filters?: Filters;
  schema: Schema;
}): PipelineStage | undefined => {
  if (!filters) {
    return undefined;
  }

  const severity = filters.severity;

  const labels = getStreamLabelsFromSchema(schema);
  const severityLabel = labels.Severity;

  if (!severity) {
    return undefined;
  }

  const unknownFilter = severity.has('unknown')
    ? `${severityLabel}="unknown" or ${severityLabel}=""`
    : '';

  const severityFilters = Array.from(severity).flatMap((group: string | undefined) => {
    if (group === 'unknown' || group === undefined) {
      return [];
    }

    return severityAbbreviations[group as Severity];
  });

  const levelsfilter =
    severityFilters.length > 0 ? `${severityLabel}=~"${severityFilters.join('|')}"` : '';

  const allFilters = [unknownFilter, levelsfilter].filter(notEmptyString);

  return allFilters.length > 0 ? { operator: '|', value: allFilters.join(' or ') } : undefined;
};

const getPodAttributeOptions = (
  tenant: string,
  config: Config,
  schema: Schema,
  namespaces?: Array<string>,
): (() => Promise<Option[]>) => {
  const { podLabel } = getAttributeLabels(schema);

  const namespacedPodsResources: Array<Promise<Option[]>> = [];

  // get pods in selected namespaces for users that have restricted access
  for (const ns of namespaces || []) {
    namespacedPodsResources.push(resourceDataSource({ resource: 'pods', namespace: ns })());
  }

  return () =>
    Promise.allSettled<Promise<Option[]>>([
      lokiLabelValuesDataSource({
        config,
        tenant,
        labelName: podLabel,
      })(),
      resourceDataSource({ resource: 'pods' })(),
      ...namespacedPodsResources,
    ]).then((results) => {
      const podOptions: Set<Option> = new Set();
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          result.value.forEach((option) => {
            podOptions.add(option);
          });
        }
      });
      return Array.from(podOptions);
    });
};

const getContainerAttributeOptions = (
  tenant: string,
  config: Config,
  schema: Schema,
  namespaces?: Array<string>,
): (() => Promise<Option[]>) => {
  const { containerLabel, podLabel } = getAttributeLabels(schema);

  const seriesQuery = `{ ${containerLabel}!="", ${podLabel}!="" }`;

  const namespacedPodsResources: Array<Promise<Option[]>> = [];

  // get containers in selected namespaces for users that have restricted access
  for (const ns of namespaces || []) {
    namespacedPodsResources.push(
      resourceDataSource({
        resource: 'pods',
        namespace: ns,
        mapper: (resource) =>
          resource?.spec?.containers.map((container) => ({
            option: `${resource?.metadata?.name} / ${container.name}`,
            value: `${resource?.metadata?.name} / ${container.name}`,
          })) ?? [],
      })(),
    );
  }

  return () =>
    Promise.allSettled<Promise<Option[]>>([
      lokiSeriesDataSource({
        config,
        tenant,
        match: [seriesQuery],
        mapper: (response) => {
          const uniqueContainers = new Set<string>();

          response.data.forEach((item) => {
            if (item[containerLabel] && item[podLabel]) {
              uniqueContainers.add(`${item[podLabel]} / ${item[containerLabel]}`);
            }
          });

          return Array.from(uniqueContainers).map((container) => ({
            option: container,
            value: container,
          }));
        },
      })(),
      resourceDataSource({
        resource: 'pods',
        mapper: (resource) =>
          resource?.spec?.containers.map((container) => ({
            option: `${resource?.metadata?.name} / ${container.name}`,
            value: `${resource?.metadata?.name} / ${container.name}`,
          })) ?? [],
      })(),
      ...namespacedPodsResources,
    ]).then((results) => {
      const uniqueContainers = new Set<Option>();
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          result.value.forEach((option) => {
            uniqueContainers.add(option);
          });
        }
      });
      return Array.from(uniqueContainers);
    });
};
