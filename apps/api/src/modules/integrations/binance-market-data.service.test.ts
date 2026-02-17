import { describe, expect, it, vi } from "vitest";

import type { ConfigService } from "../config/config.service";
import { BinanceMarketDataService, type BinanceSymbolRules } from "./binance-market-data.service";

function createServiceWithRules(rules: BinanceSymbolRules): BinanceMarketDataService {
  const service = new BinanceMarketDataService(
    {
      load: () => ({})
    } as unknown as ConfigService
  );
  vi.spyOn(service, "getSymbolRules").mockResolvedValue(rules);
  vi.spyOn(service, "getTickerPrice").mockResolvedValue("0.1000");
  return service;
}

describe("binance-market-data qty normalization", () => {
  it("floors market qty for integer step symbols instead of rounding up", async () => {
    const service = createServiceWithRules({
      symbol: "DOGEUSDC",
      status: "TRADING",
      baseAsset: "DOGE",
      quoteAsset: "USDC",
      lotSize: { filterType: "LOT_SIZE", minQty: "1.00000000", maxQty: "1000000.00000000", stepSize: "1.00000000" },
      marketLotSize: {
        filterType: "MARKET_LOT_SIZE",
        minQty: "1.00000000",
        maxQty: "1000000.00000000",
        stepSize: "1.00000000"
      }
    });

    const result = await service.validateMarketOrderQty("DOGEUSDC", 13962.8717);
    expect(result.ok).toBe(true);
    expect(result.normalizedQty).toBe("13962");
  });

  it("floors limit qty for integer step symbols instead of rounding up", async () => {
    const service = createServiceWithRules({
      symbol: "DOGEUSDC",
      status: "TRADING",
      baseAsset: "DOGE",
      quoteAsset: "USDC",
      lotSize: { filterType: "LOT_SIZE", minQty: "1.00000000", maxQty: "1000000.00000000", stepSize: "1.00000000" }
    });

    const result = await service.validateLimitOrderQty("DOGEUSDC", 13962.8717, "0.1000");
    expect(result.ok).toBe(true);
    expect(result.normalizedQty).toBe("13962");
  });
});
