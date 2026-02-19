import { describe, expect, it } from "vitest";

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

  it("activates reason-level quarantine after repeated fee-edge skips", () => {
    const helpers = service as unknown as {
      maybeApplyReasonQuarantineLock: (params: { state: BotState; summary: string; risk: number }) => BotState;
      getActiveReasonQuarantineFamilies: (state: BotState) => Set<"FEE_EDGE" | "GRID_BUY_SIZING" | "GRID_SELL_SIZING">;
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
        walletTotalHome: number;
        nowMs: number;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        active: boolean;
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
      walletTotalHome: 1_000,
      nowMs: now
    });

    expect(guard.active).toBe(true);
    expect(guard.state).toBe("HALT");
    expect(guard.dailyRealizedPnl).toBeCloseTo(-20, 6);
    expect(guard.maxDailyLossPct).toBe(1.2);
    expect(guard.maxDailyLossAbs).toBeCloseTo(12, 6);
  });

  it("returns CAUTION before HALT threshold", () => {
    const helpers = service as unknown as {
      evaluateDailyLossGuard: (params: {
        state: BotState;
        risk: number;
        walletTotalHome: number;
        nowMs: number;
      }) => {
        state: "NORMAL" | "CAUTION" | "HALT";
        active: boolean;
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
      walletTotalHome: 1_000,
      nowMs: now
    });

    expect(guard.active).toBe(false);
    expect(guard.state).toBe("CAUTION");
    expect(guard.maxDailyLossPct).toBe(6);
    expect(guard.maxDailyLossAbs).toBeCloseTo(60, 6);
  });

  it("scales daily-loss caution entry pause cooldown with risk", () => {
    const helpers = service as unknown as {
      deriveCautionEntryPauseCooldownMs: (risk: number) => number;
    };

    expect(helpers.deriveCautionEntryPauseCooldownMs(0)).toBe(360000);
    expect(helpers.deriveCautionEntryPauseCooldownMs(50)).toBe(240000);
    expect(helpers.deriveCautionEntryPauseCooldownMs(100)).toBe(120000);
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
});
