#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const listBundles = (cwd = process.cwd()) =>
  fs.readdirSync(cwd)
    .filter((name) => /^autobot-feedback-.*\.tgz$/.test(name))
    .sort()
    .reverse();

const readFromBundle = (bundlePath, innerPaths) => {
  for (const innerPath of innerPaths) {
    try {
      return execFileSync("tar", ["-xOf", bundlePath, innerPath], {
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

const exchangeBackoffPattern =
  /Transient exchange backoff active|Live order sync failed|openOrders|502 Bad Gateway|\b(?:HTTP|status|code|response)\s*5\d\d\b|\b5\d\d\s+(?:Bad Gateway|Service Unavailable|Gateway Timeout|Internal Server Error)\b/i;

const hasExchangeBackoffEvidence = (value) => {
  const text = Array.isArray(value)
    ? value.map((entry) => String(entry ?? "")).join(" ")
    : String(value ?? "");
  return exchangeBackoffPattern.test(text);
};

const topReasonOf = (entry) => entry?.summary?.activity?.skips?.top_reasons?.[0] ?? null;

const decisionCountOf = (entry) => {
  const stateCount = Number(entry?.stateMeta?.decisionCount ?? Number.NaN);
  if (Number.isFinite(stateCount) && stateCount > 0) return stateCount;

  const summaryCount = Number(entry?.summary?.activity?.decisions?.count ?? Number.NaN);
  if (Number.isFinite(summaryCount) && summaryCount > 0) return summaryCount;

  return Number.NaN;
};

const formatPct = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "n/a";

const classifyRepeatedDominantLoop = (latestEntry, previousEntry, options = {}) => {
  const minCount = Number(options.minCount ?? 8);
  const materialCount = Number(options.materialCount ?? 20);
  const materialShare = Number(options.materialShare ?? 0.08);
  const improvementFloor = Number(options.improvementFloor ?? 0.25);

  if (!latestEntry || !previousEntry) {
    return { failed: false, repeated: false, details: "not enough fresh bundles" };
  }

  const latestTop = topReasonOf(latestEntry);
  const previousTop = topReasonOf(previousEntry);
  const latestReason = String(latestTop?.reason ?? "");
  const previousReason = String(previousTop?.reason ?? "");
  const latestCount = Number(latestTop?.count ?? 0);
  const previousCount = Number(previousTop?.count ?? 0);

  if (!latestReason || latestReason !== previousReason) {
    return {
      failed: false,
      repeated: false,
      details: `${previousReason || "n/a"} -> ${latestReason || "n/a"}`,
      latestReason,
      previousReason,
      latestCount,
      previousCount
    };
  }

  const latestDecisions = decisionCountOf(latestEntry);
  const latestShare = Number.isFinite(latestDecisions) && latestDecisions > 0
    ? latestCount / latestDecisions
    : Number.NaN;
  const materialPressure =
    latestCount >= materialCount ||
    (Number.isFinite(latestShare) ? latestShare >= materialShare : latestCount >= minCount);
  const improvementRatio = previousCount > 0 ? (previousCount - latestCount) / previousCount : 0;
  const materiallyImproving = improvementRatio >= improvementFloor;
  const failed =
    latestCount >= minCount &&
    previousCount >= minCount &&
    materialPressure &&
    !materiallyImproving;
  const disposition = failed
    ? "material persistent loop"
    : materiallyImproving
      ? `improving ${formatPct(improvementRatio)}`
      : "below material pressure";

  return {
    failed,
    repeated: true,
    details: `"${latestReason}" (${previousCount} -> ${latestCount}; latestShare=${formatPct(latestShare)}; ${disposition})`,
    latestReason,
    previousReason,
    latestCount,
    previousCount,
    latestShare,
    materialPressure,
    improvementRatio
  };
};

const readBundle = (bundlePath) => {
  const summary = parseJson(
    readFromBundle(bundlePath, [
      "./data/telemetry/last_run_summary.json",
      "data/telemetry/last_run_summary.json"
    ])
  );
  const state = parseJson(
    readFromBundle(bundlePath, [
      "./data/state.json",
      "data/state.json"
    ])
  );
  if (!summary) return null;

  const lastDecision = Array.isArray(state?.decisions) && state.decisions.length > 0 ? state.decisions[0] : null;
  const stateMeta = {
    updatedAt: typeof state?.updatedAt === "string" ? state.updatedAt : null,
    lastDecisionTs: typeof lastDecision?.ts === "string" ? lastDecision.ts : null,
    lastDecisionSummary: typeof lastDecision?.summary === "string" ? lastDecision.summary : null,
    activeOrders: Array.isArray(state?.activeOrders) ? state.activeOrders.length : null,
    decisionCount: Array.isArray(state?.decisions) ? state.decisions.length : null
  };

  const behaviorSignature = JSON.stringify({
    lastDecisionTs: stateMeta.lastDecisionTs,
    lastDecisionSummary: stateMeta.lastDecisionSummary,
    trades: Number(summary?.activity?.trades?.count ?? 0),
    buys: Number(summary?.activity?.trades?.buys ?? 0),
    sells: Number(summary?.activity?.trades?.sells ?? 0),
    submitted: Number(summary?.activity?.orders?.submitted ?? 0),
    filled: Number(summary?.activity?.orders?.filled ?? 0),
    rejected: Number(summary?.activity?.orders?.rejected ?? 0),
    canceled: Number(summary?.activity?.orders?.canceled ?? 0),
    riskState: String(summary?.risk_state?.state ?? ""),
    unwindOnly: Boolean(summary?.risk_state?.unwind_only ?? false),
    openPositions: Number(summary?.exposure?.open_positions ?? 0),
    activeOrders: stateMeta.activeOrders
  });

  const marketSignature = JSON.stringify({
    equity: Number(summary?.pnl?.equity_usdt ?? Number.NaN),
    unrealized: Number(summary?.pnl?.unrealized_usdt ?? Number.NaN),
    totalAllocPct: Number(summary?.exposure?.total_alloc_pct ?? Number.NaN),
    largestPosition: String(summary?.exposure?.largest_position?.symbol ?? ""),
    largestPositionPct: Number(summary?.exposure?.largest_position?.pct ?? Number.NaN)
  });

  return {
    bundle: path.basename(bundlePath),
    bundlePath,
    summary,
    stateMeta,
    behaviorSignature,
    marketSignature
  };
};

const collectEvidence = (bundlePaths) => {
  if (!Array.isArray(bundlePaths) || bundlePaths.length === 0) {
    throw new Error("No feedback bundles found.");
  }

  const entries = bundlePaths
    .map(readBundle)
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error("No readable bundle summaries found.");
  }

  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index];
    const previous = entries[index + 1] ?? null;
    if (!previous) {
      current.freshness = {
        classification: "baseline",
        hasFreshRuntimeEvidence: true,
        reason: "no previous bundle for comparison"
      };
      continue;
    }

    const sameBehavior = current.behaviorSignature === previous.behaviorSignature;
    const sameMarket = current.marketSignature === previous.marketSignature;
    const classification = sameBehavior ? (sameMarket ? "stale" : "mark_to_market_only") : "fresh";
    current.freshness = {
      classification,
      hasFreshRuntimeEvidence: classification === "fresh",
      reason:
        classification === "fresh"
          ? "behavior signature changed vs previous bundle"
          : classification === "mark_to_market_only"
            ? "only market/equity signature changed; no fresh bot activity"
            : "no fresh bot activity vs previous bundle"
    };
  }

  let staleStreak = 0;
  for (const entry of entries) {
    if (entry.freshness.hasFreshRuntimeEvidence) break;
    staleStreak += 1;
  }

  const freshWindow = entries.filter((entry) => entry.freshness.hasFreshRuntimeEvidence || entry.freshness.classification === "baseline");
  return {
    latest: entries[0],
    staleStreak,
    entries,
    freshWindow
  };
};

module.exports = {
  classifyRepeatedDominantLoop,
  collectEvidence,
  hasExchangeBackoffEvidence,
  listBundles
};

if (require.main === module) {
  const explicitBundles = process.argv.slice(2).filter(Boolean);
  const bundlePaths = explicitBundles.length > 0 ? explicitBundles : listBundles().slice(0, 5);
  try {
    const result = collectEvidence(bundlePaths);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}
