#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_REPORTS = [
  "docs/easy_process/reports/t026-walk-forward-20260721-mainnet-core.json",
  "docs/easy_process/reports/t026-walk-forward-20260810-mainnet-core.json",
  "docs/easy_process/reports/t026-walk-forward-20260831-mainnet-core.json"
];
const DEFAULT_OUTPUT = "docs/easy_process/reports/t026-walk-forward-gate.json";

const resolvePath = (target) => path.isAbsolute(target) ? target : path.resolve(ROOT_DIR, target);
const readJson = (target) => JSON.parse(fs.readFileSync(resolvePath(target), "utf8"));
const average = (values) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

const buildGate = (reports) => {
  const windows = reports.map((report) => ({
    source: report.baseUrl,
    sourceBundle: report.sourceBundle,
    endTime: report.endTime,
    verdict: report.verdict,
    errors: report.errors?.length ?? 0,
    symbols: report.walkForward?.symbols ?? 0,
    sellReachableSymbols: report.walkForward?.sellReachableSymbols ?? 0,
    validationAvgNetPct: report.walkForward?.validationAvgNetPct ?? Number.NaN,
    validationAvgMaxDrawdownPct: report.walkForward?.validationAvgMaxDrawdownPct ?? Number.NaN,
    profitableSymbols: report.walkForward?.profitableSymbols ?? 0,
    buyHoldAvgNetPct: report.walkForward?.buyHoldAvgNetPct ?? Number.NaN,
    buyHoldAvgMaxDrawdownPct: report.walkForward?.buyHoldAvgMaxDrawdownPct ?? Number.NaN
  }));
  const validationValues = windows.map((window) => window.validationAvgNetPct);
  const benchmarkValues = windows.map((window) => window.buyHoldAvgNetPct);
  const totalSymbols = windows.reduce((sum, window) => sum + window.symbols, 0);
  const totalProfitable = windows.reduce((sum, window) => sum + window.profitableSymbols, 0);
  const validationAvgNetPct = average(validationValues);
  const buyHoldAvgNetPct = average(benchmarkValues);
  const checks = {
    atLeastTwoCutoffs: windows.length >= 2,
    uniqueCutoffs: new Set(windows.map((window) => window.endTime)).size === windows.length,
    deterministicFixtures: windows.every((window) => String(window.source).startsWith("fixture:")),
    noDataErrors: windows.every((window) => window.errors === 0 && window.symbols >= 3),
    sellReachabilityPreserved: windows.every((window) => window.sellReachableSymbols === window.symbols),
    positiveEveryCutoff: windows.every((window) => window.validationAvgNetPct > 0),
    majorityProfitable: totalProfitable >= Math.ceil(totalSymbols / 2),
    competitiveWithBuyHold: validationAvgNetPct >= buyHoldAvgNetPct - 0.25,
    drawdownNotWorseThanBuyHold: windows.every((window) =>
      window.validationAvgMaxDrawdownPct <= window.buyHoldAvgMaxDrawdownPct + 1e-9
    )
  };
  const passed = Object.values(checks).every(Boolean);

  return {
    schema_version: 2,
    verdict: passed ? "WALK_FORWARD_PROMOTION_CANDIDATE" : "WALK_FORWARD_REJECTED",
    promotion_candidate: passed,
    runtime_patch_allowed: false,
    checks,
    aggregate: {
      cutoffs: windows.length,
      totalSymbols,
      totalProfitable,
      validationAvgNetPct,
      buyHoldAvgNetPct,
      relativeEdgePct: validationAvgNetPct - buyHoldAvgNetPct
    },
    windows,
    next_action: passed
      ? "review the selector for shadow-only integration; runtime remains unchanged until separate safety and PM/BA promotion"
      : "keep runtime unchanged; improve or replace the offline selector and rerun the same fixed fixtures"
  };
};

const parseArgs = (argv) => {
  const options = { reports: [], writeReport: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--report" && next) {
      options.reports.push(next);
      index += 1;
    } else if (arg === "--write-report") {
      options.writeReport = next && !next.startsWith("--") ? next : DEFAULT_OUTPUT;
      if (next && !next.startsWith("--")) index += 1;
    } else if (arg === "--json") {
      options.json = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (options.reports.length === 0) options.reports = DEFAULT_REPORTS;
  return options;
};

const printReport = (report) => {
  console.log(`T-026 walk-forward gate verdict: ${report.verdict}`);
  console.log(`- cutoffs=${report.aggregate.cutoffs}; symbols=${report.aggregate.totalSymbols}; profitable=${report.aggregate.totalProfitable}`);
  console.log(`- selectedAvg=${report.aggregate.validationAvgNetPct.toFixed(2)}%; buyHoldAvg=${report.aggregate.buyHoldAvgNetPct.toFixed(2)}%; relativeEdge=${report.aggregate.relativeEdgePct.toFixed(2)}%`);
  console.log(`- checks=${JSON.stringify(report.checks)}; runtimePatchAllowed=no`);
  for (const window of report.windows) {
    console.log(`- ${window.sourceBundle}: selected=${window.validationAvgNetPct.toFixed(2)}%; buyHold=${window.buyHoldAvgNetPct.toFixed(2)}%; profitable=${window.profitableSymbols}/${window.symbols}`);
  }
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const report = buildGate(options.reports.map(readJson));
  if (options.writeReport) {
    const target = resolvePath(options.writeReport);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
    if (!options.json) console.log(`Wrote report: ${target}`);
  }
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

module.exports = { buildGate };
