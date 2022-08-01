#!/bin/bash

echo "spawning standalone app..."
npm run start:standalone &

CYPRESS_INSTALL_BINARY=9.5.0 npm ci
npx cypress verify

npx cypress run --browser chrome