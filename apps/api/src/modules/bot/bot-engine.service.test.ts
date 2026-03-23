import { describe, expect, it, vi } from "vitest";

import type { AppConfig, BotState, Order, UniverseCandidate } from "@autobot/shared";
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

    const balances: BinanceBalanceSnapshot[] = [
      {
        asset: "USDC",
        free: 10_000,
        locked: 0,
        total: 10_000
      }
    ];

    type PickResult = { candidate: UniverseCandidate | null; reason?: string };
    const result = await (service as unknown as { pickFeasibleLiveCandidate: (params: unknown) => Promise<PickResult> }).pickFeasibleLiveCandidate({
      preferredCandidate: candidate,
      snapshotCandidates: [],
      state: defaultBotState(),
      homeStable: "USDC",
      allowedExecutionQuotes: new Set(["USDC"]),
      traderRegion: "EEA",
      neverTradeSymbols: [],
      excludeStableStablePairs: true,
      enforceRegionPolicy: true,
      balances,
      walletTotalHome: 10_000,
      risk: 50,
      maxPositionPct: 20,
      minQuoteLiquidityHome: 3,
      notionalCap: 0,
      capitalNotionalCapMultiplier: 1,
      bufferFactor: 1.002
    });

    expect(result.candidate?.symbol).toBe("AAAUSDC");
    expect(result.reason).toBeUndefined();
  });

  it("rejects non-home quote candidate when projected quote exposure exceeds cap", async () => {
    const config = {
      basic: {
        homeStableCoin: "USDC",
        traderRegion: "NON_EEA"
      },
      advanced: {
        neverTradeSymbols: [],
        symbolEntryCooldownMs: 0,
        maxConsecutiveEntriesPerSymbol: 0,
        universeQuoteAssets: ["USDC", "BTC"]
      }
    } as unknown as AppConfig;

    const configService = { load: () => config };
    const rules: BinanceSymbolRules = {
      symbol: "ADABTC",
      status: "TRADING",
      baseAsset: "ADA",
      quoteAsset: "BTC"
    };
    const marketData = {
      getSymbolRules: async () => rules,
      getTickerPrice: async (symbol: string) => {
        if (symbol === "BTCUSDC") return "100";
        if (symbol === "ADABTC") return "0.001";
        return "1";
      },
      validateMarketOrderQty: async () =>
        ({
          ok: true,
          normalizedQty: "1"
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
      symbol: "ADABTC",
      baseAsset: "ADA",
      quoteAsset: "BTC",
      lastPrice: 0.001,
      quoteVolume24h: 1_000_000,
      priceChangePct24h: 0,
      score: 1,
      reasons: []
    };

    const balances: BinanceBalanceSnapshot[] = [
      { asset: "BTC", free: 1, locked: 0, total: 1 },
      { asset: "USDC", free: 0, locked: 0, total: 0 }
    ];

    const result = await (
      service as unknown as {
        pickFeasibleLiveCandidate: (params: unknown) => Promise<{ candidate: UniverseCandidate | null; sizingRejected: number }>;
      }
    ).pickFeasibleLiveCandidate({
      preferredCandidate: candidate,
      snapshotCandidates: [],
      state: defaultBotState(),
      homeStable: "USDC",
      allowedExecutionQuotes: new Set(["USDC", "BTC"]),
      traderRegion: "NON_EEA",
      neverTradeSymbols: [],
      excludeStableStablePairs: true,
      enforceRegionPolicy: true,
      balances,
      walletTotalHome: 100,
      risk: 20,
      maxPositionPct: 20,
      minQuoteLiquidityHome: 3,
      notionalCap: 0,
      capitalNotionalCapMultiplier: 1,
      bufferFactor: 1.002
    });

    expect(result.candidate).toBeNull();
    expect(result.sizingRejected).toBeGreaterThan(0);
  });

  it("keeps non-home quote candidates eligible when quote reserve is normalized to quote units", async () => {
    const config = {
      basic: {
        homeStableCoin: "USDC",
        traderRegion: "NON_EEA"
      },
      advanced: {
        neverTradeSymbols: [],
        symbolEntryCooldownMs: 0,
        maxConsecutiveEntriesPerSymbol: 0,
        universeQuoteAssets: ["USDC", "ETH"],
        conversionTopUpMinTarget: 5,
        conversionTopUpReserveMultiplier: 2
      }
    } as unknown as AppConfig;

    const configService = { load: () => config };
    const rules: BinanceSymbolRules = {
      symbol: "BNBETH",
      status: "TRADING",
      baseAsset: "BNB",
      quoteAsset: "ETH"
    };
    const marketData = {
      getSymbolRules: async () => rules,
      getTickerPrice: async (symbol: string) => {
        if (symbol === "ETHUSDC") return "2000";
        if (symbol === "BNBETH") return "0.001";
        return "1";
      },
      validateMarketOrderQty: async () =>
        ({
          ok: true,
          normalizedQty: "1"
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
      symbol: "BNBETH",
      baseAsset: "BNB",
      quoteAsset: "ETH",
      lastPrice: 0.001,
      quoteVolume24h: 1_000_000,
      priceChangePct24h: 0,
      score: 1,
      reasons: []
    };

    const balances: BinanceBalanceSnapshot[] = [
      { asset: "ETH", free: 0.01, locked: 0, total: 0.01 },
      { asset: "USDC", free: 0, locked: 0, total: 0 }
    ];

    const result = await (
      service as unknown as {
        pickFeasibleLiveCandidate: (params: unknown) => Promise<{ candidate: UniverseCandidate | null }>;
      }
    ).pickFeasibleLiveCandidate({
      preferredCandidate: candidate,
      snapshotCandidates: [],
      state: defaultBotState(),
      homeStable: "USDC",
      allowedExecutionQuotes: new Set(["USDC", "ETH"]),
      traderRegion: "NON_EEA",
      neverTradeSymbols: [],
      excludeStableStablePairs: true,
      enforceRegionPolicy: true,
      balances,
      walletTotalHome: 1_000,
      risk: 100,
      maxPositionPct: 20,
      minQuoteLiquidityHome: 3,
      notionalCap: 0,
      capitalNotionalCapMultiplier: 1,
      bufferFactor: 1.002
    });

    expect(result.candidate?.symbol).toBe("BNBETH");
  });

  it("rejects home-quote candidates when spendable quote stays below the funding floor", async () => {
    const config = {
      basic: {
        homeStableCoin: "USDC",
        traderRegion: "NON_EEA"
      },
      advanced: {
        neverTradeSymbols: [],
        symbolEntryCooldownMs: 0,
        maxConsecutiveEntriesPerSymbol: 0,
        conversionTopUpMinTarget: 5,
        conversionTopUpReserveMultiplier: 2
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
      getTickerPrice: async () => "1",
      validateMarketOrderQty: async () =>
        ({
          ok: true,
          normalizedQty: "1"
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
      lastPrice: 1,
      quoteVolume24h: 1_000_000,
      priceChangePct24h: 0,
      score: 1,
      reasons: []
    };

    const balances: BinanceBalanceSnapshot[] = [
      { asset: "USDC", free: 6, locked: 0, total: 6 }
    ];

    const result = await (
      service as unknown as {
        pickFeasibleLiveCandidate: (params: unknown) => Promise<{ candidate: UniverseCandidate | null }>;
      }
    ).pickFeasibleLiveCandidate({
      preferredCandidate: candidate,
      snapshotCandidates: [],
      state: defaultBotState(),
      homeStable: "USDC",
      allowedExecutionQuotes: new Set(["USDC"]),
      traderRegion: "NON_EEA",
      neverTradeSymbols: [],
      excludeStableStablePairs: true,
      enforceRegionPolicy: true,
      balances,
      walletTotalHome: 1_000,
      risk: 100,
      maxPositionPct: 20,
      minQuoteLiquidityHome: 3,
      notionalCap: 0,
      capitalNotionalCapMultiplier: 1,
      bufferFactor: 1.002
    });

    expect(result.candidate).toBeNull();
  });

  it("filters to managed-open symbols when caution pauses new entries", async () => {
    const config = {
      basic: {
        homeStableCoin: "USDC",
        traderRegion: "NON_EEA"
      },
      advanced: {
        neverTradeSymbols: [],
        symbolEntryCooldownMs: 0,
        maxConsecutiveEntriesPerSymbol: 0,
        universeQuoteAssets: ["USDC", "BTC"]
      }
    } as unknown as AppConfig;

    const configService = { load: () => config };
    const marketData = {
      getSymbolRules: async (symbol: string) => {
        if (symbol === "NEWBTC") {
          return {
            symbol,
            status: "TRADING",
            baseAsset: "NEW",
            quoteAsset: "BTC"
          } satisfies BinanceSymbolRules;
        }
        return {
          symbol,
          status: "TRADING",
          baseAsset: "OPEN",
          quoteAsset: "BTC"
        } satisfies BinanceSymbolRules;
      },
      getTickerPrice: async (symbol: string) => {
        if (symbol === "BTCUSDC") return "100";
        return "0.001";
      },
      validateMarketOrderQty: async () =>
        ({
          ok: true,
          normalizedQty: "1"
        }) satisfies MarketQtyValidation
    };

    const service = new BotEngineService(
      configService as unknown as ConfigService,
      marketData as unknown as BinanceMarketDataService,
      {} as unknown as BinanceTradingService,
      {} as unknown as ConversionRouterService,
      {} as unknown as UniverseService
    );

    const preferredCandidate: UniverseCandidate = {
      symbol: "NEWBTC",
      baseAsset: "NEW",
      quoteAsset: "BTC",
      lastPrice: 0.001,
      quoteVolume24h: 2_000_000,
      priceChangePct24h: 0,
      score: 10,
      reasons: []
    };
    const managedCandidate: UniverseCandidate = {
      symbol: "OPENBTC",
      baseAsset: "OPEN",
      quoteAsset: "BTC",
      lastPrice: 0.001,
      quoteVolume24h: 1_500_000,
      priceChangePct24h: 0,
      score: 8,
      reasons: []
    };

    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "filled-open-buy",
          ts: new Date("2026-03-01T00:00:00Z").toISOString(),
          symbol: "OPENBTC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          qty: 100,
          price: 0.001
        }
      ]
    };

    const balances: BinanceBalanceSnapshot[] = [
      { asset: "BTC", free: 1, locked: 0, total: 1 },
      { asset: "OPEN", free: 100, locked: 0, total: 100 },
      { asset: "USDC", free: 0, locked: 0, total: 0 }
    ];

    const result = await (
      service as unknown as {
        pickFeasibleLiveCandidate: (params: unknown) => Promise<{ candidate: UniverseCandidate | null; reason?: string }>;
      }
    ).pickFeasibleLiveCandidate({
      preferredCandidate,
      snapshotCandidates: [managedCandidate],
      state,
      homeStable: "USDC",
      allowedExecutionQuotes: new Set(["USDC", "BTC"]),
      traderRegion: "NON_EEA",
      neverTradeSymbols: [],
      excludeStableStablePairs: true,
      enforceRegionPolicy: true,
      balances,
      walletTotalHome: 1_000,
      risk: 80,
      maxPositionPct: 20,
      minQuoteLiquidityHome: 3,
      notionalCap: 0,
      capitalNotionalCapMultiplier: 1,
      bufferFactor: 1.002,
      managedOpenSymbolsOnly: new Set(["OPENBTC"])
    });

    expect(result.candidate?.symbol).toBe("OPENBTC");
    expect(result.reason).toBeUndefined();
  });
});

describe("bot-engine insufficient-balance helpers", () => {
  const service = new BotEngineService(
    { load: () => null } as unknown as ConfigService,
    {} as unknown as BinanceMarketDataService,
    {} as unknown as BinanceTradingService,
    {} as unknown as ConversionRouterService,
    {} as unknown as UniverseService
  );

  it("detects insufficient-balance exchange errors", () => {
    const helpers = service as unknown as {
      isInsufficientBalanceError: (message: string) => boolean;
    };

    expect(helpers.isInsufficientBalanceError("binance Account has insufficient balance for requested action.")).toBe(true);
    expect(helpers.isInsufficientBalanceError('{"code":-2010,"msg":"Account has insufficient balance for requested action."}')).toBe(true);
    expect(helpers.isInsufficientBalanceError("Filter failure: NOTIONAL")).toBe(false);
  });

  it("escalates blacklist ttl for repeated insufficient-balance rejects", () => {
    const helpers = service as unknown as {
      deriveInsufficientBalanceBlacklistTtlMinutes: (baseTtlMinutes: number, recentCount: number) => number;
    };

    expect(helpers.deriveInsufficientBalanceBlacklistTtlMinutes(30, 1)).toBe(30);
    expect(helpers.deriveInsufficientBalanceBlacklistTtlMinutes(30, 2)).toBe(60);
    expect(helpers.deriveInsufficientBalanceBlacklistTtlMinutes(30, 4)).toBe(90);
    expect(helpers.deriveInsufficientBalanceBlacklistTtlMinutes(30, 6)).toBe(120);
  });

  it("allows tiny balance delta fallback for position exits", () => {
    const helpers = service as unknown as {
      shouldAttemptBalanceDeltaSellFallback: (required: number, available: number) => boolean;
    };

    expect(helpers.shouldAttemptBalanceDeltaSellFallback(1506, 1505.771)).toBe(true);
    expect(helpers.shouldAttemptBalanceDeltaSellFallback(0.138, 0.137791)).toBe(true);
    expect(helpers.shouldAttemptBalanceDeltaSellFallback(100, 95)).toBe(false);
    expect(helpers.shouldAttemptBalanceDeltaSellFallback(100, 0)).toBe(false);
  });

  it("picks largest managed symbol as caution fallback candidate", () => {
    const configuredService = new BotEngineService(
      {
        load: () =>
          ({
            basic: {
              traderRegion: "EEA",
              homeStableCoin: "USDC"
            },
            advanced: {
              neverTradeSymbols: []
            }
          }) as unknown as AppConfig
      } as unknown as ConfigService,
      {} as unknown as BinanceMarketDataService,
      {} as unknown as BinanceTradingService,
      {} as unknown as ConversionRouterService,
      {} as unknown as UniverseService
    );
    const configuredHelpers = configuredService as unknown as {
      pickManagedFallbackSymbol: (params: {
        state: BotState;
        isExecutionQuoteSymbol: (symbol: string) => boolean;
      }) => string | null;
    };

    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "buy-aaa",
          ts: new Date("2026-03-01T00:00:00Z").toISOString(),
          symbol: "AAAUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          qty: 10,
          price: 10
        },
        {
          id: "buy-bbb",
          ts: new Date("2026-03-01T00:01:00Z").toISOString(),
          symbol: "BBBUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          qty: 1,
          price: 20
        }
      ]
    };

    const fallback = configuredHelpers.pickManagedFallbackSymbol({
      state,
      isExecutionQuoteSymbol: (symbol) => symbol.endsWith("USDC")
    });
    expect(fallback).toBe("AAAUSDC");
  });

  it("ignores dust managed symbols for caution fallback", () => {
    const configuredService = new BotEngineService(
      {
        load: () =>
          ({
            basic: {
              traderRegion: "EEA",
              homeStableCoin: "USDC"
            },
            advanced: {
              neverTradeSymbols: []
            }
          }) as unknown as AppConfig
      } as unknown as ConfigService,
      {} as unknown as BinanceMarketDataService,
      {} as unknown as BinanceTradingService,
      {} as unknown as ConversionRouterService,
      {} as unknown as UniverseService
    );
    const configuredHelpers = configuredService as unknown as {
      pickManagedFallbackSymbol: (params: {
        state: BotState;
        isExecutionQuoteSymbol: (symbol: string) => boolean;
        minExposureHome?: number;
      }) => string | null;
    };

    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "buy-dust",
          ts: new Date("2026-03-01T00:00:00Z").toISOString(),
          symbol: "DUSTUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          qty: 4,
          price: 1
        },
        {
          id: "buy-main",
          ts: new Date("2026-03-01T00:01:00Z").toISOString(),
          symbol: "MAINUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          qty: 3,
          price: 4
        }
      ]
    };

    const fallback = configuredHelpers.pickManagedFallbackSymbol({
      state,
      isExecutionQuoteSymbol: (symbol) => symbol.endsWith("USDC"),
      minExposureHome: 5
    });
    expect(fallback).toBe("MAINUSDC");
  });

  it("classifies grid waiting skips as storm-eligible", () => {
    const helpers = service as unknown as {
      getSkipStormKey: (summary: string) => string | null;
    };

    const key = helpers.getSkipStormKey("Skip XRPUSDC: Grid waiting for ladder slot or inventory");
    expect(key).toBe("skip xrpusdc: grid waiting for ladder slot or inventory");
  });

  it("uses gentler skip-storm trigger for grid waiting loops", () => {
    const helpers = service as unknown as {
      deriveInfeasibleSymbolCooldown: (params: {
        state: BotState;
        symbol: string;
        risk: number;
        baseCooldownMs: number;
        summary: string;
      }) => { cooldownMs: number; storm?: { threshold: number } };
    };

    const summary = "Skip XRPUSDC: Grid waiting for ladder slot or inventory";
    const now = Date.now();
    const oneRecentState: BotState = {
      ...defaultBotState(),
      decisions: [
        {
          id: "wait-1",
          ts: new Date(now - 20_000).toISOString(),
          kind: "SKIP",
          summary
        }
      ]
    };

    const withOneRecent = helpers.deriveInfeasibleSymbolCooldown({
      state: oneRecentState,
      symbol: "XRPUSDC",
      risk: 100,
      baseCooldownMs: 60_000,
      summary
    });
    expect(withOneRecent.storm).toBeUndefined();

    const twoRecentState: BotState = {
      ...oneRecentState,
      decisions: [
        ...oneRecentState.decisions,
        {
          id: "wait-2",
          ts: new Date(now - 40_000).toISOString(),
          kind: "SKIP",
          summary
        }
      ]
    };
    const withTwoRecent = helpers.deriveInfeasibleSymbolCooldown({
      state: twoRecentState,
      symbol: "XRPUSDC",
      risk: 100,
      baseCooldownMs: 60_000,
      summary
    });
    expect(withTwoRecent.storm?.threshold).toBe(3);
    expect(withTwoRecent.cooldownMs).toBeGreaterThanOrEqual(150_000);
  });

  it("uses longer cooldown for no-feasible min-order sizing rejects", () => {
    const helpers = service as unknown as {
      deriveNoFeasibleSizingRejectCooldownMs: (params: { risk: number; stage?: string; reason?: string }) => number;
    };

    const minQtyCooldown = helpers.deriveNoFeasibleSizingRejectCooldownMs({
      risk: 100,
      stage: "validate-qty",
      reason: "Below minQty 0.00010000"
    });
    const genericCooldown = helpers.deriveNoFeasibleSizingRejectCooldownMs({
      risk: 100,
      stage: "quote-liquidity",
      reason: "Quote liquidity below threshold"
    });

    expect(minQtyCooldown).toBeGreaterThan(genericCooldown);
    expect(minQtyCooldown).toBeGreaterThanOrEqual(900_000);
    expect(genericCooldown).toBeGreaterThanOrEqual(240_000);
  });

  it("prioritizes concentrated losers for daily-loss HALT unwind", () => {
    const helpers = service as unknown as {
      deriveDailyLossHaltUnwindExecution: (params: {
        baseFraction: number;
        baseCooldownMs: number;
        risk: number;
        exposurePct: number;
        unrealizedPct: number | null;
      }) => { fraction: number; cooldownMs: number; priority: number };
    };

    const concentratedLoser = helpers.deriveDailyLossHaltUnwindExecution({
      baseFraction: 0.18,
      baseCooldownMs: 720_000,
      risk: 100,
      exposurePct: 20,
      unrealizedPct: -9
    });
    const smallWinner = helpers.deriveDailyLossHaltUnwindExecution({
      baseFraction: 0.18,
      baseCooldownMs: 720_000,
      risk: 100,
      exposurePct: 1,
      unrealizedPct: 2
    });

    expect(concentratedLoser.fraction).toBeGreaterThan(0.18);
    expect(concentratedLoser.cooldownMs).toBeLessThan(720_000);
    expect(concentratedLoser.priority).toBeGreaterThan(smallWinner.priority);
  });

  it("derives concentration trim thresholds and fractions", () => {
    const helpers = service as unknown as {
      deriveMaxSymbolConcentrationPct: (risk: number) => number;
      deriveConcentrationTrimFraction: (params: {
        risk: number;
        exposurePct: number;
        capPct: number;
        pnlPct: number;
      }) => number;
    };

    const highRiskCap = helpers.deriveMaxSymbolConcentrationPct(100);
    const lowRiskCap = helpers.deriveMaxSymbolConcentrationPct(0);
    expect(highRiskCap).toBeGreaterThan(lowRiskCap);

    const heavyLosingTrim = helpers.deriveConcentrationTrimFraction({
      risk: 100,
      exposurePct: 70,
      capPct: highRiskCap,
      pnlPct: -8
    });
    const mildTrim = helpers.deriveConcentrationTrimFraction({
      risk: 100,
      exposurePct: highRiskCap + 1,
      capPct: highRiskCap,
      pnlPct: 1
    });

    expect(heavyLosingTrim).toBeGreaterThan(mildTrim);
    expect(heavyLosingTrim).toBeLessThanOrEqual(0.85);
    expect(mildTrim).toBeGreaterThanOrEqual(0.15);
  });

  it("enables no-feasible recovery after repeated sizing-cap skips", () => {
    const helpers = service as unknown as {
      deriveNoFeasibleRecoveryPolicy: (params: {
        state: BotState;
        reason: string | undefined;
        risk: number;
        nowMs: number;
      }) => { enabled: boolean; recentCount: number; threshold: number; cooldownMs: number };
    };

    const now = Date.now();
    const summary = "Skip: No feasible candidates after sizing/cap filters (9 rejected)";
    const state: BotState = {
      ...defaultBotState(),
      decisions: [
        {
          id: "nf-1",
          ts: new Date(now - 45_000).toISOString(),
          kind: "SKIP",
          summary
        }
      ]
    };

    const policy = helpers.deriveNoFeasibleRecoveryPolicy({
      state,
      reason: "No feasible candidates after sizing/cap filters (10 rejected)",
      risk: 100,
      nowMs: now
    });

    expect(policy.enabled).toBe(true);
    expect(policy.threshold).toBe(2);
    expect(policy.recentCount).toBe(2);
    expect(policy.cooldownMs).toBe(600_000);
  });

  it("keeps no-feasible recovery disabled during cooldown after recovery trade", () => {
    const helpers = service as unknown as {
      deriveNoFeasibleRecoveryPolicy: (params: {
        state: BotState;
        reason: string | undefined;
        risk: number;
        nowMs: number;
      }) => { enabled: boolean; recentCount: number; threshold: number; cooldownMs: number };
    };

    const now = Date.now();
    const summary = "Skip: No feasible candidates after sizing/cap filters (11 rejected)";
    const state: BotState = {
      ...defaultBotState(),
      decisions: [
        {
          id: "trade-1",
          ts: new Date(now - 120_000).toISOString(),
          kind: "TRADE",
          summary: "Recovery sell",
          details: {
            reason: "no-feasible-liquidity-recovery"
          }
        },
        {
          id: "nf-2",
          ts: new Date(now - 180_000).toISOString(),
          kind: "SKIP",
          summary
        },
        {
          id: "nf-1",
          ts: new Date(now - 240_000).toISOString(),
          kind: "SKIP",
          summary
        }
      ]
    };

    const policy = helpers.deriveNoFeasibleRecoveryPolicy({
      state,
      reason: "No feasible candidates after sizing/cap filters (11 rejected)",
      risk: 100,
      nowMs: now
    });

    expect(policy.enabled).toBe(false);
    expect(policy.recentCount).toBe(3);
    expect(policy.threshold).toBe(2);
  });

  it("classifies skip reason clusters for KPI counters", () => {
    const helpers = service as unknown as {
      classifySkipReasonCluster: (summary: string) => "FEE_EDGE" | "MIN_ORDER" | "INVENTORY_WAITING" | "OTHER";
    };

    expect(helpers.classifySkipReasonCluster("Skip BNBUSDC: Fee/edge filter (net 0.02% < 0.05%)")).toBe("FEE_EDGE");
    expect(helpers.classifySkipReasonCluster("Skip DOGEUSDC: Grid sell sizing rejected (Below minQty 1.00000000)")).toBe("MIN_ORDER");
    expect(helpers.classifySkipReasonCluster("Skip SUIUSDC: Grid waiting for ladder slot or inventory")).toBe("INVENTORY_WAITING");
  });

  it("counts recent skip clusters inside the requested window", () => {
    const helpers = service as unknown as {
      countRecentSkipCluster: (params: {
        state: BotState;
        cluster: "FEE_EDGE" | "MIN_ORDER" | "INVENTORY_WAITING" | "OTHER";
        windowMs: number;
      }) => number;
    };

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      decisions: [
        {
          id: "skip-1",
          ts: new Date(now - 5_000).toISOString(),
          kind: "SKIP",
          summary: "Skip ETHUSDC: Grid buy sizing rejected (Below minNotional 5.00000000)"
        },
        {
          id: "skip-2",
          ts: new Date(now - 20_000).toISOString(),
          kind: "SKIP",
          summary: "Skip SOLUSDC: Grid sell sizing rejected (Below minQty 0.00100000)"
        },
        {
          id: "skip-3",
          ts: new Date(now - 40_000).toISOString(),
          kind: "SKIP",
          summary: "Skip DOGEUSDC: Grid waiting for ladder slot or inventory"
        },
        {
          id: "skip-4",
          ts: new Date(now - 80_000).toISOString(),
          kind: "SKIP",
          summary: "Skip BNBUSDC: Fee/edge filter (net 0.01% < 0.05%)"
        }
      ]
    };

    expect(
      helpers.countRecentSkipCluster({
        state,
        cluster: "MIN_ORDER",
        windowMs: 60_000
      })
    ).toBe(2);
    expect(
      helpers.countRecentSkipCluster({
        state,
        cluster: "FEE_EDGE",
        windowMs: 60_000
      })
    ).toBe(0);
  });

  it("counts recent per-symbol skip matches for inventory waiting loops", () => {
    const helpers = service as unknown as {
      countRecentSymbolSkipMatches: (params: {
        state: BotState;
        symbol: string;
        contains: string;
        windowMs: number;
      }) => number;
    };

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      decisions: [
        {
          id: "s1",
          ts: new Date(now - 5_000).toISOString(),
          kind: "SKIP",
          summary: "Skip DOGEUSDC: Grid waiting for ladder slot or inventory"
        },
        {
          id: "s2",
          ts: new Date(now - 20_000).toISOString(),
          kind: "SKIP",
          summary: "Skip DOGEUSDC: Grid waiting for ladder slot or inventory"
        },
        {
          id: "s3",
          ts: new Date(now - 70_000).toISOString(),
          kind: "SKIP",
          summary: "Skip DOGEUSDC: Grid waiting for ladder slot or inventory"
        },
        {
          id: "s4",
          ts: new Date(now - 15_000).toISOString(),
          kind: "SKIP",
          summary: "Skip ETHUSDC: Grid waiting for ladder slot or inventory"
        }
      ]
    };

    expect(
      helpers.countRecentSymbolSkipMatches({
        state,
        symbol: "DOGEUSDC",
        contains: "grid waiting for ladder slot or inventory",
        windowMs: 60_000
      })
    ).toBe(2);
  });

  it("activates reason-level quarantine after repeated fee-edge skips", () => {
    const helpers = service as unknown as {
      maybeApplyReasonQuarantineLock: (params: { state: BotState; summary: string; risk: number }) => BotState;
      getActiveReasonQuarantineFamilies: (
        state: BotState
      ) => Set<"FEE_EDGE" | "GRID_BUY_SIZING" | "GRID_SELL_SIZING" | "GRID_BUY_QUOTE">;
    };

    const now = Date.now();
    const skipSummary = "Skip BNBUSDC: Fee/edge filter (net 0.021% < 0.052%)";
    const decisions = Array.from({ length: 5 }).map((_, idx) => ({
      id: `d-${idx}`,
      ts: new Date(now - idx * 15_000).toISOString(),
      kind: "SKIP",
      summary: skipSummary
    }));

    const state: BotState = {
      ...defaultBotState(),
      decisions
    };

    const next = helpers.maybeApplyReasonQuarantineLock({
      state,
      summary: skipSummary,
      risk: 50
    });

    const families = helpers.getActiveReasonQuarantineFamilies(next);
    expect(families.has("FEE_EDGE")).toBe(true);
  });

  it("activates reason-level quarantine after repeated grid buy quote insufficiency skips", () => {
    const helpers = service as unknown as {
      maybeApplyReasonQuarantineLock: (params: { state: BotState; summary: string; risk: number }) => BotState;
      getActiveReasonQuarantineFamilies: (
        state: BotState
      ) => Set<"FEE_EDGE" | "GRID_BUY_SIZING" | "GRID_SELL_SIZING" | "GRID_BUY_QUOTE">;
    };

    const now = Date.now();
    const skipSummary = "Skip TRXETH: Insufficient spendable ETH for grid BUY";
    const decisions = Array.from({ length: 4 }).map((_, idx) => ({
      id: `q-${idx}`,
      ts: new Date(now - idx * 15_000).toISOString(),
      kind: "SKIP",
      summary: skipSummary
    }));

    const state: BotState = {
      ...defaultBotState(),
      decisions
    };

    const next = helpers.maybeApplyReasonQuarantineLock({
      state,
      summary: skipSummary,
      risk: 50
    });

    const families = helpers.getActiveReasonQuarantineFamilies(next);
    expect(families.has("GRID_BUY_QUOTE")).toBe(true);
  });

  it("extracts wallet policy snapshot from latest wallet-sweep decision", () => {
    const helpers = service as unknown as {
      extractWalletPolicySnapshot: (state: BotState) => {
        observedAt: string;
        overCap: boolean;
        unmanagedExposurePct: number;
        unmanagedExposureCapPct: number;
        category?: string;
      } | null;
    };

    const state: BotState = {
      ...defaultBotState(),
      decisions: [
        {
          id: "trade-1",
          ts: "2026-02-16T18:00:00.000Z",
          kind: "TRADE",
          summary: "wallet-sweep sample",
          details: {
            mode: "wallet-sweep",
            unmanagedExposurePct: 31.25,
            unmanagedExposureCapPct: 25,
            category: "rebalance",
            sourceAsset: "XRP"
          }
        }
      ]
    };

    const snapshot = helpers.extractWalletPolicySnapshot(state);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.observedAt).toBe("2026-02-16T18:00:00.000Z");
    expect(snapshot?.overCap).toBe(true);
    expect(snapshot?.unmanagedExposurePct).toBe(31.25);
    expect(snapshot?.unmanagedExposureCapPct).toBe(25);
    expect(snapshot?.category).toBe("rebalance");
  });

  it("keeps bear buy-pause confidence threshold risk-linked and tighter", () => {
    const helpers = service as unknown as {
      getBearPauseConfidenceThreshold: (risk: number) => number;
    };

    expect(helpers.getBearPauseConfidenceThreshold(0)).toBe(0.54);
    expect(helpers.getBearPauseConfidenceThreshold(50)).toBe(0.62);
    expect(helpers.getBearPauseConfidenceThreshold(100)).toBe(0.7);
  });

  it("tightens stop-loss in confirmed bear regime", () => {
    const helpers = service as unknown as {
      getRegimeAdjustedStopLossPct: (params: {
        risk: number;
        baseStopLossPct: number;
        regime: {
          label: "BULL_TREND" | "BEAR_TREND" | "RANGE" | "NEUTRAL" | "UNKNOWN";
          confidence: number;
          inputs: Record<string, unknown>;
        };
      }) => number;
    };

    const bearAdjusted = helpers.getRegimeAdjustedStopLossPct({
      risk: 100,
      baseStopLossPct: -2,
      regime: { label: "BEAR_TREND", confidence: 0.9, inputs: {} }
    });
    expect(bearAdjusted).toBe(-0.9);

    const bearLowConfidence = helpers.getRegimeAdjustedStopLossPct({
      risk: 100,
      baseStopLossPct: -2,
      regime: { label: "BEAR_TREND", confidence: 0.5, inputs: {} }
    });
    expect(bearLowConfidence).toBe(-2);

    const bullUnchanged = helpers.getRegimeAdjustedStopLossPct({
      risk: 100,
      baseStopLossPct: -2,
      regime: { label: "BULL_TREND", confidence: 0.95, inputs: {} }
    });
    expect(bullUnchanged).toBe(-2);
  });

  it("applies post stop-loss entry cooldown per symbol", () => {
    const config = {
      basic: { risk: 80 },
      advanced: {
        symbolEntryCooldownMs: 0,
        maxConsecutiveEntriesPerSymbol: 0
      }
    } as unknown as AppConfig;

    const guardedService = new BotEngineService(
      { load: () => config } as unknown as ConfigService,
      {} as unknown as BinanceMarketDataService,
      {} as unknown as BinanceTradingService,
      {} as unknown as ConversionRouterService,
      {} as unknown as UniverseService
    );

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      decisions: [
        {
          id: "sl-1",
          ts: new Date(now - 60_000).toISOString(),
          kind: "TRADE",
          summary: "Binance testnet SELL MARKET ORCAUSDC qty 10 → FILLED (orderId 1 · stop-loss-exit)",
          details: { reason: "stop-loss-exit" }
        }
      ]
    };

    const helpers = guardedService as unknown as {
      getEntryGuard: (params: { symbol: string; state: BotState }) => { summary: string } | null;
    };

    const guarded = helpers.getEntryGuard({ symbol: "ORCAUSDC", state });
    expect(guarded?.summary).toBe("Post stop-loss cooldown active");

    const otherSymbol = helpers.getEntryGuard({ symbol: "BTCUSDC", state });
    expect(otherSymbol).toBeNull();
  });

  it("activates daily loss guard when realized losses exceed risk-linked threshold", () => {
    const helpers = service as unknown as {
      evaluateDailyLossGuard: (params: {
        state: BotState;
        risk: number;
        homeStable: string;
        walletTotalHome: number;
        nowMs: number;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        active: boolean;
        trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
        dailyRealizedPnl: number;
        maxDailyLossAbs: number;
        maxDailyLossPct: number;
      };
    };

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "buy-1",
          ts: new Date(now - 20 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 1
        },
        {
          id: "sell-1",
          ts: new Date(now - 10 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 80,
          qty: 1
        }
      ]
    };

    const guard = helpers.evaluateDailyLossGuard({
      state,
      risk: 0,
      homeStable: "USDC",
      walletTotalHome: 1_000,
      nowMs: now
    });

    expect(guard.active).toBe(true);
    expect(guard.state).toBe("HALT");
    expect(guard.trigger).toBe("ABS_DAILY_LOSS");
    expect(guard.dailyRealizedPnl).toBeCloseTo(-20, 6);
    expect(guard.maxDailyLossPct).toBe(1);
    expect(guard.maxDailyLossAbs).toBeCloseTo(10, 6);
  });

  it("returns CAUTION before HALT threshold", () => {
    const helpers = service as unknown as {
      evaluateDailyLossGuard: (params: {
        state: BotState;
        risk: number;
        homeStable: string;
        walletTotalHome: number;
        nowMs: number;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        active: boolean;
        trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
        dailyRealizedPnl: number;
        maxDailyLossAbs: number;
        maxDailyLossPct: number;
      };
    };

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "buy-1",
          ts: new Date(now - 20 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 1
        },
        {
          id: "sell-1",
          ts: new Date(now - 10 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 70,
          qty: 1
        }
      ]
    };

    const guard = helpers.evaluateDailyLossGuard({
      state,
      risk: 100,
      homeStable: "USDC",
      walletTotalHome: 1_000,
      nowMs: now
    });

    expect(guard.active).toBe(false);
    expect(guard.state).toBe("CAUTION");
    expect(guard.trigger).toBe("ABS_DAILY_LOSS");
    expect(guard.maxDailyLossPct).toBe(4.5);
    expect(guard.maxDailyLossAbs).toBeCloseTo(45, 6);
  });

  it("switches to PROFIT_GIVEBACK caution when gains are mostly given back", () => {
    const helpers = service as unknown as {
      evaluateDailyLossGuard: (params: {
        state: BotState;
        risk: number;
        homeStable: string;
        walletTotalHome: number;
        nowMs: number;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        active: boolean;
        trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
        dailyRealizedPnl: number;
        peakDailyRealizedPnl: number;
        profitGivebackAbs: number;
        profitGivebackPct: number;
      };
    };

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "buy-1",
          ts: new Date(now - 60 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 2
        },
        {
          id: "sell-1",
          ts: new Date(now - 50 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 130,
          qty: 2
        },
        {
          id: "buy-2",
          ts: new Date(now - 40 * 60_000).toISOString(),
          symbol: "BBBUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 2
        },
        {
          id: "sell-2",
          ts: new Date(now - 30 * 60_000).toISOString(),
          symbol: "BBBUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 85,
          qty: 2
        }
      ]
    };

    const guard = helpers.evaluateDailyLossGuard({
      state,
      risk: 0,
      homeStable: "USDC",
      walletTotalHome: 1_000,
      nowMs: now
    });

    expect(guard.active).toBe(false);
    expect(guard.state).toBe("CAUTION");
    expect(guard.trigger).toBe("PROFIT_GIVEBACK");
    expect(guard.peakDailyRealizedPnl).toBeCloseTo(60, 6);
    expect(guard.dailyRealizedPnl).toBeCloseTo(30, 6);
    expect(guard.profitGivebackAbs).toBeCloseTo(30, 6);
    expect(guard.profitGivebackPct).toBeCloseTo(0.5, 6);
  });

  it("activates PROFIT_GIVEBACK caution on high risk with moderate peak", () => {
    const helpers = service as unknown as {
      evaluateDailyLossGuard: (params: {
        state: BotState;
        risk: number;
        homeStable: string;
        walletTotalHome: number;
        nowMs: number;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        active: boolean;
        trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
        dailyRealizedPnl: number;
        peakDailyRealizedPnl: number;
        profitGivebackAbs: number;
        profitGivebackPct: number;
        profitGivebackActivationAbs: number;
      };
    };

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "buy-1",
          ts: new Date(now - 60 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 2
        },
        {
          id: "sell-1",
          ts: new Date(now - 50 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 130,
          qty: 2
        },
        {
          id: "buy-2",
          ts: new Date(now - 40 * 60_000).toISOString(),
          symbol: "BBBUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 2
        },
        {
          id: "sell-2",
          ts: new Date(now - 30 * 60_000).toISOString(),
          symbol: "BBBUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 85,
          qty: 2
        }
      ]
    };

    const guard = helpers.evaluateDailyLossGuard({
      state,
      risk: 100,
      homeStable: "USDC",
      walletTotalHome: 10_000,
      nowMs: now
    });

    expect(guard.active).toBe(false);
    expect(guard.state).toBe("CAUTION");
    expect(guard.trigger).toBe("PROFIT_GIVEBACK");
    expect(guard.profitGivebackActivationAbs).toBeCloseTo(45, 6);
    expect(guard.peakDailyRealizedPnl).toBeCloseTo(60, 6);
    expect(guard.dailyRealizedPnl).toBeCloseTo(30, 6);
    expect(guard.profitGivebackAbs).toBeCloseTo(30, 6);
    expect(guard.profitGivebackPct).toBeCloseTo(0.5, 6);
  });

  it("derives home fees from fills for quote-home and home-base symbols", () => {
    const helpers = service as unknown as {
      deriveOrderFeeHome: (params: {
        symbol: string;
        homeStable: string;
        fills: Array<{ price?: string; qty?: string; commission?: string; commissionAsset?: string }>;
        fallbackPrice?: number;
      }) => { feeHome: number; feeAsset?: string; feeQty?: number; hasUnconvertedFee: boolean };
    };

    const quoteHome = helpers.deriveOrderFeeHome({
      symbol: "BTCUSDC",
      homeStable: "USDC",
      fills: [{ price: "100000", qty: "0.001", commission: "0.000001", commissionAsset: "BTC" }]
    });
    expect(quoteHome.feeHome).toBeCloseTo(0.1, 8);
    expect(quoteHome.hasUnconvertedFee).toBe(false);

    const homeBase = helpers.deriveOrderFeeHome({
      symbol: "USDCUSDT",
      homeStable: "USDC",
      fills: [{ price: "1.0000", qty: "5", commission: "0.01", commissionAsset: "USDT" }]
    });
    expect(homeBase.feeHome).toBeCloseTo(0.01, 8);
    expect(homeBase.hasUnconvertedFee).toBe(false);
  });

  it("flags unconverted fee assets when fill asset cannot be mapped to home", () => {
    const helpers = service as unknown as {
      deriveOrderFeeHome: (params: {
        symbol: string;
        homeStable: string;
        fills: Array<{ price?: string; qty?: string; commission?: string; commissionAsset?: string }>;
        fallbackPrice?: number;
      }) => { feeHome: number; feeAsset?: string; feeQty?: number; hasUnconvertedFee: boolean };
    };

    const fee = helpers.deriveOrderFeeHome({
      symbol: "BTCUSDT",
      homeStable: "USDC",
      fills: [{ price: "100000", qty: "0.001", commission: "0.01", commissionAsset: "BNB" }]
    });

    expect(fee.feeHome).toBe(0);
    expect(fee.hasUnconvertedFee).toBe(true);
  });

  it("downgrades PROFIT_GIVEBACK HALT to CAUTION when managed exposure is low", () => {
    const helpers = service as unknown as {
      evaluateDailyLossGuard: (params: {
        state: BotState;
        risk: number;
        homeStable: string;
        walletTotalHome: number;
        nowMs: number;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        active: boolean;
        trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
        dailyRealizedPnl: number;
        peakDailyRealizedPnl: number;
        profitGivebackPct: number;
        managedExposurePct: number;
        profitGivebackHaltMinExposurePct: number;
      };
    };

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "buy-1",
          ts: new Date(now - 80 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 2
        },
        {
          id: "sell-1",
          ts: new Date(now - 70 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 130,
          qty: 2
        },
        {
          id: "buy-2",
          ts: new Date(now - 60 * 60_000).toISOString(),
          symbol: "BBBUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 2
        },
        {
          id: "sell-2",
          ts: new Date(now - 50 * 60_000).toISOString(),
          symbol: "BBBUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 70,
          qty: 2
        }
      ]
    };

    const guard = helpers.evaluateDailyLossGuard({
      state,
      risk: 100,
      homeStable: "USDC",
      walletTotalHome: 10_000,
      nowMs: now
    });

    expect(guard.peakDailyRealizedPnl).toBeCloseTo(60, 6);
    expect(guard.dailyRealizedPnl).toBeCloseTo(0, 6);
    expect(guard.profitGivebackPct).toBeCloseTo(1, 6);
    expect(guard.managedExposurePct).toBe(0);
    expect(guard.profitGivebackHaltMinExposurePct).toBeCloseTo(0.08, 6);
    expect(guard.active).toBe(false);
    expect(guard.state).toBe("CAUTION");
    expect(guard.trigger).toBe("PROFIT_GIVEBACK");
  });

  it("keeps PROFIT_GIVEBACK in HALT when managed exposure stays high", () => {
    const helpers = service as unknown as {
      evaluateDailyLossGuard: (params: {
        state: BotState;
        risk: number;
        homeStable: string;
        walletTotalHome: number;
        nowMs: number;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        active: boolean;
        trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
        managedExposurePct: number;
        profitGivebackHaltMinExposurePct: number;
      };
    };

    const now = Date.now();
    const state: BotState = {
      ...defaultBotState(),
      orderHistory: [
        {
          id: "buy-1",
          ts: new Date(now - 80 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 2
        },
        {
          id: "sell-1",
          ts: new Date(now - 70 * 60_000).toISOString(),
          symbol: "AAAUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 130,
          qty: 2
        },
        {
          id: "buy-2",
          ts: new Date(now - 60 * 60_000).toISOString(),
          symbol: "BBBUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 2
        },
        {
          id: "sell-2",
          ts: new Date(now - 50 * 60_000).toISOString(),
          symbol: "BBBUSDC",
          side: "SELL",
          type: "MARKET",
          status: "FILLED",
          price: 70,
          qty: 2
        },
        {
          id: "buy-3",
          ts: new Date(now - 40 * 60_000).toISOString(),
          symbol: "CCCUSDC",
          side: "BUY",
          type: "MARKET",
          status: "FILLED",
          price: 100,
          qty: 10
        }
      ]
    };

    const guard = helpers.evaluateDailyLossGuard({
      state,
      risk: 100,
      homeStable: "USDC",
      walletTotalHome: 10_000,
      nowMs: now
    });

    expect(guard.managedExposurePct).toBeGreaterThan(guard.profitGivebackHaltMinExposurePct);
    expect(guard.active).toBe(true);
    expect(guard.state).toBe("HALT");
    expect(guard.trigger).toBe("PROFIT_GIVEBACK");
  });

  it("maps active STOPLOSS_GUARD lock to HALT runtime risk state", () => {
    const helpers = service as unknown as {
      buildRuntimeRiskState: (params: {
        dailyLossGuard: {
          state: "NORMAL" | "CAUTION" | "HALT";
          active: boolean;
          trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
          dailyRealizedPnl: number;
          peakDailyRealizedPnl: number;
          profitGivebackAbs: number;
          profitGivebackPct: number;
          profitGivebackActivationAbs: number;
          profitGivebackCautionPct: number;
          profitGivebackHaltPct: number;
          maxDailyLossAbs: number;
          maxDailyLossPct: number;
          lookbackMs: number;
          windowStartIso: string;
        };
        homeStable: string;
        activeGlobalLock?: {
          type: "COOLDOWN" | "STOPLOSS_GUARD" | "MAX_DRAWDOWN" | "LOW_PROFIT" | "GRID_GUARD_BUY_PAUSE";
          scope: "GLOBAL" | "SYMBOL";
          reason: string;
          expiresAt: string;
        } | null;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        reason_codes: string[];
        unwind_only: boolean;
        resume_conditions: string[];
      };
    };

    const riskState = helpers.buildRuntimeRiskState({
      homeStable: "USDC",
      dailyLossGuard: {
        state: "NORMAL",
        active: false,
        trigger: "NONE",
        dailyRealizedPnl: 5,
        peakDailyRealizedPnl: 8,
        profitGivebackAbs: 3,
        profitGivebackPct: 0.375,
        profitGivebackActivationAbs: 10,
        profitGivebackCautionPct: 0.3,
        profitGivebackHaltPct: 0.55,
        maxDailyLossAbs: 40,
        maxDailyLossPct: 4,
        lookbackMs: 24 * 60 * 60_000,
        windowStartIso: "2026-02-20T00:00:00.000Z"
      },
      activeGlobalLock: {
        type: "STOPLOSS_GUARD",
        scope: "GLOBAL",
        reason: "5 stop-loss exits in last 45m",
        expiresAt: "2026-02-20T16:37:46.000Z"
      }
    });

    expect(riskState.state).toBe("HALT");
    expect(riskState.unwind_only).toBe(true);
    expect(riskState.reason_codes.some((r) => r.includes("PROTECTION_LOCK_STOPLOSS_GUARD"))).toBe(true);
  });

  it("scales daily-loss caution entry pause cooldown with risk", () => {
    const helpers = service as unknown as {
      deriveCautionEntryPauseCooldownMs: (risk: number) => number;
    };

    expect(helpers.deriveCautionEntryPauseCooldownMs(0)).toBe(360000);
    expect(helpers.deriveCautionEntryPauseCooldownMs(50)).toBe(240000);
    expect(helpers.deriveCautionEntryPauseCooldownMs(100)).toBe(120000);
  });

  it("scales grid-guard no-inventory cooldown with risk", () => {
    const helpers = service as unknown as {
      deriveGridGuardNoInventoryCooldownMs: (risk: number) => number;
    };

    expect(helpers.deriveGridGuardNoInventoryCooldownMs(0)).toBe(720000);
    expect(helpers.deriveGridGuardNoInventoryCooldownMs(50)).toBe(480000);
    expect(helpers.deriveGridGuardNoInventoryCooldownMs(100)).toBe(240000);
  });

  it("extends waiting rotation cooldown when both grid ladder legs are already resting", () => {
    const helpers = service as unknown as {
      deriveGridWaitingRotationCooldownMs: (params: {
        risk: number;
        hasBuyLimit: boolean;
        hasSellLimit: boolean;
        staleTtlMinutes?: number;
      }) => number;
    };

    expect(
      helpers.deriveGridWaitingRotationCooldownMs({
        risk: 100,
        hasBuyLimit: false,
        hasSellLimit: true,
        staleTtlMinutes: 30
      })
    ).toBe(240000);

    expect(
      helpers.deriveGridWaitingRotationCooldownMs({
        risk: 100,
        hasBuyLimit: true,
        hasSellLimit: true,
        staleTtlMinutes: 30
      })
    ).toBe(600000);
  });

  it("scales countable managed-position exposure floor with risk", () => {
    const helpers = service as unknown as {
      deriveManagedPositionMinCountableExposureHome: (risk: number) => number;
    };

    expect(helpers.deriveManagedPositionMinCountableExposureHome(0)).toBe(10);
    expect(helpers.deriveManagedPositionMinCountableExposureHome(50)).toBe(7.5);
    expect(helpers.deriveManagedPositionMinCountableExposureHome(100)).toBe(5);
  });

  it("counts managed positions only when exposure floor is met", () => {
    const helpers = service as unknown as {
      isManagedPositionCountable: (
        position: { netQty: number; costQuote: number },
        minExposureHome: number
      ) => boolean;
    };

    expect(helpers.isManagedPositionCountable({ netQty: 1, costQuote: 5.01 }, 5)).toBe(true);
    expect(helpers.isManagedPositionCountable({ netQty: 1, costQuote: 4.99 }, 5)).toBe(false);
    expect(helpers.isManagedPositionCountable({ netQty: 0, costQuote: 100 }, 5)).toBe(false);
  });

  it("restricts caution candidate selection to managed symbols only when needed", () => {
    const helpers = service as unknown as {
      shouldRestrictCautionToManagedSymbols: (params: {
        tradeMode: "SPOT" | "SPOT_GRID" | "FUTURES";
        riskState: "NORMAL" | "CAUTION" | "HALT";
        openHomePositionCount: number;
        managedExposurePct: number | null;
        minManagedExposurePct: number;
      }) => boolean;
    };

    expect(
      helpers.shouldRestrictCautionToManagedSymbols({
        tradeMode: "SPOT_GRID",
        riskState: "CAUTION",
        openHomePositionCount: 3,
        managedExposurePct: 0.12,
        minManagedExposurePct: 0.03
      })
    ).toBe(true);
    expect(
      helpers.shouldRestrictCautionToManagedSymbols({
        tradeMode: "SPOT_GRID",
        riskState: "CAUTION",
        openHomePositionCount: 0,
        managedExposurePct: 0.12,
        minManagedExposurePct: 0.03
      })
    ).toBe(false);
    expect(
      helpers.shouldRestrictCautionToManagedSymbols({
        tradeMode: "SPOT",
        riskState: "CAUTION",
        openHomePositionCount: 3,
        managedExposurePct: 0.12,
        minManagedExposurePct: 0.03
      })
    ).toBe(false);
    expect(
      helpers.shouldRestrictCautionToManagedSymbols({
        tradeMode: "SPOT_GRID",
        riskState: "HALT",
        openHomePositionCount: 3,
        managedExposurePct: 0.12,
        minManagedExposurePct: 0.03
      })
    ).toBe(false);
    expect(
      helpers.shouldRestrictCautionToManagedSymbols({
        tradeMode: "SPOT_GRID",
        riskState: "CAUTION",
        openHomePositionCount: 3,
        managedExposurePct: 0.02,
        minManagedExposurePct: 0.03
      })
    ).toBe(false);
    expect(
      helpers.shouldRestrictCautionToManagedSymbols({
        tradeMode: "SPOT_GRID",
        riskState: "CAUTION",
        openHomePositionCount: 3,
        managedExposurePct: null,
        minManagedExposurePct: 0.03
      })
    ).toBe(true);
  });

  it("scales caution managed-symbol-only exposure floor with risk", () => {
    const helpers = service as unknown as {
      deriveCautionManagedSymbolOnlyMinExposurePct: (risk: number) => number;
    };

    expect(helpers.deriveCautionManagedSymbolOnlyMinExposurePct(0)).toBe(0.1);
    expect(helpers.deriveCautionManagedSymbolOnlyMinExposurePct(50)).toBe(0.065);
    expect(helpers.deriveCautionManagedSymbolOnlyMinExposurePct(100)).toBe(0.03);
  });

  it("extracts managed exposure pct from runtime risk-state reasons", () => {
    const helpers = service as unknown as {
      extractRiskStateManagedExposurePct: (riskState:
        | {
            state: "NORMAL" | "CAUTION" | "HALT";
            reason_codes: string[];
            unwind_only: boolean;
            resume_conditions: string[];
          }
        | undefined) => number | null;
    };

    expect(
      helpers.extractRiskStateManagedExposurePct({
        state: "CAUTION",
        reason_codes: ["DAILY_LOSS_GUARD", "managedExposure=0.2%"],
        unwind_only: false,
        resume_conditions: []
      })
    ).toBeCloseTo(0.002, 8);
    expect(
      helpers.extractRiskStateManagedExposurePct({
        state: "CAUTION",
        reason_codes: ["DAILY_LOSS_GUARD"],
        unwind_only: false,
        resume_conditions: []
      })
    ).toBeNull();
  });

  it("extracts risk-state trigger and halt exposure floor from reasons", () => {
    const helpers = service as unknown as {
      extractRiskStateTrigger: (riskState:
        | {
            state: "NORMAL" | "CAUTION" | "HALT";
            reason_codes: string[];
            unwind_only: boolean;
            resume_conditions: string[];
          }
        | undefined) => "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK" | null;
      extractRiskStateHaltExposureFloorPct: (riskState:
        | {
            state: "NORMAL" | "CAUTION" | "HALT";
            reason_codes: string[];
            unwind_only: boolean;
            resume_conditions: string[];
          }
        | undefined) => number | null;
    };

    const riskState = {
      state: "CAUTION" as const,
      reason_codes: ["DAILY_LOSS_GUARD", "trigger=PROFIT_GIVEBACK", "managedExposure=7.9%", "haltExposureFloor=8.0%"],
      unwind_only: false,
      resume_conditions: []
    };

    expect(helpers.extractRiskStateTrigger(riskState)).toBe("PROFIT_GIVEBACK");
    expect(helpers.extractRiskStateHaltExposureFloorPct(riskState)).toBeCloseTo(0.08, 8);
    expect(helpers.extractRiskStateTrigger(undefined)).toBeNull();
    expect(
      helpers.extractRiskStateHaltExposureFloorPct({
        state: "CAUTION",
        reason_codes: ["haltExposureFloor=bad"],
        unwind_only: false,
        resume_conditions: []
      })
    ).toBeNull();
  });

  it("uses halt exposure floor for PROFIT_GIVEBACK caution pause threshold", () => {
    const helpers = service as unknown as {
      deriveCautionPauseNewSymbolsMinExposurePct: (params: {
        risk: number;
        trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
        haltExposureFloorPct: number | null;
      }) => number;
    };

    expect(
      helpers.deriveCautionPauseNewSymbolsMinExposurePct({
        risk: 100,
        trigger: "PROFIT_GIVEBACK",
        haltExposureFloorPct: 0.08
      })
    ).toBe(0.08);
    expect(
      helpers.deriveCautionPauseNewSymbolsMinExposurePct({
        risk: 100,
        trigger: "PROFIT_GIVEBACK",
        haltExposureFloorPct: null
      })
    ).toBe(0.03);
    expect(
      helpers.deriveCautionPauseNewSymbolsMinExposurePct({
        risk: 100,
        trigger: "ABS_DAILY_LOSS",
        haltExposureFloorPct: 0.08
      })
    ).toBe(0.03);
  });

  it("suppresses stalled grid candidates when they cannot take action", () => {
    const helpers = service as unknown as {
      shouldSuppressGridStalledCandidate: (params: {
        canTakeAction: boolean;
        waiting: boolean;
        buyPaused: boolean;
        hasInventory: boolean;
        hasBuyLimit: boolean;
        hasSellLimit: boolean;
        recentInventoryWaitingSkips: number;
        inventoryWaitingPressureActive: boolean;
      }) => boolean;
    };

    expect(
      helpers.shouldSuppressGridStalledCandidate({
        canTakeAction: false,
        waiting: false,
        buyPaused: true,
        hasInventory: false,
        hasBuyLimit: false,
        hasSellLimit: false,
        recentInventoryWaitingSkips: 0,
        inventoryWaitingPressureActive: false
      })
    ).toBe(true);
    expect(
      helpers.shouldSuppressGridStalledCandidate({
        canTakeAction: false,
        waiting: true,
        buyPaused: false,
        hasInventory: true,
        hasBuyLimit: true,
        hasSellLimit: true,
        recentInventoryWaitingSkips: 2,
        inventoryWaitingPressureActive: false
      })
    ).toBe(true);
    expect(
      helpers.shouldSuppressGridStalledCandidate({
        canTakeAction: false,
        waiting: true,
        buyPaused: false,
        hasInventory: true,
        hasBuyLimit: true,
        hasSellLimit: true,
        recentInventoryWaitingSkips: 0,
        inventoryWaitingPressureActive: true
      })
    ).toBe(true);
    expect(
      helpers.shouldSuppressGridStalledCandidate({
        canTakeAction: false,
        waiting: false,
        buyPaused: true,
        hasInventory: true,
        hasBuyLimit: false,
        hasSellLimit: true,
        recentInventoryWaitingSkips: 0,
        inventoryWaitingPressureActive: false
      })
    ).toBe(true);
    expect(
      helpers.shouldSuppressGridStalledCandidate({
        canTakeAction: false,
        waiting: false,
        buyPaused: false,
        hasInventory: false,
        hasBuyLimit: true,
        hasSellLimit: false,
        recentInventoryWaitingSkips: 0,
        inventoryWaitingPressureActive: false
      })
    ).toBe(true);
    expect(
      helpers.shouldSuppressGridStalledCandidate({
        canTakeAction: true,
        waiting: true,
        buyPaused: true,
        hasInventory: false,
        hasBuyLimit: true,
        hasSellLimit: true,
        recentInventoryWaitingSkips: 10,
        inventoryWaitingPressureActive: true
      })
    ).toBe(false);
  });

  it("reclassifies buy sizing rejects as quote insufficiency when spendable quote cannot meet minimum order", () => {
    const helpers = service as unknown as {
      shouldTreatGridBuySizingRejectAsQuoteInsufficient: (params: {
        check: {
          ok: boolean;
          reason?: string;
          normalizedQty?: string;
          requiredQty?: string;
          minNotional?: string;
        };
        price: number;
        bufferFactor: number;
        quoteSpendable: number;
      }) => boolean;
    };

    expect(
      helpers.shouldTreatGridBuySizingRejectAsQuoteInsufficient({
        check: {
          ok: false,
          reason: "Below minQty 0.10000000",
          normalizedQty: "0",
          requiredQty: "0.1",
          minNotional: "5.00000000"
        },
        price: 1,
        bufferFactor: 1,
        quoteSpendable: 0.04
      })
    ).toBe(true);

    expect(
      helpers.shouldTreatGridBuySizingRejectAsQuoteInsufficient({
        check: {
          ok: false,
          reason: "Below minQty 0.10000000",
          normalizedQty: "0",
          requiredQty: "0.1",
          minNotional: "5.00000000"
        },
        price: 1,
        bufferFactor: 1,
        quoteSpendable: 6
      })
    ).toBe(false);

    expect(
      helpers.shouldTreatGridBuySizingRejectAsQuoteInsufficient({
        check: {
          ok: false,
          reason: "Below minQty 0.10000000",
          normalizedQty: "0"
        },
        price: 1,
        bufferFactor: 1,
        quoteSpendable: 0.04
      })
    ).toBe(true);
  });

  it("suppresses quote-starved grid candidates only when they cannot still place a sell leg", () => {
    const helpers = service as unknown as {
      shouldSuppressGridQuoteStarvedCandidate: (params: {
        quoteQuarantineActive: boolean;
        recentGridBuyQuoteInsufficient: number;
        hasBuyLimit: boolean;
        missingSellLeg: boolean;
        risk: number;
      }) => boolean;
    };

    expect(
      helpers.shouldSuppressGridQuoteStarvedCandidate({
        quoteQuarantineActive: true,
        recentGridBuyQuoteInsufficient: 2,
        hasBuyLimit: false,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldSuppressGridQuoteStarvedCandidate({
        quoteQuarantineActive: false,
        recentGridBuyQuoteInsufficient: 2,
        hasBuyLimit: false,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldSuppressGridQuoteStarvedCandidate({
        quoteQuarantineActive: false,
        recentGridBuyQuoteInsufficient: 1,
        hasBuyLimit: false,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(false);

    expect(
      helpers.shouldSuppressGridQuoteStarvedCandidate({
        quoteQuarantineActive: true,
        recentGridBuyQuoteInsufficient: 2,
        hasBuyLimit: false,
        missingSellLeg: true,
        risk: 100
      })
    ).toBe(false);

    expect(
      helpers.shouldSuppressGridQuoteStarvedCandidate({
        quoteQuarantineActive: true,
        recentGridBuyQuoteInsufficient: 2,
        hasBuyLimit: true,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(false);
  });

  it("suppresses repeated entry-cooldown grid candidates only when they cannot still place a sell leg", () => {
    const helpers = service as unknown as {
      shouldSuppressGridEntryGuardCandidate: (params: {
        hasEntryGuard: boolean;
        missingSellLeg: boolean;
        recentEntryGuardSkips: number;
        risk: number;
      }) => boolean;
    };

    expect(
      helpers.shouldSuppressGridEntryGuardCandidate({
        hasEntryGuard: true,
        missingSellLeg: false,
        recentEntryGuardSkips: 2,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldSuppressGridEntryGuardCandidate({
        hasEntryGuard: true,
        missingSellLeg: false,
        recentEntryGuardSkips: 1,
        risk: 100
      })
    ).toBe(false);

    expect(
      helpers.shouldSuppressGridEntryGuardCandidate({
        hasEntryGuard: true,
        missingSellLeg: true,
        recentEntryGuardSkips: 3,
        risk: 100
      })
    ).toBe(false);
  });

  it("suppresses quote-asset families during active buy-quote quarantine only when no sell leg is actionable", () => {
    const helpers = service as unknown as {
      shouldSuppressGridQuoteAssetCandidate: (params: {
        quoteQuarantineActive: boolean;
        recentQuoteAssetBuyQuoteInsufficient: number;
        missingSellLeg: boolean;
        risk: number;
      }) => boolean;
    };

    expect(
      helpers.shouldSuppressGridQuoteAssetCandidate({
        quoteQuarantineActive: false,
        recentQuoteAssetBuyQuoteInsufficient: 2,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldSuppressGridQuoteAssetCandidate({
        quoteQuarantineActive: true,
        recentQuoteAssetBuyQuoteInsufficient: 1,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldSuppressGridQuoteAssetCandidate({
        quoteQuarantineActive: true,
        recentQuoteAssetBuyQuoteInsufficient: 3,
        missingSellLeg: true,
        risk: 100
      })
    ).toBe(false);

    expect(
      helpers.shouldSuppressGridQuoteAssetCandidate({
        quoteQuarantineActive: false,
        recentQuoteAssetBuyQuoteInsufficient: 1,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(false);
  });

  it("suppresses repeated fee-edge grid candidates only when no sell leg is actionable", () => {
    const helpers = service as unknown as {
      shouldSuppressGridFeeEdgeCandidate: (params: {
        feeEdgeQuarantineActive: boolean;
        recentFeeEdgeRejects: number;
        missingSellLeg: boolean;
        risk: number;
      }) => boolean;
    };

    expect(
      helpers.shouldSuppressGridFeeEdgeCandidate({
        feeEdgeQuarantineActive: false,
        recentFeeEdgeRejects: 2,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldSuppressGridFeeEdgeCandidate({
        feeEdgeQuarantineActive: true,
        recentFeeEdgeRejects: 1,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldSuppressGridFeeEdgeCandidate({
        feeEdgeQuarantineActive: false,
        recentFeeEdgeRejects: 1,
        missingSellLeg: false,
        risk: 100
      })
    ).toBe(false);

    expect(
      helpers.shouldSuppressGridFeeEdgeCandidate({
        feeEdgeQuarantineActive: true,
        recentFeeEdgeRejects: 3,
        missingSellLeg: true,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldSuppressGridFeeEdgeCandidate({
        feeEdgeQuarantineActive: false,
        recentFeeEdgeRejects: 2,
        missingSellLeg: true,
        risk: 100
      })
    ).toBe(false);
  });

  it("normalizes reserve targets into quote units for non-home execution quotes", async () => {
    const helpers = service as unknown as {
      deriveQuoteReserveTargets: (params: {
        config?: AppConfig;
        walletTotalHome: number;
        capitalProfile: {
          tier: "MICRO" | "SMALL" | "STANDARD";
          notionalCapMultiplier: number;
          reserveLowPct: number;
          reserveHighPct: number;
          minNetEdgePct: number;
        };
        risk: number;
        quoteAsset: string;
        homeStable: string;
        bridgeAssets: string[];
      }) => Promise<{
        floorTopUpTarget: number;
        reserveLowTarget: number;
        reserveHighTarget: number;
        reserveHardTarget: number;
      }>;
    };

    const estimateSpy = vi
      .spyOn(service as unknown as { estimateAssetValueInHome: BotEngineService["estimateAssetValueInHome"] }, "estimateAssetValueInHome")
      .mockImplementation(async (asset: string, amount: number) => {
        if (asset === "ETH" && amount === 1) return 2_000;
        if (asset === "USDC" && amount === 1) return 1;
        return null;
      });

    const targets = await helpers.deriveQuoteReserveTargets({
      config: {
        advanced: {
          conversionTopUpMinTarget: 5,
          conversionTopUpReserveMultiplier: 2
        }
      } as unknown as AppConfig,
      walletTotalHome: 1_000,
      capitalProfile: {
        tier: "MICRO",
        notionalCapMultiplier: 1,
        reserveLowPct: 0.01,
        reserveHighPct: 0.02,
        minNetEdgePct: 0.1
      },
      risk: 100,
      quoteAsset: "ETH",
      homeStable: "USDC",
      bridgeAssets: ["BTC", "ETH"]
    });

    expect(targets.floorTopUpTarget).toBeCloseTo(0.0025, 8);
    expect(targets.reserveLowTarget).toBeCloseTo(0.005, 8);
    expect(targets.reserveHighTarget).toBeCloseTo(0.01, 8);
    expect(targets.reserveHardTarget).toBeCloseTo(0.0025, 8);

    estimateSpy.mockRestore();
  });

  it("scales global-lock unwind cooldown with risk", () => {
    const helpers = service as unknown as {
      deriveGlobalLockUnwindCooldownMs: (risk: number) => number;
    };

    expect(helpers.deriveGlobalLockUnwindCooldownMs(0)).toBe(1200000);
    expect(helpers.deriveGlobalLockUnwindCooldownMs(50)).toBe(840000);
    expect(helpers.deriveGlobalLockUnwindCooldownMs(100)).toBe(480000);
  });

  it("derives trigger-aware daily-loss HALT unwind policy", () => {
    const helpers = service as unknown as {
      deriveDailyLossHaltUnwindPolicy: (params: { risk: number; trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK" }) => {
        cooldownMs: number;
        fraction: number;
      };
    };

    expect(helpers.deriveDailyLossHaltUnwindPolicy({ risk: 0, trigger: "ABS_DAILY_LOSS" })).toEqual({
      cooldownMs: 1080000,
      fraction: 0.5
    });
    expect(helpers.deriveDailyLossHaltUnwindPolicy({ risk: 100, trigger: "ABS_DAILY_LOSS" })).toEqual({
      cooldownMs: 480000,
      fraction: 0.32
    });
    expect(helpers.deriveDailyLossHaltUnwindPolicy({ risk: 0, trigger: "PROFIT_GIVEBACK" })).toEqual({
      cooldownMs: 1800000,
      fraction: 0.32
    });
    expect(helpers.deriveDailyLossHaltUnwindPolicy({ risk: 100, trigger: "PROFIT_GIVEBACK" })).toEqual({
      cooldownMs: 720000,
      fraction: 0.18
    });
  });

  it("activates caution unwind only for profit-giveback caution with sufficiently high managed exposure", () => {
    const helpers = service as unknown as {
      shouldRunDailyLossCautionUnwind: (params: {
        guard: {
          state: "NORMAL" | "CAUTION" | "HALT";
          trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
          managedExposurePct: number;
        };
        risk: number;
      }) => boolean;
    };

    expect(
      helpers.shouldRunDailyLossCautionUnwind({
        guard: { state: "CAUTION", trigger: "PROFIT_GIVEBACK", managedExposurePct: 0.25 },
        risk: 100
      })
    ).toBe(true);
    expect(
      helpers.shouldRunDailyLossCautionUnwind({
        guard: { state: "CAUTION", trigger: "PROFIT_GIVEBACK", managedExposurePct: 0.1 },
        risk: 100
      })
    ).toBe(false);
    expect(
      helpers.shouldRunDailyLossCautionUnwind({
        guard: { state: "CAUTION", trigger: "ABS_DAILY_LOSS", managedExposurePct: 0.4 },
        risk: 100
      })
    ).toBe(false);
  });

  it("derives lighter caution unwind policy before HALT", () => {
    const helpers = service as unknown as {
      deriveDailyLossCautionUnwindPolicy: (params: { risk: number; trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK" }) => {
        cooldownMs: number;
        fraction: number;
      };
    };

    expect(helpers.deriveDailyLossCautionUnwindPolicy({ risk: 0, trigger: "PROFIT_GIVEBACK" })).toEqual({
      cooldownMs: 1440000,
      fraction: 0.24
    });
    expect(helpers.deriveDailyLossCautionUnwindPolicy({ risk: 100, trigger: "PROFIT_GIVEBACK" })).toEqual({
      cooldownMs: 600000,
      fraction: 0.12
    });
  });

  it("activates defensive grid-guard unwind only for repeated bear-trend loops on home-quote inventory", () => {
    const helpers = service as unknown as {
      shouldRunDefensiveGridGuardUnwind: (params: {
        executionLane: "GRID" | "MARKET" | "DEFENSIVE";
        riskState: "NORMAL" | "CAUTION" | "HALT";
        buyPaused: boolean;
        hasInventory: boolean;
        quoteIsHome: boolean;
        recentBuyPauseSkips: number;
        recentInventoryWaitingSkips: number;
        recentGridSellSizingRejects: number;
        risk: number;
      }) => boolean;
    };

    expect(
      helpers.shouldRunDefensiveGridGuardUnwind({
        executionLane: "DEFENSIVE",
        riskState: "NORMAL",
        buyPaused: true,
        hasInventory: true,
        quoteIsHome: true,
        recentBuyPauseSkips: 17,
        recentInventoryWaitingSkips: 16,
        recentGridSellSizingRejects: 0,
        risk: 100
      })
    ).toBe(true);

    expect(
      helpers.shouldRunDefensiveGridGuardUnwind({
        executionLane: "DEFENSIVE",
        riskState: "CAUTION",
        buyPaused: true,
        hasInventory: true,
        quoteIsHome: true,
        recentBuyPauseSkips: 17,
        recentInventoryWaitingSkips: 16,
        recentGridSellSizingRejects: 0,
        risk: 100
      })
    ).toBe(false);

    expect(
      helpers.shouldRunDefensiveGridGuardUnwind({
        executionLane: "DEFENSIVE",
        riskState: "NORMAL",
        buyPaused: true,
        hasInventory: true,
        quoteIsHome: false,
        recentBuyPauseSkips: 17,
        recentInventoryWaitingSkips: 16,
        recentGridSellSizingRejects: 0,
        risk: 100
      })
    ).toBe(false);
  });

  it("derives tighter defensive grid-guard unwind policy for concentrated high-confidence bear loops", () => {
    const helpers = service as unknown as {
      deriveDefensiveGridGuardUnwindPolicy: (params: {
        risk: number;
        regimeConfidence: number;
        positionExposurePct: number;
      }) => { cooldownMs: number; fraction: number };
    };

    expect(
      helpers.deriveDefensiveGridGuardUnwindPolicy({
        risk: 100,
        regimeConfidence: 0.9,
        positionExposurePct: 18
      })
    ).toEqual({
      cooldownMs: 680400,
      fraction: 0.18
    });
  });

  it("formats daily-loss guard summary for profit-giveback trigger", () => {
    const helpers = service as unknown as {
      buildDailyLossGuardSkipSummary: (guard: {
        state: "NORMAL" | "CAUTION" | "HALT";
        trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
        peakDailyRealizedPnl: number;
        profitGivebackPct: number;
        profitGivebackCautionPct: number;
        profitGivebackHaltPct: number;
        dailyRealizedPnl: number;
        maxDailyLossAbs: number;
      }, homeStable: string) => string;
    };

    const summary = helpers.buildDailyLossGuardSkipSummary(
      {
        state: "HALT",
        trigger: "PROFIT_GIVEBACK",
        peakDailyRealizedPnl: 40,
        profitGivebackPct: 0.72,
        profitGivebackCautionPct: 0.45,
        profitGivebackHaltPct: 0.7,
        dailyRealizedPnl: 11,
        maxDailyLossAbs: 380
      },
      "USDC"
    );
    expect(summary).toContain("profit giveback");
    expect(summary).toContain("72.0%");
    expect(summary).toContain("70.0%");
  });

  it("treats fee-edge compare as pass when values match at 3-decimal precision", () => {
    const helpers = service as unknown as {
      isFeeEdgeSufficient: (netEdgePct: number, minNetEdgePct: number) => boolean;
    };

    expect(helpers.isFeeEdgeSufficient(0.05198, 0.05201)).toBe(true);
    expect(helpers.isFeeEdgeSufficient(0.0514, 0.05201)).toBe(false);
  });

  it("penalizes grid score in bear trend", () => {
    const helpers = service as unknown as {
      buildAdaptiveStrategyScores: (candidate: UniverseCandidate | null, regime: "BEAR_TREND" | "RANGE") => {
        grid: number;
      };
    };

    const candidate: UniverseCandidate = {
      symbol: "SOLUSDC",
      baseAsset: "SOL",
      quoteAsset: "USDC",
      lastPrice: 80,
      quoteVolume24h: 1_000_000,
      priceChangePct24h: -3.1,
      adx14: 31,
      rsi14: 39,
      atrPct14: 1.4,
      score: 1,
      reasons: []
    };

    const bear = helpers.buildAdaptiveStrategyScores(candidate, "BEAR_TREND");
    const range = helpers.buildAdaptiveStrategyScores(candidate, "RANGE");
    expect(bear.grid).toBeLessThan(range.grid);
  });

  it("routes SPOT_GRID execution lane by regime and confidence", () => {
    const helpers = service as unknown as {
      resolveExecutionLane: (params: {
        tradeMode: "SPOT" | "SPOT_GRID";
        gridEnabled: boolean;
        risk: number;
        regime: { label: "BULL_TREND" | "BEAR_TREND" | "RANGE" | "NEUTRAL" | "UNKNOWN"; confidence: number };
        strategy: { trend: number; meanReversion: number; grid: number; recommended: "TREND" | "MEAN_REVERSION" | "GRID" };
      }) => "GRID" | "MARKET" | "DEFENSIVE";
    };

    expect(
      helpers.resolveExecutionLane({
        tradeMode: "SPOT_GRID",
        gridEnabled: true,
        risk: 100,
        regime: { label: "BEAR_TREND", confidence: 0.75 },
        strategy: { trend: 0.2, meanReversion: 0.5, grid: 0.4, recommended: "MEAN_REVERSION" }
      })
    ).toBe("DEFENSIVE");

    expect(
      helpers.resolveExecutionLane({
        tradeMode: "SPOT_GRID",
        gridEnabled: true,
        risk: 100,
        regime: { label: "BULL_TREND", confidence: 0.8 },
        strategy: { trend: 0.7, meanReversion: 0.3, grid: 0.35, recommended: "TREND" }
      })
    ).toBe("MARKET");

    expect(
      helpers.resolveExecutionLane({
        tradeMode: "SPOT_GRID",
        gridEnabled: true,
        risk: 50,
        regime: { label: "RANGE", confidence: 0.55 },
        strategy: { trend: 0.3, meanReversion: 0.4, grid: 0.6, recommended: "GRID" }
      })
    ).toBe("GRID");
  });
});

describe("bot-engine multi-quote execution policy", () => {
  const service = new BotEngineService(
    { load: () => null } as unknown as ConfigService,
    {} as unknown as BinanceMarketDataService,
    {} as unknown as BinanceTradingService,
    {} as unknown as ConversionRouterService,
    {} as unknown as UniverseService
  );

  it("widens execution quote allowlist as risk increases", () => {
    const helpers = service as unknown as {
      resolveExecutionQuoteAssets: (params: {
        config: AppConfig | null;
        homeStable: string;
        traderRegion: "EEA" | "NON_EEA";
        risk: number;
      }) => Set<string>;
    };

    const lowRiskQuotes = helpers.resolveExecutionQuoteAssets({
      config: null,
      homeStable: "USDC",
      traderRegion: "NON_EEA",
      risk: 20
    });
    const highRiskQuotes = helpers.resolveExecutionQuoteAssets({
      config: null,
      homeStable: "USDC",
      traderRegion: "NON_EEA",
      risk: 90
    });

    expect(lowRiskQuotes.has("USDC")).toBe(true);
    expect(lowRiskQuotes.has("USDT")).toBe(true);
    expect(lowRiskQuotes.has("JPY")).toBe(false);
    expect(lowRiskQuotes.has("BTC")).toBe(false);

    expect(highRiskQuotes.has("USDC")).toBe(true);
    expect(highRiskQuotes.has("USDT")).toBe(true);
    expect(highRiskQuotes.has("JPY")).toBe(true);
    expect(highRiskQuotes.has("BTC")).toBe(true);
  });
});

describe("bot-engine ownership detection", () => {
  const service = new BotEngineService(
    { load: () => null } as unknown as ConfigService,
    {} as unknown as BinanceMarketDataService,
    {} as unknown as BinanceTradingService,
    {} as unknown as ConversionRouterService,
    {} as unknown as UniverseService
  );

  it("treats legacy ABOT prefix and generated signature ids as bot-owned", () => {
    const helpers = service as unknown as {
      isBotOwnedOrder: (order: Order, prefix: string) => boolean;
    };

    const byCurrentPrefix = {
      id: "1",
      ts: "2026-02-16T11:00:00.000Z",
      symbol: "BTCUSDC",
      clientOrderId: "MINE-GRB-MLOABC1234ABCD",
      side: "BUY",
      type: "LIMIT",
      status: "NEW",
      qty: 0.001,
      price: 100000
    } satisfies Order;

    const byLegacyPrefix = {
      ...byCurrentPrefix,
      clientOrderId: "ABOT-GRS-MLOABC1234ABCD"
    } satisfies Order;

    const bySignatureFallback = {
      ...byCurrentPrefix,
      clientOrderId: "OLDPX-ENB-MLOZZZZ1234AA"
    } satisfies Order;

    const external = {
      ...byCurrentPrefix,
      clientOrderId: "MANUAL-123"
    } satisfies Order;

    expect(helpers.isBotOwnedOrder(byCurrentPrefix, "MINE")).toBe(true);
    expect(helpers.isBotOwnedOrder(byLegacyPrefix, "MINE")).toBe(true);
    expect(helpers.isBotOwnedOrder(bySignatureFallback, "MINE")).toBe(true);
    expect(helpers.isBotOwnedOrder(external, "MINE")).toBe(false);
  });
});

describe("bot-engine symbol lock checks", () => {
  const service = new BotEngineService(
    { load: () => ({ advanced: { neverTradeSymbols: [] } }) } as unknown as ConfigService,
    {} as unknown as BinanceMarketDataService,
    {} as unknown as BinanceTradingService,
    {} as unknown as ConversionRouterService,
    {} as unknown as UniverseService
  );

  it("treats active symbol cooldown lock as blocked", () => {
    const helpers = service as unknown as {
      isSymbolBlocked: (symbol: string, state: BotState) => string | null;
    };

    const state: BotState = {
      ...defaultBotState(),
      protectionLocks: [
        {
          id: "lock-1",
          type: "COOLDOWN",
          createdAt: "2026-02-16T11:00:00.000Z",
          scope: "SYMBOL",
          symbol: "ZAMAUSDC",
          reason: "test",
          expiresAt: "2099-01-01T00:00:00.000Z"
        }
      ]
    };

    expect(helpers.isSymbolBlocked("ZAMAUSDC", state)).not.toBeNull();
    expect(helpers.isSymbolBlocked("BTCUSDC", state)).toBeNull();
  });

  it("does not treat reason-quarantine global cooldown as hard global lock", () => {
    const helpers = service as unknown as {
      isSymbolBlocked: (symbol: string, state: BotState) => string | null;
    };

    const state: BotState = {
      ...defaultBotState(),
      protectionLocks: [
        {
          id: "lock-rq",
          type: "COOLDOWN",
          createdAt: "2026-02-17T11:00:00.000Z",
          scope: "GLOBAL",
          symbol: "REASON_QUARANTINE:FEE_EDGE",
          reason: "Reason quarantine FEE_EDGE",
          expiresAt: "2099-01-01T00:00:00.000Z",
          details: {
            category: "REASON_QUARANTINE",
            family: "FEE_EDGE"
          }
        }
      ]
    };

    expect(helpers.isSymbolBlocked("BTCUSDC", state)).toBeNull();
  });
});

describe("bot-engine live order sync", () => {
  it("periodically discovers external open orders on hinted symbols even with active tracked orders", async () => {
    const calls: string[] = [];
    const trading = {
      getOpenOrders: async (symbol?: string) => {
        const normalized = (symbol ?? "").trim().toUpperCase();
        calls.push(normalized);
        if (normalized === "BTCUSDC") {
          return [
            {
              symbol: "BTCUSDC",
              orderId: "1001",
              side: "BUY",
              type: "LIMIT",
              status: "NEW",
              origQty: "0.01",
              executedQty: "0.0",
              price: "100000",
              transactTime: Date.parse("2026-02-16T08:00:00.000Z"),
              clientOrderId: "ABOT-OLD-BTC"
            }
          ];
        }
        if (normalized === "ETHUSDC") {
          return [
            {
              symbol: "ETHUSDC",
              orderId: "2002",
              side: "SELL",
              type: "LIMIT",
              status: "NEW",
              origQty: "0.5",
              executedQty: "0.0",
              price: "2200",
              transactTime: Date.parse("2026-02-16T08:05:00.000Z"),
              clientOrderId: "MANUAL-ETH"
            }
          ];
        }
        return [];
      }
    } as unknown as BinanceTradingService;

    const service = new BotEngineService(
      { load: () => null } as unknown as ConfigService,
      {} as unknown as BinanceMarketDataService,
      trading,
      {} as unknown as ConversionRouterService,
      {} as unknown as UniverseService
    );

    const state: BotState = {
      ...defaultBotState(),
      activeOrders: [
        {
          id: "1001",
          ts: "2026-02-16T08:00:00.000Z",
          symbol: "BTCUSDC",
          clientOrderId: "ABOT-OLD-BTC",
          side: "BUY",
          type: "LIMIT",
          status: "NEW",
          qty: 0.01,
          price: 100000
        }
      ]
    };

    const synced = await (
      service as unknown as {
        syncLiveOrders: (state: BotState, opts?: { symbolsHint?: string[] }) => Promise<BotState>;
      }
    ).syncLiveOrders(state, { symbolsHint: ["ETHUSDC"] });

    expect(calls).toContain("BTCUSDC");
    expect(calls).toContain("ETHUSDC");
    expect(synced.activeOrders.some((order) => order.id === "1001")).toBe(true);
    expect(synced.activeOrders.some((order) => order.id === "2002")).toBe(true);
    expect(synced.decisions[0]?.summary).toContain("Discovered 1 additional open order(s)");
  });

  it("preserves tracked open orders when one symbol sync fails but others succeed", async () => {
    const calls: string[] = [];
    const trading = {
      getOpenOrders: async (symbol?: string) => {
        const normalized = (symbol ?? "").trim().toUpperCase();
        calls.push(normalized);
        if (normalized === "BTCUSDC") {
          throw new Error("binance GET /openOrders 502 Bad Gateway");
        }
        if (normalized === "ETHUSDC") {
          return [
            {
              symbol: "ETHUSDC",
              orderId: "2002",
              side: "SELL",
              type: "LIMIT",
              status: "NEW",
              origQty: "0.5",
              executedQty: "0.0",
              price: "2200",
              transactTime: Date.parse("2026-02-16T08:05:00.000Z"),
              clientOrderId: "MANUAL-ETH"
            }
          ];
        }
        return [];
      }
    } as unknown as BinanceTradingService;

    const service = new BotEngineService(
      { load: () => null } as unknown as ConfigService,
      {} as unknown as BinanceMarketDataService,
      trading,
      {} as unknown as ConversionRouterService,
      {} as unknown as UniverseService
    );

    const state: BotState = {
      ...defaultBotState(),
      activeOrders: [
        {
          id: "1001",
          ts: "2026-02-16T08:00:00.000Z",
          symbol: "BTCUSDC",
          clientOrderId: "ABOT-OLD-BTC",
          side: "BUY",
          type: "LIMIT",
          status: "NEW",
          qty: 0.01,
          price: 100000
        }
      ]
    };

    const synced = await (
      service as unknown as {
        syncLiveOrders: (state: BotState, opts?: { symbolsHint?: string[] }) => Promise<BotState>;
      }
    ).syncLiveOrders(state, { symbolsHint: ["ETHUSDC"] });

    expect(calls).toContain("BTCUSDC");
    expect(calls).toContain("ETHUSDC");
    expect(synced.activeOrders.some((order) => order.id === "1001")).toBe(true);
    expect(synced.activeOrders.some((order) => order.id === "2002")).toBe(true);
  });
});
