FEATURES?=

.PHONY: install-frontend
install-frontend:
	cd web && npm install

.PHONY: install-frontend-ci
install-frontend-ci:
	cd web && npm ci

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
	go build -o plugin-backend cmd/plugin-backend.go

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
	./plugin-backend -port 9002 -features "$(FEATURES)"

.PHONY: build-image
build-image: install-backend build-backend install-frontend build-frontend
	./scripts/image.sh -t latest
