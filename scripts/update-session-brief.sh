#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SESSION_FILE="docs/SESSION_BRIEF.md"

if [[ ! -f "$SESSION_FILE" ]]; then
  echo "Missing $SESSION_FILE" >&2
  exit 1
fi

BUNDLE="${1:-}"
if [[ -z "$BUNDLE" ]]; then
  BUNDLE="$(ls -t autobot-feedback-*.tgz 2>/dev/null | head -n1 || true)"
fi

if [[ -z "$BUNDLE" || ! -f "$BUNDLE" ]]; then
  echo "Feedback bundle not found. Provide path or run ./scripts/collect-feedback.sh first." >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

tar -xzf "$BUNDLE" -C "$TMP_DIR"

STATE_SUMMARY_PATH="$TMP_DIR/meta/state-summary.txt"
STATE_PATH="$TMP_DIR/data/state.json"
KPI_PATH="$TMP_DIR/data/telemetry/baseline-kpis.json"

node - "$SESSION_FILE" "$BUNDLE" "$STATE_SUMMARY_PATH" "$STATE_PATH" "$KPI_PATH" <<'NODE'
const fs = require("node:fs");

const [sessionFile, bundlePath, stateSummaryPath, statePath, kpiPath] = process.argv.slice(2);

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
const sessionRaw = fs.readFileSync(sessionFile, "utf8");

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

let decision = "continue";
if (!limitLifecycleObserved || sizingRejectPressure === "high") {
  decision = "pivot";
}
const activeTicketMatch = sessionRaw.match(/^- Active ticket:\s*`([^`]+)`/m);
const activeTicket = activeTicketMatch ? activeTicketMatch[1].trim() : "T-029";
const nextTicket = decision === "continue" ? activeTicket : "PM/BA-TRIAGE";

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
if (risks.length === 0) {
  risks.push("none critical from automated checks.");
}

const now = new Date();
const nowIso = now.toISOString();
const nowPretty = `${nowIso.slice(0, 16).replace("T", " ")} UTC`;
const block = [
  "## 4) End-of-batch result (fill after run)",
  "",
  "- Observed KPI delta:",
  `  - open LIMIT lifecycle observed: \`${limitLifecycleObserved ? "yes" : "no"}\` (openLimitOrders=${activeLimitOrders}, historyLimitOrders=${historyLimitOrders}, activeMarketOrders=${activeMarketOrders})`,
  `  - market-only share reduced: \`${marketOnlyReduced ? "yes" : "no"}\`${marketOrderShare === null ? "" : ` (historyMarketShare=${marketOrderShare.toFixed(1)}%)`}`,
  `  - sizing reject pressure: \`${sizingRejectPressure}\` (sizingRejectSkips=${sizingRejectSkips}, decisions=${decisions}, ratio=${(sizingRejectRatio * 100).toFixed(1)}%)`,
  `- Decision: \`${decision}\``,
  `- Next ticket candidate: \`${nextTicket}\`${decision === "continue" ? " (continue active lane unless PM/BA reprioritizes)" : " (triage required before lane change)"}`,
  "- Open risks:",
  ...risks.map((risk) => `  - ${risk}`),
  "- Notes for next session:",
  `  - bundle: \`${bundlePath}\``,
  `  - auto-updated at: \`${nowIso}\``
].join("\n");

const sectionPattern = /## 4\) End-of-batch result \(fill after run\)[\s\S]*?(?=## 5\) Copy\/paste prompt for next session)/m;
if (!sectionPattern.test(sessionRaw)) {
  console.error("Could not find Section 4 in docs/SESSION_BRIEF.md");
  process.exit(1);
}

const withSection = sessionRaw.replace(sectionPattern, `${block}\n\n`);
const withUpdatedAt = withSection.replace(
  /^Last updated:.*$/m,
  `Last updated: ${nowPretty}`
);
fs.writeFileSync(sessionFile, withUpdatedAt);

console.log(`Updated ${sessionFile} from ${bundlePath}`);
console.log(`Decision=${decision}, nextTicket=${nextTicket}, sizingRejectPressure=${sizingRejectPressure}`);
NODE
