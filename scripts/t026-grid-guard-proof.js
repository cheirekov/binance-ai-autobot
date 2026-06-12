#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_COMPARISON_PATH = "docs/easy_process/reports/t026-fixture-comparison.json";
const DEFAULT_FIXTURE_PATH = "docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json";
const DEFAULT_REPORT_PATH = "docs/easy_process/reports/t026-grid-guard-proof.json";

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
    minEligibleWindows: 4,
    minLossChurnWindows: 3
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
    } else if (arg === "--min-eligible-windows" && next) {
      options.minEligibleWindows = Number(next);
      index += 1;
    } else if (arg === "--min-loss-churn-windows" && next) {
      options.minLossChurnWindows = Number(next);
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.minEligibleWindows) || options.minEligibleWindows < 1) {
    throw new Error(`--min-eligible-windows must be a positive integer, got ${options.minEligibleWindows}`);
  }
  if (!Number.isInteger(options.minLossChurnWindows) || options.minLossChurnWindows < 1) {
    throw new Error(`--min-loss-churn-windows must be a positive integer, got ${options.minLossChurnWindows}`);
  }

  return options;
};

const byBundle = (items) => items.reduce((acc, item) => {
  if (item?.bundle) acc.set(item.bundle, item);
  return acc;
}, new Map());

const sumSymbols = (symbols, readValue) =>
  symbols.reduce((sum, symbol) => sum + asNumber(readValue(symbol), 0), 0);

const hasTopReason = (window, pattern) =>
  (window.topReasons ?? []).some((reason) => pattern.test(String(reason.reason ?? "")));

const summarizeWindow = (window, fixtureWindow) => {
  const topLossSymbols = Array.isArray(window.topLossSymbols) ? window.topLossSymbols : [];
  const pressure = window.pressure ?? {};
  const adaptive = window.adaptive ?? {};
  const laneCounts = adaptive.laneCounts ?? {};

  const lossChurnSymbols = topLossSymbols.filter((symbol) =>
    asNumber(symbol.netAfterFees, 0) < 0 &&
    asNumber(symbol.buys, 0) > asNumber(symbol.sells, 0)
  );
  const lossChurnAfterFees = sumSymbols(lossChurnSymbols, (symbol) => Math.abs(asNumber(symbol.netAfterFees, 0)));
  const buyPressure = sumSymbols(lossChurnSymbols, (symbol) => asNumber(symbol.buys, 0) - asNumber(symbol.sells, 0));
  const gridLaneEvents = asNumber(laneCounts.GRID, 0);
  const gridReasonCount = asNumber(pressure.gridReasonCount, 0);
  const riskBudgetReasonCount = asNumber(pressure.riskBudgetReasonCount, 0);
  const feeEdgeReasonCount = asNumber(pressure.feeEdgeReasonCount, 0);
  const pausedGridBuyReasons = hasTopReason(window, /paused grid buy|grid guard paused buy/i);
  const fixtureBuys = asNumber(fixtureWindow?.buys, 0);
  const fixtureSells = asNumber(fixtureWindow?.sells, 0);

  const eligible = (
    asNumber(window.dailyNet, 0) < 0 &&
    asNumber(window.realizedAfterFees, 0) < 0 &&
    (gridLaneEvents > 0 || gridReasonCount > 0) &&
    riskBudgetReasonCount > 0 &&
    feeEdgeReasonCount > 0
  );

  return {
    bundle: window.bundle,
    class: window.class,
    eligible,
    dailyNet: asNumber(window.dailyNet, Number.NaN),
    realizedAfterFees: asNumber(window.realizedAfterFees, Number.NaN),
    totalAllocPct: asNumber(window.totalAllocPct, Number.NaN),
    filledOrders: asNumber(window.filledOrders, 0),
    rejectedOrders: asNumber(window.rejectedOrders, 0),
    gridLaneEvents,
    gridReasonCount,
    riskBudgetReasonCount,
    feeEdgeReasonCount,
    pausedGridBuyReasons,
    lossChurnSymbols: lossChurnSymbols.map((symbol) => ({
      symbol: symbol.symbol,
      buys: asNumber(symbol.buys, 0),
      sells: asNumber(symbol.sells, 0),
      netAfterFees: asNumber(symbol.netAfterFees, 0),
      openCost: asNumber(symbol.openCost, 0)
    })),
    lossChurnAfterFees,
    buyPressure,
    fixtureBuys,
    fixtureSells
  };
};

const buildProof = (comparison, fixture, options = {}) => {
  const fixtureWindows = byBundle(Array.isArray(fixture?.windows) ? fixture.windows : []);
  const windows = (comparison.windows ?? []).map((window) => summarizeWindow(window, fixtureWindows.get(window.bundle)));
  const aggregate = comparison.aggregate ?? {};
  const candidates = Array.isArray(comparison.candidates) ? comparison.candidates : [];
  const topCandidate = candidates[0]?.family ?? "NONE";
  const riskGovernorCandidate = candidates.find((candidate) => candidate.family === "risk_governor_hysteresis");
  const gridCandidate = candidates.find((candidate) => candidate.family === "grid_guard_v2");
  const eligibleWindows = windows.filter((window) => window.eligible).length;
  const lossChurnWindows = windows.filter((window) => window.lossChurnSymbols.length > 0).length;
  const pausedGridBuyWindows = windows.filter((window) => window.pausedGridBuyReasons).length;
  const totalLossChurnAfterFees = windows.reduce((sum, window) => sum + window.lossChurnAfterFees, 0);
  const totalBuyPressure = windows.reduce((sum, window) => sum + window.buyPressure, 0);
  const totalFixtureBuys = windows.reduce((sum, window) => sum + window.fixtureBuys, 0);
  const totalFixtureSells = windows.reduce((sum, window) => sum + window.fixtureSells, 0);
  const safetyClean = aggregate.safetyClean === true &&
    windows.every((window) => window.rejectedOrders === 0);
  const minEligibleWindows = options.minEligibleWindows ?? 4;
  const minLossChurnWindows = options.minLossChurnWindows ?? 3;

  const checks = {
    safetyClean,
    topCandidateIsGridGuard: topCandidate === "grid_guard_v2",
    enoughEligibleWindows: eligibleWindows >= minEligibleWindows,
    enoughLossChurnWindows: lossChurnWindows >= minLossChurnWindows,
    sellActivityPresent: totalFixtureSells > 0,
    buyPressurePresent: totalBuyPressure > 0
  };

  let verdict = "GRID_GUARD_OFFLINE_PROOF_TARGET_READY";
  if (!checks.safetyClean) verdict = "GRID_GUARD_PROOF_BLOCKED_SAFETY";
  else if (!checks.topCandidateIsGridGuard) verdict = "GRID_GUARD_PROOF_BLOCKED_NOT_TOP_CANDIDATE";
  else if (!checks.enoughEligibleWindows) verdict = "GRID_GUARD_PROOF_INSUFFICIENT_PRESSURE";
  else if (!checks.enoughLossChurnWindows || !checks.buyPressurePresent) verdict = "GRID_GUARD_PROOF_INSUFFICIENT_LOSS_CHURN";
  else if (!checks.sellActivityPresent) verdict = "GRID_GUARD_PROOF_BLOCKED_NO_SELL_ACTIVITY";

  return {
    schema_version: 1,
    fixture: comparison.fixture ?? fixture?.name ?? path.basename(DEFAULT_FIXTURE_PATH),
    source_bundles: comparison.source_bundles ?? fixture?.source_bundles ?? windows.map((window) => window.bundle),
    verdict,
    runtime_patch_allowed: false,
    reason: "offline proof target only; runtime grid changes still require a focused test/replay proving BUY-only suppression keeps SELL/unwind reachable",
    checks,
    aggregate: {
      windows: windows.length,
      eligibleWindows,
      lossChurnWindows,
      pausedGridBuyWindows,
      totalDailyNet: asNumber(aggregate.totalDailyNet, Number.NaN),
      totalFees: asNumber(aggregate.totalFees, Number.NaN),
      totalRealizedAfterFees: asNumber(aggregate.totalRealizedAfterFees, Number.NaN),
      totalLossChurnAfterFees,
      totalBuyPressure,
      totalFixtureBuys,
      totalFixtureSells
    },
    candidate_scores: {
      grid_guard_v2: asNumber(gridCandidate?.score, 0),
      risk_governor_hysteresis: asNumber(riskGovernorCandidate?.score, 0)
    },
    acceptance: {
      target: "pause or shrink GRID BUY legs only in eligible negative/fee-pressure windows",
      must_preserve: "SELL/reduce-only and managed unwind paths",
      must_improve: "filled-order count, fees, open exposure, or realized-after-fees versus the fixture baseline",
      must_not_increase: "exchange rejects, health errors, restarts, or hard-risk violations"
    },
    windows
  };
};

const printReport = (report) => {
  const aggregate = report.aggregate;
  console.log(`T-026 grid guard proof verdict: ${report.verdict}`);
  console.log(`- fixture=${report.fixture}; windows=${aggregate.windows}; runtimePatchAllowed=${report.runtime_patch_allowed ? "yes" : "no"}`);
  console.log(
    `- baseline=totalDailyNet=${formatSigned(aggregate.totalDailyNet)}; totalFees=${formatNumber(aggregate.totalFees)}; totalRealizedAfterFees=${formatSigned(aggregate.totalRealizedAfterFees)}`
  );
  console.log(
    `- proofSignals=eligibleWindows=${aggregate.eligibleWindows}; lossChurnWindows=${aggregate.lossChurnWindows}; pausedGridBuyWindows=${aggregate.pausedGridBuyWindows}; buyPressure=${formatNumber(aggregate.totalBuyPressure, 0)}; sellsObserved=${formatNumber(aggregate.totalFixtureSells, 0)}`
  );
  console.log(
    `- candidateScores=grid_guard_v2=${report.candidate_scores.grid_guard_v2}; risk_governor_hysteresis=${report.candidate_scores.risk_governor_hysteresis}`
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
