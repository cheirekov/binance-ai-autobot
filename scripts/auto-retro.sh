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
const { execFileSync } = require("node:child_process");

const [sessionFile, outputFile, bundleArg] = process.argv.slice(2);

const sessionRaw = fs.readFileSync(sessionFile, "utf8");
const ticketMatch = sessionRaw.match(/^- Active ticket:\s*`([^`]+)`/m);
const activeTicket = ticketMatch ? ticketMatch[1].trim() : "unknown";

const listBundles = () => {
  const entries = fs.readdirSync(process.cwd())
    .filter((name) => /^autobot-feedback-.*\.tgz$/.test(name))
    .sort((a, b) => {
      const aMtime = fs.statSync(a).mtimeMs;
      const bMtime = fs.statSync(b).mtimeMs;
      return bMtime - aMtime;
    });
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

const readFromBundle = (bundlePath, innerPath) => {
  try {
    return execFileSync("tar", ["-xOf", bundlePath, innerPath], {
      stdio: ["ignore", "pipe", "ignore"]
    }).toString("utf8");
  } catch {
    return null;
  }
};

const readSummary = (bundlePath) => {
  const candidates = [
    "./data/telemetry/last_run_summary.json",
    "data/telemetry/last_run_summary.json"
  ];
  for (const candidate of candidates) {
    const raw = readFromBundle(bundlePath, candidate);
    if (!raw) continue;
    try {
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
};

const bundles = listBundles();
if (bundles.length === 0) {
  console.error("No feedback bundles found for auto-retro.");
  process.exit(1);
}

const summaries = bundles
  .map((bundle) => ({ bundle, summary: readSummary(bundle) }))
  .filter((entry) => entry.summary);

if (summaries.length === 0) {
  console.error("No readable last_run_summary.json found in feedback bundles.");
  process.exit(1);
}

const latest = summaries[0];
const previous = summaries[1] ?? null;
const latestThree = summaries.slice(0, 3);

const topReasonOf = (summary) => summary?.activity?.skips?.top_reasons?.[0] ?? null;
const dailyNetOf = (summary) => Number(summary?.pnl?.daily_net_usdt ?? Number.NaN);
const drawdownOf = (summary) => Number(summary?.pnl?.max_drawdown_pct ?? Number.NaN);

const repeatedDominantLoop = (() => {
  if (!previous) return { failed: false, details: "not enough bundles" };
  const a = topReasonOf(latest.summary);
  const b = topReasonOf(previous.summary);
  const aReason = String(a?.reason ?? "");
  const bReason = String(b?.reason ?? "");
  const aCount = Number(a?.count ?? 0);
  const bCount = Number(b?.count ?? 0);
  const failed = Boolean(aReason && aReason === bReason && aCount >= 8 && bCount >= 8);
  return {
    failed,
    details: failed
      ? `"${aReason}" (${bCount} -> ${aCount})`
      : previous
        ? `${bReason || "n/a"} -> ${aReason || "n/a"}`
        : "not enough bundles"
  };
})();

const threeNegativeDailyNet = (() => {
  if (latestThree.length < 3) return { failed: false, details: "not enough bundles" };
  const values = latestThree.map((entry) => dailyNetOf(entry.summary));
  const failed = values.every((value) => Number.isFinite(value) && value < 0);
  return {
    failed,
    details: values.map((value) => Number.isFinite(value) ? value.toFixed(2) : "n/a").join(" | ")
  };
})();

const noTrendImprovement = (() => {
  if (latestThree.length < 3) return { failed: false, details: "not enough bundles" };
  const values = latestThree.map((entry) => dailyNetOf(entry.summary));
  const drawdowns = latestThree.map((entry) => drawdownOf(entry.summary));
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
const decision = triggers >= 2 ? "pivot_required" : triggers === 1 ? "patch_required" : "continue";

const latestTopReasons = (latest.summary?.activity?.skips?.top_reasons ?? []).slice(0, 5);
const lines = [
  "# Automatic Retrospective",
  "",
  `Last updated: ${new Date().toISOString()}`,
  `Active ticket: \`${activeTicket}\``,
  `Latest bundle: \`${latest.bundle}\``,
  `Review window: \`${summaries.length}\` local bundle(s)`,
  "",
  "## Hard rules",
  "",
  `- Repeated dominant loop across latest 2 bundles: \`${repeatedDominantLoop.failed ? "FAIL" : "PASS"}\` — ${repeatedDominantLoop.details}`,
  `- Negative daily_net_usdt across latest 3 bundles: \`${threeNegativeDailyNet.failed ? "FAIL" : "PASS"}\` — ${threeNegativeDailyNet.details}`,
  `- No KPI trend improvement across latest 3 bundles: \`${noTrendImprovement.failed ? "FAIL" : "PASS"}\` — ${noTrendImprovement.details}`,
  "",
  "## Latest bundle snapshot",
  "",
  `- Risk state: \`${String(latest.summary?.risk_state?.state ?? "unknown")}\``,
  `- Daily net: \`${Number.isFinite(dailyNetOf(latest.summary)) ? dailyNetOf(latest.summary).toFixed(2) : "n/a"}\``,
  `- Max drawdown: \`${Number.isFinite(drawdownOf(latest.summary)) ? drawdownOf(latest.summary).toFixed(2) : "n/a"}%\``,
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
  `- Required action: \`${decision === "continue" ? "continue active ticket" : decision === "patch_required" ? "same-ticket mitigation required before next long run" : "PM/BA pivot review required before next long run"}\``,
  "",
  "## Bundle window",
  "",
  ...summaries.map((entry, index) => {
    const summary = entry.summary;
    const top = topReasonOf(summary);
    return `- ${index + 1}. \`${entry.bundle}\` — dailyNet=${Number.isFinite(dailyNetOf(summary)) ? dailyNetOf(summary).toFixed(2) : "n/a"}, risk=${String(summary?.risk_state?.state ?? "unknown")}, top=${String(top?.reason ?? "n/a")} (${Number(top?.count ?? 0)})`;
  }),
  ""
];

fs.writeFileSync(outputFile, `${lines.join("\n")}\n`);

console.log(`Auto-retro updated: ${outputFile}`);
console.log(`Auto-retro decision=${decision}`);
console.log(`Auto-retro latestBundle=${latest.bundle}`);
NODE
