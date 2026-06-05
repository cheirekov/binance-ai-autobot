#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Docker Compose compatibility:
# - Prefer `docker compose` (v2 plugin)
# - Fallback to `docker-compose` (v1 standalone)
COMPOSE=()
if [[ -n "${AUTOBOT_COMPOSE_CMD:-}" ]]; then
  read -r -a COMPOSE <<<"${AUTOBOT_COMPOSE_CMD}"
else
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    echo "Docker Compose not found. Install either 'docker compose' (v2) or 'docker-compose' (v1)." >&2
    exit 1
  fi
fi

usage() {
  cat <<'USAGE'
Usage: ./scripts/run-batch.sh [options]

Runs a timed batch: brings up docker compose (or docker-compose), waits, then collects a feedback bundle
and updates docs/SESSION_BRIEF.md from that bundle.

Options:
  -m, --minutes <n>        Run duration in minutes (default: 240)
  --down                  Run `docker compose down` (or `docker-compose down`) before starting
  --no-build              Do not build images (skips `--build`)
  --no-recreate           Do not force recreate (skips `--force-recreate`)
  --reset-state           Delete `data/state.json` before starting; requires AUTOBOT_ALLOW_DATA_RESET=1
  --reset-universe        Delete `data/universe.json` before starting; requires AUTOBOT_ALLOW_DATA_RESET=1
  --reset-telemetry       Delete `data/telemetry/*` before starting; requires AUTOBOT_ALLOW_DATA_RESET=1
  -h, --help              Show help

Examples:
  ./scripts/run-batch.sh --minutes 180
  AUTOBOT_ALLOW_DATA_RESET=1 ./scripts/run-batch.sh --down --reset-universe --reset-telemetry --minutes 60

Safety:
  When data/config.json has basic.liveTrading=true, reset flags are blocked unless
  AUTOBOT_ALLOW_LIVE_DATA_RESET=1 is also set. Reset backups are written under data/backups/.
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
echo "Compose: ${COMPOSE[*]}"

RESET_REQUESTED=0
if [[ "$RESET_STATE" -eq 1 || "$RESET_UNIVERSE" -eq 1 || "$RESET_TELEMETRY" -eq 1 ]]; then
  RESET_REQUESTED=1
fi

read_live_trading_flag() {
  if [[ ! -f data/config.json ]] || ! command -v node >/dev/null 2>&1; then
    echo "unknown"
    return
  fi
  node - <<'NODE' 2>/dev/null || echo "unknown"
const fs = require("node:fs");
const cfg = JSON.parse(fs.readFileSync("data/config.json", "utf8"));
process.stdout.write(cfg?.basic?.liveTrading === true ? "true" : "false");
NODE
}

backup_before_reset() {
  local src="$1"
  local label="$2"
  local backup_root="$3"
  if [[ -f "$src" ]]; then
    mkdir -p "$backup_root/$(dirname "$src")"
    cp "$src" "$backup_root/$src"
    echo "Backup: $src -> $backup_root/$src"
  elif [[ -d "$src" ]]; then
    mkdir -p "$backup_root/$(dirname "$src")"
    cp -a "$src" "$backup_root/$src"
    echo "Backup: $label -> $backup_root/$src"
  else
    echo "Backup skipped: $label not present"
  fi
}

write_reset_event() {
  local timestamp="$1"
  local backup_dir="$2"
  mkdir -p data/telemetry
  node - "$timestamp" "$backup_dir" "$RESET_STATE" "$RESET_UNIVERSE" "$RESET_TELEMETRY" <<'NODE' >>data/telemetry/reset-events.jsonl
const [timestamp, backupDir, resetState, resetUniverse, resetTelemetry] = process.argv.slice(2);
const event = {
  timestamp,
  backupDir,
  reset: {
    state: resetState === "1",
    universe: resetUniverse === "1",
    telemetry: resetTelemetry === "1"
  },
  source: "scripts/run-batch.sh"
};
process.stdout.write(`${JSON.stringify(event)}\n`);
NODE
}

if [[ "$RESET_REQUESTED" -eq 1 ]]; then
  if [[ "${AUTOBOT_ALLOW_DATA_RESET:-0}" != "1" ]]; then
    echo "Refusing reset flags without AUTOBOT_ALLOW_DATA_RESET=1." >&2
    echo "Preserve data/state.json unless you intentionally want to discard continuity evidence." >&2
    exit 2
  fi

  LIVE_TRADING_FLAG="$(read_live_trading_flag)"
  if [[ "$LIVE_TRADING_FLAG" == "true" && "${AUTOBOT_ALLOW_LIVE_DATA_RESET:-0}" != "1" ]]; then
    echo "Refusing reset flags while data/config.json has basic.liveTrading=true." >&2
    echo "Set AUTOBOT_ALLOW_LIVE_DATA_RESET=1 only for an intentional break-glass reset." >&2
    exit 2
  fi

  RESET_TS="$(date -u +"%Y%m%d-%H%M%S")"
  RESET_BACKUP_DIR="data/backups/reset-${RESET_TS}"
  mkdir -p "$RESET_BACKUP_DIR"
  if [[ "$RESET_STATE" -eq 1 ]]; then
    backup_before_reset "data/state.json" "data/state.json" "$RESET_BACKUP_DIR"
  fi
  if [[ "$RESET_UNIVERSE" -eq 1 ]]; then
    backup_before_reset "data/universe.json" "data/universe.json" "$RESET_BACKUP_DIR"
  fi
  if [[ "$RESET_TELEMETRY" -eq 1 ]]; then
    backup_before_reset "data/telemetry" "data/telemetry/*" "$RESET_BACKUP_DIR"
  fi
fi

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

if [[ "$RESET_REQUESTED" -eq 1 ]]; then
  write_reset_event "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$RESET_BACKUP_DIR"
fi

if [[ "$DO_DOWN" -eq 1 ]]; then
  "${COMPOSE[@]}" down
fi

UP_ARGS=(up -d)
if [[ "$DO_BUILD" -eq 1 ]]; then
  UP_ARGS+=(--build)
fi
if [[ "$DO_RECREATE" -eq 1 ]]; then
  UP_ARGS+=(--force-recreate)
fi

"${COMPOSE[@]}" "${UP_ARGS[@]}"
"${COMPOSE[@]}" ps || true

echo "Sleeping for ${MINUTES}m..."
sleep "$((MINUTES * 60))"

echo "Collecting feedback bundle..."
./scripts/collect-feedback.sh >/dev/null
BUNDLE="$(find . -maxdepth 1 -type f -name 'autobot-feedback-*.tgz' -print | sed 's#^\./##' | sort | tail -n1 || true)"
if [[ -z "$BUNDLE" || ! -f "$BUNDLE" ]]; then
  echo "Expected feedback bundle not found after collect-feedback." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node is required for ingest-feedback.sh and PM/BA automation." >&2
  exit 1
fi

echo "Ingesting bundle: $BUNDLE"
./scripts/ingest-feedback.sh "$BUNDLE"

echo "Batch end (utc): $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Bundle: $BUNDLE"
