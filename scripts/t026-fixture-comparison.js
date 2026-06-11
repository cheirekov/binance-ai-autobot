#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_FIXTURE_PATH = "docs/easy_process/fixtures/t026/bear_choppy_controlled_drawdown.json";
const DEFAULT_REPORT_PATH = "docs/easy_process/reports/t026-fixture-comparison.json";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseArgs = (argv) => {
  const options = {
    fixturePath: DEFAULT_FIXTURE_PATH,
    writeReport: false,
    reportPath: DEFAULT_REPORT_PATH,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--fixture" && next) {
      options.fixturePath = next;
      index += 1;
    } else if (arg === "--write-report") {
      options.writeReport = true;
      if (next && !next.startsWith("--")) {
        options.reportPath = next;
        index += 1;
      }
    } else if (!arg.startsWith("--")) {
      options.fixturePath = arg;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return options;
};

const resolvePath = (target) => path.isAbsolute(target) ? target : path.resolve(ROOT_DIR, target);

const readJsonFile = (target) => JSON.parse(fs.readFileSync(resolvePath(target), "utf8"));

const readFromBundle = (bundlePath, innerPaths) => {
  for (const innerPath of innerPaths) {
    try {
      return execFileSync("tar", ["-xOf", bundlePath, innerPath], {
        maxBuffer: 64 * 1024 * 1024,
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

const readBundleJson = (bundlePath, innerPaths) => parseJson(readFromBundle(bundlePath, innerPaths));

const readBundleJsonLines = (bundlePath, innerPaths) => parseJsonLines(readFromBundle(bundlePath, innerPaths));

const countBy = (items, readKey) => items.reduce((acc, item) => {
  const key = String(readKey(item) ?? "UNKNOWN");
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

const sumMatchingReasons = (reasons, pattern) => reasons.reduce((sum, reason) => {
  const text = String(reason.reason ?? reason.summary ?? "");
  return pattern.test(text) ? sum + asNumber(reason.count, 1) : sum;
}, 0);

const summarizeSymbols = (symbols) => symbols.map((symbol) => {
  const realized = asNumber(symbol.realizedPnl, Number.NaN);
  const fees = asNumber(symbol.feesHome, Number.NaN);
  return {
    symbol: String(symbol.symbol ?? "UNKNOWN"),
    realized,
    fees,
    netAfterFees: realized - fees,
    openCost: asNumber(symbol.openCost, 0),
    buys: asNumber(symbol.buys, 0),
    sells: asNumber(symbol.sells, 0)
  };
});

const formatNumber = (value, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : "n/a";

const formatSigned = (value, digits = 2) =>
  Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(digits)}` : "n/a";

const safeRatioPct = (value, denominator) => denominator > 0 ? (value / denominator) * 100 : 0;

const summarizeWindow = (fixtureWindow) => {
  const bundleName = fixtureWindow.bundle;
  const bundlePath = resolvePath(bundleName);
  const summary = fs.existsSync(bundlePath)
    ? readBundleJson(bundlePath, [
        "./data/telemetry/last_run_summary.json",
        "data/telemetry/last_run_summary.json"
      ])
    : null;
  const kpis = fs.existsSync(bundlePath)
    ? readBundleJson(bundlePath, [
        "./data/telemetry/baseline-kpis.json",
        "data/telemetry/baseline-kpis.json"
      ])
    : null;
  const shadow = fs.existsSync(bundlePath)
    ? readBundleJsonLines(bundlePath, [
        "./data/telemetry/adaptive-shadow.tail.jsonl",
        "data/telemetry/adaptive-shadow.tail.jsonl"
      ])
    : [];

  const kpiTotals = kpis?.totals ?? {};
  const pnl = summary?.pnl ?? {};
  const exposure = summary?.exposure ?? {};
  const activity = summary?.activity ?? {};
  const orders = activity.orders ?? {};
  const topReasons = summary?.activity?.skips?.top_reasons ?? fixtureWindow.topReasons ?? [];
  const decisions = asNumber(kpiTotals.decisions, 200);
  const symbols = summarizeSymbols(Array.isArray(kpis?.symbols) ? kpis.symbols : []);
  const strategyCounts = countBy(shadow, (event) => event.strategy?.recommended);
  const laneCounts = countBy(shadow, (event) => event.executionLane ?? "UNSPECIFIED");
  const decisionCounts = countBy(shadow, (event) => event.decision?.kind);

  const dailyNet = asNumber(pnl.daily_net_usdt, asNumber(fixtureWindow.dailyNet, Number.NaN));
  const fees = asNumber(kpiTotals.feesHome, asNumber(pnl.fees_usdt, asNumber(fixtureWindow.fees, 0)));
  const realized = asNumber(kpiTotals.realizedPnl, asNumber(pnl.realized_usdt, 0));
  const realizedAfterFees = realized - fees;
  const filledOrders = asNumber(kpiTotals.filledOrders, asNumber(orders.filled, asNumber(fixtureWindow.filledOrders, 0)));
  const rejectedOrders = asNumber(orders.rejected, asNumber(fixtureWindow.rejectedOrders, 0));
  const maxDrawdownPct = asNumber(pnl.max_drawdown_pct, asNumber(fixtureWindow.maxDrawdown, 0));
  const totalAllocPct = asNumber(exposure.total_alloc_pct, asNumber(fixtureWindow.totalAllocation, 0));
  const entryTrades = asNumber(kpiTotals.entryTrades, 0);

  const gridReasonCount = sumMatchingReasons(topReasons, /grid|ladder|minqty|minnotional|inventory/i);
  const riskBudgetReasonCount = sumMatchingReasons(topReasons, /risk budget|blocked new exposure|market entry cap|paused grid buy/i);
  const feeEdgeReasonCount = sumMatchingReasons(topReasons, /fee\/edge/i);
  const noFeasibleReasonCount = sumMatchingReasons(topReasons, /no feasible|no eligible/i);
  const negativeSymbolLoss = symbols
    .filter((symbol) => Number.isFinite(symbol.netAfterFees) && symbol.netAfterFees < 0)
    .reduce((sum, symbol) => sum + Math.abs(symbol.netAfterFees), 0);
  const topLossSymbols = symbols
    .filter((symbol) => Number.isFinite(symbol.netAfterFees))
    .sort((a, b) => a.netAfterFees - b.netAfterFees)
    .slice(0, 5);
  const topOpenExposure = symbols
    .filter((symbol) => symbol.openCost > 0)
    .sort((a, b) => b.openCost - a.openCost)
    .slice(0, 5);

  return {
    bundle: bundleName,
    class: String(fixtureWindow.class ?? "UNKNOWN"),
    dailyNet,
    maxDrawdownPct,
    totalAllocPct,
    realized,
    fees,
    realizedAfterFees,
    filledOrders,
    rejectedOrders,
    healthErrors: asNumber(summary?.health?.errors, asNumber(fixtureWindow.healthErrors, 0)),
    restarts: asNumber(summary?.health?.restart_count, asNumber(fixtureWindow.restarts, 0)),
    entryTrades,
    decisions,
    topReason: topReasons[0]?.reason ?? fixtureWindow.topReason ?? "n/a",
    topReasons,
    pressure: {
      gridReasonCount,
      gridReasonPct: safeRatioPct(gridReasonCount, decisions),
      riskBudgetReasonCount,
      riskBudgetReasonPct: safeRatioPct(riskBudgetReasonCount, decisions),
      feeEdgeReasonCount,
      feeEdgeReasonPct: safeRatioPct(feeEdgeReasonCount, decisions),
      noFeasibleReasonCount,
      noFeasibleReasonPct: safeRatioPct(noFeasibleReasonCount, decisions)
    },
    adaptive: {
      events: shadow.length,
      strategyCounts,
      laneCounts,
      decisionCounts
    },
    topLossSymbols,
    topOpenExposure,
    negativeSymbolLoss
  };
};

const countLeadingNegative = (windows) => {
  let count = 0;
  for (const window of windows) {
    if (!(window.dailyNet < 0)) break;
    count += 1;
  }
  return count;
};

const buildCandidate = (family, score, rationale, target, acceptance) => ({
  family,
  score,
  rationale,
  target,
  acceptance
});

const buildComparison = (fixture) => {
  const windows = (fixture.windows ?? []).map(summarizeWindow);
  const safetyClean = windows.every((window) =>
    window.rejectedOrders === 0 &&
    window.healthErrors === 0 &&
    window.restarts === 0
  );
  const negativeWindows = windows.filter((window) => window.dailyNet < 0).length;
  const negativeAfterFeesWindows = windows.filter((window) => window.realizedAfterFees < 0).length;
  const leadingNegativeWindows = countLeadingNegative(windows);
  const tradeChurnWindows = windows.filter((window) => window.filledOrders >= 120 && window.fees >= 5).length;
  const gridPressureWindows = windows.filter((window) =>
    window.pressure.gridReasonCount > 0 ||
    asNumber(window.adaptive.laneCounts.GRID, 0) >= 50
  ).length;
  const riskBudgetPressureWindows = windows.filter((window) => window.pressure.riskBudgetReasonCount > 0).length;
  const feeEdgePressureWindows = windows.filter((window) => window.pressure.feeEdgeReasonCount > 0).length;
  const highExposureWindows = windows.filter((window) => window.totalAllocPct >= 5).length;
  const meanReversionActiveWindows = windows.filter((window) => asNumber(window.adaptive.strategyCounts.MEAN_REVERSION, 0) > 0).length;
  const totalDailyNet = windows.reduce((sum, window) => sum + (Number.isFinite(window.dailyNet) ? window.dailyNet : 0), 0);
  const totalFees = windows.reduce((sum, window) => sum + window.fees, 0);
  const totalRealizedAfterFees = windows.reduce((sum, window) => sum + window.realizedAfterFees, 0);
  const totalNegativeSymbolLoss = windows.reduce((sum, window) => sum + window.negativeSymbolLoss, 0);
  const latest = windows[0] ?? null;

  const candidates = [
    buildCandidate(
      "grid_guard_v2",
      gridPressureWindows * 5 +
        riskBudgetPressureWindows * 3 +
        negativeWindows * 2 +
        highExposureWindows * 4 +
        (latest?.topOpenExposure?.[0]?.openCost >= 150 ? 3 : 0),
      "grid/risk-budget/min-order pressure is present while after-fee results remain negative",
      "pause or shrink grid BUY legs under validation pressure while preserving SELL/reduce reachability",
      "lower filled-order count, fees, and open exposure without increasing rejects or blocking sells"
    ),
    buildCandidate(
      "risk_governor_hysteresis",
      leadingNegativeWindows * 5 +
        negativeAfterFeesWindows * 3 +
        tradeChurnWindows * 2 +
        highExposureWindows * 2,
      "repeated negative windows need longer memory before returning to baseline exposure",
      "extend defensive state when recent windows remain negative after fees",
      "reduce new exposure after negative streaks while leaving unwind/reduce actions available"
    ),
    buildCandidate(
      "mean_reversion_gate",
      feeEdgePressureWindows * 4 +
        meanReversionActiveWindows * 2 +
        negativeWindows +
        (totalNegativeSymbolLoss >= 25 ? 3 : 0),
      "fee-edge and mean-reversion activity are visible but not profitable enough after fees",
      "tighten mean-reversion entry quality in range/choppy windows before live exposure",
      "improve realized-after-fees in fixture replay without increasing drawdown"
    )
  ].sort((a, b) => b.score - a.score || a.family.localeCompare(b.family));

  return {
    schema_version: 1,
    fixture: fixture.name ?? path.basename(DEFAULT_FIXTURE_PATH),
    source_bundles: fixture.source_bundles ?? windows.map((window) => window.bundle),
    verdict: candidates[0]?.score > 0 ? `FIXTURE_CANDIDATE_${candidates[0].family.toUpperCase()}` : "NO_FIXTURE_CANDIDATE",
    runtime_patch_allowed: false,
    reason: "deterministic validation artifact only; runtime patches still require P0/P1 severity plus reproduction or PM/BA override",
    aggregate: {
      windows: windows.length,
      safetyClean,
      negativeWindows,
      leadingNegativeWindows,
      negativeAfterFeesWindows,
      tradeChurnWindows,
      gridPressureWindows,
      riskBudgetPressureWindows,
      feeEdgePressureWindows,
      highExposureWindows,
      totalDailyNet,
      totalFees,
      totalRealizedAfterFees,
      totalNegativeSymbolLoss
    },
    candidates,
    windows,
    next_action: `Build focused offline proof for ${candidates[0]?.family ?? "candidate family"} before any runtime behavior patch`
  };
};

const printReport = (report) => {
  const aggregate = report.aggregate;
  console.log(`T-026 fixture comparison verdict: ${report.verdict}`);
  console.log(`- fixture=${report.fixture}; windows=${aggregate.windows}; safetyClean=${aggregate.safetyClean ? "yes" : "no"}`);
  console.log(
    `- pnl=totalDailyNet=${formatSigned(aggregate.totalDailyNet)}; totalFees=${formatNumber(aggregate.totalFees)}; totalRealizedAfterFees=${formatSigned(aggregate.totalRealizedAfterFees)}`
  );
  console.log(
    `- pressure=negativeWindows=${aggregate.negativeWindows}; leadingNegative=${aggregate.leadingNegativeWindows}; gridWindows=${aggregate.gridPressureWindows}; riskBudgetWindows=${aggregate.riskBudgetPressureWindows}; feeEdgeWindows=${aggregate.feeEdgePressureWindows}; highExposureWindows=${aggregate.highExposureWindows}`
  );
  for (const [index, candidate] of report.candidates.entries()) {
    console.log(`- rank${index + 1}=${candidate.family}; score=${candidate.score}; target=${candidate.target}`);
  }
  console.log(`- runtimePatchAllowed=${report.runtime_patch_allowed ? "yes" : "no"}`);
  console.log(`- nextAction=${report.next_action}`);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const fixture = readJsonFile(options.fixturePath);
  const report = buildComparison(fixture);

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
