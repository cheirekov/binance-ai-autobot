import { describe, expect, it } from "vitest";
import { deriveAdvancedRiskProfile, deriveSettings } from "./app-config";

describe("deriveSettings", () => {
  it("maps risk to sane defaults", () => {
    expect(deriveSettings({ risk: 0, tradeMode: "SPOT" }).maxOpenPositions).toBe(1);
    expect(deriveSettings({ risk: 100, tradeMode: "SPOT" }).maxOpenPositions).toBeGreaterThan(1);
    expect(deriveSettings({ risk: 0, tradeMode: "SPOT" }).allowGrid).toBe(false);
    expect(deriveSettings({ risk: 0, tradeMode: "SPOT_GRID" }).allowGrid).toBe(true);
    expect(deriveSettings({ risk: 0, tradeMode: "SPOT" }).allowFutures).toBe(false);
    expect(deriveSettings({ risk: 100, tradeMode: "SPOT" }).allowSpot).toBe(true);
  });
});

describe("deriveAdvancedRiskProfile", () => {
  it("stays within safe ranges", () => {
    const low = deriveAdvancedRiskProfile(0);
    const high = deriveAdvancedRiskProfile(100);

    expect(low.liveTradeCooldownMs).toBeGreaterThan(high.liveTradeCooldownMs);
    expect(low.liveTradeNotionalCap).toBeLessThan(high.liveTradeNotionalCap);
    expect(low.liveTradeSlippageBuffer).toBeGreaterThan(high.liveTradeSlippageBuffer);
    expect(low.conversionBuyBuffer).toBeGreaterThan(high.conversionBuyBuffer);
    expect(low.conversionSellBuffer).toBeGreaterThanOrEqual(high.conversionSellBuffer);
    expect(low.conversionFeeBuffer).toBeGreaterThanOrEqual(high.conversionFeeBuffer);
    expect(low.symbolEntryCooldownMs).toBeGreaterThan(high.symbolEntryCooldownMs);
    expect(low.maxConsecutiveEntriesPerSymbol).toBeLessThanOrEqual(high.maxConsecutiveEntriesPerSymbol);
    expect(low.conversionTopUpReserveMultiplier).toBeGreaterThan(high.conversionTopUpReserveMultiplier);
    expect(low.conversionTopUpCooldownMs).toBeGreaterThan(high.conversionTopUpCooldownMs);
  });
});
