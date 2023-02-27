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

## Plugin configuration

The plugin can be configured by mounting a ConfigMap in the deployment and passing the `-plugin-config-path` flag with the file path, for example:

ConfigMap with plugin configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logging-view-plugin-config
  namespace: openshift-logging
  labels:
    app: logging-view-plugin
    app.kubernetes.io/part-of: logging-view-plugin
data:
  config.yaml: |-
    logsLimit: 200
    timeout: '60s'
```

Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logging-view-plugin
  namespace: openshift-logging
  labels:
    app: logging-view-plugin
    app.kubernetes.io/component: logging-view-plugin
    app.kubernetes.io/instance: logging-view-plugin
    app.kubernetes.io/part-of: logging-view-plugin
    app.openshift.io/runtime-namespace: openshift-logging
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logging-view-plugin
  template:
    metadata:
      labels:
        app: logging-view-plugin
    spec:
      containers:
        - name: logging-view-plugin
          image: "quay.io/gbernal/logging-view-plugin:latest"
          args:
            - "-plugin-config-path"
            - "/etc/plugin/config.yaml"
            ...

          volumeMounts:
            - name: plugin-config
              readOnly: true
              mountPath: /etc/plugin/config.yaml
              subPath: config.yaml
            ...

      volumes:
        - name: plugin-conf
          configMap:
            name: logging-view-plugin-config
            defaultMode: 420
        ...

      ...

```

# Configuration values

| Field                      | Description                                                                                                                                               | Default    | Unit                                         |
| :------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------- | :------------------------------------------- |
| timeout                    | fetch timeout when requesting logs                                                                                                                        | `30s`      | [duration](https://pkg.go.dev/time#Duration) |
| logLimit                   | maximum logs to be requested                                                                                                                              | `100`      | units                                        |
| alertingRuleTenantLabelKey | name of the alerting rule label used to match the tenantId for log-based alerts. Allows log-based alerts to request metrics to the proper tenant endpoint | `tenantId` | string                                       |
| useTenantInHeader          | whether or not the tenant header `X-Scope-OrgID` should be used instead of using the tenant in the URL request                                            | `false`    | boolean                                      |

## Build a testint the image

```sh
make build-image
```
