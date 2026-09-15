#!/usr/bin/env bash

# Retired with the legacy engine on 2026-09-15.
echo "Legacy workflow retired. Read README.md and apps/trader/README.md." >&2
exit 2
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
resolve_compose() {
  if [[ "${#COMPOSE[@]}" -gt 0 ]]; then
    return
  fi
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
}

run_in_ci() {
  local inner="$1"
  resolve_compose
  "${COMPOSE[@]}" -f docker-compose.ci.yml run --rm ci sh -lc "$inner"
}

if [[ "$FULL_MODE" -eq 1 ]]; then
  echo "Validation mode: full CI"
  echo "Active ticket: $ACTIVE_TICKET"
  resolve_compose
  "${COMPOSE[@]}" -f docker-compose.ci.yml run --rm ci
  exit 0
fi

case "$ACTIVE_TICKET" in
  T-040|T-PROD|T-BETA)
    echo "Validation mode: targeted beta-readiness process validation"
    echo "Active ticket: $ACTIVE_TICKET"
    bash -n scripts/auto-retro.sh scripts/update-session-brief.sh scripts/pmba-gate.sh scripts/validate-active-ticket.sh scripts/validate-beta-promotion.sh scripts/run-batch.sh
    node --check scripts/feedback-evidence.js
    node --check scripts/t040-readiness-check.js
    node --check scripts/t026-calibration-runner.js
    node --check scripts/t026-strategy-replay.js
    node --check scripts/t026-walk-forward-gate.js
    node --check scripts/t026-fixture-comparison.js
    node --check scripts/t026-grid-guard-proof.js
    node --check scripts/t026-entry-burst-proof.js
    node --check scripts/t026-proof-comparison.js
    node --check scripts/t026-risk-governor-proof.js
    node --check scripts/t040-strategy-effectiveness-report.js
    node --check scripts/t040-entry-burst-postdeploy-check.js
    node --test scripts/t026-entry-burst-proof.test.js scripts/t026-strategy-replay.test.js scripts/t026-walk-forward-gate.test.js scripts/t040-entry-burst-postdeploy-check.test.js
    set +e
    T040_OUTPUT="$(node scripts/t040-readiness-check.js 2>&1)"
    T040_STATUS=$?
    set -e
    printf '%s\n' "$T040_OUTPUT"
    T040_CLASSIFICATION="$(printf '%s\n' "$T040_OUTPUT" | sed -n 's/^T-040 readiness classification: //p' | head -n1)"
    if [[ "$T040_STATUS" -ne 0 && "$T040_CLASSIFICATION" != "PATCH_ALLOWED_REVIEW" ]]; then
      exit "$T040_STATUS"
    fi
    T026_OUTPUT="$(node scripts/t026-calibration-runner.js)"
    printf '%s\n' "$T026_OUTPUT"
    T026_RECOMMENDATION="$(printf '%s\n' "$T026_OUTPUT" | sed -n 's/^T-026 calibration recommendation: //p' | head -n1)"
    T026_FIXTURE_OUTPUT="$(node scripts/t026-fixture-comparison.js)"
    printf '%s\n' "$T026_FIXTURE_OUTPUT"
    T026_FIXTURE_VERDICT="$(printf '%s\n' "$T026_FIXTURE_OUTPUT" | sed -n 's/^T-026 fixture comparison verdict: //p' | head -n1)"
    T026_GRID_GUARD_OUTPUT="$(node scripts/t026-grid-guard-proof.js)"
    printf '%s\n' "$T026_GRID_GUARD_OUTPUT"
    T026_GRID_GUARD_VERDICT="$(printf '%s\n' "$T026_GRID_GUARD_OUTPUT" | sed -n 's/^T-026 grid guard proof verdict: //p' | head -n1)"
    T026_ENTRY_BURST_OUTPUT="$(node scripts/t026-entry-burst-proof.js)"
    printf '%s\n' "$T026_ENTRY_BURST_OUTPUT"
    T026_ENTRY_BURST_VERDICT="$(printf '%s\n' "$T026_ENTRY_BURST_OUTPUT" | sed -n 's/^T-026 entry burst proof verdict: //p' | head -n1)"
    T026_ENTRY_BURST_INDEPENDENT_OUTPUT="$(node scripts/t026-entry-burst-proof.js --previous autobot-feedback-20260604-082337.tgz --current autobot-feedback-20260605-075150.tgz)"
    printf '%s\n' "$T026_ENTRY_BURST_INDEPENDENT_OUTPUT"
    T026_ENTRY_BURST_INDEPENDENT_VERDICT="$(printf '%s\n' "$T026_ENTRY_BURST_INDEPENDENT_OUTPUT" | sed -n 's/^T-026 entry burst proof verdict: //p' | head -n1)"
    T026_RISK_GOVERNOR_OUTPUT="$(node scripts/t026-risk-governor-proof.js)"
    printf '%s\n' "$T026_RISK_GOVERNOR_OUTPUT"
    T026_RISK_GOVERNOR_VERDICT="$(printf '%s\n' "$T026_RISK_GOVERNOR_OUTPUT" | sed -n 's/^T-026 risk governor proof verdict: //p' | head -n1)"
    T026_PROOF_COMPARISON_OUTPUT="$(node scripts/t026-proof-comparison.js)"
    printf '%s\n' "$T026_PROOF_COMPARISON_OUTPUT"
    T026_PROOF_COMPARISON_VERDICT="$(printf '%s\n' "$T026_PROOF_COMPARISON_OUTPUT" | sed -n 's/^T-026 proof comparison verdict: //p' | head -n1)"
    T040_EFFECTIVENESS_OUTPUT="$(node scripts/t040-strategy-effectiveness-report.js)"
    printf '%s\n' "$T040_EFFECTIVENESS_OUTPUT"
    T040_EFFECTIVENESS_VERDICT="$(printf '%s\n' "$T040_EFFECTIVENESS_OUTPUT" | sed -n 's/^T-040 strategy effectiveness verdict: //p' | head -n1)"
    T040_ENTRY_BURST_POSTDEPLOY_OUTPUT="$(node scripts/t040-entry-burst-postdeploy-check.js)"
    printf '%s\n' "$T040_ENTRY_BURST_POSTDEPLOY_OUTPUT"
    T040_ENTRY_BURST_POSTDEPLOY_VERDICT="$(printf '%s\n' "$T040_ENTRY_BURST_POSTDEPLOY_OUTPUT" | sed -n 's/^T-040 entry burst post-deploy verdict: //p' | head -n1)"
    ./scripts/pmba-gate.sh start
    ./scripts/pmba-gate.sh end
    export T040_CLASSIFICATION T026_RECOMMENDATION T026_FIXTURE_VERDICT T026_GRID_GUARD_VERDICT T026_ENTRY_BURST_VERDICT T026_ENTRY_BURST_INDEPENDENT_VERDICT T026_RISK_GOVERNOR_VERDICT T026_PROOF_COMPARISON_VERDICT T040_EFFECTIVENESS_VERDICT T040_ENTRY_BURST_POSTDEPLOY_VERDICT
    node <<'NODE'
const fs = require('fs');
const { execFileSync } = require('child_process');

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
const t026FixtureVerdict = process.env.T026_FIXTURE_VERDICT ?? '';
const t026GridGuardVerdict = process.env.T026_GRID_GUARD_VERDICT ?? '';
const t026EntryBurstVerdict = process.env.T026_ENTRY_BURST_VERDICT ?? '';
const t026EntryBurstIndependentVerdict = process.env.T026_ENTRY_BURST_INDEPENDENT_VERDICT ?? '';
const t026RiskGovernorVerdict = process.env.T026_RISK_GOVERNOR_VERDICT ?? '';
const t026ProofComparisonVerdict = process.env.T026_PROOF_COMPARISON_VERDICT ?? '';
const t040EffectivenessVerdict = process.env.T040_EFFECTIVENESS_VERDICT ?? '';
const t040EntryBurstPostdeployVerdict = process.env.T040_ENTRY_BURST_POSTDEPLOY_VERDICT ?? '';
const changedFiles = (() => {
  try {
    const tracked = execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], { encoding: 'utf8' });
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
    return `${tracked}\n${untracked}`.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
})();
const runtimeOrTestChanges = changedFiles.filter((path) => /^(apps|packages)\//.test(path));
const deterministicValidationChanges = changedFiles.filter((path) =>
  /^scripts\/(?:feedback-evidence\.js|t0(?:26|40)-.+\.js)$/.test(path)
);
const codeOrValidationChanges = [...new Set([...runtimeOrTestChanges, ...deterministicValidationChanges])];
const operatorStopDecisionPath = 'docs/easy_process/OPERATOR_STOP_DECISION.md';
const operatorStopDecision = fs.existsSync(operatorStopDecisionPath)
  ? /Decision:\s*`?STOP_TESTNET`?/i.test(read(operatorStopDecisionPath))
  : false;

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
if (!/^(CONTINUE_READINESS|VALIDATION_REQUIRED|PATCH_ALLOWED_REVIEW)$/.test(t040Classification)) {
  fail(`unexpected T-040 readiness classification ${t040Classification || 'empty'}`);
}
if (!/^(NOT_BETA_READY|CANDIDATE_READY_FOR_OPERATOR_REVIEW)$/.test(t040EffectivenessVerdict)) {
  fail(`unexpected T-040 strategy effectiveness verdict ${t040EffectivenessVerdict || 'empty'}`);
}
if (t040EntryBurstPostdeployVerdict !== 'ENTRY_BURST_POSTDEPLOY_PASS') {
  fail(`expected entry-burst post-deploy audit to pass, found ${t040EntryBurstPostdeployVerdict || 'empty'}`);
}
if (!/Entry-burst post-deploy audit/.test(validationMap)) {
  fail('validation map is missing the entry-burst post-deploy audit');
}
if (!/^(FIXTURE_CANDIDATE_[A-Z0-9_]+|NO_FIXTURE_CANDIDATE)$/.test(t026FixtureVerdict)) {
  fail(`unexpected T-026 fixture comparison verdict ${t026FixtureVerdict || 'empty'}`);
}
if (!/^(GRID_GUARD_OFFLINE_PROOF_TARGET_READY|GRID_GUARD_PROOF_BLOCKED_[A-Z_]+|GRID_GUARD_PROOF_INSUFFICIENT_[A-Z_]+)$/.test(t026GridGuardVerdict)) {
  fail(`unexpected T-026 grid guard proof verdict ${t026GridGuardVerdict || 'empty'}`);
}
if (!/^ENTRY_BURST_GUARD_OFFLINE_PROOF_(PASSED|INCONCLUSIVE)$/.test(t026EntryBurstVerdict)) {
  fail(`unexpected T-026 entry burst proof verdict ${t026EntryBurstVerdict || 'empty'}`);
}
if (t026EntryBurstIndependentVerdict !== 'ENTRY_BURST_GUARD_OFFLINE_PROOF_PASSED') {
  fail(`expected independent entry burst proof to pass, found ${t026EntryBurstIndependentVerdict || 'empty'}`);
}
if (!/^(RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY|RISK_GOVERNOR_PROOF_BLOCKED_[A-Z_]+|RISK_GOVERNOR_PROOF_INSUFFICIENT_[A-Z_]+|RISK_GOVERNOR_PROOF_SECONDARY_ONLY)$/.test(t026RiskGovernorVerdict)) {
  fail(`unexpected T-026 risk governor proof verdict ${t026RiskGovernorVerdict || 'empty'}`);
}
if (!/^OFFLINE_PROOF_COMPARE_(ENTRY_BURST_CONFIRMED|ENTRY_BURST_PRIMARY|GRID_PRIMARY|GRID_PRIMARY_RISK_FALLBACK|RISK_GOVERNOR_PRIMARY|RISK_PRIMARY_GRID_FALLBACK|BLOCKED)$/.test(t026ProofComparisonVerdict)) {
  fail(`unexpected T-026 proof comparison verdict ${t026ProofComparisonVerdict || 'empty'}`);
}
if (t040Classification === 'VALIDATION_REQUIRED') {
  if (!/Decision mode: `VALIDATION_REQUIRED`/.test(packet)) fail('beta packet does not record VALIDATION_REQUIRED');
  if (!/Production posture: not approved/.test(packet)) fail('beta packet does not block production promotion');
  if (!/Beta posture: pause promotion/.test(packet)) fail('beta packet does not pause beta promotion');
  if (!/T-026 fixture comparison/.test(validationMap)) fail('validation map is missing T-026 fixture comparison');
  if (!/T-026 grid guard proof/.test(validationMap)) fail('validation map is missing T-026 grid guard proof');
  if (!/T-026 entry burst proof/.test(validationMap)) fail('validation map is missing T-026 entry burst proof');
  if (!/T-026 proof comparison/.test(validationMap)) fail('validation map is missing T-026 proof comparison');
  if (!/T-026 risk governor proof/.test(validationMap)) fail('validation map is missing T-026 risk governor proof');
  if (t026Recommendation !== 'BUILD_BEAR_CHOPPY_FIXTURE') {
    fail(`expected T-026 BUILD_BEAR_CHOPPY_FIXTURE during validation pressure, found ${t026Recommendation || 'empty'}`);
  }
  if (
    t040EffectivenessVerdict === 'NOT_BETA_READY' &&
    changedFiles.length > 0 &&
    codeOrValidationChanges.length === 0 &&
    !operatorStopDecision
  ) {
    fail(
      [
        'docs-only loop blocked: T-040 is VALIDATION_REQUIRED and NOT_BETA_READY, but this batch has no runtime/test or deterministic validation-code changes.',
        'Add an apps/ or packages/ runtime/test patch, update a deterministic validation helper, or create docs/easy_process/OPERATOR_STOP_DECISION.md with Decision: STOP_TESTNET.'
      ].join(' ')
    );
  }
}
if (t040Classification === 'PATCH_ALLOWED_REVIEW') {
  if (!/Decision mode: `PATCH_ALLOWED_REVIEW`/.test(packet)) fail('beta packet does not record PATCH_ALLOWED_REVIEW');
  if (!/Production posture: not approved/.test(packet)) fail('beta packet does not block production promotion');
  if (!/Beta posture: pause promotion/.test(packet)) fail('beta packet does not pause beta promotion');
  if (!/exchange\/order-sync|order-sync|backoff/i.test(packet)) fail('beta packet does not record the operational review trigger');
  if (!/exchange\/order-sync|order-sync|backoff/i.test(validationMap)) fail('validation map does not record the operational review trigger');
  if (t026Recommendation !== 'PATCH_ALLOWED_REVIEW') {
    fail(`expected T-026 PATCH_ALLOWED_REVIEW during safety review, found ${t026Recommendation || 'empty'}`);
  }
}

console.log(`PASS: T-040 beta-readiness process validation (${t040Classification}; promotion gate remains separate)`);
if (t040Classification === 'VALIDATION_REQUIRED' && t040EffectivenessVerdict === 'NOT_BETA_READY' && changedFiles.length > 0) {
  console.log(
    `PASS: T-040 no-docs-only loop gate (${codeOrValidationChanges.length > 0 ? 'runtime/test or deterministic validation-code changes present' : 'operator stop decision present'})`
  );
}
NODE
    ;;
  T-026)
    echo "Validation mode: targeted deterministic calibration"
    echo "Active ticket: $ACTIVE_TICKET"
    bash -n scripts/auto-retro.sh scripts/update-session-brief.sh scripts/pmba-gate.sh scripts/validate-active-ticket.sh
    node --check scripts/feedback-evidence.js
    node --check scripts/t026-calibration-runner.js
    node --check scripts/t026-strategy-replay.js
    node --check scripts/t026-walk-forward-gate.js
    node --check scripts/t026-fixture-comparison.js
    node --check scripts/t026-grid-guard-proof.js
    node --check scripts/t026-entry-burst-proof.js
    node --check scripts/t026-proof-comparison.js
    node --check scripts/t026-risk-governor-proof.js
    node --test scripts/t026-entry-burst-proof.test.js scripts/t026-strategy-replay.test.js scripts/t026-walk-forward-gate.test.js scripts/t040-entry-burst-postdeploy-check.test.js
    node scripts/t026-calibration-runner.js
    node scripts/t026-fixture-comparison.js
    node scripts/t026-grid-guard-proof.js
    node scripts/t026-entry-burst-proof.js
    node scripts/t026-risk-governor-proof.js
    node scripts/t026-proof-comparison.js
    node scripts/t026-walk-forward-gate.js
    node <<'NODE'
const fs = require('node:fs');

const board = fs.readFileSync('docs/DELIVERY_BOARD.md', 'utf8');
const session = fs.readFileSync('docs/SESSION_BRIEF.md', 'utf8');
const retro = fs.readFileSync('docs/RETROSPECTIVE_AUTO.md', 'utf8');
const inProgress = [...board.matchAll(/^\| (T-[0-9]{3}) \| IN_PROGRESS \|/gm)].map((match) => match[1]);

if (inProgress.length !== 1 || inProgress[0] !== 'T-026') {
  throw new Error(`expected exactly one IN_PROGRESS ticket T-026, found ${inProgress.join(', ') || 'none'}`);
}
if (!/^- Active ticket: `T-026`/m.test(session)) throw new Error('session brief is not aligned to T-026');
if (!/^Active ticket: `T-026`/m.test(retro)) throw new Error('auto-retro is not aligned to T-026');
if (!/Deterministic calibration mode: `enabled`/.test(retro)) {
  throw new Error('auto-retro deterministic calibration mode is not enabled');
}

console.log('PASS: T-026 deterministic calibration process validation');
NODE
    ;;
  T-032)
    echo "Validation mode: targeted deterministic validation"
    echo "Active ticket: $ACTIVE_TICKET"
    run_in_ci "corepack enable && pnpm install --no-frozen-lockfile && pnpm -C apps/api exec vitest run src/modules/bot/bot-engine.service.test.ts -t 'caution unwind|defensive grid-guard unwind|grid-guard pause|GRID_GUARD_BUY_PAUSE|grid waiting skips as storm-eligible|no-feasible recovery'"
    ;;
  *)
    echo "No ticket-specific deterministic validation mapped for $ACTIVE_TICKET; running full CI instead."
    resolve_compose
    "${COMPOSE[@]}" -f docker-compose.ci.yml run --rm ci
    ;;
esac
