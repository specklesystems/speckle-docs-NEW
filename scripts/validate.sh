#!/usr/bin/env bash
# Run `mint validate`, filtering out warnings from .worktrees/ agent worktrees
# that lack their own snippets/ directory.
set -euo pipefail

HIDDEN=".worktrees-validating-$$"

cleanup() {
  [ -d "$HIDDEN" ] && mv "$HIDDEN" .worktrees
}
trap cleanup EXIT INT TERM

if [ -d .worktrees ]; then
  mv .worktrees "$HIDDEN"
fi

output=$(pnpm exec mint validate 2>&1) || true

# Strip ANSI escape sequences so our grep patterns work reliably.
clean=$(echo "$output" | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\r//g')

# Drop lines that reference the hidden worktrees directory.
filtered=$(echo "$clean" | grep -v "$HIDDEN")

# Count real (non-worktree) warnings.
real_warnings=$(echo "$filtered" | grep -c "^warning" || true)

if [ "$real_warnings" -gt 0 ]; then
  echo "$filtered" | grep -v "^error Build validation failed"
  echo "error Build validation failed with ${real_warnings} warning(s). See above for details." >&2
  exit 1
fi

# All warnings were from worktrees — drop mint's stale failure summary and exit clean.
echo "$filtered" | grep -v "^error Build validation failed"
