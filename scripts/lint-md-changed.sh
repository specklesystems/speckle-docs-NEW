#!/usr/bin/env bash
# Lint only markdown/MDX files changed vs a base ref (PR-friendly).
# Usage:
#   scripts/lint-md-changed.sh                 # vs origin/main (or main)
#   scripts/lint-md-changed.sh <base>...<head> # git rev range
set -euo pipefail

RANGE="${1:-}"

if [ -z "$RANGE" ]; then
  if git rev-parse --verify origin/main >/dev/null 2>&1; then
    RANGE="origin/main...HEAD"
  elif git rev-parse --verify main >/dev/null 2>&1; then
    RANGE="main...HEAD"
  else
    echo "No base ref found; pass a git range (e.g. origin/main...HEAD)." >&2
    exit 1
  fi
fi

# Bash 3.2-safe (macOS /bin/bash): no mapfile / process substitution.
files=()
while IFS= read -r file; do
  [ -n "$file" ] || continue
  case "$file" in
    node_modules/* | .mintlify/* | .cursor/* | .claude/* | .github/skills/* | .github/instructions/* | .universal-ai-config/* | */notebooks/*)
      continue
      ;;
  esac
  files[${#files[@]}]="$file"
done <<EOF
$(git diff --name-only --diff-filter=ACMRT "$RANGE" -- '*.md' '*.mdx' || true)
EOF

if [ "${#files[@]}" -eq 0 ]; then
  echo "No changed markdown/MDX files in range: $RANGE"
  exit 0
fi

echo "Linting ${#files[@]} changed file(s) in range: $RANGE"
for file in "${files[@]}"; do
  printf '  %s\n' "$file"
done

# --no-globs: use only the files we pass (ignore config globs that would re-scan the repo)
exec pnpm exec markdownlint-cli2 --no-globs "${files[@]}"
