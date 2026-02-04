import { describe, expect, it } from "vitest";
import { deriveSettings } from "./app-config";

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
