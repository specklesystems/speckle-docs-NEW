#!/usr/bin/env bash
# markdownlint for lint-staged — Phase 1 report-only (matches CI continue-on-error).
# Prettier in lint-staged remains blocking. Usage: scripts/lint-md-staged.sh <files...>
set -uo pipefail

if [ "$#" -eq 0 ]; then
  echo "No markdown files to lint."
  exit 0
fi

if pnpm exec markdownlint-cli2 --no-globs "$@"; then
  exit 0
fi

echo ""
echo "markdownlint reported issues on staged files (Phase 1: non-blocking)."
echo "CI Format and lint is also report-only. Fix with: pnpm lint:md:changed"
echo "or pnpm exec markdownlint-cli2 --fix --no-globs <files>"
echo "Phase 2 will make this blocking once debt is cleared."
exit 0
