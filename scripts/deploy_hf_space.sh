#!/usr/bin/env bash
# deploy_hf_space.sh
# Pushes the LeaseIQ backend to HuggingFace Spaces.
#
# Prerequisites:
#   1. hf auth login   (run this first — opens browser)
#   2. bash scripts/deploy_hf_space.sh <your-hf-username>
#
# What it does:
#   - Creates the Space if it doesn't exist (docker SDK, public)
#   - Clones the Space repo into /tmp/leaseiq-space
#   - Copies app/, src/, requirements_api.txt, models/xgb_risk_model.pkl, Dockerfile, README.md
#   - Commits and pushes

set -euo pipefail

HF_USER="${1:-}"
if [[ -z "$HF_USER" ]]; then
  echo "Usage: bash scripts/deploy_hf_space.sh <your-hf-username>"
  exit 1
fi

SPACE_NAME="leaseiq-api"
SPACE_ID="$HF_USER/$SPACE_NAME"
REPO_URL="https://huggingface.co/spaces/$SPACE_ID"
TMP_DIR="/tmp/leaseiq-space"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Creating Space $SPACE_ID (if it doesn't exist)..."
hf repo create "$SPACE_NAME" --type space --space-sdk docker --exist-ok 2>/dev/null || true

echo "==> Cloning Space repo..."
rm -rf "$TMP_DIR"
git clone "https://huggingface.co/spaces/$SPACE_ID" "$TMP_DIR"

echo "==> Copying files..."
cp    "$ROOT/hf_space/Dockerfile"       "$TMP_DIR/Dockerfile"
cp    "$ROOT/hf_space/README.md"        "$TMP_DIR/README.md"
cp    "$ROOT/requirements_api.txt"      "$TMP_DIR/requirements_api.txt"

mkdir -p "$TMP_DIR/app" "$TMP_DIR/src" "$TMP_DIR/models"
cp    "$ROOT/app/api.py"                "$TMP_DIR/app/api.py"
cp    "$ROOT/app/inference.py"          "$TMP_DIR/app/inference.py"
cp    "$ROOT/src/data_utils.py"         "$TMP_DIR/src/data_utils.py"
cp    "$ROOT/src/model_utils.py"        "$TMP_DIR/src/model_utils.py"
cp    "$ROOT/src/risk_scorer.py"        "$TMP_DIR/src/risk_scorer.py"
cp    "$ROOT/models/xgb_risk_model.pkl" "$TMP_DIR/models/xgb_risk_model.pkl"

# app/__init__.py so Python can import app.api
touch "$TMP_DIR/app/__init__.py"
touch "$TMP_DIR/src/__init__.py"

echo "==> Committing and pushing..."
cd "$TMP_DIR"
git add -A
git commit -m "deploy: LeaseIQ API $(date +%Y-%m-%d)" || echo "(nothing to commit)"
git push

echo ""
echo "✅ Deployed! Space URL: $REPO_URL"
echo ""
echo "Next steps:"
echo "  1. Go to $REPO_URL/settings"
echo "  2. Add these environment variables:"
echo "     HF_MODEL_LB = nlpaueb/legal-bert-base-uncased"
echo "     ALLOWED_ORIGINS = https://<your-vercel-app>.vercel.app"
echo "     DISABLE_DOCS = true"
echo "  3. After full training, push fine-tuned model and update HF_MODEL_LB"
