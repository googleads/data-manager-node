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
# 4. Upload to Internal Exit Gate Artifact Registry
# -----------------------------------------------------------------------------
cd "${REPO_DIR}/util"

EXIT_GATE_PROJECT="oss-exit-gate-prod"
EXIT_GATE_LOCATION="us"
EXIT_GATE_REPOSITORY="measurement-devrel--npm"
PACKAGE_NAME="@google-ads/data-manager-util"

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

# Configure .npmrc for Artifact Registry according to go/oss-exit-gate-release-npm
cat <<EOF > .npmrc
@google-ads:registry=https://${EXIT_GATE_LOCATION}-npm.pkg.dev/${EXIT_GATE_PROJECT}/${EXIT_GATE_REPOSITORY}/
//${EXIT_GATE_LOCATION}-npm.pkg.dev/${EXIT_GATE_PROJECT}/${EXIT_GATE_REPOSITORY}/:always-auth=true
EOF
# Clean up .npmrc and manifest.json on exit. google-artifactregistry-auth writes
# a live GCP OAuth bearer token into .npmrc, so removing it prevents credential
# leakage into Kokoro logs/artifacts and keeps the local workspace clean.
trap 'rm -f .npmrc manifest.json 2>/dev/null || true' EXIT

# Authenticate with Artifact Registry
npx google-artifactregistry-auth

echo "=== Publishing package to Exit Gate staging repository ==="
npm publish

# -----------------------------------------------------------------------------
# 5. Trigger Exit Gate Release via GCS Manifest
# -----------------------------------------------------------------------------
# If DRY_RUN is set to "true", stop here so you can verify AR staging
# without publishing to public npm.
if [[ "${DRY_RUN:-false}" == "true" ]]; then
  echo "=== DRY_RUN is enabled. Skipping manifest upload to Exit Gate. ==="
  echo "Artifacts are staged in Artifact Registry."
  exit 0
fi

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
MANIFEST_NAME="manifest-$(date +%Y%m%d%H%M%S).json"

echo "=== Uploading manifest to ${EXIT_GATE_BUCKET}/${MANIFEST_NAME} ==="
gcloud storage cp manifest.json "${EXIT_GATE_BUCKET}/${MANIFEST_NAME}"

echo "========================================================================="
echo "Release successfully triggered! Exit Gate will now verify BCID and publish to npm."
echo "========================================================================="
