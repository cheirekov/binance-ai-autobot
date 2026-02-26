#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BOARD_FILE="docs/DELIVERY_BOARD.md"
SESSION_FILE="docs/SESSION_BRIEF.md"
CHANGELOG_FILE="docs/PM_BA_CHANGELOG.md"

PHASE="${1:-start}"
if [[ "$PHASE" != "start" && "$PHASE" != "end" ]]; then
  echo "Usage: ./scripts/pmba-gate.sh [start|end]" >&2
  exit 2
fi

for required in "$BOARD_FILE" "$SESSION_FILE" "$CHANGELOG_FILE"; do
  if [[ ! -f "$required" ]]; then
    echo "FAIL: missing required file: $required" >&2
    exit 1
  fi
done

mapfile -t ACTIVE_TICKETS < <(
  grep -E '^\| T-[0-9]{3} \| IN_PROGRESS \|' "$BOARD_FILE" \
    | sed -E 's/^\| (T-[0-9]{3}) \|.*/\1/'
)

if [[ "${#ACTIVE_TICKETS[@]}" -ne 1 ]]; then
  echo "FAIL: expected exactly one IN_PROGRESS ticket, found ${#ACTIVE_TICKETS[@]}." >&2
  if [[ "${#ACTIVE_TICKETS[@]}" -gt 0 ]]; then
    printf 'IN_PROGRESS tickets: %s\n' "${ACTIVE_TICKETS[*]}" >&2
  fi
  exit 1
fi

ACTIVE_TICKET="${ACTIVE_TICKETS[0]}"
if ! grep -q "Active ticket: \`$ACTIVE_TICKET\`" "$SESSION_FILE"; then
  echo "FAIL: SESSION_BRIEF active ticket does not match board IN_PROGRESS ticket ($ACTIVE_TICKET)." >&2
  exit 1
fi

if grep -q "<set-after-commit>" "$SESSION_FILE"; then
  echo "WARN: SESSION_BRIEF still contains <set-after-commit> placeholder."
fi

if ! grep -q "$ACTIVE_TICKET" "$CHANGELOG_FILE"; then
  echo "WARN: no changelog entry references active ticket $ACTIVE_TICKET yet."
fi

if [[ "$PHASE" == "end" ]]; then
  if ! grep -q -- "- Decision: \`" "$SESSION_FILE"; then
    echo "FAIL: SESSION_BRIEF Section 4 missing decision line." >&2
    exit 1
  fi
  if ! grep -Eq -- "^- Observed KPI delta" "$SESSION_FILE"; then
    echo "FAIL: SESSION_BRIEF Section 4 missing observed KPI delta block." >&2
    exit 1
  fi

  if command -v node >/dev/null 2>&1; then
    mapfile -t LATEST_BUNDLES < <(ls -t autobot-feedback-*.tgz 2>/dev/null | head -n 2)
    if [[ "${#LATEST_BUNDLES[@]}" -ge 2 ]]; then
      node - "${LATEST_BUNDLES[0]}" "${LATEST_BUNDLES[1]}" "$ACTIVE_TICKET" <<'NODE'
const { execSync } = require("node:child_process");

const [latestBundle, previousBundle, activeTicket] = process.argv.slice(2);

const readSummaryFromBundle = (bundlePath) => {
  const candidates = [
    "data/telemetry/last_run_summary.json",
    "./data/telemetry/last_run_summary.json"
  ];
  for (const innerPath of candidates) {
    try {
      const raw = execSync(`tar -xOf ${JSON.stringify(bundlePath)} ${JSON.stringify(innerPath)}`, {
        stdio: ["ignore", "pipe", "ignore"]
      }).toString("utf8");
      return JSON.parse(raw);
    } catch {
      // try next path
    }
  }
  return null;
};

const latest = readSummaryFromBundle(latestBundle);
const previous = readSummaryFromBundle(previousBundle);

if (!latest || !previous) process.exit(0);

const latestTop = latest?.activity?.skips?.top_reasons?.[0];
const previousTop = previous?.activity?.skips?.top_reasons?.[0];

const latestReason = String(latestTop?.reason ?? "");
const previousReason = String(previousTop?.reason ?? "");
const latestCount = Number(latestTop?.count ?? 0);
const previousCount = Number(previousTop?.count ?? 0);

const dominantLoopRepeated =
  latestReason.length > 0 &&
  latestReason === previousReason &&
  latestCount >= 8 &&
  previousCount >= 8;

if (dominantLoopRepeated) {
  console.error(
    `FAIL: Dominant loop reason repeated in last 2 bundles for active ticket ${activeTicket}: "${latestReason}" (${previousCount} -> ${latestCount}).`
  );
  console.error("Action required: add triage note (docs/TRIAGE_NOTE_TEMPLATE.md) and either patch mitigation or PM/BA pivot decision.");
  process.exit(1);
}
NODE
    fi
  fi
fi

echo "PASS: PM/BA gate ($PHASE)"
echo "- active ticket: $ACTIVE_TICKET"
echo "- session brief aligned: yes"
