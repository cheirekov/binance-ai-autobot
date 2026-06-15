#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_COMPARISON_PATH = "docs/easy_process/reports/t026-fixture-comparison.json";
const DEFAULT_FIXTURE_PATH = "docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json";
const DEFAULT_REPORT_PATH = "docs/easy_process/reports/t026-risk-governor-proof.json";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolvePath = (target) => path.isAbsolute(target) ? target : path.resolve(ROOT_DIR, target);

const readJson = (target) => JSON.parse(fs.readFileSync(resolvePath(target), "utf8"));

const formatNumber = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : "n/a";

const formatSigned = (value, digits = 2) =>
  Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(digits)}` : "n/a";

const parseArgs = (argv) => {
  const options = {
    comparisonPath: DEFAULT_COMPARISON_PATH,
    fixturePath: DEFAULT_FIXTURE_PATH,
    reportPath: DEFAULT_REPORT_PATH,
    writeReport: false,
    json: false,
    minLeadingNegativeWindows: 3,
    minHighExposureWindows: 1,
    maxCandidateScoreGap: 10
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--comparison" && next) {
      options.comparisonPath = next;
      index += 1;
    } else if (arg === "--fixture" && next) {
      options.fixturePath = next;
      index += 1;
    } else if (arg === "--write-report") {
      options.writeReport = true;
      if (next && !next.startsWith("--")) {
        options.reportPath = next;
        index += 1;
      }
    } else if (arg === "--min-leading-negative-windows" && next) {
      options.minLeadingNegativeWindows = Number(next);
      index += 1;
    } else if (arg === "--min-high-exposure-windows" && next) {
      options.minHighExposureWindows = Number(next);
      index += 1;
    } else if (arg === "--max-candidate-score-gap" && next) {
      options.maxCandidateScoreGap = Number(next);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.minLeadingNegativeWindows) || options.minLeadingNegativeWindows < 1) {
    throw new Error(`--min-leading-negative-windows must be a positive integer, got ${options.minLeadingNegativeWindows}`);
  }
  if (!Number.isInteger(options.minHighExposureWindows) || options.minHighExposureWindows < 0) {
    throw new Error(`--min-high-exposure-windows must be a non-negative integer, got ${options.minHighExposureWindows}`);
  }
  if (!Number.isFinite(options.maxCandidateScoreGap) || options.maxCandidateScoreGap < 0) {
    throw new Error(`--max-candidate-score-gap must be non-negative, got ${options.maxCandidateScoreGap}`);
  }

  return options;
};

const byBundle = (items) => items.reduce((acc, item) => {
  if (item?.bundle) acc.set(item.bundle, item);
  return acc;
}, new Map());

const findCandidate = (comparison, family) =>
  (comparison.candidates ?? []).find((candidate) => candidate.family === family) ?? null;

const summarizeWindow = (window, fixtureWindow) => {
  const pressure = window.pressure ?? {};
  const topOpenExposure = Array.isArray(window.topOpenExposure) ? window.topOpenExposure : [];
  const largestOpen = topOpenExposure[0] ?? null;

  return {
    bundle: window.bundle,
    class: window.class,
    dailyNet: asNumber(window.dailyNet, Number.NaN),
    realizedAfterFees: asNumber(window.realizedAfterFees, Number.NaN),
    totalAllocPct: asNumber(window.totalAllocPct, Number.NaN),
    filledOrders: asNumber(window.filledOrders, 0),
    rejectedOrders: asNumber(window.rejectedOrders, 0),
    riskBudgetReasonCount: asNumber(pressure.riskBudgetReasonCount, 0),
    feeEdgeReasonCount: asNumber(pressure.feeEdgeReasonCount, 0),
    largestOpenExposure: largestOpen ? {
      symbol: largestOpen.symbol,
      openCost: asNumber(largestOpen.openCost, 0),
      netAfterFees: asNumber(largestOpen.netAfterFees, 0),
      buys: asNumber(largestOpen.buys, 0),
      sells: asNumber(largestOpen.sells, 0)
    } : null,
    fixtureBuys: asNumber(fixtureWindow?.buys, 0),
    fixtureSells: asNumber(fixtureWindow?.sells, 0)
  };
};

const buildProof = (comparison, fixture, options = {}) => {
  const aggregate = comparison.aggregate ?? {};
  const fixtureWindows = byBundle(Array.isArray(fixture?.windows) ? fixture.windows : []);
  const windows = (comparison.windows ?? []).map((window) => summarizeWindow(window, fixtureWindows.get(window.bundle)));
  const gridCandidate = findCandidate(comparison, "grid_guard_v2");
  const riskCandidate = findCandidate(comparison, "risk_governor_hysteresis");
  const gridScore = asNumber(gridCandidate?.score, 0);
  const riskScore = asNumber(riskCandidate?.score, 0);
  const scoreGap = Math.abs(gridScore - riskScore);
  const totalFixtureSells = windows.reduce((sum, window) => sum + window.fixtureSells, 0);
  const totalRiskBudgetReasons = windows.reduce((sum, window) => sum + window.riskBudgetReasonCount, 0);
  const totalFeeEdgeReasons = windows.reduce((sum, window) => sum + window.feeEdgeReasonCount, 0);
  const highExposureWindows = asNumber(aggregate.highExposureWindows, 0);
  const leadingNegativeWindows = asNumber(aggregate.leadingNegativeWindows, 0);
  const negativeAfterFeesWindows = asNumber(aggregate.negativeAfterFeesWindows, 0);
  const tradeChurnWindows = asNumber(aggregate.tradeChurnWindows, 0);
  const safetyClean = aggregate.safetyClean === true &&
    windows.every((window) => window.rejectedOrders === 0);

  const minLeadingNegativeWindows = options.minLeadingNegativeWindows ?? 3;
  const minHighExposureWindows = options.minHighExposureWindows ?? 1;
  const maxCandidateScoreGap = options.maxCandidateScoreGap ?? 10;

  const checks = {
    safetyClean,
    candidatePresent: riskCandidate !== null,
    negativeStreakPresent: leadingNegativeWindows >= minLeadingNegativeWindows,
    negativeAfterFeesPresent: negativeAfterFeesWindows >= minLeadingNegativeWindows,
    highExposurePresent: highExposureWindows >= minHighExposureWindows,
    riskBudgetPressurePresent: totalRiskBudgetReasons > 0,
    feePressurePresent: totalFeeEdgeReasons > 0,
    tradeChurnPresent: tradeChurnWindows >= minLeadingNegativeWindows,
    sellActivityPresent: totalFixtureSells > 0,
    closeEnoughToTopCandidate: scoreGap <= maxCandidateScoreGap || riskScore >= gridScore
  };

  let verdict = "RISK_GOVERNOR_OFFLINE_PROOF_TARGET_READY";
  if (!checks.safetyClean) verdict = "RISK_GOVERNOR_PROOF_BLOCKED_SAFETY";
  else if (!checks.candidatePresent) verdict = "RISK_GOVERNOR_PROOF_BLOCKED_NO_CANDIDATE";
  else if (!checks.negativeStreakPresent || !checks.negativeAfterFeesPresent) verdict = "RISK_GOVERNOR_PROOF_INSUFFICIENT_NEGATIVE_STREAK";
  else if (!checks.highExposurePresent) verdict = "RISK_GOVERNOR_PROOF_INSUFFICIENT_EXPOSURE";
  else if (!checks.riskBudgetPressurePresent || !checks.feePressurePresent || !checks.tradeChurnPresent) verdict = "RISK_GOVERNOR_PROOF_INSUFFICIENT_PRESSURE";
  else if (!checks.sellActivityPresent) verdict = "RISK_GOVERNOR_PROOF_BLOCKED_NO_SELL_ACTIVITY";
  else if (!checks.closeEnoughToTopCandidate) verdict = "RISK_GOVERNOR_PROOF_SECONDARY_ONLY";

  return {
    schema_version: 1,
    fixture: comparison.fixture ?? fixture?.name ?? path.basename(DEFAULT_FIXTURE_PATH),
    source_bundles: comparison.source_bundles ?? fixture?.source_bundles ?? windows.map((window) => window.bundle),
    verdict,
    runtime_patch_allowed: false,
    reason: "offline proof target only; runtime risk-governor changes still require focused tests proving earlier defensive state preserves SELL/unwind reachability",
    checks,
    aggregate: {
      windows: windows.length,
      leadingNegativeWindows,
      negativeAfterFeesWindows,
      highExposureWindows,
      tradeChurnWindows,
      totalDailyNet: asNumber(aggregate.totalDailyNet, Number.NaN),
      totalFees: asNumber(aggregate.totalFees, Number.NaN),
      totalRealizedAfterFees: asNumber(aggregate.totalRealizedAfterFees, Number.NaN),
      totalRiskBudgetReasons,
      totalFeeEdgeReasons,
      totalFixtureSells
    },
    candidate_scores: {
      grid_guard_v2: gridScore,
      risk_governor_hysteresis: riskScore,
      scoreGap
    },
    acceptance: {
      target: "extend defensive state after repeated negative-after-fee windows before new exposure resumes",
      must_preserve: "SELL/reduce-only and managed unwind paths",
      must_improve: "new exposure, high-exposure duration, fees, or realized-after-fees versus the fixture baseline",
      must_not_increase: "exchange rejects, health errors, restarts, or hard-risk violations"
    },
    windows
  };
};

const printReport = (report) => {
  const aggregate = report.aggregate;
  console.log(`T-026 risk governor proof verdict: ${report.verdict}`);
  console.log(`- fixture=${report.fixture}; windows=${aggregate.windows}; runtimePatchAllowed=${report.runtime_patch_allowed ? "yes" : "no"}`);
  console.log(
    `- baseline=totalDailyNet=${formatSigned(aggregate.totalDailyNet)}; totalFees=${formatNumber(aggregate.totalFees)}; totalRealizedAfterFees=${formatSigned(aggregate.totalRealizedAfterFees)}`
  );
  console.log(
    `- proofSignals=leadingNegative=${aggregate.leadingNegativeWindows}; negativeAfterFees=${aggregate.negativeAfterFeesWindows}; highExposure=${aggregate.highExposureWindows}; tradeChurn=${aggregate.tradeChurnWindows}; sellsObserved=${formatNumber(aggregate.totalFixtureSells, 0)}`
  );
  console.log(
    `- candidateScores=grid_guard_v2=${report.candidate_scores.grid_guard_v2}; risk_governor_hysteresis=${report.candidate_scores.risk_governor_hysteresis}; gap=${report.candidate_scores.scoreGap}`
  );
  console.log(`- acceptance=${report.acceptance.target}; preserve=${report.acceptance.must_preserve}`);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const comparison = readJson(options.comparisonPath);
  const fixture = readJson(options.fixturePath);
  const report = buildProof(comparison, fixture, options);

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

module.exports = { buildProof };
