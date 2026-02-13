import { describe, expect, it } from "vitest";

import { getPairPolicyBlockReason, isStableAsset } from "./trading-policy";

describe("trading-policy", () => {
  it("treats known stable assets as stable for stable/stable filtering", () => {
    expect(isStableAsset("usdc")).toBe(true);
    expect(isStableAsset("usdt")).toBe(true);
    expect(isStableAsset("u")).toBe(true);

    const reason = getPairPolicyBlockReason({
      symbol: "USDCUSDT",
      baseAsset: "USDC",
      quoteAsset: "USDT",
      traderRegion: "EEA",
      excludeStableStablePairs: true
    });
    expect(reason).toBe("Stable/stable pair filtered");
  });

  it("allows stable/stable when filter disabled", () => {
    const reason = getPairPolicyBlockReason({
      symbol: "USDCUSDT",
      baseAsset: "USDC",
      quoteAsset: "USDT",
      traderRegion: "NON_EEA",
      excludeStableStablePairs: false
    });
    expect(reason).toBeNull();
  });

  it("keeps EEA quote restrictions active", () => {
    const reason = getPairPolicyBlockReason({
      symbol: "BTCUSDT",
      baseAsset: "BTC",
      quoteAsset: "USDT",
      traderRegion: "EEA",
      enforceRegionPolicy: true
    });
    expect(reason).toBe("EEA policy filtered quote asset USDT");
  });

  it("keeps EEA restrictions for non-MiCA stable-like quotes", () => {
    const reason = getPairPolicyBlockReason({
      symbol: "BTCFDUSD",
      baseAsset: "BTC",
      quoteAsset: "FDUSD",
      traderRegion: "EEA",
      enforceRegionPolicy: true
    });
    expect(reason).toBe("EEA policy filtered quote asset FDUSD");
  });
});
