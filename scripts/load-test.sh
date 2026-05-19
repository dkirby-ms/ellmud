#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run load-test -- \
  --url https://ellmud-test.kirbytoso.xyz \
  --connections 200 \
  --stress \
  --action-interval 3000 \
  "$@"
