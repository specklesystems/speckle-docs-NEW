#!/usr/bin/env bash
# Require Docs PR check jobs on main (Phase 2b: validate + links + format-lint).
# Needs: gh auth login with admin on specklesystems/speckle-docs-NEW
#
# Usage:
#   bash scripts/enable-required-pr-checks.sh
#   REPO=specklesystems/speckle-docs-NEW BRANCH=main bash scripts/enable-required-pr-checks.sh
set -euo pipefail

REPO="${REPO:-specklesystems/speckle-docs-NEW}"
BRANCH="${BRANCH:-main}"

echo "Updating branch protection on ${REPO}@${BRANCH}"
echo "Required status checks: Mintlify validate, Broken links, Format and lint"

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/branches/${BRANCH}/protection" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Mintlify validate", "Broken links", "Format and lint"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

echo "Done. Confirm in GitHub → Settings → Branches → ${BRANCH}."
