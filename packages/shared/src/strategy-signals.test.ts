import { describe, expect, it } from "vitest";
import {
  computeBollingerSignal,
  computeDonchianBreakoutPct,
  computeEmaTrendSpreadPct,
  computeRangeCycleScore
} from "./strategy-signals";

describe("strategy signal helpers", () => {
  it("reports positive and negative Donchian breakouts against the prior window", () => {
    const highs = Array.from({ length: 20 }, () => 100);
    const lows = Array.from({ length: 20 }, () => 90);

    expect(computeDonchianBreakoutPct([...highs, 101], [...lows, 99], [...Array(20).fill(95), 101], 20)).toBeCloseTo(0.9901, 4);
    expect(computeDonchianBreakoutPct([...highs, 91], [...lows, 89], [...Array(20).fill(95), 89], 20)).toBeCloseTo(-1.1236, 4);
    expect(computeDonchianBreakoutPct([...highs, 98], [...lows, 94], [...Array(20).fill(95), 98], 20)).toBe(0);
  });

  it("normalizes Bollinger position and width", () => {
    const signal = computeBollingerSignal([
      100, 101, 99, 102, 98, 100, 101, 99, 102, 98,
      100, 101, 99, 102, 98, 100, 101, 99, 102, 110
    ]);

    expect(signal).not.toBeNull();
    expect(signal?.position).toBeGreaterThan(0.9);
    expect(signal?.widthPct).toBeGreaterThan(0);
  });

  it("detects rising EMA trend spread", () => {
    const closes = Array.from({ length: 40 }, (_, index) => 100 + index);

    expect(computeEmaTrendSpreadPct(closes)).toBeGreaterThan(1);
  });

  it("scores repeated mean crossings as range-friendly", () => {
    const choppy = Array.from({ length: 20 }, (_, index) => (index % 2 === 0 ? 99 : 101));
    const trending = Array.from({ length: 20 }, (_, index) => 90 + index);

    expect(computeRangeCycleScore(choppy)).toBeGreaterThan(0.9);
    expect(computeRangeCycleScore(trending)).toBeLessThan(0.3);
  });
});
