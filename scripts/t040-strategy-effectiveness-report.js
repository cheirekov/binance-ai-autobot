#!/usr/bin/env node
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { collectEvidence, listBundles } = require("./feedback-evidence");
const { classifyWindow } = require("./t026-calibration-runner");

const ROOT_DIR = path.resolve(__dirname, "..");

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveBundlePath = (bundlePath) =>
  path.isAbsolute(bundlePath) ? bundlePath : path.resolve(ROOT_DIR, bundlePath);

const readFromBundle = (bundlePath, innerPaths) => {
  for (const innerPath of innerPaths) {
    try {
      return execFileSync("tar", ["-xOf", bundlePath, innerPath], {
        maxBuffer: 32 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"]
      }).toString("utf8");
    } catch {
      // try next candidate path
    }
  }
  return null;
};

const parseJson = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const parseJsonLines = (raw) => String(raw ?? "")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => parseJson(line))
  .filter(Boolean);

const readBaselineKpis = (bundlePath) => parseJson(
  readFromBundle(bundlePath, [
    "./data/telemetry/baseline-kpis.json",
    "data/telemetry/baseline-kpis.json"
  ])
);

const readAdaptiveShadow = (bundlePath) => parseJsonLines(
  readFromBundle(bundlePath, [
    "./data/telemetry/adaptive-shadow.tail.jsonl",
    "data/telemetry/adaptive-shadow.tail.jsonl"
  ])
);

const formatNumber = (value, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits) : "n/a";

const formatSigned = (value, digits = 2) =>
  Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(digits)}` : "n/a";

const compactCounts = (counts) => Object.entries(counts)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([key, count]) => `${key}=${count}`)
  .join(",");

const countBy = (items, readKey) => items.reduce((acc, item) => {
  const key = String(readKey(item) ?? "UNKNOWN");
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

const summarizeSymbols = (symbols) => symbols.map((symbol) => {
  const realized = asNumber(symbol.realizedPnl, Number.NaN);
  const fees = asNumber(symbol.feesHome, Number.NaN);
  return {
    symbol: String(symbol.symbol ?? "UNKNOWN"),
    realized,
    fees,
    netAfterFees: realized - fees,
    openCost: asNumber(symbol.openCost, 0)
  };
});

const topLossSymbols = (symbols) => summarizeSymbols(symbols)
  .filter((symbol) => Number.isFinite(symbol.netAfterFees))
  .sort((a, b) => a.netAfterFees - b.netAfterFees || b.openCost - a.openCost)
  .slice(0, 5);

const topOpenExposure = (symbols) => summarizeSymbols(symbols)
  .filter((symbol) => symbol.openCost > 0)
  .sort((a, b) => b.openCost - a.openCost || a.symbol.localeCompare(b.symbol))
  .slice(0, 5);

const formatSymbolList = (symbols, valueKey) =>
  symbols.map((symbol) => `${symbol.symbol}:${formatSigned(symbol[valueKey])}`).join(",");

const formatOpenList = (symbols) =>
  symbols.map((symbol) => `${symbol.symbol}:${formatNumber(symbol.openCost)}`).join(",");

const summarizeWindow = (entry) => ({
  bundle: entry.bundle,
  class: classifyWindow(entry),
  dailyNet: asNumber(entry?.summary?.pnl?.daily_net_usdt, Number.NaN),
  maxDrawdownPct: asNumber(entry?.summary?.pnl?.max_drawdown_pct, Number.NaN),
  totalAllocPct: asNumber(entry?.summary?.exposure?.total_alloc_pct, Number.NaN),
  rejectedOrders: asNumber(entry?.summary?.activity?.orders?.rejected)
});

const buildReport = (evidence) => {
  const latest = evidence.latest;
  const latestBundlePath = latest.bundlePath;
  const latestSummary = latest.summary ?? {};
  const latestPnl = latestSummary.pnl ?? {};
  const latestActivity = latestSummary.activity ?? {};
  const latestOrders = latestActivity.orders ?? {};
  const latestAi = latestSummary.ai ?? {};
  const kpis = readBaselineKpis(latestBundlePath) ?? {};
  const kpiTotals = kpis.totals ?? {};
  const symbols = Array.isArray(kpis.symbols) ? kpis.symbols : [];
  const adaptiveShadow = readAdaptiveShadow(latestBundlePath);

  const windows = evidence.freshWindow
    .filter((entry) => entry.freshness?.hasFreshRuntimeEvidence)
    .slice(0, 5)
    .map(summarizeWindow);
  const classes = windows.reduce((acc, window) => {
    acc[window.class] = (acc[window.class] ?? 0) + 1;
    return acc;
  }, {});
  const fiveWindowNet = windows.reduce((sum, window) => (
    Number.isFinite(window.dailyNet) ? sum + window.dailyNet : sum
  ), 0);

  const strategyCounts = countBy(adaptiveShadow, (event) => event.strategy?.recommended);
  const laneCounts = countBy(adaptiveShadow, (event) => event.executionLane ?? "UNSPECIFIED");
  const regimeCounts = countBy(adaptiveShadow, (event) => event.regime?.label);
  const decisionCounts = countBy(adaptiveShadow, (event) => event.decision?.kind);
  const strategySwitchingObserved = Object.keys(strategyCounts).length > 1 || Object.keys(laneCounts).length > 1;

  const realized = asNumber(kpiTotals.realizedPnl, asNumber(latestPnl.realized_usdt, Number.NaN));
  const fees = asNumber(kpiTotals.feesHome, asNumber(latestPnl.fees_usdt, Number.NaN));
  const realizedAfterFees = realized - fees;
  const dailyNet = asNumber(latestPnl.daily_net_usdt, Number.NaN);
  const unrealized = asNumber(latestPnl.unrealized_usdt, Number.NaN);
  const controlledDrawdowns = asNumber(classes.CONTROLLED_DRAWDOWN);

  const blockingReasons = [];
  if (Number.isFinite(dailyNet) && dailyNet < 0) blockingReasons.push(`latest_daily_net=${formatSigned(dailyNet)}`);
  if (Number.isFinite(fiveWindowNet) && fiveWindowNet <= 0) blockingReasons.push(`five_window_net=${formatSigned(fiveWindowNet)}`);
  if (controlledDrawdowns >= 3) blockingReasons.push(`controlled_drawdown_windows=${controlledDrawdowns}`);
  if (Number.isFinite(realizedAfterFees) && realizedAfterFees < 0) {
    blockingReasons.push(`realized_after_fees=${formatSigned(realizedAfterFees)}`);
  }
  if (strategySwitchingObserved && (Number.isFinite(fiveWindowNet) && fiveWindowNet <= 0)) {
    blockingReasons.push("strategy_switching_not_profitable_yet");
  }

  return {
    verdict: blockingReasons.length > 0 ? "NOT_BETA_READY" : "CANDIDATE_READY_FOR_OPERATOR_REVIEW",
    latestBundle: latest.bundle,
    aiMode: String(latestAi.mode ?? (latestAi.enabled ? "ON" : "OFF")),
    environment: String(latestSummary.environment ?? "unknown"),
    dailyNet,
    fiveWindowNet,
    maxDrawdownPct: asNumber(latestPnl.max_drawdown_pct, Number.NaN),
    totalAllocPct: asNumber(latestSummary.exposure?.total_alloc_pct, Number.NaN),
    openPositions: asNumber(latestSummary.exposure?.open_positions, Number.NaN),
    realized,
    fees,
    realizedAfterFees,
    unrealized,
    kpiTotals,
    latestOrders,
    classes,
    windows,
    adaptiveEventCount: adaptiveShadow.length,
    strategyCounts,
    laneCounts,
    regimeCounts,
    decisionCounts,
    strategySwitchingObserved,
    topLossSymbols: topLossSymbols(symbols),
    topOpenExposure: topOpenExposure(symbols),
    blockingReasons
  };
};

const printReport = (report) => {
  console.log(`T-040 strategy effectiveness verdict: ${report.verdict}`);
  console.log(`- latestBundle=${report.latestBundle}`);
  console.log(`- environment=${report.environment}; aiMode=${report.aiMode}`);
  console.log(
    `- pnl=dailyNet=${formatSigned(report.dailyNet)}; fiveWindowNet=${formatSigned(report.fiveWindowNet)}; realized=${formatSigned(report.realized)}; fees=${formatNumber(report.fees)}; realizedAfterFees=${formatSigned(report.realizedAfterFees)}; unrealized=${formatSigned(report.unrealized)}`
  );
  console.log(
    `- risk=maxDD=${formatNumber(report.maxDrawdownPct)}%; totalAlloc=${formatNumber(report.totalAllocPct)}%; openPositions=${formatNumber(report.openPositions, 0)}`
  );
  console.log(
    `- activity=decisions=${formatNumber(asNumber(report.kpiTotals.decisions, Number.NaN), 0)}; kpiTrades=${formatNumber(asNumber(report.kpiTotals.trades, Number.NaN), 0)}; filledOrders=${formatNumber(asNumber(report.latestOrders.filled, Number.NaN), 0)}; rejectedOrders=${formatNumber(asNumber(report.latestOrders.rejected, Number.NaN), 0)}; skips=${formatNumber(asNumber(report.kpiTotals.skips, Number.NaN), 0)}; entryTrades=${formatNumber(asNumber(report.kpiTotals.entryTrades, Number.NaN), 0)}`
  );
  console.log(`- windowClasses=${compactCounts(report.classes)}`);
  console.log(`- adaptiveEvents=${report.adaptiveEventCount}; strategySwitchingObserved=${report.strategySwitchingObserved ? "yes" : "no"}`);
  console.log(`- recommendedStrategies=${compactCounts(report.strategyCounts) || "none"}`);
  console.log(`- executionLanes=${compactCounts(report.laneCounts) || "none"}`);
  console.log(`- regimes=${compactCounts(report.regimeCounts) || "none"}`);
  console.log(`- decisionKinds=${compactCounts(report.decisionCounts) || "none"}`);
  console.log(`- topLossSymbolsAfterFees=${formatSymbolList(report.topLossSymbols, "netAfterFees") || "none"}`);
  console.log(`- topOpenExposureCost=${formatOpenList(report.topOpenExposure) || "none"}`);
  console.log(
    `- clientAnswer=${report.strategySwitchingObserved ? "rule_based_adaptation_visible_but_not_proven_profitable" : "no_meaningful_strategy_switching_visible"}`
  );
  if (report.blockingReasons.length > 0) {
    console.log(`- blockingReasons=${report.blockingReasons.join(",")}`);
  }
};

const main = () => {
  const args = process.argv.slice(2).filter(Boolean);
  const json = args.includes("--json");
  const bundles = args.filter((arg) => arg !== "--json");
  const bundlePaths = bundles.length > 0
    ? bundles.map(resolveBundlePath)
    : listBundles(ROOT_DIR).slice(0, 5).map((bundle) => path.join(ROOT_DIR, bundle));
  const evidence = collectEvidence(bundlePaths);
  const report = buildReport(evidence);

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

module.exports = { buildReport };
