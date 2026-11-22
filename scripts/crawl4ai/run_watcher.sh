#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="$REPO_DIR/scripts/crawl4ai/watcher.log"
VENV_DIR="$HOME/.crawl4ai-venv"
ENV_FILE="$HOME/.config/csodisha/crawl-sync.env"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "[$(date -Is)] ERROR: $VENV_DIR/bin/python not found. Run scripts/crawl4ai/install-persistent-runner.sh first." | tee -a "$LOG_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

cd "$REPO_DIR"
{
  echo "=== [$(date -Is)] Starting Crawl4AI .gov.in watcher ==="
  if [[ -n "${CSO_CRAWL_SYNC_TOKEN:-}" ]]; then
    python scripts/crawl4ai/watch_gov_notices.py --sync
  else
    python scripts/crawl4ai/watch_gov_notices.py
  fi
  echo "=== [$(date -Is)] Finished Crawl4AI .gov.in watcher ==="
} 2>&1 | tee -a "$LOG_FILE"
