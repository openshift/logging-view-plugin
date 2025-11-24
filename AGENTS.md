# Openshift Logging View Plugin - AI Agent Guide

## Project Overview
A frontend plugin to the OpenShift Console to display logs using telemetry from Loki. 

## External Dependencies & Operators

| System | Repository | Purpose |
|--------|------------|---------|
| Red Hat OpenShift Logging Operator | https://github.com/openshift/cluster-logging-operator | Orchestrates log collection and forwarding to Red Hat managed log stores and other third-party receivers
| Loki Operator | https://github.com/grafana/loki | Provides a means for configuring and managing a LokiStack for cluster logging
| COO | https://github.com/rhobs/observability-operator | Manages logging-view-plugin |
| Console SDK | https://github.com/openshift/console | Plugin framework |

### Prerequisites to deploy logging-view-plugin in a cluster 
- Install  Red Hat OpenShift Logging Operator, Loki Operator, Cluster Observability Operator (COO) on a OpenShift cluster 
- Deploy and configure minio storage, LokiStack, ClusterLogForwarder (either Otel or ViaQ). This can be done using the script https://github.com/observability-ui/development-tools/tree/main/logging but it will require user input from an interactive terminal to select a data model, either a) otel or b) viqa

### COO (Cluster Observability Operator)
- The attribute `schema` can be configured the options of `otel`, `viaq`, or `select`. The default option is `viaq` if no `schema` is specified. When you choose the `select` option, a dropdown is shown in the UI to allow the user to choose `otel` or `viaq` for any query.
- The attribute `logsLimit` defines the maximum number of log lines to retrieve in a single query. This helps control query performance and UI responsiveness by limiting the amount of data returned.
- The attribute `timeout` specifies the maximum duration to wait for log queries to complete. This prevents queries from running indefinitely and provides a better user experience by failing fast on slow queries.
- The attribute `lokiStack` references the name of the LokiStack resource that the plugin should connect to for retrieving logs. This must match the name of an existing LokiStack instance in the cluster. 

- **UIPlugin CR example**:
```yaml
apiVersion: observability.openshift.io/v1alpha1
kind: UIPlugin
metadata:
  name: logging
spec:
  type: Logging
  logging:
    lokiStack:
      name: logging-loki
    logsLimit: 50
    timeout: 30s
    schema: otel 
```
Documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_cluster_observability_operator/1-latest/html/ui_plugins_for_red_hat_openshift_cluster_observability_operator/logging-ui-plugin


### About Red Hat OpenShift logging
Introduction to OpenShift Logging
https://docs.redhat.com/en/documentation/red_hat_openshift_logging/6.4/pdf/about_openshift_logging/Red_Hat_OpenShift_Logging-6.4-About_OpenShift_logging-en-US.pdf


### Console Plugin Framework
The OpenShift Console uses a frontend plugin system powered by Webpack's Module Fedaration. Upon reconciling the UIPlugin, COO will create a ConsolePlugin CR which will enable a route for OpenShift console users to make requests to the logging-view-plugin pod. The OpenShift Console will first load a `plugin-manifest.json` which is rendered from the `./web/console-extensions.json` file during build time, and then use the information within it to dynamically load needed chunks of the built js to the frontend.

The OpenShift console provides an npm SDK package which is tied to the OCP version it is built for. The package tries to retain compatability as much as possible, so a single build is able to be used across multiple OCP versions, with specific versions (such as 4.19 and the unreleased 4.22) breaking backwards compatability. 

## Development Guide
The logging-view-plugin repo's code is split up into 2 general areas:
- golang backend - `./cmd` and `./pkg` folders
- frontend components - `./web`

All commands should be routed through the `Makefile`.

### Frontend
The logging-view-plugin  uses the following technologies:
- typescript
- react 17
- i18next

#### i18next
When working with i18next the react hook should contain the logging view plugin namespace, and each piece of static text should be wrapped in the returned translation function. After adding a new tranlated text, make sure to run `make build-frontend` which will regenerate the translation files.

```ts
  const { t } = useTranslation('plugin__logging-view-plugin');
  return <div>{`t('Logs')`}</div>
```

### Backend
The logging-view-plugin uses the following technologies:
- go
- gorilla/mux

### Console Plugin Framework:
- Dynamic Plugin: https://github.com/openshift/enhancements/blob/master/enhancements/console/dynamic-plugins.md
- Plugin SDK README: https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/README.md
- Plugin SDK API: https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/docs/api.md
- Extensions docs: https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/docs/console-extensions.md
- Example plugin: https://github.com/openshift/console/tree/main/dynamic-demo-plugin


For reference for adding console extension points or features:
https://github.com/openshift/monitoring-plugin/tree/main/pkg


### Development Setup
- See README.md for full setup; particularly the section `Running using Devspace`
    - "Running using Devspace" >> "1. Create and install a LokiStack in your cluster collecting logs". Use the script found in https://github.com/observability-ui/development-tools/tree/main/logging to install a LokiStack and other resources needed to run this plugin. 
- Deployment of COO and other resources: https://github.com/observability-ui/development-tools/

## Release & Testing

### Before submitting a PR run the following and address any errors:
```bash
make build-frontend
make test-frontend
make build-backend
make test-unit-backend
```

### PR Requirements:
- **Title format**: `[JIRA_ISSUE]: Description`
- **Testing**: All linting and tests must pass
- **Translations**: Ensure i18next keys are properly added by ensuring any static text in the frontend is wrapped in a useTranslation function call, ie. `t('Logs')`

### Commit Requirements:
- **Title format**: Conventional Commit format ([link](https://www.conventionalcommits.org/en/v1.0.0/))

---
*This guide is optimized for AI agents and developers. For detailed setup instructions, also refer to README.md and Makefile.*