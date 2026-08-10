import type { UniverseCandidate } from "@autobot/shared";
import { describe, expect, it } from "vitest";

import { getFreshLongBlockReason, scoreAdaptiveStrategy } from "./adaptive-strategy";

const candidate = (overrides: Partial<UniverseCandidate>): UniverseCandidate => ({
  symbol: "TESTUSDC",
  baseAsset: "TEST",
  quoteAsset: "USDC",
  lastPrice: 100,
  quoteVolume24h: 1_000_000,
  priceChangePct24h: 0,
  score: 1,
  reasons: [],
  ...overrides
});

describe("adaptive strategy scoring", () => {
  it("rewards bullish direction instead of absolute movement", () => {
    const bullish = scoreAdaptiveStrategy(
      candidate({ priceChangePct24h: 3, rsi14: 60, adx14: 30, emaTrendSpreadPct: 1, donchianBreakoutPct20: 1 }),
      "BULL_TREND"
    );
    const bearish = scoreAdaptiveStrategy(
      candidate({ priceChangePct24h: -3, rsi14: 40, adx14: 30, emaTrendSpreadPct: -1, donchianBreakoutPct20: -1 }),
      "BEAR_TREND"
    );

    expect(bullish.recommended).toBe("TREND");
    expect(bullish.trend).toBeGreaterThan(bearish.trend);
  });

  it("treats oversold lower-band conditions as long mean reversion, not overbought conditions", () => {
    const oversold = scoreAdaptiveStrategy(candidate({ rsi14: 25, bollingerPosition20: 0.04, adx14: 12 }), "NEUTRAL");
    const overbought = scoreAdaptiveStrategy(candidate({ rsi14: 76, bollingerPosition20: 0.96, adx14: 12 }), "NEUTRAL");

    expect(oversold.recommended).toBe("MEAN_REVERSION");
    expect(oversold.meanReversion).toBeGreaterThan(overbought.meanReversion);
  });

  it("blocks only fresh long entries at confirmed bearish breakdowns or extreme overheating", () => {
    expect(
      getFreshLongBlockReason(
        candidate({ priceChangePct24h: -2.5, adx14: 28, emaTrendSpreadPct: -0.8, donchianBreakoutPct20: -0.6 })
      )
    ).toContain("bearish breakdown");
    expect(
      getFreshLongBlockReason(candidate({ priceChangePct24h: 5, rsi14: 79, bollingerPosition20: 0.98 }))
    ).toContain("overheated");
    expect(getFreshLongBlockReason(candidate({ priceChangePct24h: 1, rsi14: 58, emaTrendSpreadPct: 0.4 }))).toBeNull();
  });
});
