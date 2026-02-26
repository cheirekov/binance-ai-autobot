#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUT_FILE="${1:-data/telemetry/last_run_summary.json}"

mkdir -p "$(dirname "$OUT_FILE")"

node - "$OUT_FILE" <<'NODE'
const fs = require("node:fs");
const crypto = require("node:crypto");
const { execSync } = require("node:child_process");

const outFile = process.argv[2];

const readJson = (path) => {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};

const safeNum = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const state = readJson("data/state.json") ?? {};
const config = readJson("data/config.json") ?? {};
const kpis = readJson("data/telemetry/baseline-kpis.json") ?? {};

const totals = kpis.totals ?? {};
const topSkipSummaries = Array.isArray(kpis.topSkipSummaries) ? kpis.topSkipSummaries : [];
const decisions = Array.isArray(state.decisions) ? state.decisions : [];
const activeOrders = Array.isArray(state.activeOrders) ? state.activeOrders : [];
const orderHistory = Array.isArray(state.orderHistory) ? state.orderHistory : [];
const locks = Array.isArray(state.protectionLocks) ? state.protectionLocks : [];
const symbols = Array.isArray(kpis.symbols) ? kpis.symbols : [];

const exec = (cmd) => {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};

const configRaw = (() => {
  try {
    return fs.readFileSync("data/config.json", "utf8");
  } catch {
    return "{}";
  }
})();

const readJsonLinesTail = (path, limit = 2000) => {
  try {
    const raw = fs.readFileSync(path, "utf8");
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const tail = lines.slice(Math.max(0, lines.length - limit));
    const parsed = [];
    for (const line of tail) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // ignore malformed lines
      }
    }
    return parsed;
  } catch {
    return [];
  }
};

const configHash = crypto.createHash("sha256").update(configRaw).digest("hex").slice(0, 16);
const commit = exec("git rev-parse --short HEAD");
const branch = exec("git rev-parse --abbrev-ref HEAD");

const nowIso = new Date().toISOString();
const startedAt = kpis.startedAt ?? state.startedAt ?? nowIso;
const endedAt = kpis.generatedAt ?? state.updatedAt ?? nowIso;
const runId = crypto
  .createHash("sha1")
  .update(`${startedAt}|${endedAt}|${commit}|${configHash}`)
  .digest("hex")
  .slice(0, 12);

const liveTrading = Boolean(config?.basic?.liveTrading);
const environment = !liveTrading
  ? "paper"
  : String(config?.advanced?.binanceEnvironment ?? "").toUpperCase() === "SPOT_TESTNET"
    ? "testnet"
    : "mainnet";

const riskSlider = Math.max(0, Math.min(100, Math.round(safeNum(config?.basic?.risk, 50))));
const aiSliderCandidate = [
  config?.basic?.aiAutonomy,
  config?.basic?.aiSlider,
  config?.expert?.aiAutonomy,
  config?.expert?.aiSlider
].find((value) => Number.isFinite(Number(value)));
const aiSlider = config?.basic?.aiEnabled
  ? Math.max(0, Math.min(100, Math.round(safeNum(aiSliderCandidate, 30))))
  : 0;

const activeGlobalLocks = locks.filter((lock) => String(lock?.scope ?? "").toUpperCase() === "GLOBAL");
const canonicalRiskStateRaw = String(state?.riskState?.state ?? state?.riskState ?? "").toUpperCase();
const hasCanonicalRiskState = ["NORMAL", "CAUTION", "HALT"].includes(canonicalRiskStateRaw);
const fallbackUnwindOnly = activeGlobalLocks.some((lock) => {
  const type = String(lock?.type ?? "").toUpperCase();
  return type === "MAX_DRAWDOWN" || type === "STOPLOSS_GUARD";
});
const fallbackRiskState = fallbackUnwindOnly ? "HALT" : activeGlobalLocks.length > 0 ? "CAUTION" : "NORMAL";
const riskState = hasCanonicalRiskState ? canonicalRiskStateRaw : fallbackRiskState;
const reasonCodes = hasCanonicalRiskState
  ? Array.isArray(state?.riskState?.reason_codes)
    ? state.riskState.reason_codes.map((reason) => String(reason))
    : Array.isArray(state?.riskState?.reasonCodes)
      ? state.riskState.reasonCodes.map((reason) => String(reason))
      : []
  : [
      "BEST_EFFORT_PROTECTION_LOCKS",
      ...activeGlobalLocks.map((lock) => String(lock?.type ?? "UNKNOWN"))
    ];
const unwindOnly = hasCanonicalRiskState ? Boolean(state?.riskState?.unwind_only ?? state?.riskState?.unwindOnly ?? false) : fallbackUnwindOnly;
const resumeConditions = hasCanonicalRiskState
  ? Array.isArray(state?.riskState?.resume_conditions)
    ? state.riskState.resume_conditions.map((condition) => String(condition))
    : Array.isArray(state?.riskState?.resumeConditions)
      ? state.riskState.resumeConditions.map((condition) => String(condition))
      : []
  : ["Best-effort risk state until T-005 canonical guardrails"];

const realized = safeNum(totals.realizedPnl, 0);
const fees = Math.max(0, safeNum(totals.feesHome, safeNum(totals.fees, 0)));
const openExposureCost = safeNum(totals.openExposureCost, 0);
const latestFillPriceBySymbol = new Map();
for (const order of orderHistory) {
  if (String(order?.status ?? "").toUpperCase() !== "FILLED") continue;
  const symbol = String(order?.symbol ?? "").trim().toUpperCase();
  const ts = Date.parse(String(order?.ts ?? ""));
  const price = safeNum(order?.price, NaN);
  if (!symbol || !Number.isFinite(ts) || !Number.isFinite(price) || price <= 0) continue;
  const prev = latestFillPriceBySymbol.get(symbol);
  if (!prev || ts > prev.ts) {
    latestFillPriceBySymbol.set(symbol, { ts, price });
  }
}

let openValueEstimate = 0;
for (const symbolStats of symbols) {
  const netQty = safeNum(symbolStats?.netQty, 0);
  if (netQty <= 0) continue;
  const symbol = String(symbolStats?.symbol ?? "").trim().toUpperCase();
  const latest = latestFillPriceBySymbol.get(symbol);
  const price = latest?.price ?? safeNum(symbolStats?.avgEntry, 0);
  if (!Number.isFinite(price) || price <= 0) continue;
  openValueEstimate += netQty * price;
}
const unrealized = openValueEstimate > 0 ? openValueEstimate - openExposureCost : 0;
const net = realized + unrealized - fees;

const adaptiveEvents = readJsonLinesTail("data/telemetry/adaptive-shadow.jsonl");
const walletTotals = adaptiveEvents
  .map((event) => safeNum(event?.risk?.walletTotalHome, NaN))
  .filter((value) => Number.isFinite(value) && value > 0);
const latestWalletTotalHome = walletTotals.length > 0 ? walletTotals[walletTotals.length - 1] : null;
let walletMaxDrawdownPct = 0;
if (walletTotals.length > 1) {
  let peak = walletTotals[0];
  for (const value of walletTotals) {
    if (value > peak) peak = value;
    if (peak <= 0) continue;
    const drawdown = ((peak - value) / peak) * 100;
    if (drawdown > walletMaxDrawdownPct) walletMaxDrawdownPct = drawdown;
  }
}

let guardMaxDrawdownPct = 0;
for (const decision of decisions) {
  const details = decision?.details && typeof decision.details === "object" ? decision.details : null;
  if (!details) continue;
  const dailyRealized = safeNum(details.dailyRealizedPnl, NaN);
  const peakDaily = safeNum(details.peakDailyRealizedPnl, NaN);
  if (!Number.isFinite(dailyRealized) || !Number.isFinite(peakDaily) || peakDaily <= 0) continue;
  const drawdown = ((peakDaily - dailyRealized) / peakDaily) * 100;
  if (drawdown > guardMaxDrawdownPct) guardMaxDrawdownPct = drawdown;
}

const equity =
  latestWalletTotalHome && latestWalletTotalHome > 0
    ? latestWalletTotalHome
    : Math.max(0, openExposureCost + Math.max(0, net));
const totalAllocPct = equity > 0 ? Math.max(0, Math.min(100, (openExposureCost / equity) * 100)) : 0;
const dailyNetPct = equity > 0 ? (net / equity) * 100 : 0;
const maxDrawdownPct = Math.max(walletMaxDrawdownPct, guardMaxDrawdownPct);

const bySymbolPct = symbols
  .filter((symbol) => safeNum(symbol?.openCost, 0) > 0)
  .map((symbol) => ({
    symbol: String(symbol?.symbol ?? ""),
    pct: equity > 0 ? Math.max(0, Math.min(100, (safeNum(symbol?.openCost, 0) / equity) * 100)) : 0
  }))
  .sort((left, right) => right.pct - left.pct)
  .slice(0, 20);

const largestPosition = bySymbolPct[0]
  ? {
      symbol: bySymbolPct[0].symbol,
      pct: bySymbolPct[0].pct
    }
  : undefined;

const walletPolicySnapshot = decisions.find((decision) => {
  if (decision?.kind !== "TRADE") return false;
  return decision?.details?.mode === "wallet-sweep";
});

const unmanagedExposurePct = safeNum(walletPolicySnapshot?.details?.unmanagedExposurePct, 0);

const submittedOrders = activeOrders.length + orderHistory.length;
const filledOrders = safeNum(totals.filledOrders, 0);
const rejectedOrders = orderHistory.filter((order) => String(order?.status ?? "").toUpperCase() === "REJECTED").length;
const canceledOrders = orderHistory.filter((order) => String(order?.status ?? "").toUpperCase() === "CANCELED").length;

const lockCounts = new Map();
for (const lock of locks) {
  const name = String(lock?.type ?? "UNKNOWN");
  lockCounts.set(name, (lockCounts.get(name) ?? 0) + 1);
}

const lockRows = [...lockCounts.entries()].map(([name, count]) => ({
  name,
  active: count > 0,
  count
}));

const aiDecisionCount = decisions.filter((decision) => decision?.kind === "AI").length;
const aiRejectReasons = decisions
  .filter((decision) => decision?.kind === "AI")
  .reduce((acc, decision) => {
    const reason = String(decision?.summary ?? "AI gate");
    acc.set(reason, (acc.get(reason) ?? 0) + 1);
    return acc;
  }, new Map());

const aiRejectReasonRows = [...aiRejectReasons.entries()].map(([reason, count]) => ({ reason, count }));
const orderRejectEvents = decisions.filter((decision) =>
  String(decision?.summary ?? "").toLowerCase().includes("order rejected")
).length;

const loopStalls = topSkipSummaries
  .filter((row) => safeNum(row?.count, 0) >= 3)
  .slice(0, 10)
  .map((row) => ({
    reason: String(row?.summary ?? "unknown"),
    count: safeNum(row?.count, 0)
  }));

const output = {
  schema_version: "1.0",
  run_id: runId,
  environment,
  exchange: "binance",
  started_at_utc: startedAt,
  ended_at_utc: endedAt,
  effective_config_hash: configHash,
  git: {
    commit,
    branch
  },
  sliders: {
    risk: riskSlider,
    ai: aiSlider
  },
  risk_state: {
    state: riskState,
    reason_codes: reasonCodes,
    unwind_only: unwindOnly,
    resume_conditions: resumeConditions
  },
  pnl: {
    equity_usdt: equity,
    realized_usdt: realized,
    unrealized_usdt: unrealized,
    fees_usdt: fees,
    net_usdt: net,
    daily_net_usdt: net,
    daily_net_pct: dailyNetPct,
    max_drawdown_pct: maxDrawdownPct
  },
  exposure: {
    total_alloc_pct: totalAllocPct,
    open_positions: safeNum(totals.openPositions, 0),
    unmanaged_exposure_pct: unmanagedExposurePct,
    ...(largestPosition ? { largest_position: largestPosition } : {}),
    by_symbol_pct: bySymbolPct
  },
  activity: {
    trades: {
      count: safeNum(totals.trades, 0),
      buys: safeNum(totals.buys, 0),
      sells: safeNum(totals.sells, 0)
    },
    orders: {
      submitted: submittedOrders,
      filled: filledOrders,
      rejected: rejectedOrders,
      canceled: canceledOrders
    },
    skips: {
      top_reasons: topSkipSummaries.slice(0, 15).map((row) => ({
        reason: String(row?.summary ?? "unknown"),
        count: safeNum(row?.count, 0)
      }))
    },
    locks: lockRows
  },
  ai: {
    enabled: Boolean(config?.basic?.aiEnabled),
    mode: config?.basic?.aiEnabled ? "SHADOW" : "OFF",
    calls: {
      total: aiDecisionCount,
      hourly_limit: 0
    },
    cache: {
      hit_rate_pct: 0,
      ttl_sec: 0
    },
    budget: {
      tokens_used: 0,
      tokens_limit: 0,
      over_budget: false,
      estimated_cost_usd: 0
    },
    signals: {
      accepted: 0,
      rejected: aiDecisionCount,
      reject_reasons: aiRejectReasonRows
    }
  },
  health: {
    errors: orderRejectEvents,
    warnings: safeNum(totals.skips, 0),
    restart_count: 0,
    loop_stalls: loopStalls
  }
};

fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
NODE

echo "Wrote $OUT_FILE"
