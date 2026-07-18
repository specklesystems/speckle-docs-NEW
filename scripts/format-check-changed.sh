#!/usr/bin/env bash
# Prettier --check only files changed vs a base ref (PR-friendly).
# Usage:
#   scripts/format-check-changed.sh
#   scripts/format-check-changed.sh <base>...<head>
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
    node_modules/* | pnpm-lock.yaml)
      continue
      ;;
  esac
  files[${#files[@]}]="$file"
done <<EOF
$(git diff --name-only --diff-filter=ACMRT "$RANGE" -- \
  '*.md' '*.mdx' '*.js' '*.jsx' '*.ts' '*.tsx' '*.json' '*.jsonc' '*.yml' '*.yaml' \
  || true)
EOF

if [ "${#files[@]}" -eq 0 ]; then
  echo "No changed Prettier-eligible files in range: $RANGE"
  exit 0
fi

echo "Prettier check on ${#files[@]} changed file(s) in range: $RANGE"
for file in "${files[@]}"; do
  printf '  %s\n' "$file"
done

exec pnpm exec prettier --check "${files[@]}"
