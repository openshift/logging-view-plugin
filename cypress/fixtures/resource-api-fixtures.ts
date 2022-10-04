export const namespaceListResponse = {
  kind: 'NamespaceList',
  apiVersion: 'v1',
  metadata: {
    resourceVersion: '359980',
  },
  items: [
    {
      metadata: {
        name: 'default',
        resourceVersion: '30941',
      },
      spec: {
        finalizers: ['kubernetes'],
      },
      status: {
        phase: 'Active',
      },
    },
    {
      metadata: {
        name: 'gitops',
        resourceVersion: '216367',
      },
      spec: {
        finalizers: ['kubernetes'],
      },
      status: {
        phase: 'Active',
      },
    },
    {
      metadata: {
        name: 'gitops-service-argocd',
        resourceVersion: '230472',
      },
      spec: {
        finalizers: ['kubernetes'],
      },
      status: {
        phase: 'Active',
      },
    },
  ],
};
