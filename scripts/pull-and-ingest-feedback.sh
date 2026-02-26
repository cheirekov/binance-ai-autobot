#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REMOTE_HOST="${1:-}"
REMOTE_DIR="${2:-/root/work/binance-ai-autobot}"

if [[ -z "$REMOTE_HOST" ]]; then
  cat <<'USAGE' >&2
Usage: ./scripts/pull-and-ingest-feedback.sh <remote-host> [remote-repo-dir]

Examples:
  ./scripts/pull-and-ingest-feedback.sh i2
  ./scripts/pull-and-ingest-feedback.sh root@i2.mikro.work /root/work/binance-ai-autobot
USAGE
  exit 2
fi

LATEST_REMOTE="$(
  ssh "$REMOTE_HOST" "ls -1t \"$REMOTE_DIR\"/autobot-feedback-*.tgz 2>/dev/null | head -n1" || true
)"

if [[ -z "$LATEST_REMOTE" ]]; then
  echo "No feedback bundle found on remote host: $REMOTE_HOST ($REMOTE_DIR)" >&2
  exit 1
fi

LOCAL_BUNDLE="$(basename "$LATEST_REMOTE")"
scp "$REMOTE_HOST:$LATEST_REMOTE" "$LOCAL_BUNDLE"

echo "Pulled: $LOCAL_BUNDLE"
./scripts/ingest-feedback.sh "$LOCAL_BUNDLE"
