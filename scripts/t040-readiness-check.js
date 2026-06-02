#!/usr/bin/env node
const path = require("node:path");
const { collectEvidence, hasExchangeBackoffEvidence, listBundles } = require("./feedback-evidence");

const ROOT_DIR = path.resolve(__dirname, "..");

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const topReasons = (entry) => entry?.summary?.activity?.skips?.top_reasons ?? [];

const dailyNet = (entry) => asNumber(entry?.summary?.pnl?.daily_net_usdt, Number.NaN);

const rejectedOrderCount = (entry) => asNumber(entry?.summary?.activity?.orders?.rejected);

const resolveBundlePath = (bundlePath) =>
  path.isAbsolute(bundlePath) ? bundlePath : path.resolve(ROOT_DIR, bundlePath);

const formatMoney = (value) => Number.isFinite(value) ? value.toFixed(2) : "n/a";

const classifyReadiness = (evidence) => {
  const latest = evidence.latest;
  const summary = latest?.summary ?? {};
  const orders = summary.activity?.orders ?? {};
  const health = summary.health ?? {};
  const riskState = String(summary.risk_state?.state ?? "UNKNOWN");
  const rejectedOrders = asNumber(orders.rejected);
  const healthErrors = asNumber(health.errors);
  const restarts = asNumber(health.restart_count);
  const latestReasons = topReasons(latest);
  const topReasonText = latestReasons.map((reason) => `${reason.reason ?? ""} ${reason.count ?? ""}`).join(" ");
  const exchangeBackoff = hasExchangeBackoffEvidence(topReasonText);

  const latestThree = evidence.freshWindow
    .filter((entry) => entry.freshness?.hasFreshRuntimeEvidence)
    .slice(0, 3);
  const latestThreeDaily = latestThree.map(dailyNet);
  const rejectedWindows = latestThree.filter((entry) => rejectedOrderCount(entry) > 0);
  const totalRejectedRecent = latestThree.reduce((sum, entry) => sum + rejectedOrderCount(entry), 0);

  const p0p1Flags = [];
  if (healthErrors > 0) p0p1Flags.push(`health_errors=${healthErrors}`);
  if (restarts > 0) p0p1Flags.push(`restart_count=${restarts}`);
  if (rejectedOrders >= 3) p0p1Flags.push(`rejected_orders=${rejectedOrders}`);
  if (rejectedWindows.length >= 2) {
    p0p1Flags.push(`rejected_order_windows_3=${rejectedWindows.length};total_rejected_orders_3=${totalRejectedRecent}`);
  }
  if (exchangeBackoff) p0p1Flags.push("exchange_backoff_evidence");

  const negativeThree =
    latestThreeDaily.length === 3 &&
    latestThreeDaily.every((value) => Number.isFinite(value) && value < 0);

  const pressure = [];
  if (negativeThree) {
    pressure.push(`negative_daily_net_3=${latestThreeDaily.map(formatMoney).join("|")}`);
  }

  const classification = p0p1Flags.length > 0
    ? "PATCH_ALLOWED_REVIEW"
    : pressure.length > 0
      ? "VALIDATION_REQUIRED"
      : "CONTINUE_READINESS";

  return {
    classification,
    latestBundle: latest.bundle,
    riskState,
    dailyNet: dailyNet(latest),
    maxDrawdownPct: asNumber(summary.pnl?.max_drawdown_pct, Number.NaN),
    totalAllocPct: asNumber(summary.exposure?.total_alloc_pct, Number.NaN),
    openPositions: asNumber(summary.exposure?.open_positions, Number.NaN),
    rejectedOrders,
    healthErrors,
    restarts,
    p0p1Flags,
    validationPressure: pressure,
    topReason: latestReasons[0]?.reason ?? "n/a"
  };
};

const main = () => {
  const bundles = process.argv.slice(2).filter(Boolean);
  const bundlePaths = bundles.length > 0
    ? bundles.map(resolveBundlePath)
    : listBundles(ROOT_DIR).slice(0, 5).map((bundle) => path.join(ROOT_DIR, bundle));
  const evidence = collectEvidence(bundlePaths);
  const result = classifyReadiness(evidence);

  console.log(`T-040 readiness classification: ${result.classification}`);
  console.log(`- latestBundle=${result.latestBundle}`);
  console.log(`- riskState=${result.riskState}`);
  console.log(`- dailyNet=${formatMoney(result.dailyNet)}`);
  console.log(`- maxDrawdownPct=${Number.isFinite(result.maxDrawdownPct) ? result.maxDrawdownPct.toFixed(2) : "n/a"}`);
  console.log(`- totalAllocPct=${Number.isFinite(result.totalAllocPct) ? result.totalAllocPct.toFixed(2) : "n/a"}`);
  console.log(`- rejectedOrders=${result.rejectedOrders}`);
  console.log(`- healthErrors=${result.healthErrors}`);
  console.log(`- restarts=${result.restarts}`);
  console.log(`- topReason=${result.topReason}`);
  if (result.validationPressure.length > 0) {
    console.log(`- validationPressure=${result.validationPressure.join(",")}`);
  }
  if (result.p0p1Flags.length > 0) {
    console.error(`- p0p1Flags=${result.p0p1Flags.join(",")}`);
    process.exit(1);
  }
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || String(error));
    process.exit(1);
  }
}

module.exports = { classifyReadiness };
