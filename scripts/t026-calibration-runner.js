#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { collectEvidence, hasExchangeBackoffEvidence, listBundles } = require("./feedback-evidence");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_FIXTURE_PATH = "docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const topReasons = (entry) => entry?.summary?.activity?.skips?.top_reasons ?? [];

const dailyNet = (entry) => asNumber(entry?.summary?.pnl?.daily_net_usdt, Number.NaN);

const maxDrawdown = (entry) => asNumber(entry?.summary?.pnl?.max_drawdown_pct, Number.NaN);

const totalAllocation = (entry) => asNumber(entry?.summary?.exposure?.total_alloc_pct, Number.NaN);

const orders = (entry) => entry?.summary?.activity?.orders ?? {};

const health = (entry) => entry?.summary?.health ?? {};

const pnl = (entry) => entry?.summary?.pnl ?? {};

const trades = (entry) => entry?.summary?.activity?.trades ?? {};

const reasonText = (entry) => topReasons(entry).map((reason) => `${reason.reason ?? ""} ${reason.count ?? ""}`).join(" ");

const isBundleArg = (arg) => /\.tgz$/i.test(path.basename(String(arg ?? "")));

const resolveBundlePath = (bundlePath) =>
  path.isAbsolute(bundlePath) ? bundlePath : path.resolve(ROOT_DIR, bundlePath);

const classifyWindow = (entry) => {
  const rejected = asNumber(orders(entry).rejected);
  const errors = asNumber(health(entry).errors);
  const restarts = asNumber(health(entry).restart_count);
  const exchangeBackoff = hasExchangeBackoffEvidence(reasonText(entry));
  const pnl = dailyNet(entry);
  const alloc = totalAllocation(entry);

  if (rejected >= 3 || errors > 0 || restarts > 0 || exchangeBackoff) {
    return "SAFETY_FAILURE";
  }
  if (Number.isFinite(pnl) && pnl < 0 && Number.isFinite(alloc) && alloc <= 5) {
    return "CONTROLLED_DRAWDOWN";
  }
  if (Number.isFinite(pnl) && pnl > 0) {
    return "PROFIT_WINDOW";
  }
  return "NEUTRAL_OR_INCONCLUSIVE";
};

const summarizeEntry = (entry) => ({
  bundle: entry.bundle,
  class: classifyWindow(entry),
  dailyNet: dailyNet(entry),
  fees: asNumber(pnl(entry).fees_usdt, Number.NaN),
  maxDrawdown: maxDrawdown(entry),
  totalAllocation: totalAllocation(entry),
  submittedOrders: asNumber(orders(entry).submitted),
  filledOrders: asNumber(orders(entry).filled),
  rejectedOrders: asNumber(orders(entry).rejected),
  canceledOrders: asNumber(orders(entry).canceled),
  buys: asNumber(trades(entry).buys),
  sells: asNumber(trades(entry).sells),
  healthErrors: asNumber(health(entry).errors),
  restarts: asNumber(health(entry).restart_count),
  topReason: topReasons(entry)[0]?.reason ?? "n/a",
  topReasons: topReasons(entry).slice(0, 8)
});

const includesAny = (value, needles) => {
  const lower = String(value ?? "").toLowerCase();
  return needles.some((needle) => lower.includes(needle));
};

const scoreCandidateFamilies = (windows) => {
  const latestThree = windows.slice(0, 3);
  const negativeThree = latestThree.length === 3 && latestThree.every((window) => window.dailyNet < 0);

  const metrics = windows.reduce((acc, window) => {
    const reasons = window.topReasons.map((reason) => reason.reason).join(" | ");
    const isControlledDrawdown = window.class === "CONTROLLED_DRAWDOWN";
    const hasGridPressure = includesAny(reasons, ["grid", "ladder", "minqty", "minnotional"]);
    const hasRiskBudgetPressure = includesAny(reasons, ["risk budget", "blocked new exposure"]);
    const hasFeePressure = includesAny(reasons, ["fee/edge"]);
    const hasLowAllocation = Number.isFinite(window.totalAllocation) && window.totalAllocation <= 5;
    const hasTradeChurn = window.submittedOrders >= 150 && window.dailyNet < 0;

    if (isControlledDrawdown) acc.controlledDrawdown += 1;
    if (hasGridPressure) acc.gridPressure += 1;
    if (hasRiskBudgetPressure) acc.riskBudgetPressure += 1;
    if (hasFeePressure) acc.feePressure += 1;
    if (hasLowAllocation) acc.lowAllocation += 1;
    if (hasTradeChurn) acc.tradeChurn += 1;
    return acc;
  }, {
    controlledDrawdown: 0,
    gridPressure: 0,
    riskBudgetPressure: 0,
    feePressure: 0,
    lowAllocation: 0,
    tradeChurn: 0
  });

  const candidates = [
    {
      family: "risk_governor_hysteresis",
      score:
        metrics.controlledDrawdown * 4 +
        metrics.tradeChurn * 2 +
        metrics.lowAllocation +
        (negativeThree ? 4 : 0),
      reason: "best first response when repeated negative windows need earlier caution/halt hysteresis without breaking sell/unwind reachability"
    },
    {
      family: "grid_guard_v2",
      score:
        metrics.gridPressure * 3 +
        metrics.riskBudgetPressure * 2 +
        metrics.controlledDrawdown * 2 +
        (negativeThree ? 2 : 0),
      reason: "targets grid/min-order/risk-budget pressure by pausing BUY legs in bad regimes while preserving SELL/unwind"
    },
    {
      family: "mean_reversion_gate",
      score:
        metrics.feePressure * 3 +
        metrics.controlledDrawdown +
        metrics.tradeChurn +
        (negativeThree ? 1 : 0),
      reason: "candidate entry-quality gate for range/choppy windows; must stay shadow/offline until replay proves edge"
    }
  ];

  return candidates
    .sort((a, b) => b.score - a.score || a.family.localeCompare(b.family))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
};

const buildReport = (evidence) => {
  const windows = evidence.freshWindow
    .filter((entry) => entry.freshness?.hasFreshRuntimeEvidence)
    .slice(0, 5)
    .map(summarizeEntry);

  const classes = windows.reduce((acc, window) => {
    acc[window.class] = (acc[window.class] ?? 0) + 1;
    return acc;
  }, {});

  const latestThree = windows.slice(0, 3);
  const negativeThree = latestThree.length === 3 && latestThree.every((window) => window.dailyNet < 0);
  const safetyFailures = windows.filter((window) => window.class === "SAFETY_FAILURE");
  const rejectedWindows = latestThree.filter((window) => window.rejectedOrders > 0);
  const totalRejectedRecent = latestThree.reduce((sum, window) => sum + window.rejectedOrders, 0);
  const repeatedSmallRejects = rejectedWindows.length >= 2 || totalRejectedRecent >= 3;
  const controlledDrawdowns = windows.filter((window) => window.class === "CONTROLLED_DRAWDOWN");

  const recommendation = safetyFailures.length > 0 || repeatedSmallRejects
    ? "PATCH_ALLOWED_REVIEW"
    : negativeThree
      ? "BUILD_BEAR_CHOPPY_FIXTURE"
      : controlledDrawdowns.length > 0
        ? "KEEP_COLLECTING_AND_LABEL_REGIME"
        : "ADD_TREND_AND_RANGE_BASELINES";

  const candidateScores = scoreCandidateFamilies(windows);

  return {
    recommendation,
    classes,
    windows,
    safetySignals: {
      rejectedWindowsRecent: rejectedWindows.length,
      totalRejectedRecent,
      repeatedSmallRejects
    },
    candidateScores,
    nextStrategyFixture:
      recommendation === "BUILD_BEAR_CHOPPY_FIXTURE"
        ? {
            name: "bear_choppy_controlled_drawdown",
            objective: "prove a reference-inspired strategy can reduce drawdown/fee burn without increasing rejects, restarts, or hard-risk violations",
            candidateFamilies: candidateScores.map((candidate) => candidate.family),
            acceptance: {
              safety: "0 rejected orders, 0 restarts, no exchange backoff",
              risk: "allocation remains bounded and sell/unwind stays reachable",
              quality: "improves daily net or max drawdown versus current baseline in replay"
            }
          }
        : null
  };
};

const printReport = (report) => {
  console.log(`T-026 calibration recommendation: ${report.recommendation}`);
  console.log(`- windows=${report.windows.length}`);
  console.log(`- classes=${JSON.stringify(report.classes)}`);
  console.log(
    `- safetySignals=rejectedWindowsRecent=${report.safetySignals.rejectedWindowsRecent},totalRejectedRecent=${report.safetySignals.totalRejectedRecent},repeatedSmallRejects=${report.safetySignals.repeatedSmallRejects}`
  );
  for (const window of report.windows) {
    console.log(
      `- ${window.bundle}: ${window.class}; dailyNet=${window.dailyNet.toFixed(2)}; maxDD=${window.maxDrawdown.toFixed(2)}; alloc=${window.totalAllocation.toFixed(2)}; rejected=${window.rejectedOrders}; top=${window.topReason}`
    );
  }
  if (report.nextStrategyFixture) {
    console.log(`- nextFixture=${report.nextStrategyFixture.name}`);
    console.log(`- candidateFamilies=${report.nextStrategyFixture.candidateFamilies.join(",")}`);
    for (const candidate of report.candidateScores) {
      console.log(`- rank${candidate.rank}=${candidate.family}; score=${candidate.score}; reason=${candidate.reason}`);
    }
  }
};

const buildFixture = (report) => {
  if (!report.nextStrategyFixture) return null;
  return {
    schema_version: 1,
    name: report.nextStrategyFixture.name,
    recommendation: report.recommendation,
    objective: report.nextStrategyFixture.objective,
    source_bundles: report.windows.map((window) => window.bundle),
    windows: report.windows,
    safety_signals: report.safetySignals,
    candidate_scores: report.candidateScores,
    acceptance: report.nextStrategyFixture.acceptance,
    next_action: "implement offline comparison for ranked candidate families before any runtime strategy patch"
  };
};

const writeFixture = (report, outPath) => {
  const fixture = buildFixture(report);
  if (!fixture) {
    throw new Error("No fixture selected for the current calibration report.");
  }
  const target = path.isAbsolute(outPath) ? outPath : path.resolve(ROOT_DIR, outPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(fixture, null, 2)}\n`);
  return target;
};

const main = () => {
  const args = process.argv.slice(2).filter(Boolean);
  const json = args.includes("--json");
  const writeIndex = args.indexOf("--write-fixture");
  const shouldWriteFixture = writeIndex >= 0;
  const fixturePath =
    shouldWriteFixture && args[writeIndex + 1] && !args[writeIndex + 1].startsWith("--") && !isBundleArg(args[writeIndex + 1])
      ? args[writeIndex + 1]
      : DEFAULT_FIXTURE_PATH;
  const bundles = args.filter((arg, index) => (
    arg !== "--json" &&
    arg !== "--write-fixture" &&
    !(shouldWriteFixture && index === writeIndex + 1 && arg === fixturePath)
  ));
  const bundlePaths = bundles.length > 0
    ? bundles.map(resolveBundlePath)
    : listBundles(ROOT_DIR).slice(0, 5).map((bundle) => path.join(ROOT_DIR, bundle));
  const evidence = collectEvidence(bundlePaths);
  const report = buildReport(evidence);
  if (shouldWriteFixture) {
    const target = writeFixture(report, fixturePath);
    console.log(`Wrote fixture: ${target}`);
  }
  if (json) {
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

module.exports = { buildFixture, buildReport, classifyWindow, scoreCandidateFamilies };
