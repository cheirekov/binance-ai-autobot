import { describe, expect, it } from "vitest";

import type { MarketHistoryService, StoredMarketCandle } from "./market-history.service";
import { StrategyEvaluationService } from "./strategy-evaluation.service";

const candles = (direction: 1 | -1): StoredMarketCandle[] => Array.from({ length: 140 }, (_, index) => {
  const close = 100 * Math.pow(1 + direction * 0.001, index);
  return {
    symbol: "TESTUSDC",
    interval: "1h",
    source: "test",
    openTime: index * 3_600_000,
    closeTime: (index + 1) * 3_600_000 - 1,
    open: close / (1 + direction * 0.001),
    high: close * 1.001,
    low: close * 0.999,
    close,
    volume: 100
  };
});

const serviceWith = (rows: StoredMarketCandle[]) => new StrategyEvaluationService({
  getCandles: () => rows
} as unknown as MarketHistoryService);

describe("StrategyEvaluationService", () => {
  it("evaluates bullish trend signals from persisted candles", () => {
    const report = serviceWith(candles(1)).evaluate({ symbol: "TESTUSDC", feeBps: 0 });
    expect(report.sufficientHistory).toBe(true);
    expect(report.strategies.TREND.signals).toBeGreaterThan(0);
    expect(report.strategies.TREND.winRatePct).toBe(100);
  });

  it("records bearish fresh-long blocks instead of rewarding downside momentum", () => {
    const report = serviceWith(candles(-1)).evaluate({ symbol: "TESTUSDC", feeBps: 0 });
    expect(report.freshLongBlocked).toBeGreaterThan(0);
    expect(report.strategies.TREND.signals).toBe(0);
  });
});
