#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_PREVIOUS_BUNDLE = "autobot-feedback-20260713-085946.tgz";
const DEFAULT_CURRENT_BUNDLE = "autobot-feedback-20260714-075300.tgz";
const DEFAULT_REPORT_PATH = "docs/easy_process/reports/t026-entry-burst-proof.json";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const round = (value, digits = 8) => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const resolvePath = (target) => path.isAbsolute(target) ? target : path.resolve(ROOT_DIR, target);

const readBundleFile = (bundlePath, innerPath) => {
  const candidates = [`./${innerPath}`, innerPath];
  for (const candidate of candidates) {
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
    previousBundle: DEFAULT_PREVIOUS_BUNDLE,
    currentBundle: DEFAULT_CURRENT_BUNDLE,
    maxNeutralEntries: 2,
    reportPath: DEFAULT_REPORT_PATH,
    writeReport: false,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--previous" && next) {
      options.previousBundle = next;
      index += 1;
    } else if (arg === "--current" && next) {
      options.currentBundle = next;
      index += 1;
    } else if (arg === "--max-neutral-entries" && next) {
      options.maxNeutralEntries = Number(next);
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

  if (!Number.isInteger(options.maxNeutralEntries) || options.maxNeutralEntries < 1 || options.maxNeutralEntries > 8) {
    throw new Error(`--max-neutral-entries must be an integer from 1 to 8, got ${options.maxNeutralEntries}`);
  }
  return options;
};

const buildInitialPositions = (baselineKpis) => new Map(
  (baselineKpis?.symbols ?? [])
    .filter((symbol) => asNumber(symbol.netQty, 0) > 0 && asNumber(symbol.openCost, 0) > 0)
    .map((symbol) => [String(symbol.symbol).toUpperCase(), {
      qty: asNumber(symbol.netQty, 0),
      cost: asNumber(symbol.openCost, 0)
    }])
);

const clonePositions = (positions) => new Map(
  [...positions.entries()].map(([symbol, position]) => [symbol, { ...position }])
);

const buildDecisionMetadata = (shadowEvents) => {
  const byOrderId = new Map();
  for (const event of shadowEvents) {
    const decision = event?.decision ?? {};
    if (decision.kind !== "TRADE" || decision.orderId === undefined || decision.orderId === null) continue;
    byOrderId.set(String(decision.orderId), {
      reason: String(decision.reason ?? "unknown"),
      executionLane: String(event.executionLane ?? "UNSPECIFIED"),
      regime: String(event.regime?.label ?? "UNKNOWN"),
      strategy: String(event.strategy?.recommended ?? "UNKNOWN")
    });
  }
  return byOrderId;
};

const normalizeOrders = ({ orderHistory, metadata, windowStart }) => orderHistory
  .filter((order) => order.status === "FILLED" && Date.parse(order.ts) > windowStart)
  .map((order) => {
    const decision = metadata.get(String(order.id)) ?? {};
    return {
      id: String(order.id),
      ts: order.ts,
      symbol: String(order.symbol).toUpperCase(),
      side: String(order.side).toUpperCase(),
      type: String(order.type).toUpperCase(),
      qty: asNumber(order.qty, 0),
      price: asNumber(order.price, 0),
      feeHome: asNumber(order.feeHome, 0),
      reason: String(decision.reason ?? "unknown"),
      executionLane: String(decision.executionLane ?? "UNSPECIFIED"),
      regime: String(decision.regime ?? "UNKNOWN"),
      strategy: String(decision.strategy ?? "UNKNOWN")
    };
  })
  .filter((order) => order.symbol && order.qty > 0 && order.price > 0)
  .sort((left, right) => Date.parse(left.ts) - Date.parse(right.ts));

const isGuardEligible = (order) => (
  order.side === "BUY" &&
  order.type === "MARKET" &&
  (order.reason === "entry" || order.reason === "entry-retry-sizing") &&
  ["NEUTRAL", "RANGE", "UNKNOWN"].includes(order.regime)
);

const markPositions = (positions, prices) => {
  let exposureCost = 0;
  let marketValue = 0;
  const symbols = [];
  for (const [symbol, position] of positions.entries()) {
    if (position.qty <= 1e-12 || position.cost <= 1e-12) continue;
    const markPrice = asNumber(prices.get(symbol), position.cost / position.qty);
    const value = position.qty * markPrice;
    exposureCost += position.cost;
    marketValue += value;
    symbols.push({
      symbol,
      qty: round(position.qty),
      cost: round(position.cost),
      markPrice: round(markPrice),
      marketValue: round(value),
      unrealizedPnl: round(value - position.cost)
    });
  }
  symbols.sort((left, right) => right.cost - left.cost);
  return {
    exposureCost: round(exposureCost),
    marketValue: round(marketValue),
    unrealizedPnl: round(marketValue - exposureCost),
    symbols
  };
};

const replayOrders = ({ initialPositions, orders, prices, maxNeutralEntries, guarded }) => {
  const positions = clonePositions(initialPositions);
  const consecutiveEntries = new Map();
  let realizedPnl = 0;
  let fees = 0;
  let filledOrders = 0;
  let sellOrdersRequested = 0;
  let sellOrdersExecuted = 0;
  let sellOrdersSkippedNoInventory = 0;
  let clippedSellQty = 0;
  const suppressed = [];

  for (const order of orders) {
    const position = positions.get(order.symbol) ?? { qty: 0, cost: 0 };
    if (order.side === "BUY") {
      const eligible = isGuardEligible(order);
      const entryCount = consecutiveEntries.get(order.symbol) ?? 0;
      if (guarded && eligible && entryCount >= maxNeutralEntries) {
        suppressed.push({
          id: order.id,
          ts: order.ts,
          symbol: order.symbol,
          regime: order.regime,
          strategy: order.strategy,
          notional: round(order.qty * order.price),
          feeHome: round(order.feeHome)
        });
        continue;
      }

      const notional = order.qty * order.price;
      position.qty += order.qty;
      position.cost += notional + order.feeHome;
      positions.set(order.symbol, position);
      fees += order.feeHome;
      filledOrders += 1;
      if (eligible) consecutiveEntries.set(order.symbol, entryCount + 1);
      continue;
    }

    sellOrdersRequested += 1;
    const executableQty = Math.min(order.qty, position.qty);
    const feeScale = order.qty > 0 ? executableQty / order.qty : 0;
    const executionFee = order.feeHome * feeScale;
    if (executableQty > 0) {
      const avgCost = position.qty > 0 ? position.cost / position.qty : 0;
      const soldCost = avgCost * executableQty;
      realizedPnl += executableQty * order.price - soldCost - executionFee;
      position.qty -= executableQty;
      position.cost -= soldCost;
      if (position.qty <= 1e-12) {
        position.qty = 0;
        position.cost = 0;
      }
      positions.set(order.symbol, position);
      fees += executionFee;
      filledOrders += 1;
      sellOrdersExecuted += 1;
    } else {
      sellOrdersSkippedNoInventory += 1;
    }
    clippedSellQty += Math.max(0, order.qty - executableQty);
    consecutiveEntries.set(order.symbol, 0);
  }

  const marked = markPositions(positions, prices);
  return {
    realizedPnl: round(realizedPnl),
    fees: round(fees),
    unrealizedPnl: marked.unrealizedPnl,
    markToMarketPnl: round(realizedPnl + marked.unrealizedPnl),
    endingExposureCost: marked.exposureCost,
    endingMarketValue: marked.marketValue,
    filledOrders,
    sellOrdersRequested,
    sellOrdersExecuted,
    sellOrdersSkippedNoInventory,
    clippedSellQty: round(clippedSellQty),
    suppressedEntries: suppressed.length,
    suppressedNotional: round(suppressed.reduce((sum, item) => sum + item.notional, 0)),
    suppressedFees: round(suppressed.reduce((sum, item) => sum + item.feeHome, 0)),
    suppressed,
    positions: marked.symbols
  };
};

const buildProof = ({ previousBundle, currentBundle, previousSummary, previousKpis, currentSummary, currentKpis, currentState, currentUniverse, shadowEvents, maxNeutralEntries = 2 }) => {
  const windowStart = Date.parse(previousSummary?.generated_at ?? previousSummary?.generatedAt ?? previousKpis?.generatedAt);
  if (!Number.isFinite(windowStart)) throw new Error("Previous bundle has no usable generated timestamp");

  const metadata = buildDecisionMetadata(shadowEvents);
  const orders = normalizeOrders({ orderHistory: currentState.orderHistory ?? [], metadata, windowStart });
  const initialPositions = buildInitialPositions(previousKpis);
  const prices = new Map((currentUniverse?.candidates ?? []).map((candidate) => [
    String(candidate.symbol).toUpperCase(),
    asNumber(candidate.lastPrice, 0)
  ]));
  const baseline = replayOrders({ initialPositions, orders, prices, maxNeutralEntries, guarded: false });
  const candidate = replayOrders({ initialPositions, orders, prices, maxNeutralEntries, guarded: true });
  const currentOrders = currentSummary?.activity?.orders ?? {};
  const observedExposureCost = asNumber(currentKpis?.totals?.openExposureCost, baseline.endingExposureCost);
  const baselineExposureGap = Math.abs(baseline.endingExposureCost - observedExposureCost);
  const exposureMatchTolerance = Math.max(1, observedExposureCost * 0.01);
  const safetyClean = asNumber(currentOrders.rejected, 0) === 0 &&
    asNumber(currentSummary?.health?.errors, 0) === 0 &&
    asNumber(currentSummary?.health?.restart_count, 0) === 0;

  const deltas = {
    markToMarketPnl: round(candidate.markToMarketPnl - baseline.markToMarketPnl),
    realizedPnl: round(candidate.realizedPnl - baseline.realizedPnl),
    fees: round(candidate.fees - baseline.fees),
    endingExposureCost: round(candidate.endingExposureCost - baseline.endingExposureCost),
    filledOrders: candidate.filledOrders - baseline.filledOrders
  };
  const checks = {
    safetyClean,
    enoughObservedOrders: orders.length >= 8,
    baselineExposureMatchesObserved: baselineExposureGap <= exposureMatchTolerance,
    repeatedNeutralEntriesReproduced: candidate.suppressedEntries >= 2,
    sellPathPreserved: candidate.sellOrdersExecuted > 0 &&
      candidate.sellOrdersRequested === baseline.sellOrdersRequested &&
      candidate.sellOrdersExecuted + candidate.sellOrdersSkippedNoInventory === candidate.sellOrdersRequested,
    feesReduced: candidate.fees < baseline.fees,
    exposureReduced: candidate.endingExposureCost < baseline.endingExposureCost,
    markToMarketImproved: candidate.markToMarketPnl > baseline.markToMarketPnl
  };
  const passed = Object.values(checks).every(Boolean);

  return {
    schema_version: 1,
    source_bundles: [previousBundle, currentBundle].filter(Boolean),
    verdict: passed ? "ENTRY_BURST_GUARD_OFFLINE_PROOF_PASSED" : "ENTRY_BURST_GUARD_OFFLINE_PROOF_INCONCLUSIVE",
    runtime_patch_allowed: false,
    reason: passed
      ? "deterministic bundle-delta replay supports a neutral/range MARKET entry burst cap; runtime behavior remains unchanged pending PM/BA severity or explicit override"
      : "bundle-delta replay did not satisfy every proof acceptance check",
    window: {
      start: new Date(windowStart).toISOString(),
      end: currentSummary?.ended_at_utc ?? currentSummary?.generated_at ?? currentSummary?.generatedAt ?? null,
      orders: orders.length,
      maxNeutralEntries
    },
    replay_fidelity: {
      observedExposureCost: round(observedExposureCost),
      reconstructedExposureCost: baseline.endingExposureCost,
      exposureGap: round(baselineExposureGap),
      tolerance: round(exposureMatchTolerance)
    },
    checks,
    baseline,
    candidate,
    deltas
  };
};

const loadProofInputs = (options) => ({
  previousBundle: options.previousBundle,
  currentBundle: options.currentBundle,
  previousSummary: readBundleJson(options.previousBundle, "data/telemetry/last_run_summary.json"),
  previousKpis: readBundleJson(options.previousBundle, "data/telemetry/baseline-kpis.json"),
  currentSummary: readBundleJson(options.currentBundle, "data/telemetry/last_run_summary.json"),
  currentKpis: readBundleJson(options.currentBundle, "data/telemetry/baseline-kpis.json"),
  currentState: readBundleJson(options.currentBundle, "data/state.json"),
  currentUniverse: readBundleJson(options.currentBundle, "data/universe.json"),
  shadowEvents: readBundleJsonLines(options.currentBundle, "data/telemetry/adaptive-shadow.tail.jsonl")
});

const formatSigned = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;

const printReport = (report) => {
  console.log(`T-026 entry burst proof verdict: ${report.verdict}`);
  console.log(`- window=${report.window.start}..${report.window.end}; filledOrders=${report.window.orders}; maxNeutralEntries=${report.window.maxNeutralEntries}; runtimePatchAllowed=no`);
  console.log(`- baseline=markPnl=${formatSigned(report.baseline.markToMarketPnl)}; realized=${formatSigned(report.baseline.realizedPnl)}; fees=${report.baseline.fees.toFixed(2)}; exposure=${report.baseline.endingExposureCost.toFixed(2)}`);
  console.log(`- candidate=markPnl=${formatSigned(report.candidate.markToMarketPnl)}; realized=${formatSigned(report.candidate.realizedPnl)}; fees=${report.candidate.fees.toFixed(2)}; exposure=${report.candidate.endingExposureCost.toFixed(2)}`);
  console.log(`- delta=markPnl=${formatSigned(report.deltas.markToMarketPnl)}; realized=${formatSigned(report.deltas.realizedPnl)}; fees=${formatSigned(report.deltas.fees)}; exposure=${formatSigned(report.deltas.endingExposureCost)}; fills=${report.deltas.filledOrders}`);
  console.log(`- proofSignals=suppressedEntries=${report.candidate.suppressedEntries}; suppressedNotional=${report.candidate.suppressedNotional.toFixed(2)}; sellsExecuted=${report.candidate.sellOrdersExecuted}; sellsSkippedNoInventory=${report.candidate.sellOrdersSkippedNoInventory}; sellInstructions=${report.candidate.sellOrdersRequested}`);
  console.log(`- replayFidelity=observedExposure=${report.replay_fidelity.observedExposureCost.toFixed(2)}; reconstructed=${report.replay_fidelity.reconstructedExposureCost.toFixed(2)}; gap=${report.replay_fidelity.exposureGap.toFixed(2)}`);
  console.log(`- suppressed=${report.candidate.suppressed.map((item) => `${item.symbol}@${item.regime}:${item.notional.toFixed(2)}`).join(",") || "none"}`);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const report = buildProof({ ...loadProofInputs(options), maxNeutralEntries: options.maxNeutralEntries });
  if (options.writeReport) {
    const target = resolvePath(options.reportPath);
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

module.exports = { buildProof, replayOrders, isGuardEligible };
