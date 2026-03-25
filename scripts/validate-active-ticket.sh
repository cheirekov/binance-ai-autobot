#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SESSION_FILE="docs/SESSION_BRIEF.md"
FULL_MODE=0

if [[ "${1:-}" == "--full" ]]; then
  FULL_MODE=1
fi

if [[ ! -f "$SESSION_FILE" ]]; then
  echo "Missing $SESSION_FILE" >&2
  exit 1
fi

ACTIVE_TICKET="$(grep -E '^- Active ticket: `' "$SESSION_FILE" | head -n1 | sed -E 's/^- Active ticket: `([^`]+)`.*/\1/')"
if [[ -z "$ACTIVE_TICKET" ]]; then
  echo "Could not determine active ticket from $SESSION_FILE" >&2
  exit 1
fi

COMPOSE=()
if [[ -n "${AUTOBOT_COMPOSE_CMD:-}" ]]; then
  read -r -a COMPOSE <<<"${AUTOBOT_COMPOSE_CMD}"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose not found. Install either 'docker compose' (v2) or 'docker-compose' (v1)." >&2
  exit 1
fi

run_in_ci() {
  local inner="$1"
  "${COMPOSE[@]}" -f docker-compose.ci.yml run --rm ci sh -lc "$inner"
}

if [[ "$FULL_MODE" -eq 1 ]]; then
  echo "Validation mode: full CI"
  echo "Active ticket: $ACTIVE_TICKET"
  "${COMPOSE[@]}" -f docker-compose.ci.yml run --rm ci
  exit 0
fi

case "$ACTIVE_TICKET" in
  T-032)
    echo "Validation mode: targeted deterministic validation"
    echo "Active ticket: $ACTIVE_TICKET"
    run_in_ci "corepack enable && pnpm install --no-frozen-lockfile && pnpm -C apps/api exec vitest run src/modules/bot/bot-engine.service.test.ts -t 'caution unwind|defensive grid-guard unwind|grid guard pause|grid waiting skips as storm-eligible'"
    ;;
  *)
    echo "No ticket-specific deterministic validation mapped for $ACTIVE_TICKET; running full CI instead."
    "${COMPOSE[@]}" -f docker-compose.ci.yml run --rm ci
    ;;
esac
