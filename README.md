# Logging View Plugin for OpenShift Console

This plugin adds the logging view into the 'observe' menu in the OpenShift console. It requires OpenShift 4.10.

This plugin connects to a loki backend, you can install the [loki-operator](https://github.com/grafana/loki/tree/main/operator)
in your cluster.

## Development

[Node.js](https://nodejs.org/en/) and [npm](https://www.npmjs.com/) are required
to build and run the plugin. To run OpenShift console in a container, either
[Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io) and
[oc](https://console.redhat.com/openshift/downloads) are required.

### Running locally

Make sure you have loki running on `http://localhost:3100`

1. Install the dependencies running `make install`
2. Start the backend `make start-backend`
3. In a different terminal start the frontend `make start-frontend`
4. In a different terminal start the console
   a. `oc login` (requires [oc](https://console.redhat.com/openshift/downloads) and an [OpenShift cluster](https://console.redhat.com/openshift/create))
   b. `make start-console` (requires [Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io))

This will create an environment file `web/scripts/env.list` and run the OpenShift console
in a container connected to the cluster you've logged into. The plugin backend server
runs on port 9002 with CORS enabled.

The dynamic console plugin is configured to connect to loki using a proxy
`/api/proxy/plugin/logging-view-plugin/backend/`, in local mode this will point
to `http://localhost:3100`. You can disable this by re-running the console with
`npm run start:console -c` to use the cluster proxy

Navigate to <http://localhost:9000/monitoring/logs> to see the running plugin.

### Runing tests

#### Unit tests

```sh
make test-unit
```

#### e2e tests

```sh
make test-frontend
```

this will build the frontend in standalone mode and run the cypress tests

## Deployment on cluster

You can deploy the plugin to a cluster by instantiating the provided
[Plugin Resources](logging-view-plugin-resources.yml). It will use the latest plugin
docker image and run a light-weight go HTTP server to serve the plugin's assets.

```sh
oc create -f logging-view-plugin-resources.yml
```

Once deployed, patch the [Console operator](https://github.com/openshift/console-operator)
config to enable the plugin.

```sh
oc patch consoles.operator.openshift.io cluster \
  --patch '{ "spec": { "plugins": ["logging-view-plugin"] } }' --type=merge
```

## Build a testint the image

```sh
make build-image
```

## Features

From 5.6.1+, appart from the core functionality, the plugin offers additional features that can be enabled using the `-features` flag with comma separated values. For example:

`-features=dev-console,alerts`

In Openshift console, these features will be enabled by the Cluster Logging Operator based on the cluster version.

### Feature list

| Feature       | Description                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev-console` | Adds the logging view to the developer perspective                                                                                           |
| `alerts`      | Merges the Openshift console alerts with log-based alerts defined in the Loki ruler. Adds a log-based metrics chart in the alert detail view |

### Compatibility matrix

| CLO version | OCP versions                    | Features                                              |
| ----------- | ------------------------------- | ----------------------------------------------------- |
| 5.5         | 4.10 (tech preview), 4.11, 4.12 | _No features configuration, just core functionallity_ |
| 5.6.1+      | 4.10 (tech preview), 4.11       | _No additional features, just core functionallity_    |
| 5.6.1+      | 4.12, 4.13                      | `dev-console`                                         |
| 5.7         | 4.11                            | _No additional features, just core functionallity_    |
| 5.7         | 4.12                            | `dev-console`                                         |
| 5.7         | 4.13                            | `dev-console`, `alerts`                               |
