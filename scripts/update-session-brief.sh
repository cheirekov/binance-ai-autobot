#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SESSION_FILE="docs/SESSION_BRIEF.md"
RETRO_FILE="docs/RETROSPECTIVE_AUTO.md"

if [[ ! -f "$SESSION_FILE" ]]; then
  echo "Missing $SESSION_FILE" >&2
  exit 1
fi

BUNDLE="${1:-}"
if [[ -z "$BUNDLE" ]]; then
  BUNDLE="$(find . -maxdepth 1 -type f -name 'autobot-feedback-*.tgz' -printf '%f\n' | sort | tail -n1 || true)"
fi

if [[ -z "$BUNDLE" || ! -f "$BUNDLE" ]]; then
  echo "Feedback bundle not found. Provide path or run ./scripts/collect-feedback.sh first." >&2
  exit 1
fi

PREVIOUS_BUNDLE="$(find . -maxdepth 1 -type f -name 'autobot-feedback-*.tgz' -printf '%f\n' | grep -Fxv "$BUNDLE" | sort | tail -n1 || true)"

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

tar -xzf "$BUNDLE" -C "$TMP_DIR"

STATE_SUMMARY_PATH="$TMP_DIR/meta/state-summary.txt"
STATE_PATH="$TMP_DIR/data/state.json"
KPI_PATH="$TMP_DIR/data/telemetry/baseline-kpis.json"
SUMMARY_PATH="$TMP_DIR/data/telemetry/last_run_summary.json"
RUN_CONTEXT_PATH="$TMP_DIR/meta/run-context.json"

node - "$SESSION_FILE" "$RETRO_FILE" "$BUNDLE" "$PREVIOUS_BUNDLE" "$STATE_SUMMARY_PATH" "$STATE_PATH" "$KPI_PATH" "$SUMMARY_PATH" "$RUN_CONTEXT_PATH" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const [sessionFile, retroFile, bundlePath, previousBundlePath, stateSummaryPath, statePath, kpiPath, summaryPath, runContextPath] = process.argv.slice(2);

const readJson = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const stateSummary = readJson(stateSummaryPath) ?? {};
const state = readJson(statePath) ?? {};
const kpis = readJson(kpiPath) ?? {};
const bundleSummary = readJson(summaryPath) ?? {};
const runContext = readJson(runContextPath) ?? {};
const sessionRaw = fs.readFileSync(sessionFile, "utf8");
const retroRaw = fs.existsSync(retroFile) ? fs.readFileSync(retroFile, "utf8") : "";
const { collectEvidence } = require(path.join(process.cwd(), "scripts", "feedback-evidence.js"));
const safeExec = (cmd) => {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString("utf8").trim();
  } catch {
    return "";
  }
};
const evidence = (() => {
  try {
    const args = previousBundlePath ? [bundlePath, previousBundlePath] : [bundlePath];
    return collectEvidence(args);
  } catch {
    return null;
  }
})();
const latestEvidence = evidence?.latest ?? null;
const previousEvidence = Array.isArray(evidence?.entries) ? evidence.entries[1] ?? null : null;
const freshnessClass = latestEvidence?.freshness?.classification ?? "unknown";
const freshRuntimeEvidence = Boolean(latestEvidence?.freshness?.hasFreshRuntimeEvidence ?? true);
const staleStreak = Number(evidence?.staleStreak ?? 0);
const bundleIntervalHours = (() => {
  const latestEnded = Date.parse(String(latestEvidence?.summary?.ended_at_utc ?? ""));
  const previousEnded = Date.parse(String(previousEvidence?.summary?.ended_at_utc ?? ""));
  if (!Number.isFinite(latestEnded) || !Number.isFinite(previousEnded) || latestEnded < previousEnded) return null;
  return Number(((latestEnded - previousEnded) / 36e5).toFixed(3));
})();
const retroLatestBundleMatch = retroRaw.match(/^Latest bundle: `([^`]+)`$/m);
const retroDecisionMatch = retroRaw.match(/^- Decision: `([^`]+)`$/m);
const retroActionMatch = retroRaw.match(/^- Required action: `([^`]+)`$/m);
const retroStaleStreakMatch = retroRaw.match(/^- Stale bundle streak: `([^`]+)`$/m);
const retroLatestBundle = retroLatestBundleMatch ? retroLatestBundleMatch[1].trim() : "";
const retroDecision = retroLatestBundle === path.basename(bundlePath) && retroDecisionMatch
  ? retroDecisionMatch[1].trim()
  : "";
const retroRequiredAction = retroLatestBundle === path.basename(bundlePath) && retroActionMatch
  ? retroActionMatch[1].trim()
  : "";
const retroStaleStreak = retroLatestBundle === path.basename(bundlePath) && retroStaleStreakMatch
  ? Number(retroStaleStreakMatch[1].trim())
  : Number.NaN;
const displayedStaleStreak = Number.isFinite(retroStaleStreak) ? retroStaleStreak : staleStreak;

const activeOrders = Array.isArray(state.activeOrders) ? state.activeOrders : [];
const historyOrders = Array.isArray(state.orderHistory) ? state.orderHistory : [];

const activeLimitOrders = Number.isFinite(stateSummary.openLimitOrders)
  ? stateSummary.openLimitOrders
  : activeOrders.filter((order) => String(order?.type ?? "").toUpperCase().startsWith("LIMIT")).length;
const activeMarketOrders = Number.isFinite(stateSummary.openMarketOrders)
  ? stateSummary.openMarketOrders
  : activeOrders.filter((order) => String(order?.type ?? "").toUpperCase() === "MARKET").length;

let historyLimitOrders = 0;
let historyMarketOrders = 0;
for (const order of historyOrders) {
  const type = String(order?.type ?? "").toUpperCase();
  if (type.startsWith("LIMIT")) {
    historyLimitOrders += 1;
  } else if (type === "MARKET") {
    historyMarketOrders += 1;
  }
}

const limitLifecycleObserved = activeLimitOrders > 0 || historyLimitOrders > 0;

const historyOrderCount = historyLimitOrders + historyMarketOrders;
const marketOrderShare = historyOrderCount > 0
  ? (historyMarketOrders / historyOrderCount) * 100
  : null;
const marketOnlyReduced = historyLimitOrders > 0;

const totals = kpis.totals ?? {};
let decisions = Number.isFinite(stateSummary.decisions)
  ? stateSummary.decisions
  : (Number.isFinite(totals.decisions) ? totals.decisions : 0);

let sizingRejectSkips = Number.isFinite(totals.sizingRejectSkips) ? totals.sizingRejectSkips : 0;
if (!sizingRejectSkips && Array.isArray(kpis.topSkipSummaries)) {
  const rejectPattern = /(sizing filter|notional|lot_size|min_notional|percent_price|too_small|too_big)/i;
  sizingRejectSkips = kpis.topSkipSummaries
    .filter((entry) => rejectPattern.test(String(entry?.summary ?? "")))
    .reduce((sum, entry) => sum + (Number(entry?.count ?? 0) || 0), 0);
}

if (!decisions) {
  const trades = Number.isFinite(stateSummary.trades) ? stateSummary.trades : (Number.isFinite(totals.trades) ? totals.trades : 0);
  const skips = Number.isFinite(stateSummary.skips) ? stateSummary.skips : (Number.isFinite(totals.skips) ? totals.skips : 0);
  decisions = trades + skips;
}

const sizingRejectRatio = decisions > 0 ? sizingRejectSkips / decisions : 0;
let sizingRejectPressure = "low";
if (sizingRejectRatio >= 0.25) {
  sizingRejectPressure = "high";
} else if (sizingRejectRatio >= 0.1) {
  sizingRejectPressure = "medium";
}

const activeTicketMatch = sessionRaw.match(/^- Active ticket:\s*`([^`]+)`/m);
const activeTicket = activeTicketMatch ? activeTicketMatch[1].trim() : "T-029";
const dominantTopReason = Array.isArray(bundleSummary?.activity?.skips?.top_reasons)
  ? bundleSummary.activity.skips.top_reasons[0] ?? null
  : null;
const fundingRegression = Array.isArray(bundleSummary?.activity?.skips?.top_reasons)
  ? bundleSummary.activity.skips.top_reasons.some((entry) => /Insufficient spendable/i.test(String(entry?.reason ?? "")))
  : false;
const mapNextTicket = (decision) => {
  if (decision === "pivot_required") return "PM/BA-TRIAGE";
  if (decision === "validation_required") return "PM/BA-VALIDATION";
  return activeTicket;
};
const decision = retroDecision || "pending_auto_retro";
const nextTicket = mapNextTicket(decision);

const conversionTrades = Number.isFinite(totals.conversions) ? totals.conversions : 0;
const totalTrades = Number.isFinite(totals.trades) ? totals.trades : 0;
const conversionShare = totalTrades > 0 ? (conversionTrades / totalTrades) * 100 : 0;

const risks = [];
if (!limitLifecycleObserved) {
  risks.push("no observed LIMIT order lifecycle in this bundle.");
}
if (sizingRejectPressure !== "low") {
  risks.push(`sizing reject pressure is ${sizingRejectPressure} (${(sizingRejectRatio * 100).toFixed(1)}%).`);
}
if (conversionShare >= 70) {
  risks.push(`conversion-heavy flow remains high (${conversionShare.toFixed(1)}% of trades).`);
}
if (!freshRuntimeEvidence) {
  risks.push(`latest bundle has no fresh runtime evidence (${freshnessClass}); do not patch from cumulative history alone.`);
}
if (fundingRegression) {
  risks.push("T-034 funding regression detected in latest top skip reasons.");
}
if (risks.length === 0) {
  risks.push("none critical from automated checks.");
}

const dodStatus = [
  {
    label: "fresh runtime evidence",
    value: freshRuntimeEvidence ? "met" : "not met",
    note: `class=${freshnessClass}, staleStreak=${displayedStaleStreak}`
  },
  {
    label: "funding regression absent",
    value: freshRuntimeEvidence ? (fundingRegression ? "not met" : "met") : "not measured",
    note: fundingRegression ? "dominant/top skip reasons include Insufficient spendable" : "no dominant funding regression in latest top skips"
  },
  {
    label: "active ticket runtime signal",
    value: freshRuntimeEvidence ? (dominantTopReason ? "observed" : "not measured") : "not measured",
    note: dominantTopReason ? `${String(dominantTopReason.reason ?? "unknown")} (${Number(dominantTopReason.count ?? 0)})` : "no dominant skip reason available"
  }
];

const now = new Date();
const nowIso = now.toISOString();
const nowPretty = `${nowIso.slice(0, 16).replace("T", " ")} UTC`;
const contextSummary =
  runContext.collection_window_local || runContext.run_end_window_local
    ? `${String(runContext.collection_window_local ?? "unknown")} (collection) / ${String(runContext.run_end_window_local ?? "unknown")} (run end)`
    : "unknown";
const promptLines = (() => {
  const base = [
    `Ticket: ${activeTicket}`,
    `Decision: ${decision}`,
    `Required action: ${retroRequiredAction || "run auto-retro before trusting this bundle"}`,
    `Latest bundle: ${path.basename(bundlePath)}`,
    `Fresh runtime evidence: ${freshRuntimeEvidence ? "yes" : "no"} (${freshnessClass})`
  ];
  if (decision === "validation_required" || decision === "await_fresh_evidence") {
    return [
      ...base,
      "Do not patch from this bundle alone.",
      "Use deterministic validation or wait for a fresh runtime-evidence bundle before changing runtime code.",
      "Keep active ticket scope unchanged unless PM/BA explicitly pivots."
    ];
  }
  return [
    ...base,
    "Goal: reduce profit giveback and improve downside control while preserving T-034 funding stability.",
    "In scope: exit-manager / de-risking behavior under adverse conditions.",
    "Out of scope: quote-routing redesign, candidate-hygiene-only optimization, PnL schema changes, AI lane.",
    "Validation: docker compose -f docker-compose.ci.yml run --rm ci",
    "After patch: update docs/DELIVERY_BOARD.md, docs/PM_BA_CHANGELOG.md, docs/SESSION_BRIEF.md."
  ];
})();
const block = [
  "## 4) End-of-batch result (fill after run)",
  "",
  "- Run context:",
  `  - window (local): \`${contextSummary}\``,
  `  - timezone: \`${String(runContext.timezone_local ?? "unknown")}\``,
  `  - bundle interval (hours): \`${bundleIntervalHours ?? "unknown"}\``,
  `  - runtime uptime (hours): \`${runContext.run_duration_hours ?? "unknown"}\``,
  `  - run end: \`${String(runContext.run_end_local ?? runContext.run_ended_at_utc ?? "unknown")}\``,
  `  - declared cycle: \`${String(runContext.declared_cycle ?? "auto")}\``,
  `  - cycle source: \`${String(runContext.declared_cycle_source ?? "unknown")}\``,
  "- Definition of Done status:",
  ...dodStatus.map((item) => `  - ${item.label}: \`${item.value}\` (${item.note})`),
  "- Observed KPI delta:",
  `  - open LIMIT lifecycle observed: \`${limitLifecycleObserved ? "yes" : "no"}\` (openLimitOrders=${activeLimitOrders}, historyLimitOrders=${historyLimitOrders}, activeMarketOrders=${activeMarketOrders})`,
  `  - market-only share reduced: \`${marketOnlyReduced ? "yes" : "no"}\`${marketOrderShare === null ? "" : ` (historyMarketShare=${marketOrderShare.toFixed(1)}%)`}`,
  `  - sizing reject pressure: \`${sizingRejectPressure}\` (sizingRejectSkips=${sizingRejectSkips}, decisions=${decisions}, ratio=${(sizingRejectRatio * 100).toFixed(1)}%)`,
  `  - fresh runtime evidence: \`${freshRuntimeEvidence ? "yes" : "no"}\` (class=${freshnessClass})`,
  `- Decision: \`${decision}\``,
  `- Next ticket candidate: \`${nextTicket}\`${decision === "continue" || decision === "patch_required" || decision === "await_fresh_evidence" ? " (continue active lane unless PM/BA reprioritizes)" : decision === "validation_required" ? " (stop live-wait loop and use deterministic validation)" : " (triage required before lane change)"}`,
  `- Required action: \`${retroRequiredAction || "run auto-retro before trusting this section"}\``,
  "- Open risks:",
  ...risks.map((risk) => `  - ${risk}`),
  "- Notes for next session:",
  `  - bundle: \`${bundlePath}\``,
  `  - auto-updated at: \`${nowIso}\``
].join("\n");
const promptBlock = [
  "## 5) Copy/paste prompt for next session",
  "",
  "```text",
  ...promptLines,
  "```",
  ""
].join("\n");

const sectionPattern = /## 4\) End-of-batch result \((?:fill after run|latest reference run)\)[\s\S]*?(?=## 5\) Copy\/paste prompt for next session)/m;
if (!sectionPattern.test(sessionRaw)) {
  console.error("Could not find Section 4 in docs/SESSION_BRIEF.md");
  process.exit(1);
}

const withSection = sessionRaw.replace(sectionPattern, `${block}\n\n`);
const promptPattern = /## 5\) Copy\/paste prompt for next session[\s\S]*$/m;
const withPrompt = promptPattern.test(withSection)
  ? withSection.replace(promptPattern, promptBlock)
  : `${withSection.trimEnd()}\n\n${promptBlock}`;
const withUpdatedAtPrompt = withPrompt.replace(
  /^Last updated:.*$/m,
  `Last updated: ${nowPretty}`
);
const commitHash = String(bundleSummary?.git?.commit ?? "").trim() || safeExec("git rev-parse --short HEAD") || "unknown";
const withCommit = withUpdatedAtPrompt.replace(
  /^- Commit hash:.*$/m,
  `- Commit hash: \`${commitHash}\``
);
fs.writeFileSync(sessionFile, withCommit);

console.log(`Updated ${sessionFile} from ${bundlePath}`);
console.log(`Decision=${decision}, nextTicket=${nextTicket}, sizingRejectPressure=${sizingRejectPressure}`);
NODE
