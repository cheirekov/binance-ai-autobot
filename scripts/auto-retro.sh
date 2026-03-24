#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SESSION_FILE="docs/SESSION_BRIEF.md"
OUTPUT_FILE="docs/RETROSPECTIVE_AUTO.md"

BUNDLE_ARG="${1:-}"

if [[ ! -f "$SESSION_FILE" ]]; then
  echo "Missing $SESSION_FILE" >&2
  exit 1
fi

node - "$SESSION_FILE" "$OUTPUT_FILE" "$BUNDLE_ARG" <<'NODE'
const fs = require("node:fs");
const path = require("node:path");

const [sessionFile, outputFile, bundleArg] = process.argv.slice(2);
const { collectEvidence, listBundles } = require(path.join(process.cwd(), "scripts", "feedback-evidence.js"));

const sessionRaw = fs.readFileSync(sessionFile, "utf8");
const ticketMatch = sessionRaw.match(/^- Active ticket:\s*`([^`]+)`/m);
const activeTicket = ticketMatch ? ticketMatch[1].trim() : "unknown";

const resolveBundles = () => {
  const entries = listBundles();
  if (bundleArg) {
    const resolved = path.basename(bundleArg);
    if (!entries.includes(resolved) && fs.existsSync(bundleArg)) {
      entries.unshift(bundleArg);
    } else if (entries.includes(resolved)) {
      entries.splice(entries.indexOf(resolved), 1);
      entries.unshift(resolved);
    }
  }
  return entries.slice(0, 5);
};

const bundles = resolveBundles();
if (bundles.length === 0) {
  console.error("No feedback bundles found for auto-retro.");
  process.exit(1);
}

const evidence = collectEvidence(bundles);

const summaries = evidence.entries ?? [];
const latest = evidence.latest;
const freshWindow = evidence.freshWindow ?? [];
if (!latest || summaries.length === 0) {
  console.error("No readable bundle evidence found for auto-retro.");
  process.exit(1);
}
const staleStreak = Number(evidence.staleStreak ?? 0);
const previous = summaries[1] ?? null;
const latestFreshThree = freshWindow.slice(0, 3);

const topReasonOf = (entry) => entry?.summary?.activity?.skips?.top_reasons?.[0] ?? null;
const dailyNetOf = (entry) => Number(entry?.summary?.pnl?.daily_net_usdt ?? Number.NaN);
const drawdownOf = (entry) => Number(entry?.summary?.pnl?.max_drawdown_pct ?? Number.NaN);

const repeatedDominantLoop = (() => {
  const recentFresh = freshWindow.slice(0, 2);
  if (recentFresh.length < 2) return { failed: false, details: "not enough fresh bundles" };
  const a = topReasonOf(recentFresh[0]);
  const b = topReasonOf(recentFresh[1]);
  const aReason = String(a?.reason ?? "");
  const bReason = String(b?.reason ?? "");
  const aCount = Number(a?.count ?? 0);
  const bCount = Number(b?.count ?? 0);
  const failed = Boolean(aReason && aReason === bReason && aCount >= 8 && bCount >= 8);
  return {
    failed,
    details: failed
      ? `"${aReason}" (${bCount} -> ${aCount})`
      : recentFresh[1]
        ? `${bReason || "n/a"} -> ${aReason || "n/a"}`
        : "not enough fresh bundles"
  };
})();

const threeNegativeDailyNet = (() => {
  if (latestFreshThree.length < 3) return { failed: false, details: "not enough fresh bundles" };
  const values = latestFreshThree.map((entry) => dailyNetOf(entry));
  const failed = values.every((value) => Number.isFinite(value) && value < 0);
  return {
    failed,
    details: values.map((value) => Number.isFinite(value) ? value.toFixed(2) : "n/a").join(" | ")
  };
})();

const noTrendImprovement = (() => {
  if (latestFreshThree.length < 3) return { failed: false, details: "not enough fresh bundles" };
  const values = latestFreshThree.map((entry) => dailyNetOf(entry));
  const drawdowns = latestFreshThree.map((entry) => drawdownOf(entry));
  const monotonicNonImproving =
    values.every((value) => Number.isFinite(value)) &&
    values[0] <= values[1] + 1e-9 &&
    values[1] <= values[2] + 1e-9;
  const drawdownNonImproving =
    drawdowns.every((value) => Number.isFinite(value)) &&
    drawdowns[0] >= drawdowns[1] - 1e-9 &&
    drawdowns[1] >= drawdowns[2] - 1e-9;
  const failed = monotonicNonImproving && drawdownNonImproving;
  return {
    failed,
    details: `daily=${values.map((value) => Number.isFinite(value) ? value.toFixed(2) : "n/a").join(" | ")} ; maxDD=${drawdowns.map((value) => Number.isFinite(value) ? value.toFixed(2) : "n/a").join(" | ")}`
  };
})();

const triggers = [repeatedDominantLoop, threeNegativeDailyNet, noTrendImprovement].filter((item) => item.failed).length;
const decision =
  staleStreak >= 2
    ? "validation_required"
    : !latest.freshness?.hasFreshRuntimeEvidence
      ? "await_fresh_evidence"
      : triggers >= 2
        ? "pivot_required"
        : triggers === 1
          ? "patch_required"
          : "continue";

const latestTopReasons = (latest.summary?.activity?.skips?.top_reasons ?? []).slice(0, 5);
const lines = [
  "# Automatic Retrospective",
  "",
  `Last updated: ${new Date().toISOString()}`,
  `Active ticket: \`${activeTicket}\``,
  `Latest bundle: \`${latest.bundle}\``,
  `Review window: \`${freshWindow.length}\` fresh/baseline bundle(s) out of \`${summaries.length}\` local bundle(s)`,
  "",
  "## Hard rules",
  "",
  `- Fresh runtime evidence in latest bundle: \`${latest.freshness?.hasFreshRuntimeEvidence ? "PASS" : "FAIL"}\` — ${latest.freshness?.reason ?? "unknown"}`,
  `- Repeated dominant loop across latest 2 fresh bundles: \`${repeatedDominantLoop.failed ? "FAIL" : "PASS"}\` — ${repeatedDominantLoop.details}`,
  `- Negative daily_net_usdt across latest 3 fresh bundles: \`${threeNegativeDailyNet.failed ? "FAIL" : "PASS"}\` — ${threeNegativeDailyNet.details}`,
  `- No KPI trend improvement across latest 3 fresh bundles: \`${noTrendImprovement.failed ? "FAIL" : "PASS"}\` — ${noTrendImprovement.details}`,
  "",
  "## Latest bundle snapshot",
  "",
  `- Freshness class: \`${String(latest.freshness?.classification ?? "unknown")}\``,
  `- Stale bundle streak: \`${staleStreak}\``,
  `- Risk state: \`${String(latest.summary?.risk_state?.state ?? "unknown")}\``,
  `- Daily net: \`${Number.isFinite(dailyNetOf(latest)) ? dailyNetOf(latest).toFixed(2) : "n/a"}\``,
  `- Max drawdown: \`${Number.isFinite(drawdownOf(latest)) ? drawdownOf(latest).toFixed(2) : "n/a"}%\``,
  `- Open positions: \`${String(latest.summary?.exposure?.open_positions ?? "n/a")}\``,
  `- Total alloc pct: \`${Number.isFinite(Number(latest.summary?.exposure?.total_alloc_pct)) ? Number(latest.summary.exposure.total_alloc_pct).toFixed(2) : "n/a"}\``,
  "",
  "## Top skip reasons (latest bundle)",
  "",
  ...latestTopReasons.map((entry) => `- ${String(entry?.reason ?? "unknown")} (${Number(entry?.count ?? 0)})`),
  "",
  "## PM/BA automatic decision",
  "",
  `- Decision: \`${decision}\``,
  `- Required action: \`${decision === "continue"
    ? "continue active ticket"
    : decision === "patch_required"
      ? "same-ticket mitigation required before next long run"
      : decision === "pivot_required"
        ? "PM/BA pivot review required before next long run"
        : decision === "await_fresh_evidence"
          ? "do not patch from this bundle alone; wait for fresh runtime evidence"
          : "switch to deterministic validation path before more live-wait bundles"}\``,
  "",
  "## Bundle window",
  "",
  ...summaries.map((entry, index) => {
    const top = topReasonOf(entry);
    return `- ${index + 1}. \`${entry.bundle}\` — class=${String(entry.freshness?.classification ?? "unknown")}, dailyNet=${Number.isFinite(dailyNetOf(entry)) ? dailyNetOf(entry).toFixed(2) : "n/a"}, risk=${String(entry.summary?.risk_state?.state ?? "unknown")}, top=${String(top?.reason ?? "n/a")} (${Number(top?.count ?? 0)})`;
  }),
  ""
];

fs.writeFileSync(outputFile, `${lines.join("\n")}\n`);

console.log(`Auto-retro updated: ${outputFile}`);
console.log(`Auto-retro decision=${decision}`);
console.log(`Auto-retro latestBundle=${latest.bundle}`);
NODE
