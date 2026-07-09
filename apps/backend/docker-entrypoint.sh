#!/bin/sh
set -e

mkdir -p /repo/apps/backend/uploads /data
chown -R itportal:itportal /repo/apps/backend/uploads /data

exec su-exec itportal "$@"
