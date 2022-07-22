#!/usr/bin/env bash

set -euo pipefail

PREFER_PODMAN=0
PUSH=0
TAG="dev"

while getopts ":pdt:" flag; do
    case $flag in
        p) PREFER_PODMAN=1;;
        d) PUSH=1;;
        t) TAG=$OPTARG;;
        \?) echo "Invalid option: -$flag" 
            exit;;
    esac
done

if [[ -x "$(command -v podman)" && $PREFER_PODMAN == 1 ]]; then
    OCI_BIN="podman"
else
    OCI_BIN="docker"
fi

BASE_IMAGE="quay.io/openshift-logging/logging-view-plugin"
IMAGE=${BASE_IMAGE}:${TAG}

echo "Building image '${IMAGE}' with ${OCI_BIN}"
$OCI_BIN build -t $IMAGE .

if [[ $PUSH == 1 ]]; then
    echo "Pushing to registry with ${OCI_BIN}"
    $OCI_BIN push $IMAGE
fi
