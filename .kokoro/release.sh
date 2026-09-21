#!/bin/bash
set -euo pipefail

# -----------------------------------------------------------------------------
# 1. Workspace & Directory Resolution
# -----------------------------------------------------------------------------
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_DIR}"

echo "=== Building and Releasing from: ${REPO_DIR} ==="

# -----------------------------------------------------------------------------
# 2. Environment & Tooling Setup
# -----------------------------------------------------------------------------
echo "=== Environment Info ==="
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# -----------------------------------------------------------------------------
# 3. Clean and Build Distribution Packages
# -----------------------------------------------------------------------------
echo "=== Installing dependencies ==="
npm ci

echo "=== Building packages ==="
npm run build

echo "=== Running tests ==="
npm test

# -----------------------------------------------------------------------------
# 4. Delete existing files from Exit Gate Artifact Registry
# -----------------------------------------------------------------------------
EXIT_GATE_PROJECT="oss-exit-gate-prod"
EXIT_GATE_LOCATION="us"
EXIT_GATE_REPOSITORY="measurement-devrel--npm"
PACKAGE_NAME="@google-ads/datamanager-util"

# Delete existing package from the Exit Gate staging repository if present.
# This prevents upload failures on retries or re-releases of the same version.
if gcloud artifacts packages describe "${PACKAGE_NAME}" \
    --project="${EXIT_GATE_PROJECT}" \
    --location="${EXIT_GATE_LOCATION}" \
    --repository="${EXIT_GATE_REPOSITORY}" &>/dev/null; then
  echo "=== Deleting existing package '${PACKAGE_NAME}' from Exit Gate staging repository ==="
  gcloud artifacts packages delete "${PACKAGE_NAME}" \
    --project="${EXIT_GATE_PROJECT}" \
    --location="${EXIT_GATE_LOCATION}" \
    --repository="${EXIT_GATE_REPOSITORY}" \
    --quiet
else
  echo "=== Skipping deletion. Package '${PACKAGE_NAME}' not found in staging repository. 🙂 ==="
fi

# -----------------------------------------------------------------------------
# 5. Configure and verify npm auth for the Exit Gate Artifact Registry
# -----------------------------------------------------------------------------

# Configure .npmrc for Artifact Registry according to go/oss-exit-gate-release-npm.
# Because this project uses npm workspaces, npm ignores .npmrc files inside
# workspace subdirectories (e.g. util/.npmrc). Writing to repository root ensures
# npm resolves the registry and credentials properly across all workspace packages.
cat <<EOF > .npmrc
@google-ads:registry=https://${EXIT_GATE_LOCATION}-npm.pkg.dev/${EXIT_GATE_PROJECT}/${EXIT_GATE_REPOSITORY}/
//${EXIT_GATE_LOCATION}-npm.pkg.dev/${EXIT_GATE_PROJECT}/${EXIT_GATE_REPOSITORY}/:always-auth=true
EOF
# Clean up .npmrc on exit. google-artifactregistry-auth writes a live GCP OAuth
# bearer token into .npmrc, so removing it prevents credential leakage.
trap "rm -f '${REPO_DIR}/.npmrc' 2>/dev/null || true" EXIT

# Authenticate with Artifact Registry
npx google-artifactregistry-auth

# -----------------------------------------------------------------------------
# 6. Trigger Exit Gate Release via GCS Manifest if not a dry run
# -----------------------------------------------------------------------------

# If DRY_RUN is set to "true", stop here so you can verify the process without
# consuming the version and without publishing to public npm.
if [[ "${DRY_RUN:-false}" == "true" ]]; then
  echo "=== DRY_RUN is enabled. Skipping Artifact Registry and manifest upload."
  echo "===   Uploading to Artifact Registry would claim the current version,  "
  echo "===   preventing us from actually releasing it via DRY_RUN=false.      "
  echo "=== Instead, running 'npm pack' to verify as much of the workflow as   "
  echo "=== possible.                                                          "
  npm pack --workspace util
  echo "=== Test of 'npm pack' completed. Listing generated archive."
  ls -l google-ads-datamanager-util-*.tgz
  exit 0
fi

echo "=== Publishing package to Exit Gate staging repository ==="
npm publish --workspace util

echo "=== Creating targeted release manifest for ${PACKAGE_NAME} ==="
cat <<EOF > manifest.json
{
  "publish_all": false,
  "publishing_groups": [
    {
      "packages": [
        {
          "name": "${PACKAGE_NAME}"
        }
      ]
    }
  ]
}
EOF

EXIT_GATE_BUCKET="gs://oss-exit-gate-prod-projects-bucket/measurement-devrel/npm/manifests"
MANIFEST_NAME="manifest-$(date --utc +%Y%m%d%H%M%S'UTC').json"

echo "=== Uploading manifest to ${EXIT_GATE_BUCKET}/${MANIFEST_NAME} ==="
gcloud storage cp manifest.json "${EXIT_GATE_BUCKET}/${MANIFEST_NAME}"

echo "========================================================================="
echo "Release successfully triggered! Exit Gate will now verify BCID and publish to npm."
echo "========================================================================="
