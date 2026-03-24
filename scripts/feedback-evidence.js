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
  collectEvidence,
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
