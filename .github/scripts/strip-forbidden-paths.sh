#!/usr/bin/env bash
# strip-forbidden-paths.sh — Single source of truth for paths forbidden on uat/prod.
# Called by scheduled-uat-promote.yml and squad-promote.yml during promotion merges.
#
# These paths contain AI-team / squad tooling and internal docs that must never
# reach uat or prod branches.

set -euo pipefail

FORBIDDEN_PATHS=(
  .ai-team/
  .squad/
  .ai-team-templates/
  team-docs/
  docs/proposals/
)

echo "Stripping forbidden paths: ${FORBIDDEN_PATHS[*]}"
git rm -rf --cached --ignore-unmatch "${FORBIDDEN_PATHS[@]}" || true
