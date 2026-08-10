import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ConfigService } from "../config/config.service";
import { MarketHistoryService } from "./market-history.service";

describe("MarketHistoryService", () => {
  const services: MarketHistoryService[] = [];

  afterEach(() => {
    for (const service of services) service.onModuleDestroy();
    services.length = 0;
  });

  const createService = (dataDir: string) => {
    const service = new MarketHistoryService({ dataDir } as ConfigService);
    services.push(service);
    return service;
  };

  it("persists candles across service restarts and returns chronological history", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobot-history-"));
    const first = createService(dataDir);
    expect(first.upsertCandles({
      symbol: "btcusdc",
      interval: "1h",
      source: "test",
      candles: [
        { openTime: 2, closeTime: 3, open: 11, high: 13, low: 10, close: 12, volume: 101 },
        { openTime: 1, closeTime: 2, open: 10, high: 12, low: 9, close: 11, volume: 100 }
      ]
    })).toBe(2);
    first.onModuleDestroy();

    const restarted = createService(dataDir);
    const rows = restarted.getCandles({ symbol: "BTCUSDC", interval: "1h" });
    expect(rows.map((row) => row.openTime)).toEqual([1, 2]);
    expect(rows.map((row) => row.close)).toEqual([11, 12]);
    expect(restarted.getStats()).toMatchObject({ candles: 2, symbols: 1, intervals: 1 });
  });

  it("upserts the same exchange candle instead of duplicating it", () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobot-history-"));
    const service = createService(dataDir);
    const base = { openTime: 1, closeTime: 2, open: 10, high: 12, low: 9, close: 11, volume: 100 };
    service.upsertCandles({ symbol: "ETHUSDC", interval: "1h", source: "first", candles: [base] });
    service.upsertCandles({ symbol: "ETHUSDC", interval: "1h", source: "second", candles: [{ ...base, close: 11.5 }] });

    expect(service.getStats().candles).toBe(1);
    expect(service.getCandles({ symbol: "ETHUSDC", interval: "1h" })[0]).toMatchObject({ close: 11.5, source: "second" });
  });
});
