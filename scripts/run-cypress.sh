#!/usr/bin/env bash

set -xu

npm run start:standalone &
app=$!

npm run cypress:run:ci
cypress=$?

kill $app
wait $app

pkill node

exit $cypress
