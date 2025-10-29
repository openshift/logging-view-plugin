FEATURES?=
VERSION     ?= latest
PLATFORMS   ?= linux/arm64,linux/amd64
ORG         ?= openshift-observability-ui
IMAGE       ?= quay.io/${ORG}/logging-view-plugin:${VERSION}

.PHONY: install-frontend
install-frontend:
	cd web && npm install

.PHONY: install-frontend-ci
install-frontend-ci:
	cd web && npm ci --omit=optional --ignore-scripts

.PHONY: install-frontend-ci-clean
install-frontend-ci-clean: install-frontend-ci
	cd web && npm cache clean --force

.PHONY: lint-frontend
lint-frontend:
	cd web && npm run lint

.PHONY: test-unit-frontend
test-unit-frontend:
	cd web && npm run test:unit

.PHONY: build-frontend-standalone
build-frontend-standalone:
	cd web && npm run build:standalone

.PHONY: test-frontend
test-frontend: test-unit-frontend build-frontend-standalone
	cd web && npm run test

.PHONY: build-frontend
build-frontend:
	cd web && npm run build

.PHONY: install-backend
install-backend:
	go mod download

.PHONY: build-backend
build-backend:
	go build $(BUILD_OPTS) -mod=readonly -o plugin-backend cmd/plugin-backend.go

.PHONY: test-unit-backend
test-unit-backend:
	go test ./...

.PHONY: start-console
start-console:
	cd web && ./scripts/start-console.sh

.PHONY: install
install: install-backend build-backend install-frontend

.PHONY: start-frontend
start-frontend:
	cd web && npm run dev

.PHONY: start-backend
start-backend: build-backend
	./plugin-backend -port 9002 -features "${FEATURES}"

.PHONY: start-devspace-backend
start-devspace-backend:
	/opt/app-root/plugin-backend -port=9443 -cert=/var/serving-cert/tls.crt -key=/var/serving-cert/tls.key -plugin-config-path=/etc/plugin/config.yaml -static-path=/opt/app-root/web/dist -config-path=/opt/app-root/config

.PHONY: build-image
build-image:
	./scripts/image.sh -t latest

deploy:
	helm uninstall logging-view-plugin -n logging-view-plugin || true
	PUSH=1 scripts/build-image.sh
	helm install logging-view-plugin charts/openshift-console-plugin -n logging-view-plugin --create-namespace --set plugin.image=${IMAGE}

.PHONY: podman-cross-build
podman-cross-build:
	podman manifest create -a ${IMAGE}
	podman build --platform=${PLATFORMS} --manifest ${IMAGE} -f Dockerfile.dev
	podman manifest push ${IMAGE}
