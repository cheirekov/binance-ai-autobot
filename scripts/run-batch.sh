#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'USAGE'
Usage: ./scripts/run-batch.sh [options]

Runs a timed batch: brings up docker compose, waits, then collects a feedback bundle
and updates docs/SESSION_BRIEF.md from that bundle.

Options:
  -m, --minutes <n>        Run duration in minutes (default: 240)
  --down                  Run `docker compose down` before starting
  --no-build              Do not build images (skips `--build`)
  --no-recreate           Do not force recreate (skips `--force-recreate`)
  --reset-state           Delete `data/state.json` before starting
  --reset-universe        Delete `data/universe.json` before starting
  --reset-telemetry       Delete `data/telemetry/*` before starting
  -h, --help              Show help

Examples:
  ./scripts/run-batch.sh --minutes 180
  ./scripts/run-batch.sh --down --reset-state --reset-universe --minutes 60
USAGE
}

MINUTES=240
DO_DOWN=0
DO_BUILD=1
DO_RECREATE=1
RESET_STATE=0
RESET_UNIVERSE=0
RESET_TELEMETRY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--minutes)
      MINUTES="${2:-}"
      shift 2
      ;;
    --down)
      DO_DOWN=1
      shift
      ;;
    --no-build)
      DO_BUILD=0
      shift
      ;;
    --no-recreate)
      DO_RECREATE=0
      shift
      ;;
    --reset-state)
      RESET_STATE=1
      shift
      ;;
    --reset-universe)
      RESET_UNIVERSE=1
      shift
      ;;
    --reset-telemetry)
      RESET_TELEMETRY=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if ! [[ "$MINUTES" =~ ^[0-9]+$ ]] || [[ "$MINUTES" -le 0 ]]; then
  echo "--minutes must be a positive integer, got: $MINUTES" >&2
  exit 2
fi

echo "Batch start (utc): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Run minutes: $MINUTES"

if [[ "$RESET_STATE" -eq 1 ]]; then
  rm -f data/state.json
  echo "Reset: data/state.json"
fi
if [[ "$RESET_UNIVERSE" -eq 1 ]]; then
  rm -f data/universe.json
  echo "Reset: data/universe.json"
fi
if [[ "$RESET_TELEMETRY" -eq 1 ]]; then
  rm -rf data/telemetry
  mkdir -p data/telemetry
  echo "Reset: data/telemetry/*"
fi

if [[ "$DO_DOWN" -eq 1 ]]; then
  docker compose down
fi

UP_ARGS=(up -d)
if [[ "$DO_BUILD" -eq 1 ]]; then
  UP_ARGS+=(--build)
fi
if [[ "$DO_RECREATE" -eq 1 ]]; then
  UP_ARGS+=(--force-recreate)
fi

docker compose "${UP_ARGS[@]}"
docker compose ps || true

echo "Sleeping for ${MINUTES}m..."
sleep "$((MINUTES * 60))"

echo "Collecting feedback bundle..."
./scripts/collect-feedback.sh >/dev/null
BUNDLE="$(ls -t autobot-feedback-*.tgz 2>/dev/null | head -n1 || true)"
if [[ -z "$BUNDLE" || ! -f "$BUNDLE" ]]; then
  echo "Expected feedback bundle not found after collect-feedback." >&2
  exit 1
fi

echo "Updating session brief from bundle: $BUNDLE"
./scripts/update-session-brief.sh "$BUNDLE" >/dev/null

echo "Batch end (utc): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Bundle: $BUNDLE"
