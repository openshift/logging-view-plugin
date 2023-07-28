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

Use the testing docker-compose to spin up loki, promtail and the proper tenant based routing that [LokiStack](https://docs.openshift.com/container-platform/4.13/logging/cluster-logging-loki.html) uses.

```sh
docker-compose -f hack/docker-compose/docker-compose.test.yml up
```

In one terminal window, run:

1. `npm install`
2. `npm run dev`

In another terminal window, run:

1. `oc login` (requires [oc](https://console.redhat.com/openshift/downloads) and an [OpenShift cluster](https://console.redhat.com/openshift/create))
2. `npm run start:console` (requires [Docker](https://www.docker.com) or [podman 3.2.0+](https://podman.io))

This will create an environment file `scripts/env.list` and run the OpenShift console
in a container connected to the cluster you've logged into. The plugin HTTP server
runs on port 9001 with CORS enabled.

The dynamic console plugin is configured to connect to loki using a proxy
`/api/proxy/plugin/logging-view-plugin/backend/`, in local mode this will point
to `http://localhost:3100`. You can disable this by re-running the console with
`npm run start:console -c` to use the cluster proxy

Navigate to <http://localhost:9000/monitoring/logs> to see the running plugin.

#### Running start:console with Apple silicon and podman

If you are using podman on a Mac with Apple silicon, `npm run start:console`
might fail since it runs an amd64 image. You can workaround the problem with
[qemu-user-static](https://github.com/multiarch/qemu-user-static) by running
these commands:

```sh
podman machine ssh
sudo -i
rpm-ostree install qemu-user-static
systemctl reboot
```

### Running tests

#### Unit tests

```sh
npm run test:unit
```

#### e2e tests

In order to run the e2e tests, you need first to build the plugin in standalone mode

```sh
npm run build:standalone:instrumented
```

and then run the cypress tests

```sh
npm run test:e2e
```

## Deployment on cluster

You can deploy the plugin to a cluster by instantiating the provided
[Plugin Resources](logging-view-plugin-resources.yml). It will use the latest plugin
docker image and run a light-weight nginx HTTP server to serve the plugin's assets.

```sh
oc create -f logging-view-plugin-resources.yml
```

Once deployed, patch the [Console operator](https://github.com/openshift/console-operator)
config to enable the plugin.

```sh
oc patch consoles.operator.openshift.io cluster \
  --patch '{ "spec": { "plugins": ["logging-view-plugin"] } }' --type=merge
```

## Build the image

```sh
./scripts/image.sh -t latest
```
