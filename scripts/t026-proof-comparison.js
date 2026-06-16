#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_FIXTURE_COMPARISON_PATH = "docs/easy_process/reports/t026-fixture-comparison.json";
const DEFAULT_GRID_PROOF_PATH = "docs/easy_process/reports/t026-grid-guard-proof.json";
const DEFAULT_RISK_PROOF_PATH = "docs/easy_process/reports/t026-risk-governor-proof.json";
const DEFAULT_REPORT_PATH = "docs/easy_process/reports/t026-proof-comparison.json";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolvePath = (target) => path.isAbsolute(target) ? target : path.resolve(ROOT_DIR, target);

const readJson = (target) => JSON.parse(fs.readFileSync(resolvePath(target), "utf8"));

const parseArgs = (argv) => {
  const options = {
    fixtureComparisonPath: DEFAULT_FIXTURE_COMPARISON_PATH,
    gridProofPath: DEFAULT_GRID_PROOF_PATH,
    riskProofPath: DEFAULT_RISK_PROOF_PATH,
    reportPath: DEFAULT_REPORT_PATH,
    writeReport: false,
    json: false,
    fallbackScoreGap: 10
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--fixture-comparison" && next) {
      options.fixtureComparisonPath = next;
      index += 1;
    } else if (arg === "--grid-proof" && next) {
      options.gridProofPath = next;
      index += 1;
    } else if (arg === "--risk-proof" && next) {
      options.riskProofPath = next;
      index += 1;
    } else if (arg === "--write-report") {
      options.writeReport = true;
      if (next && !next.startsWith("--")) {
        options.reportPath = next;
        index += 1;
      }
    } else if (arg === "--fallback-score-gap" && next) {
      options.fallbackScoreGap = Number(next);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.fallbackScoreGap) || options.fallbackScoreGap < 0) {
    throw new Error(`--fallback-score-gap must be non-negative, got ${options.fallbackScoreGap}`);
  }

  return options;
};

const findCandidate = (comparison, family) =>
  (comparison.candidates ?? []).find((candidate) => candidate.family === family) ?? null;

const isReady = (report, prefix) => report?.verdict === `${prefix}_OFFLINE_PROOF_TARGET_READY`;

const buildComparison = ({ fixtureComparison, gridProof, riskProof, fallbackScoreGap = 10 }) => {
  const gridCandidate = findCandidate(fixtureComparison, "grid_guard_v2");
  const riskCandidate = findCandidate(fixtureComparison, "risk_governor_hysteresis");
  const gridScore = asNumber(gridCandidate?.score, 0);
  const riskScore = asNumber(riskCandidate?.score, 0);
  const scoreGap = Math.abs(gridScore - riskScore);
  const gridReady = isReady(gridProof, "GRID_GUARD");
  const riskReady = isReady(riskProof, "RISK_GOVERNOR");
  const highExposureWindows = asNumber(fixtureComparison?.aggregate?.highExposureWindows, 0);
  const negativeAfterFeesWindows = asNumber(fixtureComparison?.aggregate?.negativeAfterFeesWindows, 0);

  let verdict = "OFFLINE_PROOF_COMPARE_BLOCKED";
  let primary = "none";
  let secondary = "none";
  const reasons = [];

  if (gridReady && gridScore >= riskScore) {
    primary = "grid_guard_v2";
    verdict = "OFFLINE_PROOF_COMPARE_GRID_PRIMARY";
    reasons.push("fixture comparison ranks grid_guard_v2 first");
  } else if (riskReady) {
    primary = "risk_governor_hysteresis";
    verdict = "OFFLINE_PROOF_COMPARE_RISK_GOVERNOR_PRIMARY";
    reasons.push("risk_governor_hysteresis is the highest ready proof target");
  }

  const keepRiskFallback = riskReady && (
    primary !== "risk_governor_hysteresis" &&
    (scoreGap <= fallbackScoreGap || highExposureWindows >= 2 || negativeAfterFeesWindows >= 5)
  );
  if (keepRiskFallback) {
    secondary = "risk_governor_hysteresis";
    verdict = "OFFLINE_PROOF_COMPARE_GRID_PRIMARY_RISK_FALLBACK";
    reasons.push("risk governor stays active due close score, exposure, or persistent after-fee losses");
  }

  const keepGridFallback = gridReady && primary === "risk_governor_hysteresis";
  if (keepGridFallback) {
    secondary = "grid_guard_v2";
    verdict = "OFFLINE_PROOF_COMPARE_RISK_PRIMARY_GRID_FALLBACK";
    reasons.push("grid guard remains available as a secondary ready proof target");
  }

  if (!gridReady && !riskReady) {
    reasons.push("no proof target is ready");
  }

  return {
    schema_version: 1,
    fixture: fixtureComparison.fixture,
    source_bundles: fixtureComparison.source_bundles,
    verdict,
    runtime_patch_allowed: false,
    primary,
    secondary,
    reasons,
    scores: {
      grid_guard_v2: gridScore,
      risk_governor_hysteresis: riskScore,
      gap: scoreGap
    },
    proof_verdicts: {
      grid_guard_v2: gridProof.verdict,
      risk_governor_hysteresis: riskProof.verdict
    },
    aggregate: {
      totalDailyNet: asNumber(fixtureComparison?.aggregate?.totalDailyNet, Number.NaN),
      totalFees: asNumber(fixtureComparison?.aggregate?.totalFees, Number.NaN),
      totalRealizedAfterFees: asNumber(fixtureComparison?.aggregate?.totalRealizedAfterFees, Number.NaN),
      leadingNegativeWindows: asNumber(fixtureComparison?.aggregate?.leadingNegativeWindows, 0),
      negativeAfterFeesWindows,
      highExposureWindows
    },
    next_action: "build focused offline proof for the primary target; keep secondary active only as fallback until the primary proof fails acceptance"
  };
};

const printReport = (report) => {
  console.log(`T-026 proof comparison verdict: ${report.verdict}`);
  console.log(`- primary=${report.primary}; secondary=${report.secondary}; runtimePatchAllowed=${report.runtime_patch_allowed ? "yes" : "no"}`);
  console.log(`- scores=grid_guard_v2=${report.scores.grid_guard_v2}; risk_governor_hysteresis=${report.scores.risk_governor_hysteresis}; gap=${report.scores.gap}`);
  console.log(`- proofs=grid_guard_v2=${report.proof_verdicts.grid_guard_v2}; risk_governor_hysteresis=${report.proof_verdicts.risk_governor_hysteresis}`);
  console.log(`- nextAction=${report.next_action}`);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const report = buildComparison({
    fixtureComparison: readJson(options.fixtureComparisonPath),
    gridProof: readJson(options.gridProofPath),
    riskProof: readJson(options.riskProofPath),
    fallbackScoreGap: options.fallbackScoreGap
  });

  if (options.writeReport) {
    const target = resolvePath(options.reportPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
    if (!options.json) console.log(`Wrote report: ${target}`);
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

module.exports = { buildComparison };
