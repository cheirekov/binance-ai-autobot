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
  T-040|T-PROD|T-BETA)
    echo "Validation mode: targeted beta-readiness process validation"
    echo "Active ticket: $ACTIVE_TICKET"
    bash -n scripts/auto-retro.sh scripts/update-session-brief.sh scripts/pmba-gate.sh scripts/validate-active-ticket.sh
    node --check scripts/feedback-evidence.js
    node --check scripts/t040-readiness-check.js
    node --check scripts/t026-calibration-runner.js
    node --check scripts/t040-strategy-effectiveness-report.js
    T040_OUTPUT="$(node scripts/t040-readiness-check.js)"
    printf '%s\n' "$T040_OUTPUT"
    T040_CLASSIFICATION="$(printf '%s\n' "$T040_OUTPUT" | sed -n 's/^T-040 readiness classification: //p' | head -n1)"
    T026_OUTPUT="$(node scripts/t026-calibration-runner.js)"
    printf '%s\n' "$T026_OUTPUT"
    T026_RECOMMENDATION="$(printf '%s\n' "$T026_OUTPUT" | sed -n 's/^T-026 calibration recommendation: //p' | head -n1)"
    T040_EFFECTIVENESS_OUTPUT="$(node scripts/t040-strategy-effectiveness-report.js)"
    printf '%s\n' "$T040_EFFECTIVENESS_OUTPUT"
    T040_EFFECTIVENESS_VERDICT="$(printf '%s\n' "$T040_EFFECTIVENESS_OUTPUT" | sed -n 's/^T-040 strategy effectiveness verdict: //p' | head -n1)"
    ./scripts/pmba-gate.sh start
    ./scripts/pmba-gate.sh end
    export T040_CLASSIFICATION T026_RECOMMENDATION T040_EFFECTIVENESS_VERDICT
    node <<'NODE'
const fs = require('fs');

const requiredFiles = [
  'docs/DELIVERY_BOARD.md',
  'docs/SESSION_BRIEF.md',
  'docs/TICKET_SWITCH_RETRO.md',
  'docs/RETROSPECTIVE_AUTO.md',
  'docs/easy_process/T040_BETA_READINESS_PACKET.md',
  'docs/easy_process/T040_VALIDATION_MAP.md',
  'docs/easy_process/AI_ORCHESTRATION.md',
];

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`T-040 validation failed: ${message}`);
  process.exit(1);
};

for (const path of requiredFiles) {
  if (!fs.existsSync(path)) fail(`missing ${path}`);
}

const board = read('docs/DELIVERY_BOARD.md');
const session = read('docs/SESSION_BRIEF.md');
const retro = read('docs/RETROSPECTIVE_AUTO.md');
const packet = read('docs/easy_process/T040_BETA_READINESS_PACKET.md');
const validationMap = read('docs/easy_process/T040_VALIDATION_MAP.md');
const orchestration = read('docs/easy_process/AI_ORCHESTRATION.md');
const t040Classification = process.env.T040_CLASSIFICATION ?? '';
const t026Recommendation = process.env.T026_RECOMMENDATION ?? '';
const t040EffectivenessVerdict = process.env.T040_EFFECTIVENESS_VERDICT ?? '';

const inProgress = [...board.matchAll(/^\| (T-[0-9]{3}) \| IN_PROGRESS \|/gm)].map((match) => match[1]);
if (inProgress.length !== 1 || inProgress[0] !== 'T-040') {
  fail(`expected exactly one IN_PROGRESS ticket T-040, found ${inProgress.join(', ') || 'none'}`);
}

if (!/^- Active ticket: `T-040`/m.test(session)) fail('session brief is not aligned to T-040');
if (!/Decision: `(continue|validation_required)`/m.test(session)) {
  fail('session brief decision is neither continue nor validation_required');
}
if (!/^Active ticket: `T-040`/m.test(retro)) fail('auto-retro is not aligned to T-040');
if (!/Production readiness mode: `enabled`/.test(retro)) fail('auto-retro production readiness mode is not enabled');
if (!/P0\/P1/.test(packet) || !/deterministic reproduction/.test(packet)) fail('beta packet is missing severity/reproduction patch rule');
if (!/Gate P1/.test(packet)) fail('beta packet is missing Gate P1 checklist');
if (!/Strategy effectiveness verdict/.test(packet)) fail('beta packet is missing strategy effectiveness verdict');
if (!/Required Deterministic Scenarios/.test(validationMap)) fail('validation map is missing deterministic scenarios');
if (!/PATCH_ALLOWED/.test(orchestration) || !/VALIDATION_ONLY/.test(orchestration)) fail('AI orchestration is missing output classes');
if (!/^(CONTINUE_READINESS|VALIDATION_REQUIRED)$/.test(t040Classification)) {
  fail(`unexpected T-040 readiness classification ${t040Classification || 'empty'}`);
}
if (!/^(NOT_BETA_READY|CANDIDATE_READY_FOR_OPERATOR_REVIEW)$/.test(t040EffectivenessVerdict)) {
  fail(`unexpected T-040 strategy effectiveness verdict ${t040EffectivenessVerdict || 'empty'}`);
}
if (t040Classification === 'VALIDATION_REQUIRED') {
  if (!/Decision mode: `VALIDATION_REQUIRED`/.test(packet)) fail('beta packet does not record VALIDATION_REQUIRED');
  if (!/Production posture: not approved/.test(packet)) fail('beta packet does not block production promotion');
  if (!/Beta posture: pause promotion/.test(packet)) fail('beta packet does not pause beta promotion');
  if (t026Recommendation !== 'BUILD_BEAR_CHOPPY_FIXTURE') {
    fail(`expected T-026 BUILD_BEAR_CHOPPY_FIXTURE during validation pressure, found ${t026Recommendation || 'empty'}`);
  }
}

console.log(`PASS: T-040 beta-readiness process validation (${t040Classification}; promotion gate remains separate)`);
NODE
    ;;
  T-032)
    echo "Validation mode: targeted deterministic validation"
    echo "Active ticket: $ACTIVE_TICKET"
    run_in_ci "corepack enable && pnpm install --no-frozen-lockfile && pnpm -C apps/api exec vitest run src/modules/bot/bot-engine.service.test.ts -t 'caution unwind|defensive grid-guard unwind|grid-guard pause|GRID_GUARD_BUY_PAUSE|grid waiting skips as storm-eligible|no-feasible recovery'"
    ;;
  *)
    echo "No ticket-specific deterministic validation mapped for $ACTIVE_TICKET; running full CI instead."
    "${COMPOSE[@]}" -f docker-compose.ci.yml run --rm ci
    ;;
esac
