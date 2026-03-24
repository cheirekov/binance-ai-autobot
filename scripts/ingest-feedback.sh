#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BUNDLE="${1:-}"
if [[ -z "$BUNDLE" ]]; then
  BUNDLE="$(find . -maxdepth 1 -type f -name 'autobot-feedback-*.tgz' -printf '%f\n' | sort | tail -n1 || true)"
fi

if [[ -z "$BUNDLE" || ! -f "$BUNDLE" ]]; then
  echo "Feedback bundle not found. Pass a bundle path or copy one locally first." >&2
  exit 1
fi

node - "$BUNDLE" <<'NODE'
const { execFileSync } = require("node:child_process");

const bundlePath = process.argv[2];

const readFromTar = (innerPaths) => {
  for (const innerPath of innerPaths) {
    try {
      const raw = execFileSync("tar", ["-xOf", bundlePath, innerPath], {
        stdio: ["ignore", "pipe", "ignore"]
      }).toString("utf8");
      return raw;
    } catch {
      // try next path
    }
  }
  return null;
};

const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const runContextRaw = readFromTar(["./meta/run-context.json", "meta/run-context.json"]);
const summaryRaw = readFromTar([
  "./data/telemetry/last_run_summary.json",
  "data/telemetry/last_run_summary.json"
]);
const infoRaw = readFromTar(["./meta/info.txt", "meta/info.txt"]);

if (!summaryRaw || !infoRaw || !runContextRaw) {
  console.error("Bundle is missing required metadata files (summary/run-context/info).");
  process.exit(2);
}

const runContext = parseJson(runContextRaw);
const summary = parseJson(summaryRaw);
if (!summary || !runContext) {
  console.error("Bundle metadata is present but invalid JSON.");
  process.exit(3);
}

const fmt = (v) => (v === null || v === undefined || v === "" ? "unknown" : String(v));
console.log(`Bundle: ${bundlePath}`);
console.log(`- Cycle: ${fmt(runContext.declared_cycle)}`);
console.log(`- Window(local): ${fmt(runContext.collection_window_local)} | Run end(local): ${fmt(runContext.run_end_window_local)}`);
console.log(`- Run end UTC: ${fmt(summary.ended_at_utc)}`);
console.log(`- Active ticket expected from board/session will be checked by pmba-gate.`);
NODE

./scripts/auto-retro.sh "$BUNDLE"
./scripts/update-session-brief.sh "$BUNDLE"
./scripts/pmba-gate.sh end

echo "Ingestion complete: $BUNDLE"
