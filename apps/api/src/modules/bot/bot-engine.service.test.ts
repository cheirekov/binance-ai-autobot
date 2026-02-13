import { describe, expect, it } from "vitest";

import type { AppConfig, UniverseCandidate } from "@autobot/shared";
import { defaultBotState } from "@autobot/shared";

import { BotEngineService } from "./bot-engine.service";
import type { ConfigService } from "../config/config.service";
import type { BinanceMarketDataService, BinanceSymbolRules, MarketQtyValidation } from "../integrations/binance-market-data.service";
import type { BinanceBalanceSnapshot, BinanceTradingService } from "../integrations/binance-trading.service";
import type { ConversionRouterService } from "../integrations/conversion-router.service";
import type { UniverseService } from "../universe/universe.service";

describe("bot-engine pickFeasibleLiveCandidate", () => {
  it("does not reject max-symbol-exposure when only buffered cost exceeds remaining exposure", async () => {
    const config = {
      advanced: {
        neverTradeSymbols: [],
        symbolEntryCooldownMs: 0,
        maxConsecutiveEntriesPerSymbol: 0
      }
    } as unknown as AppConfig;

    const configService = { load: () => config };

    const rules: BinanceSymbolRules = {
      symbol: "AAAUSDC",
      status: "TRADING",
      baseAsset: "AAA",
      quoteAsset: "USDC"
    };

    const marketData = {
      getSymbolRules: async () => rules,
      getTickerPrice: async () => "100",
      validateMarketOrderQty: async () =>
        ({
          ok: true,
          normalizedQty: "20"
        }) satisfies MarketQtyValidation
    };

    const service = new BotEngineService(
      configService as unknown as ConfigService,
      marketData as unknown as BinanceMarketDataService,
      {} as unknown as BinanceTradingService,
      {} as unknown as ConversionRouterService,
      {} as unknown as UniverseService
    );

    const candidate: UniverseCandidate = {
      symbol: "AAAUSDC",
      baseAsset: "AAA",
      quoteAsset: "USDC",
      lastPrice: 100,
      quoteVolume24h: 1_000_000,
      priceChangePct24h: 0,
      score: 1,
      reasons: []
    };

    const balances: BinanceBalanceSnapshot[] = [];

    type PickResult = { candidate: UniverseCandidate | null; reason?: string };
    const result = await (service as unknown as { pickFeasibleLiveCandidate: (params: unknown) => Promise<PickResult> }).pickFeasibleLiveCandidate({
      preferredCandidate: candidate,
      snapshotCandidates: [],
      state: defaultBotState(),
      homeStable: "USDC",
      traderRegion: "EEA",
      neverTradeSymbols: [],
      excludeStableStablePairs: true,
      enforceRegionPolicy: true,
      balances,
      walletTotalHome: 10_000,
      maxPositionPct: 20,
      quoteFree: 10_000,
      notionalCap: 0,
      capitalNotionalCapMultiplier: 1,
      bufferFactor: 1.002
    });

    expect(result.candidate?.symbol).toBe("AAAUSDC");
    expect(result.reason).toBeUndefined();
  });
});
