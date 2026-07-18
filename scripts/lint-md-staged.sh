#!/usr/bin/env bash
# markdownlint for lint-staged — blocking (matches CI Format and lint).
# Prettier in lint-staged remains blocking. Usage: scripts/lint-md-staged.sh <files...>
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "No markdown files to lint."
  exit 0
fi

pnpm exec markdownlint-cli2 --no-globs "$@"
