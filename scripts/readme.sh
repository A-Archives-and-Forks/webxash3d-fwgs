#!/usr/bin/env bash
set -euo pipefail

: "${DOCKER_USERNAME:?DOCKER_USERNAME env var is required}"
: "${DOCKER_PASSWORD:?DOCKER_PASSWORD env var is required}"

IMAGE_NAME="yohimik/${DISPAT_PACKAGE}"
README_PATH="docker/${DISPAT_PACKAGE}/README.docker.md"

DESCRIPTION=$(jq -Rs . < "$README_PATH")

TOKEN=$(curl -s -H "Content-Type: application/json" \
  -X POST -d "{\"username\": \"${DOCKER_USERNAME}\", \"password\": \"${DOCKER_PASSWORD}\"}" \
  https://hub.docker.com/v2/users/login/ | jq -r .token)

curl -X PATCH "https://hub.docker.com/v2/repositories/${IMAGE_NAME}/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"full_description\": ${DESCRIPTION}}"