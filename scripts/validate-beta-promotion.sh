#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "FAIL: beta promotion gate: $*" >&2
  exit 1
}

require_file() {
  local file="$1"
  [[ -f "$file" ]] || fail "missing $file"
}

require_file "docs/DELIVERY_BOARD.md"
require_file "docs/SESSION_BRIEF.md"
require_file "docs/easy_process/T040_BETA_READINESS_PACKET.md"
require_file "docs/easy_process/T040_VALIDATION_MAP.md"
require_file "scripts/t040-readiness-check.js"
require_file "scripts/t040-strategy-effectiveness-report.js"
require_file "scripts/t026-calibration-runner.js"
require_file "scripts/t026-strategy-replay.js"

bash -n scripts/auto-retro.sh scripts/update-session-brief.sh scripts/pmba-gate.sh scripts/validate-active-ticket.sh scripts/run-batch.sh scripts/validate-beta-promotion.sh
node --check scripts/feedback-evidence.js
node --check scripts/t040-readiness-check.js
node --check scripts/t040-strategy-effectiveness-report.js
node --check scripts/t026-calibration-runner.js
node --check scripts/t026-strategy-replay.js

T040_OUTPUT="$(node scripts/t040-readiness-check.js "$@")"
printf '%s\n' "$T040_OUTPUT"
T040_CLASSIFICATION="$(printf '%s\n' "$T040_OUTPUT" | sed -n 's/^T-040 readiness classification: //p' | head -n1)"
[[ "$T040_CLASSIFICATION" == "CONTINUE_READINESS" ]] || fail "readiness classification is ${T040_CLASSIFICATION:-empty}, expected CONTINUE_READINESS"

export T040_STRATEGY_JSON="$(node scripts/t040-strategy-effectiveness-report.js --json "$@")"
export T026_JSON="$(node scripts/t026-calibration-runner.js --json "$@")"

node <<'NODE'
const fs = require("node:fs");

const fail = (message) => {
  console.error(`FAIL: beta promotion gate: ${message}`);
  process.exit(1);
};

const parseJsonEnv = (name) => {
  try {
    return JSON.parse(process.env[name] ?? "");
  } catch (error) {
    fail(`could not parse ${name}: ${error.message}`);
  }
};

const board = fs.readFileSync("docs/DELIVERY_BOARD.md", "utf8");
const session = fs.readFileSync("docs/SESSION_BRIEF.md", "utf8");
const packet = fs.readFileSync("docs/easy_process/T040_BETA_READINESS_PACKET.md", "utf8");
const validationMap = fs.readFileSync("docs/easy_process/T040_VALIDATION_MAP.md", "utf8");
const strategy = parseJsonEnv("T040_STRATEGY_JSON");
const calibration = parseJsonEnv("T026_JSON");

const inProgress = [...board.matchAll(/^\| (T-[0-9]{3}) \| IN_PROGRESS \|/gm)].map((match) => match[1]);
if (inProgress.length !== 1 || inProgress[0] !== "T-040") {
  fail(`expected exactly one IN_PROGRESS ticket T-040, found ${inProgress.join(", ") || "none"}`);
}
if (!/^- Active ticket: `T-040`/m.test(session)) {
  fail("SESSION_BRIEF.md is not aligned to T-040");
}

if (strategy.verdict !== "CANDIDATE_READY_FOR_OPERATOR_REVIEW") {
  fail(`strategy effectiveness verdict is ${strategy.verdict ?? "empty"}, expected CANDIDATE_READY_FOR_OPERATOR_REVIEW`);
}
if (Array.isArray(strategy.blockingReasons) && strategy.blockingReasons.length > 0) {
  fail(`strategy blocking reasons remain: ${strategy.blockingReasons.join(",")}`);
}
if (strategy.strategySwitchingObserved !== true) {
  fail("strategy switching is not visible in adaptive-shadow telemetry");
}
if (!Number.isFinite(Number(strategy.fiveWindowNet)) || Number(strategy.fiveWindowNet) <= 0) {
  fail(`five-window net is not positive: ${strategy.fiveWindowNet}`);
}
if (!Number.isFinite(Number(strategy.realizedAfterFees)) || Number(strategy.realizedAfterFees) <= 0) {
  fail(`realized-after-fees is not positive: ${strategy.realizedAfterFees}`);
}

const blockingCalibration = new Set([
  "PATCH_ALLOWED_REVIEW",
  "BUILD_BEAR_CHOPPY_FIXTURE",
  "KEEP_COLLECTING_AND_LABEL_REGIME"
]);
if (blockingCalibration.has(calibration.recommendation)) {
  fail(`T-026 recommendation remains blocking: ${calibration.recommendation}`);
}

if (/`?NOT_BETA_READY`?/.test(packet)) fail("beta packet still records NOT_BETA_READY");
if (/\|\s*[^|\n]+\s*\|\s*[^|\n]+\s*\|\s*`?PARTIAL`?\s*\|/m.test(packet)) {
  fail("beta packet still has PARTIAL checklist rows");
}
if (/Production posture:\s*not approved/i.test(packet)) fail("production posture is still not approved");
if (/Beta posture:\s*not beta-ready/i.test(packet)) fail("beta posture is still not beta-ready");
if (!/release/i.test(packet) || !/rollback/i.test(packet)) fail("release/rollback proof is not present in beta packet");
if (/map exact test names|add deterministic|accepted fixture gaps|does not close Gate P1/i.test(validationMap)) {
  fail("validation map still contains unresolved deterministic-validation language");
}

console.log("PASS: beta promotion gate");
NODE
