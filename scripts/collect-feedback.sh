#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

# Core artifacts (no secrets)
copy_if_exists "data/state.json" "$TMP_DIR/data/state.json"
copy_if_exists "data/universe.json" "$TMP_DIR/data/universe.json"
copy_if_exists "data/news.json" "$TMP_DIR/data/news.json"
copy_if_exists "data/logs/api.log" "$TMP_DIR/data/logs/api.log"
copy_if_exists "data/telemetry/baseline-kpis.json" "$TMP_DIR/data/telemetry/baseline-kpis.json"

if [[ -f "data/telemetry/adaptive-shadow.jsonl" ]]; then
  tail -n 5000 "data/telemetry/adaptive-shadow.jsonl" >"$TMP_DIR/data/telemetry/adaptive-shadow.tail.jsonl" || true
fi

# Delivery context snapshots (team memory + ticket state)
copy_if_exists "docs/TEAM_OPERATING_RULES.md" "$TMP_DIR/meta/docs/TEAM_OPERATING_RULES.md"
copy_if_exists "docs/DELIVERY_BOARD.md" "$TMP_DIR/meta/docs/DELIVERY_BOARD.md"
copy_if_exists "docs/PM_BA_CHANGELOG.md" "$TMP_DIR/meta/docs/PM_BA_CHANGELOG.md"

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
    docker compose exec -T api node - <<'NODE' >"$TMP_DIR/data/config.redacted.json" 2>/dev/null || true
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
  echo "docker_compose_version=$(docker compose version 2>/dev/null | head -n 1 || echo unknown)"
} >"$TMP_DIR/meta/info.txt"

docker compose ps >"$TMP_DIR/meta/docker-compose-ps.txt" 2>/dev/null || true
docker compose logs --no-color --tail=300 api >"$TMP_DIR/meta/docker-api-tail.log" 2>/dev/null || true
docker compose logs --no-color --tail=300 ui >"$TMP_DIR/meta/docker-ui-tail.log" 2>/dev/null || true

tar -czf "$OUT_FILE" -C "$TMP_DIR" .

echo "Wrote $OUT_FILE"
echo "Contains: state/universe/news/api.log + telemetry + redacted config + team docs snapshot (no raw config.json)."
