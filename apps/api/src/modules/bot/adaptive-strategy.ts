import type { UniverseCandidate } from "@autobot/shared";

export type AdaptiveStrategy = "TREND" | "MEAN_REVERSION" | "GRID";
export type AdaptiveRegime = "BULL_TREND" | "BEAR_TREND" | "RANGE" | "NEUTRAL" | "UNKNOWN";

export type AdaptiveStrategyScores = {
  trend: number;
  meanReversion: number;
  grid: number;
  recommended: AdaptiveStrategy;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const rounded = (value: number): number => Number(value.toFixed(4));

export function scoreAdaptiveStrategy(
  candidate: UniverseCandidate | null,
  regime: AdaptiveRegime
): AdaptiveStrategyScores {
  const adx = Number.isFinite(candidate?.adx14) ? Math.max(0, candidate?.adx14 ?? 0) : 0;
  const rsi = Number.isFinite(candidate?.rsi14) ? Math.max(0, Math.min(100, candidate?.rsi14 ?? 50)) : 50;
  const atr = Number.isFinite(candidate?.atrPct14) ? Math.max(0, candidate?.atrPct14 ?? 0) : 0;
  const change = Number.isFinite(candidate?.priceChangePct24h) ? candidate?.priceChangePct24h ?? 0 : 0;
  const donchian = Number.isFinite(candidate?.donchianBreakoutPct20) ? candidate?.donchianBreakoutPct20 ?? 0 : 0;
  const bandPosition = Number.isFinite(candidate?.bollingerPosition20) ? candidate?.bollingerPosition20 ?? 0.5 : 0.5;
  const bandWidth = Number.isFinite(candidate?.bollingerWidthPct20) ? Math.max(0, candidate?.bollingerWidthPct20 ?? 0) : 0;
  const emaSpread = Number.isFinite(candidate?.emaTrendSpreadPct) ? candidate?.emaTrendSpreadPct ?? 0 : 0;
  const rangeCycle = Number.isFinite(candidate?.rangeCycleScore20)
    ? clamp01(candidate?.rangeCycleScore20 ?? 0)
    : 0;

  const trendStrength = clamp01(adx / 45);
  const bullishChange = clamp01(Math.max(0, change) / 8);
  const bullishBreakout = clamp01(Math.max(0, donchian) / 1.5);
  const bullishEma = clamp01(Math.max(0, emaSpread) / 1.2);
  const bearishBreakdown = clamp01(Math.max(0, -donchian) / 1.5);
  const bearishEma = clamp01(Math.max(0, -emaSpread) / 1.2);
  const bearishChange = clamp01(Math.max(0, -change) / 8);
  const bearishPressure = Math.max(bearishBreakdown, bearishEma, bearishChange);
  const oversold = clamp01((35 - rsi) / 20);
  const lowerBand = clamp01((0.3 - bandPosition) / 0.3);
  const weakTrend = clamp01(1 - adx / 45);
  const neutralBand = clamp01(1 - Math.abs(bandPosition - 0.5) * 2);
  const moderateAtr = atr > 0 ? clamp01(1 - Math.abs(atr - 1) / 2.5) : 0;
  const moderateBandWidth = bandWidth > 0 ? clamp01(1 - Math.abs(bandWidth - 2.2) / 3.2) : 0;
  const trendRsiFit = clamp01(1 - Math.abs(rsi - 58) / 30);

  let trend = clamp01(
    trendStrength * 0.25 +
      bullishEma * 0.35 +
      bullishBreakout * 0.25 +
      bullishChange * 0.1 +
      trendRsiFit * 0.05
  );
  let meanReversion = clamp01(
    0.06 + oversold * 0.42 + lowerBand * 0.32 + weakTrend * 0.1 + moderateAtr * 0.1
  );
  let grid = clamp01(
    (regime === "RANGE" ? 0.42 : 0.12) +
      rangeCycle * 0.28 +
      weakTrend * 0.1 +
      neutralBand * 0.1 +
      moderateBandWidth * 0.1
  );

  // Long-only spot entries must not interpret downside momentum as positive evidence.
  trend = clamp01(trend * (1 - bearishPressure * 0.75));
  if (bearishPressure >= 0.45 && oversold < 0.25) meanReversion = clamp01(meanReversion * 0.6);
  grid = clamp01(grid * (1 - bearishPressure * 0.25));

  if (regime === "BULL_TREND") {
    trend = clamp01(trend + 0.08);
  } else if (regime === "BEAR_TREND") {
    trend = clamp01(trend * 0.35);
    meanReversion = clamp01(meanReversion * (oversold >= 0.25 ? 0.85 : 0.55));
    grid = clamp01(grid * 0.7);
  } else if (regime === "RANGE") {
    grid = clamp01(grid + 0.08);
  }

  const ranked: Array<{ strategy: AdaptiveStrategy; score: number }> = [
    { strategy: "TREND", score: trend },
    { strategy: "MEAN_REVERSION", score: meanReversion },
    { strategy: "GRID", score: grid }
  ];
  ranked.sort((left, right) => right.score - left.score);

  return {
    trend: rounded(trend),
    meanReversion: rounded(meanReversion),
    grid: rounded(grid),
    recommended: ranked[0]?.strategy ?? "GRID"
  };
}

export function getFreshLongBlockReason(candidate: UniverseCandidate | null): string | null {
  if (!candidate) return null;

  const change = Number.isFinite(candidate.priceChangePct24h) ? candidate.priceChangePct24h : 0;
  const rsi = Number.isFinite(candidate.rsi14) ? candidate.rsi14 ?? 50 : 50;
  const bandPosition = Number.isFinite(candidate.bollingerPosition20) ? candidate.bollingerPosition20 ?? 0.5 : 0.5;
  const adx = Number.isFinite(candidate.adx14) ? candidate.adx14 ?? 0 : 0;
  const emaSpread = Number.isFinite(candidate.emaTrendSpreadPct) ? candidate.emaTrendSpreadPct ?? 0 : 0;
  const donchian = Number.isFinite(candidate.donchianBreakoutPct20) ? candidate.donchianBreakoutPct20 ?? 0 : 0;

  const confirmedBearishBreakdown =
    change <= -1 &&
    emaSpread <= -0.35 &&
    (donchian <= -0.25 || adx >= 22);
  if (confirmedBearishBreakdown) return "fresh long blocked by bearish breakdown";

  const overheated = change >= 3 && rsi >= 75 && bandPosition >= 0.95;
  if (overheated) return "fresh long blocked by overheated momentum";

  return null;
}
