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

STAMP="$(date -u +"%Y%m%d-%H%M%S")"
OUT_FILE="autobot-feedback-${STAMP}.tgz"

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

mkdir -p "$TMP_DIR/data" "$TMP_DIR/data/logs" "$TMP_DIR/data/telemetry" "$TMP_DIR/meta" "$TMP_DIR/meta/docs"

copy_if_exists() {
  local src="$1"
  local dst="$2"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
}

# Generate compact last-run summary if generator exists.
if [[ -x "scripts/generate-last-run-summary.sh" ]]; then
  ./scripts/generate-last-run-summary.sh >/dev/null 2>&1 || true
fi

# Core artifacts (no secrets)
copy_if_exists "data/state.json" "$TMP_DIR/data/state.json"
copy_if_exists "data/universe.json" "$TMP_DIR/data/universe.json"
copy_if_exists "data/news.json" "$TMP_DIR/data/news.json"
copy_if_exists "data/logs/api.log" "$TMP_DIR/data/logs/api.log"
copy_if_exists "data/telemetry/baseline-kpis.json" "$TMP_DIR/data/telemetry/baseline-kpis.json"
copy_if_exists "data/telemetry/last_run_summary.json" "$TMP_DIR/data/telemetry/last_run_summary.json"

if [[ -f "data/telemetry/adaptive-shadow.jsonl" ]]; then
  tail -n 5000 "data/telemetry/adaptive-shadow.jsonl" >"$TMP_DIR/data/telemetry/adaptive-shadow.tail.jsonl" || true
fi

# Delivery context snapshots (team memory + ticket state)
copy_if_exists "docs/TEAM_OPERATING_RULES.md" "$TMP_DIR/meta/docs/TEAM_OPERATING_RULES.md"
copy_if_exists "docs/DELIVERY_BOARD.md" "$TMP_DIR/meta/docs/DELIVERY_BOARD.md"
copy_if_exists "docs/PM_BA_CHANGELOG.md" "$TMP_DIR/meta/docs/PM_BA_CHANGELOG.md"
copy_if_exists "docs/AI_DECISION_CONTRACT.md" "$TMP_DIR/meta/docs/AI_DECISION_CONTRACT.md"
copy_if_exists "docs/schemas/last_run_summary.schema.json" "$TMP_DIR/meta/docs/last_run_summary.schema.json"
for retro in docs/RETROSPECTIVE_*.md; do
  [[ -f "$retro" ]] || continue
  copy_if_exists "$retro" "$TMP_DIR/meta/docs/$(basename "$retro")"
done

# Redacted config (keeps structure, removes secrets)
if [[ -f "data/config.json" ]]; then
  if command -v node >/dev/null 2>&1; then
    node - <<'NODE' >"$TMP_DIR/data/config.redacted.json"
const fs = require("node:fs");

const raw = fs.readFileSync("data/config.json", "utf8");
const cfg = JSON.parse(raw);

const redact = (obj, path) => {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const k = path[i];
    if (!cur || typeof cur !== "object" || !(k in cur)) return;
    cur = cur[k];
  }
  const last = path[path.length - 1];
  if (cur && typeof cur === "object" && last in cur) {
    cur[last] = "[REDACTED]";
  }
};

[
  ["basic", "binance", "apiKey"],
  ["basic", "binance", "apiSecret"],
  ["basic", "openai", "apiKey"],
  ["basic", "uiAuth", "passwordHash"],
  ["advanced", "apiKey"]
].forEach((p) => redact(cfg, p));

process.stdout.write(JSON.stringify(cfg, null, 2));
NODE
  else
    # Fallback: use node inside the api container (reads /data/config.json).
    "${COMPOSE[@]}" exec -T api node - <<'NODE' >"$TMP_DIR/data/config.redacted.json" 2>/dev/null || true
const fs = require("node:fs");

const raw = fs.readFileSync("/data/config.json", "utf8");
const cfg = JSON.parse(raw);

const redact = (obj, path) => {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const k = path[i];
    if (!cur || typeof cur !== "object" || !(k in cur)) return;
    cur = cur[k];
  }
  const last = path[path.length - 1];
  if (cur && typeof cur === "object" && last in cur) {
    cur[last] = "[REDACTED]";
  }
};

[
  ["basic", "binance", "apiKey"],
  ["basic", "binance", "apiSecret"],
  ["basic", "openai", "apiKey"],
  ["basic", "uiAuth", "passwordHash"],
  ["advanced", "apiKey"]
].forEach((p) => redact(cfg, p));

process.stdout.write(JSON.stringify(cfg, null, 2));
NODE
  fi
fi

# Minimal environment/meta (safe to share)
{
  echo "date_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "git_sha=$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "docker_compose_cmd=${COMPOSE[*]}"
  echo "docker_compose_version=$("${COMPOSE[@]}" version 2>/dev/null | head -n 1 || echo unknown)"
} >"$TMP_DIR/meta/info.txt"

"${COMPOSE[@]}" ps >"$TMP_DIR/meta/docker-compose-ps.txt" 2>&1 || true

compose_services_running=0
if awk 'NR>1 && NF>0 { found=1 } END { exit(found?0:1) }' "$TMP_DIR/meta/docker-compose-ps.txt"; then
  compose_services_running=1
fi

write_service_tail() {
  local service="$1"
  local out_file="$2"
  local fallback_file="$3"
  local header="[$service tail]"

  if [[ "$compose_services_running" -eq 1 ]]; then
    "${COMPOSE[@]}" logs --no-color --tail=500 "$service" >"$out_file" 2>&1 || true
  fi

  if [[ -s "$out_file" ]]; then
    return
  fi

  {
    echo "$header compose logs unavailable in this environment."
    if [[ -f "$fallback_file" ]]; then
      echo "$header fallback from $fallback_file"
      tail -n 500 "$fallback_file"
    else
      echo "$header no fallback file found."
    fi
  } >"$out_file"
}

write_service_tail "api" "$TMP_DIR/meta/docker-api-tail.log" "data/logs/api.log"
write_service_tail "ui" "$TMP_DIR/meta/docker-ui-tail.log" "data/logs/ui.log"

if [[ -f "data/state.json" ]] && command -v node >/dev/null 2>&1; then
  node - <<'NODE' >"$TMP_DIR/meta/state-summary.txt" 2>/dev/null || true
const fs = require("node:fs");
const raw = fs.readFileSync("data/state.json", "utf8");
const state = JSON.parse(raw);
const openLimits = (state.activeOrders ?? []).filter((o) => {
  const t = String(o.type ?? "").toUpperCase();
  return t === "LIMIT" || t === "LIMIT_MAKER";
}).length;
const openMarkets = (state.activeOrders ?? []).filter((o) => String(o.type ?? "").toUpperCase() === "MARKET").length;
const tradeCount = (state.decisions ?? []).filter((d) => d.kind === "TRADE").length;
const skipCount = (state.decisions ?? []).filter((d) => d.kind === "SKIP").length;

const out = {
  updatedAt: state.updatedAt,
  running: state.running,
  phase: state.phase,
  activeOrders: (state.activeOrders ?? []).length,
  openLimitOrders: openLimits,
  openMarketOrders: openMarkets,
  orderHistory: (state.orderHistory ?? []).length,
  decisions: (state.decisions ?? []).length,
  trades: tradeCount,
  skips: skipCount
};
process.stdout.write(JSON.stringify(out, null, 2));
NODE
fi

tar -czf "$OUT_FILE" -C "$TMP_DIR" .

echo "Wrote $OUT_FILE"
echo "Contains: state/universe/news/api.log + telemetry + redacted config + team docs snapshot (no raw config.json)."
