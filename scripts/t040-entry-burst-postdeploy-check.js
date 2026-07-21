#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_REPORT_PATH = "docs/easy_process/reports/t040-entry-burst-postdeploy.json";

const resolvePath = (target) => path.isAbsolute(target) ? target : path.resolve(ROOT_DIR, target);

const latestBundle = () => fs.readdirSync(ROOT_DIR)
  .filter((name) => /^autobot-feedback-\d{8}-\d{6}\.tgz$/.test(name))
  .sort()
  .at(-1);

const readBundleFile = (bundlePath, innerPath) => {
  for (const candidate of [`./${innerPath}`, innerPath]) {
    try {
      return execFileSync("tar", ["-xOf", resolvePath(bundlePath), candidate], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"]
      });
    } catch {
      // Try the alternate archive path spelling.
    }
  }
  throw new Error(`${bundlePath} is missing ${innerPath}`);
};

const readBundleJson = (bundlePath, innerPath) => JSON.parse(readBundleFile(bundlePath, innerPath));

const readBundleJsonLines = (bundlePath, innerPath) => readBundleFile(bundlePath, innerPath)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const parseArgs = (argv) => {
  const options = {
    bundle: latestBundle(),
    reportPath: DEFAULT_REPORT_PATH,
    writeReport: false,
    json: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--bundle" && next) {
      options.bundle = next;
      index += 1;
    } else if (arg === "--write-report") {
      options.writeReport = true;
      if (next && !next.startsWith("--")) {
        options.reportPath = next;
        index += 1;
      }
    } else if (arg === "--json") {
      options.json = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (!options.bundle) throw new Error("No feedback bundle found");
  return options;
};

const buildMetadata = (shadowEvents) => {
  const byOrderId = new Map();
  for (const event of shadowEvents) {
    const decision = event?.decision ?? {};
    if (decision.orderId === undefined || decision.orderId === null) continue;
    byOrderId.set(String(decision.orderId), {
      ts: event.ts,
      regime: String(event.regime?.label ?? "UNKNOWN"),
      risk: Number(event.risk?.risk),
      reason: String(decision.reason ?? "unknown")
    });
  }
  return byOrderId;
};

const summarizeActivations = (shadowEvents) => {
  const activations = shadowEvents
    .filter((event) => /entry burst cap reached/i.test(String(event?.decision?.summary ?? "")))
    .map((event) => ({
      ts: event.ts,
      symbol: String(event.candidateSymbol ?? "UNKNOWN").toUpperCase(),
      regime: String(event.regime?.label ?? "UNKNOWN"),
      summary: String(event.decision.summary)
    }));
  const bySymbol = Object.entries(activations.reduce((counts, activation) => {
    counts[activation.symbol] = (counts[activation.symbol] ?? 0) + 1;
    return counts;
  }, {})).map(([symbol, count]) => ({ symbol, count }));
  return { activations, bySymbol };
};

const buildAudit = ({ bundle, summary, state, shadowEvents, workspaceCommit }) => {
  const metadata = buildMetadata(shadowEvents);
  const activationSummary = summarizeActivations(shadowEvents);
  const streaks = new Map();
  const violations = [];
  let filledBuys = 0;
  let filledSells = 0;
  let filledSellsAfterFirstActivation = 0;
  let marketBuysWithMetadata = 0;
  let neutralRangeMarketEntries = 0;
  let maxObservedNeutralRangeStreak = 0;
  const firstActivationMs = activationSummary.activations.length > 0
    ? Math.min(...activationSummary.activations.map((item) => Date.parse(item.ts)).filter(Number.isFinite))
    : Number.POSITIVE_INFINITY;

  const filledOrders = (state.orderHistory ?? [])
    .filter((order) => order.status === "FILLED")
    .slice()
    .sort((left, right) => Date.parse(left.ts) - Date.parse(right.ts));

  for (const order of filledOrders) {
    const symbol = String(order.symbol ?? "").toUpperCase();
    if (!symbol) continue;
    if (order.side === "SELL") {
      filledSells += 1;
      if (Date.parse(order.ts) > firstActivationMs) filledSellsAfterFirstActivation += 1;
      streaks.set(symbol, 0);
      continue;
    }
    if (order.side !== "BUY") continue;
    filledBuys += 1;
    if (String(order.type).toUpperCase() !== "MARKET") continue;

    const currentStreak = streaks.get(symbol) ?? 0;
    const decision = metadata.get(String(order.id));
    if (decision) marketBuysWithMetadata += 1;
    const risk = Number.isFinite(decision?.risk) ? decision.risk : 100;
    const cap = risk >= 70 ? 2 : 1;
    const regime = decision?.regime ?? "UNKNOWN";
    if (regime === "NEUTRAL" || regime === "RANGE") {
      neutralRangeMarketEntries += 1;
      const executedStreak = currentStreak + 1;
      maxObservedNeutralRangeStreak = Math.max(maxObservedNeutralRangeStreak, executedStreak);
      if (currentStreak >= cap) {
        violations.push({
          orderId: String(order.id),
          ts: order.ts,
          symbol,
          regime,
          risk,
          cap,
          executedStreak
        });
      }
    }
    streaks.set(symbol, currentStreak + 1);
  }

  const marketBuyOrders = filledOrders.filter((order) =>
    order.side === "BUY" && String(order.type).toUpperCase() === "MARKET"
  ).length;
  const metadataCoveragePct = marketBuyOrders > 0 ? (marketBuysWithMetadata / marketBuyOrders) * 100 : 0;
  const deployedCommit = String(summary?.git?.commit ?? "");
  const commitMatches = Boolean(
    deployedCommit && workspaceCommit &&
    (deployedCommit === workspaceCommit || workspaceCommit.startsWith(deployedCommit) || deployedCommit.startsWith(workspaceCommit))
  );
  const checks = {
    deployedCommitMatchesWorkspace: commitMatches,
    guardActivated: activationSummary.activations.length > 0,
    noForbiddenNeutralRangeFill: violations.length === 0,
    marketBuyMetadataCoverage: metadataCoveragePct >= 95,
    sellReachabilityObserved: filledSells > 0 && filledSellsAfterFirstActivation > 0,
    noRejectedOrders: Number(summary?.activity?.orders?.rejected ?? 0) === 0,
    noHealthErrors: Number(summary?.health?.errors ?? 0) === 0,
    noRestarts: Number(summary?.health?.restart_count ?? 0) === 0
  };
  const passed = Object.values(checks).every(Boolean);

  return {
    schema_version: 1,
    bundle,
    verdict: passed ? "ENTRY_BURST_POSTDEPLOY_PASS" : "ENTRY_BURST_POSTDEPLOY_FAIL",
    checks,
    commits: { deployed: deployedCommit, workspace: workspaceCommit },
    evidence: {
      shadowEvents: shadowEvents.length,
      filledOrders: filledOrders.length,
      filledBuys,
      filledSells,
      filledSellsAfterFirstActivation,
      marketBuyOrders,
      marketBuysWithMetadata,
      metadataCoveragePct: Number(metadataCoveragePct.toFixed(2)),
      neutralRangeMarketEntries,
      maxObservedNeutralRangeStreak,
      guardActivations: activationSummary.activations.length,
      activationsBySymbol: activationSummary.bySymbol,
      violations
    }
  };
};

const printReport = (report) => {
  const evidence = report.evidence;
  console.log(`T-040 entry burst post-deploy verdict: ${report.verdict}`);
  console.log(`- bundle=${report.bundle}; deployedCommit=${report.commits.deployed}; workspaceCommit=${report.commits.workspace}`);
  console.log(`- guard=activations=${evidence.guardActivations}; symbols=${evidence.activationsBySymbol.map((item) => `${item.symbol}:${item.count}`).join(",") || "none"}; violations=${evidence.violations.length}`);
  console.log(`- entries=neutralRange=${evidence.neutralRangeMarketEntries}; maxExecutedStreak=${evidence.maxObservedNeutralRangeStreak}; marketMetadataCoverage=${evidence.metadataCoveragePct.toFixed(2)}%`);
  console.log(`- exits=filledSells=${evidence.filledSells}; afterFirstActivation=${evidence.filledSellsAfterFirstActivation}`);
  console.log(`- safety=rejected=${report.checks.noRejectedOrders ? 0 : "nonzero"}; healthErrors=${report.checks.noHealthErrors ? 0 : "nonzero"}; restarts=${report.checks.noRestarts ? 0 : "nonzero"}`);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const workspaceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT_DIR, encoding: "utf8" }).trim();
  const report = buildAudit({
    bundle: path.basename(options.bundle),
    summary: readBundleJson(options.bundle, "data/telemetry/last_run_summary.json"),
    state: readBundleJson(options.bundle, "data/state.json"),
    shadowEvents: readBundleJsonLines(options.bundle, "data/telemetry/adaptive-shadow.tail.jsonl"),
    workspaceCommit
  });
  if (options.writeReport) {
    const target = resolvePath(options.reportPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
    if (!options.json) console.log(`Wrote report: ${target}`);
  }
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  if (report.verdict === "ENTRY_BURST_POSTDEPLOY_FAIL") process.exitCode = 1;
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

module.exports = { buildAudit };
