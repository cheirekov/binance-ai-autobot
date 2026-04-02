#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BOARD_FILE="docs/DELIVERY_BOARD.md"
SESSION_FILE="docs/SESSION_BRIEF.md"
CHANGELOG_FILE="docs/PM_BA_CHANGELOG.md"
SWITCH_RETRO_FILE="docs/TICKET_SWITCH_RETRO.md"
RETRO_FILE="docs/RETROSPECTIVE_AUTO.md"

PHASE="${1:-start}"
if [[ "$PHASE" != "start" && "$PHASE" != "end" ]]; then
  echo "Usage: ./scripts/pmba-gate.sh [start|end]" >&2
  exit 2
fi

for required in "$BOARD_FILE" "$SESSION_FILE" "$CHANGELOG_FILE" "$SWITCH_RETRO_FILE" "$RETRO_FILE"; do
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

mapfile -t LINKED_SUPPORT_TICKETS < <(
  grep -E '^- Linked support ticket:\s*`T-[0-9]{3}`' "$SESSION_FILE" \
    | sed -E 's/^- Linked support ticket:\s*`(T-[0-9]{3})`.*/\1/'
)

if [[ "${#LINKED_SUPPORT_TICKETS[@]}" -gt 1 ]]; then
  echo "FAIL: expected at most one linked support ticket in SESSION_BRIEF, found ${#LINKED_SUPPORT_TICKETS[@]}." >&2
  printf 'Linked support tickets: %s\n' "${LINKED_SUPPORT_TICKETS[*]}" >&2
  exit 1
fi

LINKED_SUPPORT_TICKET=""
if [[ "${#LINKED_SUPPORT_TICKETS[@]}" -eq 1 ]]; then
  LINKED_SUPPORT_TICKET="${LINKED_SUPPORT_TICKETS[0]}"
  if [[ "$LINKED_SUPPORT_TICKET" == "$ACTIVE_TICKET" ]]; then
    echo "FAIL: linked support ticket cannot equal active ticket ($ACTIVE_TICKET)." >&2
    exit 1
  fi
  if ! grep -q "^\| $LINKED_SUPPORT_TICKET \|" "$BOARD_FILE"; then
    echo "FAIL: linked support ticket $LINKED_SUPPORT_TICKET is not present on the delivery board." >&2
    exit 1
  fi
fi

if ! grep -q "Current ticket: \`$ACTIVE_TICKET\`" "$SWITCH_RETRO_FILE"; then
  echo "FAIL: TICKET_SWITCH_RETRO current ticket does not match board IN_PROGRESS ticket ($ACTIVE_TICKET)." >&2
  exit 1
fi

if ! grep -q "^Previous ticket: \`T-[0-9]\\{3\\}\`" "$SWITCH_RETRO_FILE"; then
  echo "FAIL: TICKET_SWITCH_RETRO missing previous ticket reference." >&2
  exit 1
fi

if ! grep -q "^Switch decision: \`" "$SWITCH_RETRO_FILE"; then
  echo "FAIL: TICKET_SWITCH_RETRO missing switch decision line." >&2
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
    mapfile -t LATEST_BUNDLES < <(find . -maxdepth 1 -type f -name 'autobot-feedback-*.tgz' -printf '%f\n' | sort | tail -n 2 | tac)
    if [[ "${#LATEST_BUNDLES[@]}" -ge 2 ]]; then
      node - "${LATEST_BUNDLES[0]}" "${LATEST_BUNDLES[1]}" "$ACTIVE_TICKET" <<'NODE'
const path = require("node:path");

const [latestBundle, previousBundle, activeTicket] = process.argv.slice(2);
const { collectEvidence } = require(path.join(process.cwd(), "scripts", "feedback-evidence.js"));
const evidence = collectEvidence([latestBundle, previousBundle]);

const latest = evidence.latest;
if (!latest) process.exit(0);

if (!latest.freshness?.hasFreshRuntimeEvidence) {
  console.error(
    `WARN: latest bundle ${latest.bundle} has no fresh runtime evidence (${latest.freshness?.classification ?? "unknown"}); dominant-loop gate is skipped.`
  );
  if (Number(evidence.staleStreak ?? 0) >= 2) {
    console.error("WARN: repeated stale bundles detected; switch to deterministic validation instead of patching from cumulative history.");
  }
  process.exit(0);
}

const freshWindow = Array.isArray(evidence.freshWindow) ? evidence.freshWindow : [];
if (freshWindow.length < 2) process.exit(0);

const latestTop = freshWindow[0]?.summary?.activity?.skips?.top_reasons?.[0];
const previousTop = freshWindow[1]?.summary?.activity?.skips?.top_reasons?.[0];
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
    `FAIL: Dominant loop reason repeated in last 2 fresh bundles for active ticket ${activeTicket}: "${latestReason}" (${previousCount} -> ${latestCount}).`
  );
  console.error("Action required: add triage note (docs/TRIAGE_NOTE_TEMPLATE.md) and either patch mitigation or PM/BA pivot decision.");
  process.exit(1);
}
NODE
    fi
  fi

  SESSION_DECISION="$(grep -E '^- Decision: `' "$SESSION_FILE" | head -n1 | sed -E 's/^- Decision: `([^`]+)`.*/\1/')"
  RETRO_DECISION="$(grep -E '^- Decision: `' "$RETRO_FILE" | head -n1 | sed -E 's/^- Decision: `([^`]+)`.*/\1/')"
  if [[ -n "$RETRO_DECISION" && -n "$SESSION_DECISION" && "$RETRO_DECISION" != "$SESSION_DECISION" ]]; then
    echo "FAIL: SESSION_BRIEF decision ($SESSION_DECISION) does not match RETROSPECTIVE_AUTO decision ($RETRO_DECISION)." >&2
    exit 1
  fi
fi

echo "PASS: PM/BA gate ($PHASE)"
echo "- active ticket: $ACTIVE_TICKET"
if [[ -n "$LINKED_SUPPORT_TICKET" ]]; then
  echo "- linked support ticket: $LINKED_SUPPORT_TICKET"
fi
echo "- session brief aligned: yes"
