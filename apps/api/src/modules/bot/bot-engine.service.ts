import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Injectable, OnModuleInit } from "@nestjs/common";
import type { AppConfig, BotState, Decision, Order, ProtectionLockEntry, SymbolBlacklistEntry, UniverseCandidate } from "@autobot/shared";
import { BotStateSchema, defaultBotState } from "@autobot/shared";

import { ConfigService } from "../config/config.service";
import { resolveRouteBridgeAssets, resolveUniverseDefaultQuoteAssets } from "../config/asset-routing";
import { BinanceMarketDataService, type MarketQtyValidation } from "../integrations/binance-market-data.service";
import {
  BinanceTradingService,
  type BinanceOrderSnapshot,
  isBinanceTestnetBaseUrl,
  type BinanceBalanceSnapshot,
  type BinanceMarketOrderResponse
} from "../integrations/binance-trading.service";
import { ConversionRouterService } from "../integrations/conversion-router.service";
import { getPairPolicyBlockReason, isStableAsset } from "../policy/trading-policy";
import { UniverseService } from "../universe/universe.service";

const EXECUTION_FIAT_QUOTES = new Set(["EUR", "JPY", "GBP", "TRY", "BRL", "AUD"]);

function atomicWriteFile(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, data, { encoding: "utf-8" });
  fs.renameSync(tmpPath, filePath);
}

type ManagedPosition = {
  symbol: string;
  netQty: number;
  costQuote: number;
  lastBuyTs?: string;
  lastSellTs?: string;
};

type CapitalProfile = {
  tier: "MICRO" | "SMALL" | "STANDARD";
  notionalCapMultiplier: number;
  reserveLowPct: number;
  reserveHighPct: number;
  minNetEdgePct: number;
};

type RegimeLabel = "BULL_TREND" | "BEAR_TREND" | "RANGE" | "NEUTRAL" | "UNKNOWN";

type AdaptiveStrategy = "TREND" | "MEAN_REVERSION" | "GRID";
type AdaptiveExecutionLane = "GRID" | "MARKET" | "DEFENSIVE";

type AdaptiveRegimeSnapshot = {
  label: RegimeLabel;
  confidence: number;
  inputs: {
    priceChangePct24h?: number;
    rsi14?: number;
    adx14?: number;
    atrPct14?: number;
  };
};

type AdaptiveStrategyScores = {
  trend: number;
  meanReversion: number;
  grid: number;
  recommended: AdaptiveStrategy;
};

type AdaptiveShadowEvent = {
  version: 1;
  ts: string;
  tickStartedAt: string;
  tickDurationMs: number;
  environment: "LIVE" | "PAPER";
  homeStableCoin: string;
  candidateSymbol: string;
  executionLane?: AdaptiveExecutionLane;
  candidateFeatures?: {
    score?: number;
    strategyHint?: string;
    priceChangePct24h?: number;
    rsi14?: number;
    adx14?: number;
    atrPct14?: number;
  };
  regime: AdaptiveRegimeSnapshot;
  strategy: AdaptiveStrategyScores;
  risk: {
    risk: number;
    maxOpenPositions?: number;
    maxPositionPct?: number;
    walletTotalHome?: number;
  };
  decision: {
    kind: string;
    summary: string;
    reason?: string;
    orderId?: string;
    symbol?: string;
    side?: "BUY" | "SELL";
    status?: Order["status"];
    qty?: number;
    price?: number;
  };
};

type BaselineSymbolStats = {
  symbol: string;
  buys: number;
  sells: number;
  buyNotional: number;
  sellNotional: number;
  netQty: number;
  avgEntry: number;
  openCost: number;
  realizedPnl: number;
  feesHome: number;
  lastTradeTs?: string;
};

type BaselineRunStats = {
  version: 1;
  generatedAt: string;
  startedAt: string;
  runtimeSeconds: number;
  bot: {
    running: boolean;
    phase: BotState["phase"];
    lastError?: string;
  };
  totals: {
    decisions: number;
    trades: number;
    skips: number;
    filledOrders: number;
    activeOrders: number;
    buys: number;
    sells: number;
    conversions: number;
    entryTrades: number;
    sizingRejectSkips: number;
    feeEdgeSkips: number;
    minOrderSkips: number;
    inventoryWaitingSkips: number;
    conversionTradePct: number;
    entryTradePct: number;
    sizingRejectSkipPct: number;
    feeEdgeSkipPct: number;
    minOrderSkipPct: number;
    inventoryWaitingSkipPct: number;
    buyNotional: number;
    sellNotional: number;
    realizedPnl: number;
    feesHome: number;
    openExposureCost: number;
    openPositions: number;
  };
  byDecisionKind: Record<string, number>;
  topSkipSummaries: Array<{ summary: string; count: number }>;
  quoteFamilies?: Array<{
    quoteAsset: string;
    filledOrders: number;
    buys: number;
    sells: number;
    skips: number;
    trades: number;
  }>;
  symbols: BaselineSymbolStats[];
};

type TickTelemetryContext = {
  tickStartedAtIso: string;
  homeStableCoin: string;
  liveTrading: boolean;
  risk: number;
  candidateSymbol: string;
  candidate: UniverseCandidate | null;
  executionLane?: AdaptiveExecutionLane;
  walletTotalHome?: number;
  maxOpenPositions?: number;
  maxPositionPct?: number;
};

type TransientExchangeBackoffState = {
  errorCount: number;
  lastErrorAtMs: number;
  pauseUntilMs: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
};

type ClosedPnlEvent = {
  symbol: string;
  ts: string;
  pnlAbs: number;
  pnlPct: number;
};

type ProtectionPolicy = {
  cooldownMs: number;
  stoplossLookbackMs: number;
  stoplossTradeLimit: number;
  stoplossLockMs: number;
  maxDrawdownLookbackMs: number;
  maxDrawdownPct: number;
  maxDrawdownLockMs: number;
  maxDailyLossLookbackMs: number;
  maxDailyLossPct: number;
  lowProfitLookbackMs: number;
  lowProfitTradeLimit: number;
  lowProfitThresholdPct: number;
  lowProfitLockMs: number;
};

type DailyLossGuardSnapshot = {
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
  profitGivebackHaltMinExposurePct: number;
  managedExposurePct: number;
  maxDailyLossAbs: number;
  maxDailyLossPct: number;
  lookbackMs: number;
  windowStartIso: string;
};

type ReasonQuarantineFamily = "FEE_EDGE" | "GRID_BUY_SIZING" | "GRID_SELL_SIZING" | "GRID_BUY_QUOTE";

export type BotRunStatsResponse = {
  generatedAt: string;
  kpi: BaselineRunStats | null;
  adaptiveShadowTail: AdaptiveShadowEvent[];
  walletPolicy: {
    observedAt: string;
    overCap: boolean;
    unmanagedExposurePct: number;
    unmanagedExposureCapPct: number;
    unmanagedNonHomeValue?: number;
    unmanagedExposureCapHome?: number;
    category?: string;
    sourceAsset?: string;
    reason?: string;
  } | null;
  notes: {
    activeOrders: string;
  };
};

@Injectable()
export class BotEngineService implements OnModuleInit {
  private readonly dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  private readonly statePath = path.join(this.dataDir, "state.json");
  private readonly telemetryDir = path.join(this.dataDir, "telemetry");
  private readonly baselineStatsPath = path.join(this.telemetryDir, "baseline-kpis.json");
  private readonly adaptiveShadowPath = path.join(this.telemetryDir, "adaptive-shadow.jsonl");

  private loopTimer: NodeJS.Timeout | null = null;
  private examineTimer: NodeJS.Timeout | null = null;
  private tickInFlight = false;
  private lastBaselineFingerprint: string | null = null;
  private transientExchangeBackoffState: TransientExchangeBackoffState | null = null;
  private orderDiscoveryCursor = 0;
  private lastSupplementalOrderDiscoveryAtMs = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly marketData: BinanceMarketDataService,
    private readonly trading: BinanceTradingService,
    private readonly conversionRouter: ConversionRouterService,
    private readonly universe: UniverseService
  ) {}

  onModuleInit(): void {
    const state = this.getState();
    if (!state.running) return;

    const summary = "Recovered running bot state after process restart; resuming engine loop";
    const alreadyLogged = state.decisions[0]?.kind === "ENGINE" && state.decisions[0]?.summary === summary;
    if (!alreadyLogged) {
      this.addDecision("ENGINE", summary);
    }

    if (state.phase !== "TRADING" && state.phase !== "EXAMINING") {
      this.save({
        ...state,
        phase: "EXAMINING"
      });
    }

    if (this.getState().phase !== "TRADING") {
      this.scheduleExamineTransition();
    }
    this.ensureLoopTimer();
  }

  getState(): BotState {
    if (!fs.existsSync(this.statePath)) {
      return defaultBotState();
    }

    try {
      const raw = fs.readFileSync(this.statePath, "utf-8");
      return this.ensureStateStartedAt(BotStateSchema.parse(JSON.parse(raw)));
    } catch (err) {
      const fallback = defaultBotState();
      return {
        ...fallback,
        lastError: err instanceof Error ? err.message : "Failed to load state.json"
      };
    }
  }

  private ensureStateStartedAt(state: BotState): BotState {
    if (state.startedAt && Number.isFinite(Date.parse(state.startedAt))) {
      return state;
    }

    const candidates = [
      ...state.decisions.map((d) => d.ts),
      ...state.orderHistory.map((o) => o.ts),
      state.updatedAt
    ];
    const timestamps = candidates.map((ts) => Date.parse(ts)).filter((ts) => Number.isFinite(ts));
    const earliest = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    return {
      ...state,
      startedAt: new Date(earliest).toISOString()
    };
  }

  private save(state: BotState): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const withStartedAt = this.ensureStateStartedAt(state);
    const next: BotState = { ...withStartedAt, updatedAt: new Date().toISOString() };
    atomicWriteFile(this.statePath, JSON.stringify(next, null, 2));
  }

  private pruneExpiredBlacklist(state: BotState): BotState {
    if (!state.symbolBlacklist || state.symbolBlacklist.length === 0) return state;
    const now = Date.now();
    const pruned = state.symbolBlacklist.filter((e) => {
      const expiresAt = Date.parse(e.expiresAt);
      return Number.isNaN(expiresAt) ? true : expiresAt > now;
    });
    if (pruned.length === state.symbolBlacklist.length) return state;
    return { ...state, symbolBlacklist: pruned };
  }

  private pruneExpiredProtectionLocks(state: BotState): BotState {
    if (!state.protectionLocks || state.protectionLocks.length === 0) return state;
    const now = Date.now();
    const pruned = state.protectionLocks.filter((lock) => {
      const expiresAt = Date.parse(lock.expiresAt);
      return Number.isFinite(expiresAt) && expiresAt > now;
    });
    if (pruned.length === state.protectionLocks.length) return state;
    return { ...state, protectionLocks: pruned };
  }

  private upsertProtectionLock(
    state: BotState,
    lockInput: Omit<ProtectionLockEntry, "id" | "createdAt">
  ): BotState {
    const existingIndex = (state.protectionLocks ?? []).findIndex(
      (lock) => lock.type === lockInput.type && lock.scope === lockInput.scope && (lock.symbol ?? "") === (lockInput.symbol ?? "")
    );
    const nowIso = new Date().toISOString();
    const existing = existingIndex >= 0 ? state.protectionLocks[existingIndex] : undefined;
    const nextLock: ProtectionLockEntry = {
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? nowIso,
      ...lockInput
    };

    const existingLocks = state.protectionLocks ?? [];
    if (existingIndex >= 0) {
      const nextLocks = existingLocks.filter((_, idx) => idx !== existingIndex);
      return { ...state, protectionLocks: [nextLock, ...nextLocks].slice(0, 300) };
    }

    return { ...state, protectionLocks: [nextLock, ...existingLocks].slice(0, 300) };
  }

  private readLockDetails(lock: ProtectionLockEntry): Record<string, unknown> | undefined {
    if (!lock.details || typeof lock.details !== "object") return undefined;
    return lock.details as Record<string, unknown>;
  }

  private isReasonQuarantineLock(lock: ProtectionLockEntry): boolean {
    if (lock.scope !== "GLOBAL") return false;
    const details = this.readLockDetails(lock);
    return details?.category === "REASON_QUARANTINE";
  }

  private getReasonQuarantineFamilyFromLock(lock: ProtectionLockEntry): ReasonQuarantineFamily | null {
    if (!this.isReasonQuarantineLock(lock)) return null;
    const details = this.readLockDetails(lock);
    const raw = typeof details?.family === "string" ? details.family.trim().toUpperCase() : "";
    if (raw === "FEE_EDGE" || raw === "GRID_BUY_SIZING" || raw === "GRID_SELL_SIZING" || raw === "GRID_BUY_QUOTE") {
      return raw;
    }
    return null;
  }

  private getActiveGlobalProtectionLock(state: BotState): ProtectionLockEntry | null {
    const now = Date.now();
    return (
      (state.protectionLocks ?? []).find(
        (lock) =>
          lock.scope === "GLOBAL" &&
          !this.isReasonQuarantineLock(lock) &&
          Number.isFinite(Date.parse(lock.expiresAt)) &&
          Date.parse(lock.expiresAt) > now
      ) ?? null
    );
  }

  private getActiveReasonQuarantineFamilies(state: BotState): Set<ReasonQuarantineFamily> {
    const now = Date.now();
    const families = new Set<ReasonQuarantineFamily>();
    for (const lock of state.protectionLocks ?? []) {
      if (!this.isReasonQuarantineLock(lock)) continue;
      const expiresAt = Date.parse(lock.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= now) continue;
      const family = this.getReasonQuarantineFamilyFromLock(lock);
      if (family) families.add(family);
    }
    return families;
  }

  private getActiveSymbolProtectionLock(
    state: BotState,
    symbol: string,
    opts?: {
      excludeTypes?: string[];
      onlyTypes?: string[];
    }
  ): ProtectionLockEntry | null {
    const now = Date.now();
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return null;
    const exclude = new Set((opts?.excludeTypes ?? []).map((t) => t.trim().toUpperCase()).filter(Boolean));
    const only = opts?.onlyTypes
      ? new Set(opts.onlyTypes.map((t) => t.trim().toUpperCase()).filter(Boolean))
      : null;
    for (const lock of state.protectionLocks ?? []) {
      if (lock.scope !== "SYMBOL") continue;
      if (lock.symbol?.trim().toUpperCase() !== normalized) continue;
      const expiresAt = Date.parse(lock.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= now) continue;
      const type = lock.type.trim().toUpperCase();
      if (exclude.has(type)) continue;
      if (only && !only.has(type)) continue;
      return lock;
    }
    return null;
  }

  private isNonBlockingGridGuardPauseCooldownLock(lock: ProtectionLockEntry | null): boolean {
    if (!lock) return false;
    if (lock.scope !== "SYMBOL") return false;
    if (lock.type.trim().toUpperCase() !== "COOLDOWN") return false;
    const details = this.readLockDetails(lock);
    const category = typeof details?.category === "string" ? details.category.trim().toUpperCase() : "";
    if (category !== "GRID_GUARD_BUY_PAUSE") return false;
    return details?.buyPausedByCaution !== true;
  }

  private deriveProtectionPolicy(risk: number): ProtectionPolicy {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;

    return {
      cooldownMs: Math.round(180_000 - t * 160_000), // 180s -> 20s
      stoplossLookbackMs: Math.round((180 - t * 135) * 60_000), // 180m -> 45m
      stoplossTradeLimit: Math.max(2, Math.round(2 + t * 3)), // 2 -> 5
      stoplossLockMs: Math.round((90 - t * 70) * 60_000), // 90m -> 20m
      maxDrawdownLookbackMs: Math.round((24 - t * 12) * 60 * 60_000), // 24h -> 12h
      maxDrawdownPct: Math.max(2.5, Number((4 + t * 10).toFixed(2))), // 4% -> 14%
      maxDrawdownLockMs: Math.round((120 - t * 90) * 60_000), // 120m -> 30m
      maxDailyLossLookbackMs: 24 * 60 * 60_000, // 24h rolling window
      maxDailyLossPct: Number((1 + t * 3.5).toFixed(2)), // 1.0% -> 4.5%
      lowProfitLookbackMs: Math.round((180 - t * 135) * 60_000), // 180m -> 45m
      lowProfitTradeLimit: Math.max(2, Math.round(2 + t * 3)), // 2 -> 5
      lowProfitThresholdPct: Number((-0.5 - t * 2).toFixed(2)), // -0.5% -> -2.5%
      lowProfitLockMs: Math.round((120 - t * 90) * 60_000) // 120m -> 30m
    };
  }

  private deriveStopLossEntryCooldownMs(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    return Math.round((45 - t * 33) * 60_000); // 45m -> 12m
  }

  private deriveCautionEntryPauseCooldownMs(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    return Math.round((6 - t * 4) * 60_000); // 6m -> 2m
  }

  private deriveGridGuardNoInventoryCooldownMs(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    return Math.round((12 - t * 8) * 60_000); // 12m -> 4m
  }

  private deriveGridWaitingRotationCooldownMs(params: {
    risk: number;
    hasBuyLimit: boolean;
    hasSellLimit: boolean;
    staleTtlMinutes?: number;
  }): number {
    const baseCooldownMs = Math.max(
      this.deriveNoActionSymbolCooldownMs(params.risk),
      this.deriveGridGuardNoInventoryCooldownMs(params.risk)
    );
    if (!(params.hasBuyLimit && params.hasSellLimit)) {
      return baseCooldownMs;
    }
    const ttlMinutes =
      Number.isFinite(params.staleTtlMinutes ?? Number.NaN) && (params.staleTtlMinutes ?? 0) > 0
        ? (params.staleTtlMinutes as number)
        : 30;
    const ttlScaledCooldownMs = Math.round((ttlMinutes * 60_000) / 3);
    return Math.max(baseCooldownMs, Math.min(15 * 60_000, ttlScaledCooldownMs));
  }

  private deriveManagedPositionMinCountableExposureHome(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    return Number((10 - t * 5).toFixed(2)); // 10 -> 5 (home-quote value)
  }

  private isManagedPositionCountable(position: ManagedPosition, minExposureHome: number): boolean {
    if (!Number.isFinite(position.netQty) || position.netQty <= 0) return false;
    if (!Number.isFinite(position.costQuote) || position.costQuote <= 0) return false;
    return position.costQuote + 1e-8 >= minExposureHome;
  }

  private deriveCautionManagedSymbolOnlyMinExposurePct(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    return Number((0.1 - t * 0.07).toFixed(4)); // 10% -> 3%
  }

  private extractRiskStateManagedExposurePct(riskState: BotState["riskState"] | undefined): number | null {
    const raw = riskState?.reason_codes?.find((reason) => reason.startsWith("managedExposure="));
    if (!raw) return null;
    const match = /^managedExposure=([0-9]+(?:\.[0-9]+)?)%$/i.exec(raw.trim());
    if (!match) return null;
    const pct = Number.parseFloat(match[1]);
    if (!Number.isFinite(pct) || pct < 0) return null;
    return pct / 100;
  }

  private extractRiskStateTrigger(
    riskState: BotState["riskState"] | undefined
  ): DailyLossGuardSnapshot["trigger"] | null {
    const raw = riskState?.reason_codes?.find((reason) => reason.startsWith("trigger="));
    if (!raw) return null;
    const match = /^trigger=(NONE|ABS_DAILY_LOSS|PROFIT_GIVEBACK)$/i.exec(raw.trim());
    if (!match) return null;
    return match[1].toUpperCase() as DailyLossGuardSnapshot["trigger"];
  }

  private extractRiskStateHaltExposureFloorPct(riskState: BotState["riskState"] | undefined): number | null {
    const raw = riskState?.reason_codes?.find((reason) => reason.startsWith("haltExposureFloor="));
    if (!raw) return null;
    const match = /^haltExposureFloor=([0-9]+(?:\.[0-9]+)?)%$/i.exec(raw.trim());
    if (!match) return null;
    const pct = Number.parseFloat(match[1]);
    if (!Number.isFinite(pct) || pct < 0) return null;
    return pct / 100;
  }

  private deriveCautionPauseNewSymbolsMinExposurePct(params: {
    risk: number;
    trigger: DailyLossGuardSnapshot["trigger"];
    haltExposureFloorPct: number | null;
  }): number {
    const base = this.deriveCautionManagedSymbolOnlyMinExposurePct(params.risk);
    if (params.trigger !== "PROFIT_GIVEBACK") {
      return base;
    }
    if (params.haltExposureFloorPct === null || !Number.isFinite(params.haltExposureFloorPct)) {
      return base;
    }
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;
    // Profit-giveback CAUTION should keep pausing new symbols only while exposure is still materially high.
    // Once the bot has already de-risked most of the book, keep symbol-level bear pauses but allow fresh candidates again.
    const givebackBufferPct = Number((0.17 - t * 0.05).toFixed(4)); // 17% -> 12%
    const givebackPauseFloorPct = Math.min(0.35, Math.max(0, params.haltExposureFloorPct + givebackBufferPct));
    return Math.max(base, givebackPauseFloorPct);
  }

  private shouldRestrictCautionToManagedSymbols(params: {
    tradeMode: AppConfig["basic"]["tradeMode"];
    riskState: DailyLossGuardSnapshot["state"];
    openHomePositionCount: number;
    managedExposurePct: number | null;
    minManagedExposurePct: number;
  }): boolean {
    if (params.tradeMode !== "SPOT_GRID") return false;
    if (params.riskState !== "CAUTION") return false;
    if (params.openHomePositionCount <= 0) return false;
    if (params.managedExposurePct === null) return true;
    return params.managedExposurePct >= params.minManagedExposurePct;
  }

  private shouldCancelDefensiveGridBuyOrders(params: {
    executionLane: AdaptiveExecutionLane;
    hasBotBuyOrders: boolean;
    buyPaused: boolean;
  }): boolean {
    if (params.executionLane !== "DEFENSIVE") return false;
    if (!params.hasBotBuyOrders) return false;
    return params.buyPaused;
  }

  private shouldSuppressGridStalledCandidate(params: {
    canTakeAction: boolean;
    waiting: boolean;
    buyPaused: boolean;
    hasInventory: boolean;
    hasBuyLimit: boolean;
    hasSellLimit: boolean;
    recentInventoryWaitingSkips: number;
    inventoryWaitingPressureActive: boolean;
  }): boolean {
    if (params.canTakeAction) return false;
    if (params.buyPaused && (!params.hasInventory || params.hasSellLimit)) return true;
    if (params.hasBuyLimit || params.hasSellLimit) return true;
    if (!params.waiting) return false;
    if (params.inventoryWaitingPressureActive) return true;
    return params.recentInventoryWaitingSkips >= 2;
  }

  private shouldSuppressGridQuoteStarvedCandidate(params: {
    quoteQuarantineActive: boolean;
    recentGridBuyQuoteInsufficient: number;
    hasBuyLimit: boolean;
    missingSellLeg: boolean;
    risk: number;
  }): boolean {
    if (params.hasBuyLimit) return false;
    if (params.missingSellLeg) return false;
    if (params.recentGridBuyQuoteInsufficient <= 0) return false;

    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const localThreshold = Math.max(2, Math.round(4 - boundedRisk / 50)); // risk 0 -> 4, risk 100 -> 2
    if (params.recentGridBuyQuoteInsufficient >= localThreshold) return true;
    return params.quoteQuarantineActive;
  }

  private shouldSuppressGridEntryGuardCandidate(params: {
    hasEntryGuard: boolean;
    missingSellLeg: boolean;
    recentEntryGuardSkips: number;
    risk: number;
  }): boolean {
    if (!params.hasEntryGuard) return false;
    if (params.missingSellLeg) return false;
    if (params.recentEntryGuardSkips <= 0) return false;

    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const localThreshold = Math.max(2, Math.round(4 - boundedRisk / 50)); // risk 0 -> 4, risk 100 -> 2
    return params.recentEntryGuardSkips >= localThreshold;
  }

  private shouldSuppressGridQuoteAssetCandidate(params: {
    quoteQuarantineActive: boolean;
    recentQuoteAssetBuyQuoteInsufficient: number;
    missingSellLeg: boolean;
    risk: number;
  }): boolean {
    if (params.missingSellLeg) return false;
    if (params.recentQuoteAssetBuyQuoteInsufficient <= 0) return false;

    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const localThreshold = Math.max(2, Math.round(4 - boundedRisk / 50)); // risk 0 -> 4, risk 100 -> 2
    if (params.recentQuoteAssetBuyQuoteInsufficient >= localThreshold) return true;
    return params.quoteQuarantineActive;
  }

  private shouldSuppressGridFeeEdgeCandidate(params: {
    feeEdgeQuarantineActive: boolean;
    recentFeeEdgeRejects: number;
    missingSellLeg: boolean;
    risk: number;
  }): boolean {
    if (params.recentFeeEdgeRejects <= 0) return false;

    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const localThreshold = Math.max(2, Math.round(4 - boundedRisk / 50)); // risk 0 -> 4, risk 100 -> 2
    const actionableSellThreshold = localThreshold + 1;
    if (params.recentFeeEdgeRejects >= (params.missingSellLeg ? actionableSellThreshold : localThreshold)) return true;
    return params.feeEdgeQuarantineActive;
  }

  private shouldTreatGridBuySizingRejectAsQuoteInsufficient(params: {
    check: MarketQtyValidation;
    price: number;
    bufferFactor: number;
    quoteSpendable: number;
  }): boolean {
    if (params.check.ok) return false;
    const quoteSpendable = Number.isFinite(params.quoteSpendable) ? Math.max(0, params.quoteSpendable) : 0;
    if (quoteSpendable <= 0) return true;

    const requiredQty = params.check.requiredQty ? Number.parseFloat(params.check.requiredQty) : Number.NaN;
    if (Number.isFinite(requiredQty) && requiredQty > 0 && Number.isFinite(params.price) && params.price > 0) {
      const requiredBufferedCost = requiredQty * params.price * Math.max(1, params.bufferFactor);
      if (Number.isFinite(requiredBufferedCost) && requiredBufferedCost > quoteSpendable + 1e-8) {
        return true;
      }
    }

    const minQtyMatch = params.check.reason?.match(/Below minQty\s+([0-9.]+)/i);
    const minQty = minQtyMatch ? Number.parseFloat(minQtyMatch[1]) : Number.NaN;
    if (Number.isFinite(minQty) && minQty > 0 && Number.isFinite(params.price) && params.price > 0) {
      const minQtyBufferedCost = minQty * params.price * Math.max(1, params.bufferFactor);
      if (Number.isFinite(minQtyBufferedCost) && minQtyBufferedCost > quoteSpendable + 1e-8) {
        return true;
      }
    }

    const minNotional = params.check.minNotional ? Number.parseFloat(params.check.minNotional) : Number.NaN;
    if (Number.isFinite(minNotional) && minNotional > quoteSpendable + 1e-8) {
      return true;
    }

    return false;
  }

  private deriveGlobalLockUnwindCooldownMs(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    return Math.round((20 - t * 12) * 60_000); // 20m -> 8m
  }

  private deriveDailyLossHaltUnwindPolicy(params: {
    risk: number;
    trigger: DailyLossGuardSnapshot["trigger"];
  }): { cooldownMs: number; fraction: number } {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;
    const isAbsLoss = params.trigger === "ABS_DAILY_LOSS";
    const cooldownMs = isAbsLoss
      ? Math.round((18 - t * 10) * 60_000) // 18m -> 8m
      : Math.round((30 - t * 18) * 60_000); // 30m -> 12m
    const floor = isAbsLoss ? 0.32 : 0.18;
    const span = isAbsLoss ? 0.18 : 0.14;
    const fraction = Number((floor + (1 - t) * span).toFixed(4));
    return { cooldownMs, fraction };
  }

  private shouldRunDailyLossCautionUnwind(params: {
    guard: DailyLossGuardSnapshot;
    risk: number;
  }): boolean {
    if (params.guard.state !== "CAUTION") return false;
    if (params.guard.trigger !== "PROFIT_GIVEBACK") return false;

    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;
    const minManagedExposurePct = Number((0.35 - t * 0.17).toFixed(4)); // 35% -> 18%
    return params.guard.managedExposurePct >= minManagedExposurePct;
  }

  private deriveDailyLossCautionUnwindPolicy(params: {
    risk: number;
    trigger: DailyLossGuardSnapshot["trigger"];
  }): { cooldownMs: number; fraction: number } {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;
    const isGiveback = params.trigger === "PROFIT_GIVEBACK";
    const cooldownMs = isGiveback
      ? Math.round((24 - t * 14) * 60_000) // 24m -> 10m
      : Math.round((18 - t * 10) * 60_000); // 18m -> 8m
    const floor = isGiveback ? 0.12 : 0.16;
    const span = isGiveback ? 0.12 : 0.1;
    const fraction = Number((floor + (1 - t) * span).toFixed(4));
    return { cooldownMs, fraction };
  }

  private shouldRunDefensiveGridGuardUnwind(params: {
    executionLane: AdaptiveExecutionLane;
    riskState: DailyLossGuardSnapshot["state"];
    buyPaused: boolean;
    hasInventory: boolean;
    quoteIsHome: boolean;
    recentBuyPauseSkips: number;
    recentInventoryWaitingSkips: number;
    recentGridSellSizingRejects: number;
    risk: number;
  }): boolean {
    if (params.executionLane !== "DEFENSIVE") return false;
    if (params.riskState !== "NORMAL") return false;
    if (!params.quoteIsHome) return false;
    if (!params.buyPaused || !params.hasInventory) return false;

    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const localThreshold = Math.max(3, Math.round(5 - boundedRisk / 50)); // risk 0 -> 5, risk 100 -> 3
    if (params.recentBuyPauseSkips < localThreshold) return false;

    return (
      params.recentInventoryWaitingSkips >= Math.max(2, localThreshold - 1) ||
      params.recentGridSellSizingRejects >= localThreshold
    );
  }

  private deriveDefensiveGridGuardUnwindPolicy(params: {
    risk: number;
    regimeConfidence: number;
    positionExposurePct: number;
  }): { cooldownMs: number; fraction: number } {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;
    const exposurePct = Number.isFinite(params.positionExposurePct) ? Math.max(0, params.positionExposurePct) : 0;
    const regimeConfidence = Number.isFinite(params.regimeConfidence) ? Math.max(0, Math.min(1, params.regimeConfidence)) : 0;

    let fraction = 0.18 - t * 0.08; // 18% -> 10%
    let cooldownMs = Math.round((36 - t * 18) * 60_000); // 36m -> 18m

    if (exposurePct >= 15) {
      fraction += 0.06;
      cooldownMs *= 0.7;
    } else if (exposurePct >= 8) {
      fraction += 0.03;
      cooldownMs *= 0.82;
    }

    if (regimeConfidence >= 0.9) {
      fraction += 0.02;
      cooldownMs *= 0.9;
    }

    return {
      fraction: Math.max(0.08, Math.min(0.28, Number(fraction.toFixed(4)))),
      cooldownMs: Math.max(300_000, Math.round(cooldownMs))
    };
  }

  private deriveDailyLossHaltUnwindExecution(params: {
    baseFraction: number;
    baseCooldownMs: number;
    risk: number;
    exposurePct: number;
    unrealizedPct: number | null;
  }): { fraction: number; cooldownMs: number; priority: number } {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;
    const exposurePct = Number.isFinite(params.exposurePct) ? Math.max(0, params.exposurePct) : 0;
    const unrealizedPct = Number.isFinite(params.unrealizedPct ?? Number.NaN) ? (params.unrealizedPct as number) : 0;
    const lossPct = Math.max(0, -unrealizedPct);

    let fraction = params.baseFraction;
    let cooldownMs = params.baseCooldownMs;

    if (lossPct > 0) {
      const lossFactor = Math.min(1.6, lossPct / 10);
      fraction += 0.08 * lossFactor;
      cooldownMs *= Math.max(0.55, 1 - 0.2 * lossFactor);
    }

    if (exposurePct >= 15) {
      fraction += 0.18;
      cooldownMs *= 0.55;
    } else if (exposurePct >= 8) {
      fraction += 0.1;
      cooldownMs *= 0.75;
    } else if (exposurePct >= 3) {
      fraction += 0.04;
      cooldownMs *= 0.9;
    }

    const lowRiskTighten = (1 - t) * 0.08;
    fraction += lowRiskTighten;
    cooldownMs *= 1 - (1 - t) * 0.2;

    const clampedFraction = Math.max(params.baseFraction, Math.min(0.92, Number(fraction.toFixed(4))));
    const clampedCooldownMs = Math.max(120_000, Math.round(cooldownMs));
    const priority = Number((exposurePct * 4 + lossPct * 2 + (exposurePct >= 15 ? 20 : exposurePct >= 8 ? 10 : 0)).toFixed(6));

    return {
      fraction: clampedFraction,
      cooldownMs: clampedCooldownMs,
      priority
    };
  }

  private buildDailyLossGuardSkipSummary(guard: DailyLossGuardSnapshot, homeStable: string): string {
    if (guard.trigger === "PROFIT_GIVEBACK" && guard.peakDailyRealizedPnl > 0) {
      const givebackPct = guard.profitGivebackPct * 100;
      const thresholdPct = (guard.state === "HALT" ? guard.profitGivebackHaltPct : guard.profitGivebackCautionPct) * 100;
      const mode = guard.state === "HALT" ? "HALT" : "CAUTION";
      return `Skip: Daily loss ${mode} (profit giveback ${givebackPct.toFixed(1)}% >= ${thresholdPct.toFixed(1)}%)`;
    }
    return `Skip: Daily loss guard active (${guard.dailyRealizedPnl.toFixed(2)} ${homeStable} <= -${guard.maxDailyLossAbs.toFixed(2)} ${homeStable})`;
  }

  private evaluateDailyLossGuard(params: {
    state: BotState;
    risk: number;
    homeStable: string;
    allowedExecutionQuotes?: Iterable<string>;
    walletTotalHome: number;
    nowMs: number;
  }): DailyLossGuardSnapshot {
    const policy = this.deriveProtectionPolicy(params.risk);
    const walletTotalHome = Number.isFinite(params.walletTotalHome) ? Math.max(0, params.walletTotalHome) : 0;
    const maxDailyLossAbs = Math.max(5, walletTotalHome * (policy.maxDailyLossPct / 100));
    const windowStartMs = params.nowMs - policy.maxDailyLossLookbackMs;
    const windowStartIso = new Date(windowStartMs).toISOString();

    const windowEvents = this.getClosedPnlEvents(params.state)
      .filter((event) => {
        const ts = Date.parse(event.ts);
        return Number.isFinite(ts) && ts >= windowStartMs;
      })
      .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

    let dailyRealizedPnl = 0;
    let peakDailyRealizedPnl = 0;
    for (const event of windowEvents) {
      dailyRealizedPnl += event.pnlAbs;
      if (dailyRealizedPnl > peakDailyRealizedPnl) {
        peakDailyRealizedPnl = dailyRealizedPnl;
      }
    }

    const t = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50)) / 100;
    const profitGivebackAbs = Math.max(0, peakDailyRealizedPnl - dailyRealizedPnl);
    const profitGivebackPct = peakDailyRealizedPnl > 0 ? profitGivebackAbs / peakDailyRealizedPnl : 0;
    const profitGivebackActivationAbs = Math.max(10, maxDailyLossAbs * 0.1);
    const profitGivebackCautionPct = Number((0.3 + t * 0.15).toFixed(4)); // 30% -> 45%
    const profitGivebackHaltPct = Number((0.55 + t * 0.15).toFixed(4)); // 55% -> 70%
    const profitGivebackHaltMinExposurePct = Number((0.2 - t * 0.12).toFixed(4)); // 20% -> 8%
    const profitGivebackActive = peakDailyRealizedPnl >= profitGivebackActivationAbs;
    const homeStable = params.homeStable.trim().toUpperCase();
    const exposureQuotes = new Set<string>(
      [...(params.allowedExecutionQuotes ?? [])]
        .map((asset) => asset.trim().toUpperCase())
        .filter((asset) => asset.length > 0)
    );
    if (!exposureQuotes.has(homeStable)) {
      exposureQuotes.add(homeStable);
    }
    const managedExposureHome = [...this.getManagedPositions(params.state).values()]
      .filter(
        (position) =>
          position.netQty > 0 &&
          this.getSymbolQuoteAssetByPriority(position.symbol, exposureQuotes) !== null
      )
      .reduce((sum, position) => sum + Math.max(0, position.costQuote), 0);
    const managedExposurePct = walletTotalHome > 0 ? managedExposureHome / walletTotalHome : 0;
    const cautionLossAbs = maxDailyLossAbs * 0.4;
    let state: "NORMAL" | "CAUTION" | "HALT" =
      walletTotalHome <= 0
        ? "NORMAL"
        : dailyRealizedPnl <= -maxDailyLossAbs
          ? "HALT"
          : dailyRealizedPnl <= -cautionLossAbs
            ? "CAUTION"
            : "NORMAL";
    const absLossHalt = state === "HALT";
    let trigger: "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK" = state === "NORMAL" ? "NONE" : "ABS_DAILY_LOSS";

    if (profitGivebackActive) {
      if (profitGivebackPct >= profitGivebackHaltPct) {
        const shouldKeepHardHalt =
          absLossHalt || managedExposurePct >= profitGivebackHaltMinExposurePct || dailyRealizedPnl <= -cautionLossAbs;
        state = shouldKeepHardHalt ? "HALT" : "CAUTION";
        trigger = "PROFIT_GIVEBACK";
      } else if (profitGivebackPct >= profitGivebackCautionPct && state === "NORMAL") {
        state = "CAUTION";
        trigger = "PROFIT_GIVEBACK";
      }
    }
    const active = state === "HALT";
    return {
      state,
      active,
      trigger,
      dailyRealizedPnl: this.toRounded(dailyRealizedPnl, 8),
      peakDailyRealizedPnl: this.toRounded(peakDailyRealizedPnl, 8),
      profitGivebackAbs: this.toRounded(profitGivebackAbs, 8),
      profitGivebackPct: this.toRounded(profitGivebackPct, 8),
      profitGivebackActivationAbs: this.toRounded(profitGivebackActivationAbs, 8),
      profitGivebackCautionPct: this.toRounded(profitGivebackCautionPct, 8),
      profitGivebackHaltPct: this.toRounded(profitGivebackHaltPct, 8),
      profitGivebackHaltMinExposurePct: this.toRounded(profitGivebackHaltMinExposurePct, 8),
      managedExposurePct: this.toRounded(managedExposurePct, 8),
      maxDailyLossAbs: this.toRounded(maxDailyLossAbs, 8),
      maxDailyLossPct: policy.maxDailyLossPct,
      lookbackMs: policy.maxDailyLossLookbackMs,
      windowStartIso
    };
  }

  private buildRuntimeRiskState(params: {
    dailyLossGuard: DailyLossGuardSnapshot;
    homeStable: string;
    activeGlobalLock?: ProtectionLockEntry | null;
  }): BotState["riskState"] {
    const guard = params.dailyLossGuard;
    const baseReasonCodes =
      guard.state === "NORMAL"
        ? []
        : [
            "DAILY_LOSS_GUARD",
            `trigger=${guard.trigger}`,
            `dailyRealized=${guard.dailyRealizedPnl.toFixed(2)}${params.homeStable}`,
            `maxLoss=${guard.maxDailyLossAbs.toFixed(2)}${params.homeStable}`,
            ...(guard.trigger === "PROFIT_GIVEBACK"
              ? [
                  `peakDaily=${guard.peakDailyRealizedPnl.toFixed(2)}${params.homeStable}`,
                  `giveback=${guard.profitGivebackAbs.toFixed(2)}${params.homeStable} (${(guard.profitGivebackPct * 100).toFixed(1)}%)`,
                  `managedExposure=${(guard.managedExposurePct * 100).toFixed(1)}%`,
                  `haltExposureFloor=${(guard.profitGivebackHaltMinExposurePct * 100).toFixed(1)}%`
                ]
              : [])
          ];
    const baseResumeConditions =
      guard.state === "NORMAL"
        ? []
        : [`Rolling PnL window (${Math.round(guard.lookbackMs / 3_600_000)}h) must recover above threshold`];

    const lock = params.activeGlobalLock ?? null;
    if (!lock) {
      return {
        state: guard.state,
        reason_codes: baseReasonCodes,
        unwind_only: guard.state === "HALT",
        resume_conditions: baseResumeConditions
      };
    }

    const lockType = lock.type.trim().toUpperCase();
    const lockIsHardStop = lockType === "STOPLOSS_GUARD" || lockType === "MAX_DRAWDOWN";
    const lockState: "CAUTION" | "HALT" = lockIsHardStop ? "HALT" : "CAUTION";
    const mergedReasonCodes = [...baseReasonCodes, `PROTECTION_LOCK_${lockType}`, `lockReason=${lock.reason}`];
    const mergedResumeConditions = [...baseResumeConditions, `Wait protection lock expiry (${lock.expiresAt})`];

    return {
      state: guard.state === "HALT" ? "HALT" : lockState,
      reason_codes: mergedReasonCodes,
      unwind_only: guard.state === "HALT" || lockIsHardStop,
      resume_conditions: mergedResumeConditions
    };
  }

  private deriveNoActionSymbolCooldownMs(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    // Used to avoid cycling on repeatedly infeasible symbols (quote shortfalls, dust sell constraints, etc.).
    // Lower risk = longer cooldown (less thrash), higher risk = shorter cooldown (more aggressive rotation).
    return Math.round(90_000 - t * 75_000); // 90s -> 15s
  }

  private deriveMaxSymbolConcentrationPct(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    return Number((12 + (boundedRisk / 100) * 20).toFixed(2));
  }

  private deriveConcentrationTrimFraction(params: {
    risk: number;
    exposurePct: number;
    capPct: number;
    pnlPct: number;
  }): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const exposurePct = Number.isFinite(params.exposurePct) ? Math.max(0, params.exposurePct) : 0;
    const capPct = Number.isFinite(params.capPct) ? Math.max(1, params.capPct) : 1;
    const pnlPct = Number.isFinite(params.pnlPct) ? params.pnlPct : 0;
    const excessRatio = Math.max(0, (exposurePct - capPct) / capPct);

    let fraction = 0.2 + excessRatio * 0.5 + (pnlPct < 0 ? Math.min(0.15, Math.abs(pnlPct) / 100) : 0);
    fraction += ((100 - boundedRisk) / 100) * 0.08;
    return Number(Math.min(0.85, Math.max(0.15, fraction)).toFixed(4));
  }

  private deriveNoFeasibleSizingRejectCooldownMs(params: {
    risk: number;
    stage?: string;
    reason?: string;
  }): number {
    const baseCooldownMs = Math.max(this.deriveNoActionSymbolCooldownMs(params.risk), 120_000);
    const stage = (params.stage ?? "").trim().toLowerCase();
    const reason = (params.reason ?? "").trim().toLowerCase();
    const isMinQtyLike =
      stage === "validate-qty" &&
      (reason.includes("minqty") || reason.includes("lot_size") || reason.includes("market_lot_size"));
    const isNotionalLike = reason.includes("minnotional") || reason.includes("notional");

    if (isMinQtyLike) {
      return Math.max(baseCooldownMs * 6, 900_000); // >= 15m
    }
    if (isNotionalLike) {
      return Math.max(baseCooldownMs * 4, 600_000); // >= 10m
    }
    return Math.max(baseCooldownMs * 2, 240_000); // >= 4m
  }

  private deriveFeeEdgeCooldownMs(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    // Fee/edge skips can persist for long periods on low-vol symbols.
    // Cool down modestly to encourage rotation, but keep recovery quick in higher risk profiles.
    return Math.round(240_000 - t * 150_000); // 240s -> 90s
  }

  private deriveGridSizingRejectCooldownMs(params: { risk: number; side: "BUY" | "SELL"; reason?: string }): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;
    const reason = (params.reason ?? "").toLowerCase();
    const floorReject =
      reason.includes("minqty") ||
      reason.includes("minnotional") ||
      reason.includes("notional") ||
      reason.includes("lot_size");

    if (params.side === "SELL" && floorReject) {
      // Sell-side floor rejects on tiny inventory ("dust") are usually persistent; rotate away longer.
      return Math.round((45 - t * 30) * 60_000); // 45m -> 15m
    }
    if (params.side === "BUY" && floorReject) {
      // Buy-side floor rejects can recover sooner as quote/mode changes.
      return Math.round((20 - t * 12) * 60_000); // 20m -> 8m
    }
    return Math.round((8 - t * 5) * 60_000); // 8m -> 3m
  }

  private isSizingFloorRejectReason(reason: string): boolean {
    const normalized = reason.toLowerCase();
    return (
      normalized.includes("minqty") ||
      normalized.includes("minnotional") ||
      normalized.includes("notional") ||
      normalized.includes("lot_size") ||
      normalized.includes("market_lot_size")
    );
  }

  private getReasonQuarantineFamily(summary: string): ReasonQuarantineFamily | null {
    const lower = summary.trim().toLowerCase();
    if (!lower.startsWith("skip ")) return null;

    if (lower.includes("fee/edge filter")) return "FEE_EDGE";
    if (lower.includes("grid sell sizing rejected")) {
      const detail = lower.includes("(") ? lower.slice(lower.indexOf("(")) : lower;
      if (this.isSizingFloorRejectReason(detail)) return "GRID_SELL_SIZING";
    }
    if (lower.includes("grid buy sizing rejected")) {
      const detail = lower.includes("(") ? lower.slice(lower.indexOf("(")) : lower;
      if (this.isSizingFloorRejectReason(detail)) return "GRID_BUY_SIZING";
    }
    if (lower.includes("insufficient spendable") && lower.includes("for grid buy")) return "GRID_BUY_QUOTE";
    return null;
  }

  private deriveReasonQuarantinePolicy(params: {
    family: ReasonQuarantineFamily;
    risk: number;
  }): { threshold: number; windowMs: number; cooldownMs: number } {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;

    if (params.family === "FEE_EDGE") {
      return {
        threshold: Math.max(3, Math.round(4 + t * 2)), // risk 0 -> 4, risk 100 -> 6
        windowMs: 10 * 60_000,
        cooldownMs: Math.round((12 - t * 7) * 60_000) // 12m -> 5m
      };
    }
    if (params.family === "GRID_SELL_SIZING") {
      return {
        threshold: Math.max(2, Math.round(5 - t * 2)), // risk 0 -> 5, risk 100 -> 3
        windowMs: 12 * 60_000,
        cooldownMs: Math.round((20 - t * 12) * 60_000) // 20m -> 8m
      };
    }
    if (params.family === "GRID_BUY_QUOTE") {
      return {
        threshold: Math.max(2, Math.round(5 - t * 2)), // risk 0 -> 5, risk 100 -> 3
        windowMs: 12 * 60_000,
        cooldownMs: Math.round((16 - t * 10) * 60_000) // 16m -> 6m
      };
    }
    return {
      threshold: Math.max(2, Math.round(5 - t * 2)), // risk 0 -> 5, risk 100 -> 3
      windowMs: 10 * 60_000,
      cooldownMs: Math.round((14 - t * 8) * 60_000) // 14m -> 6m
    };
  }

  private maybeApplyReasonQuarantineLock(params: {
    state: BotState;
    summary: string;
    risk: number;
  }): BotState {
    const family = this.getReasonQuarantineFamily(params.summary);
    if (!family) return params.state;

    const policy = this.deriveReasonQuarantinePolicy({ family, risk: params.risk });
    const nowMs = Date.now();

    let count = 0;
    for (const decision of params.state.decisions) {
      if (decision.kind !== "SKIP") continue;
      const ts = Date.parse(decision.ts);
      if (!Number.isFinite(ts)) continue;
      if (nowMs - ts > policy.windowMs) break;
      if (this.getReasonQuarantineFamily(decision.summary) === family) count += 1;
    }
    if (count < policy.threshold) return params.state;

    const untilMs = nowMs + policy.cooldownMs;
    return this.upsertProtectionLock(params.state, {
      type: "COOLDOWN",
      scope: "GLOBAL",
      symbol: `REASON_QUARANTINE:${family}`,
      reason: `Reason quarantine ${family} (${count}/${policy.threshold}, ${Math.round(policy.cooldownMs / 1000)}s)`,
      expiresAt: new Date(untilMs).toISOString(),
      details: {
        category: "REASON_QUARANTINE",
        family,
        count,
        threshold: policy.threshold,
        windowMs: policy.windowMs,
        cooldownMs: policy.cooldownMs
      }
    });
  }

  private countRecentSymbolSkipMatches(params: {
    state: BotState;
    symbol: string;
    contains: string;
    windowMs: number;
  }): number {
    const symbol = params.symbol.trim().toUpperCase();
    const needle = params.contains.trim().toLowerCase();
    if (!symbol || !needle) return 0;

    const nowMs = Date.now();
    let count = 0;
    for (const decision of params.state.decisions) {
      if (decision.kind !== "SKIP") continue;
      const ts = Date.parse(decision.ts);
      if (Number.isFinite(ts) && nowMs - ts > params.windowMs) break;

      const summary = decision.summary.trim();
      if (!summary.toUpperCase().startsWith(`SKIP ${symbol}:`)) continue;
      if (!summary.toLowerCase().includes(needle)) continue;
      count += 1;
    }
    return count;
  }

  private countRecentQuoteAssetGridBuyQuoteSkips(params: {
    state: BotState;
    quoteAsset: string;
    windowMs: number;
  }): number {
    const quoteAsset = params.quoteAsset.trim().toUpperCase();
    if (!quoteAsset) return 0;

    const nowMs = Date.now();
    let count = 0;
    for (const decision of params.state.decisions) {
      if (decision.kind !== "SKIP") continue;
      const ts = Date.parse(decision.ts);
      if (Number.isFinite(ts) && nowMs - ts > params.windowMs) break;

      const summary = decision.summary.trim().toUpperCase();
      if (!summary.startsWith("SKIP ")) continue;
      if (!summary.includes(`INSUFFICIENT SPENDABLE ${quoteAsset}`)) continue;
      if (!summary.includes("FOR GRID BUY")) continue;
      count += 1;
    }
    return count;
  }

  private countRecentSkipCluster(params: {
    state: BotState;
    cluster: "FEE_EDGE" | "MIN_ORDER" | "INVENTORY_WAITING" | "OTHER";
    windowMs: number;
  }): number {
    const nowMs = Date.now();
    let count = 0;
    for (const decision of params.state.decisions) {
      if (decision.kind !== "SKIP") continue;
      const ts = Date.parse(decision.ts);
      if (Number.isFinite(ts) && nowMs - ts > params.windowMs) break;
      if (this.classifySkipReasonCluster(decision.summary) !== params.cluster) continue;
      count += 1;
    }
    return count;
  }

  private getSkipStormKey(summary: string): string | null {
    const raw = summary.trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (!lower.startsWith("skip ")) return null;
    if (lower.startsWith("skip:")) return null; // global skips, not symbol-specific

    const key = (lower.includes("(") ? lower.slice(0, lower.indexOf("(")) : lower).trim();
    const eligible =
      key.includes("sizing rejected") ||
      key.includes("insufficient") ||
      key.includes("conversion cooldown") ||
      key.includes("binance sizing filter") ||
      key.includes("temporarily blacklisted") ||
      key.includes("max consecutive entries reached") ||
      key.includes("waiting for ladder slot or inventory") ||
      key.includes("grid guard paused buy leg") ||
      key.includes("fee/edge filter") ||
      key.includes("max open positions reached") ||
      key.includes("no feasible candidates") ||
      key.includes("invalid");
    return eligible ? key : null;
  }

  private summarizeSkipProblem(summary: string): string {
    const raw = summary.trim();
    if (!raw) return "skip";
    const colonIdx = raw.indexOf(":");
    const afterSymbol = colonIdx >= 0 ? raw.slice(colonIdx + 1).trim() : raw;
    const beforeParen = afterSymbol.includes("(") ? afterSymbol.slice(0, afterSymbol.indexOf("(")).trim() : afterSymbol;
    return beforeParen || afterSymbol || raw;
  }

  private deriveInfeasibleSymbolCooldown(params: {
    state: BotState;
    symbol: string;
    risk: number;
    baseCooldownMs: number;
    summary: string;
  }): {
    cooldownMs: number;
    storm?: { key: string; windowMs: number; count: number; threshold: number; problem: string };
  } {
    const key = this.getSkipStormKey(params.summary);
    if (!key) return { cooldownMs: params.baseCooldownMs };

    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const t = boundedRisk / 100;
    const nowMs = Date.now();
    const isGridWaitKey = key.includes("grid waiting for ladder slot or inventory") || key.includes("grid guard paused buy leg");
    const windowMs = isGridWaitKey ? 3 * 60_000 : 2 * 60_000;
    const threshold = isGridWaitKey
      ? Math.max(3, Math.round(5 - t * 2)) // risk 0 -> 5, risk 100 -> 3
      : Math.max(2, Math.round(4 - t * 2)); // risk 0 -> 4, risk 100 -> 2
    const stormCooldownMs = isGridWaitKey
      ? Math.round(90_000 + t * 60_000) // risk 0 -> 90s, risk 100 -> 150s
      : Math.round(60_000 + t * 180_000); // risk 0 -> 60s, risk 100 -> 240s

    let recent = 0;
    for (const d of params.state.decisions) {
      if (d.kind !== "SKIP") continue;
      const ts = Date.parse(d.ts);
      if (!Number.isFinite(ts)) continue;
      if (nowMs - ts > windowMs) break;
      if (this.getSkipStormKey(d.summary) === key) {
        recent += 1;
      }
    }
    const count = recent + 1; // include current skip
    if (count < threshold) return { cooldownMs: params.baseCooldownMs };

    return {
      cooldownMs: Math.max(params.baseCooldownMs, stormCooldownMs),
      storm: {
        key,
        windowMs,
        count,
        threshold,
        problem: this.summarizeSkipProblem(params.summary)
      }
    };
  }

  private getClosedPnlEvents(state: BotState): ClosedPnlEvent[] {
    const events: ClosedPnlEvent[] = [];
    const positions = new Map<string, { netQty: number; costQuote: number }>();
    const filledOrders = [...state.orderHistory]
      .filter((o) => o.status === "FILLED")
      .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

    for (const order of filledOrders) {
      const symbol = order.symbol.trim().toUpperCase();
      if (!symbol) continue;
      const qty = Number.isFinite(order.qty) ? Math.max(0, order.qty) : 0;
      const price = Number.isFinite(order.price) ? Math.max(0, order.price ?? 0) : 0;
      if (qty <= 0 || price <= 0) continue;

      const current = positions.get(symbol) ?? { netQty: 0, costQuote: 0 };
      if (order.side === "BUY") {
        current.netQty += qty;
        current.costQuote += qty * price;
        positions.set(symbol, current);
        continue;
      }

      const closeQty = Math.min(qty, current.netQty);
      const avgCost = current.netQty > 0 ? current.costQuote / current.netQty : 0;
      if (closeQty > 0 && avgCost > 0) {
        const pnlAbs = (price - avgCost) * closeQty;
        const pnlPct = ((price - avgCost) / avgCost) * 100;
        events.push({
          symbol,
          ts: order.ts,
          pnlAbs: this.toRounded(pnlAbs, 8),
          pnlPct: this.toRounded(pnlPct, 8)
        });
      }

      current.netQty = Math.max(0, current.netQty - closeQty);
      current.costQuote = Math.max(0, current.costQuote - avgCost * closeQty);
      if (current.netQty <= 1e-12) {
        current.netQty = 0;
        current.costQuote = 0;
      }
      positions.set(symbol, current);
    }

    return events;
  }

  private evaluateProtectionLocks(params: {
    state: BotState;
    risk: number;
    walletTotalHome?: number;
  }): BotState {
    const nowMs = Date.now();
    const policy = this.deriveProtectionPolicy(params.risk);
    let next = this.pruneExpiredProtectionLocks(params.state);

    const filledOrdersDesc = [...next.orderHistory]
      .filter((o) => o.status === "FILLED")
      .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    const latestPerSymbol = new Map<string, Order>();
    for (const order of filledOrdersDesc) {
      const symbol = order.symbol.trim().toUpperCase();
      if (!symbol || latestPerSymbol.has(symbol)) continue;
      latestPerSymbol.set(symbol, order);
    }

    for (const [symbol, order] of latestPerSymbol.entries()) {
      const orderTs = Date.parse(order.ts);
      if (!Number.isFinite(orderTs)) continue;
      const expiresAtMs = orderTs + policy.cooldownMs;
      if (expiresAtMs <= nowMs) continue;
      next = this.upsertProtectionLock(next, {
        type: "COOLDOWN",
        scope: "SYMBOL",
        symbol,
        reason: `Cooldown active after last fill (${Math.round(policy.cooldownMs / 1000)}s)`,
        expiresAt: new Date(expiresAtMs).toISOString(),
        details: {
          cooldownMs: policy.cooldownMs,
          lastFillTs: order.ts
        }
      });
    }

    const stoplossEvents = next.decisions.filter((decision) => {
      if (decision.kind !== "TRADE") return false;
      const ts = Date.parse(decision.ts);
      if (!Number.isFinite(ts) || nowMs - ts > policy.stoplossLookbackMs) return false;
      const details = decision.details as Record<string, unknown> | undefined;
      const reason = typeof details?.reason === "string" ? details.reason.toLowerCase() : "";
      return reason.includes("stop-loss");
    });
    if (stoplossEvents.length >= policy.stoplossTradeLimit) {
      next = this.upsertProtectionLock(next, {
        type: "STOPLOSS_GUARD",
        scope: "GLOBAL",
        reason: `${stoplossEvents.length} stop-loss exits in last ${Math.round(policy.stoplossLookbackMs / 60000)}m`,
        expiresAt: new Date(nowMs + policy.stoplossLockMs).toISOString(),
        details: {
          stoplossEvents: stoplossEvents.length,
          lookbackMs: policy.stoplossLookbackMs,
          tradeLimit: policy.stoplossTradeLimit
        }
      });
    }

    const closedPnlEvents = this.getClosedPnlEvents(next).filter((event) => {
      const ts = Date.parse(event.ts);
      return Number.isFinite(ts) && nowMs - ts <= policy.lowProfitLookbackMs;
    });
    const pnlBySymbol = new Map<string, { count: number; totalPnlPct: number }>();
    for (const event of closedPnlEvents) {
      const entry = pnlBySymbol.get(event.symbol) ?? { count: 0, totalPnlPct: 0 };
      entry.count += 1;
      entry.totalPnlPct += event.pnlPct;
      pnlBySymbol.set(event.symbol, entry);
    }
    for (const [symbol, entry] of pnlBySymbol.entries()) {
      if (entry.count < policy.lowProfitTradeLimit) continue;
      const avgPnlPct = entry.totalPnlPct / entry.count;
      if (avgPnlPct >= policy.lowProfitThresholdPct) continue;
      next = this.upsertProtectionLock(next, {
        type: "LOW_PROFIT",
        scope: "SYMBOL",
        symbol,
        reason: `Low recent profitability (${avgPnlPct.toFixed(2)}% avg over ${entry.count} closes)`,
        expiresAt: new Date(nowMs + policy.lowProfitLockMs).toISOString(),
        details: {
          avgPnlPct: this.toRounded(avgPnlPct, 6),
          tradeCount: entry.count,
          thresholdPct: policy.lowProfitThresholdPct,
          lookbackMs: policy.lowProfitLookbackMs
        }
      });
    }

    if (typeof params.walletTotalHome === "number" && Number.isFinite(params.walletTotalHome) && params.walletTotalHome > 50) {
      const events = this.getClosedPnlEvents(next).filter((event) => {
        const ts = Date.parse(event.ts);
        return Number.isFinite(ts) && nowMs - ts <= policy.maxDrawdownLookbackMs;
      });
      if (events.length >= 2) {
        const totalPnl = events.reduce((sum, event) => sum + event.pnlAbs, 0);
        let equity = Math.max(50, params.walletTotalHome - totalPnl);
        let peak = equity;
        let maxDrawdownPct = 0;
        for (const event of events) {
          equity += event.pnlAbs;
          if (equity > peak) peak = equity;
          if (peak > 0) {
            const drawdownPct = ((peak - equity) / peak) * 100;
            if (drawdownPct > maxDrawdownPct) {
              maxDrawdownPct = drawdownPct;
            }
          }
        }

        if (maxDrawdownPct >= policy.maxDrawdownPct) {
          next = this.upsertProtectionLock(next, {
            type: "MAX_DRAWDOWN",
            scope: "GLOBAL",
            reason: `Realized drawdown ${maxDrawdownPct.toFixed(2)}% exceeded ${policy.maxDrawdownPct.toFixed(2)}%`,
            expiresAt: new Date(nowMs + policy.maxDrawdownLockMs).toISOString(),
            details: {
              drawdownPct: this.toRounded(maxDrawdownPct, 6),
              thresholdPct: this.toRounded(policy.maxDrawdownPct, 6),
              lookbackMs: policy.maxDrawdownLookbackMs
            }
          });
        }
      }
    }

    return next;
  }

  private isSymbolBlocked(symbol: string, state: BotState): string | null {
    const config = this.configService.load();
    if (!config) return "Bot is not initialized";

    const globalLock = this.getActiveGlobalProtectionLock(state);
    if (globalLock) {
      return `Protection lock ${globalLock.type}: ${globalLock.reason}`;
    }

    if (config.advanced.neverTradeSymbols.includes(symbol)) {
      return "Blocked by Advanced never-trade list";
    }

    const normalized = symbol.trim().toUpperCase();
    const now = Date.now();
    for (const lock of state.protectionLocks ?? []) {
      if (lock.scope !== "SYMBOL") continue;
      if (lock.symbol?.trim().toUpperCase() !== normalized) continue;
      const expiresAt = Date.parse(lock.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= now) continue;
      if (lock.type.trim().toUpperCase() === "GRID_GUARD_BUY_PAUSE") continue;
      if (this.isNonBlockingGridGuardPauseCooldownLock(lock)) continue;
      return `Protection lock ${lock.type}: ${lock.reason}`;
    }

    const active = (state.symbolBlacklist ?? []).find((e) => e.symbol === symbol && Date.parse(e.expiresAt) > now);
    if (active) {
      return `Temporarily blacklisted (${active.reason})`;
    }

    return null;
  }

  private addSymbolBlacklist(state: BotState, entry: SymbolBlacklistEntry): BotState {
    const next = [entry, ...(state.symbolBlacklist ?? [])];
    return { ...state, symbolBlacklist: next.slice(0, 200) };
  }

  private extractBinanceErrorMessage(rawMessage: string): string {
    const match = rawMessage.match(/\{.*\}/);
    if (!match) return rawMessage;
    try {
      const parsed = JSON.parse(match[0]) as { msg?: unknown };
      if (typeof parsed.msg === "string" && parsed.msg.trim()) {
        return parsed.msg.trim();
      }
    } catch {
      // fall through
    }
    return rawMessage;
  }

  private sanitizeUserErrorMessage(rawMessage: string): string {
    const extracted = this.extractBinanceErrorMessage(rawMessage).trim();
    if (!extracted) return "Unknown exchange error";

    const withoutQuery = extracted
      .replace(/https?:\/\/\S+/gi, (url) => {
        const q = url.indexOf("?");
        return q >= 0 ? `${url.slice(0, q)}?<redacted>` : url;
      })
      .replace(/signature=[a-fA-F0-9]+/g, "signature=<redacted>")
      .replace(/timestamp=\d+/g, "timestamp=<redacted>");

    return withoutQuery.length > 220 ? `${withoutQuery.slice(0, 220)}…` : withoutQuery;
  }

  private isSizingFilterError(rawMessage: string): boolean {
    const message = rawMessage.toUpperCase();
    return (
      message.includes("\"CODE\":-1013") ||
      message.includes("FILTER FAILURE: NOTIONAL") ||
      message.includes("MIN_NOTIONAL") ||
      message.includes("LOT_SIZE") ||
      message.includes("MARKET_LOT_SIZE")
    );
  }

  private isTransientExchangeError(rawMessage: string): boolean {
    const message = rawMessage.toUpperCase();
    return (
      message.includes("REQUEST TIMED OUT") ||
      message.includes("ETIMEDOUT") ||
      message.includes("ECONNRESET") ||
      message.includes("ECONNREFUSED") ||
      message.includes("EAI_AGAIN") ||
      message.includes("ENOTFOUND") ||
      message.includes("NETWORK ERROR") ||
      message.includes("\"CODE\":-1001") ||
      message.includes("\"CODE\":-1003") ||
      message.includes("TOO MANY REQUESTS") ||
      message.includes("429")
    );
  }

  private isInsufficientBalanceError(rawMessage: string): boolean {
    const message = rawMessage.toUpperCase();
    return (
      message.includes("ACCOUNT HAS INSUFFICIENT BALANCE") ||
      message.includes("INSUFFICIENT BALANCE") ||
      message.includes("\"CODE\":-2010")
    );
  }

  private shouldAutoBlacklistError(rawMessage: string): boolean {
    if (this.isSizingFilterError(rawMessage)) return false;
    if (this.isTransientExchangeError(rawMessage)) return false;
    return true;
  }

  private countRecentSymbolErrorSkips(params: {
    state: BotState;
    symbol: string;
    matcher: RegExp;
    windowMs: number;
  }): number {
    const now = Date.now();
    const normalized = params.symbol.trim().toUpperCase();
    let count = 0;
    for (const decision of params.state.decisions) {
      if (decision.kind !== "SKIP") continue;
      const ts = Date.parse(decision.ts);
      if (!Number.isFinite(ts)) continue;
      if (now - ts > params.windowMs) break;
      const summary = decision.summary.toUpperCase();
      if (!summary.includes(normalized)) continue;
      if (!params.matcher.test(summary)) continue;
      count += 1;
    }
    return count;
  }

  private deriveInsufficientBalanceBlacklistTtlMinutes(baseTtlMinutes: number, recentCount: number): number {
    const safeBase = Math.max(1, Math.round(baseTtlMinutes));
    if (recentCount >= 6) return Math.min(24 * 60, safeBase * 4);
    if (recentCount >= 4) return Math.min(24 * 60, safeBase * 3);
    if (recentCount >= 2) return Math.min(24 * 60, safeBase * 2);
    return safeBase;
  }

  private extractExchangeErrorCode(rawMessage: string): string | undefined {
    const quotedCode = rawMessage.match(/"code"\s*:\s*(-?\d+)/i);
    if (quotedCode && quotedCode[1]) return quotedCode[1];

    const plainCode = rawMessage.match(/\bcode\s*(-?\d+)\b/i);
    if (plainCode && plainCode[1]) return plainCode[1];

    if (rawMessage.includes("429") || rawMessage.toUpperCase().includes("TOO MANY REQUESTS")) return "429";
    if (rawMessage.toUpperCase().includes("ETIMEDOUT")) return "ETIMEDOUT";
    if (rawMessage.toUpperCase().includes("ECONNRESET")) return "ECONNRESET";
    return undefined;
  }

  private getTransientBackoffInfo(): {
    active: boolean;
    remainingMs: number;
    errorCount: number;
    pauseUntilIso?: string;
    lastErrorCode?: string;
    lastErrorMessage?: string;
  } {
    const state = this.transientExchangeBackoffState;
    if (!state) {
      return {
        active: false,
        remainingMs: 0,
        errorCount: 0
      };
    }

    const now = Date.now();
    const resetWindowMs = 30 * 60 * 1000;
    if (now - state.lastErrorAtMs > resetWindowMs) {
      this.transientExchangeBackoffState = null;
      return {
        active: false,
        remainingMs: 0,
        errorCount: 0
      };
    }

    const remainingMs = Math.max(0, state.pauseUntilMs - now);
    return {
      active: remainingMs > 0,
      remainingMs,
      errorCount: state.errorCount,
      pauseUntilIso: new Date(state.pauseUntilMs).toISOString(),
      lastErrorCode: state.lastErrorCode,
      lastErrorMessage: state.lastErrorMessage
    };
  }

  private registerTransientExchangeError(rawMessage: string, safeMessage: string): {
    pauseMs: number;
    pauseUntilIso: string;
    errorCount: number;
    lastErrorCode?: string;
  } {
    const now = Date.now();
    const minBackoffMs = 30_000;
    const maxBackoffMs = 600_000;
    const resetWindowMs = 30 * 60 * 1000;
    const multiplier = 2;

    const previous = this.transientExchangeBackoffState;
    const withinResetWindow = previous && now - previous.lastErrorAtMs <= resetWindowMs;
    const errorCount = withinResetWindow ? previous.errorCount + 1 : 1;
    const pauseMs = Math.min(maxBackoffMs, Math.round(minBackoffMs * multiplier ** Math.max(0, errorCount - 1)));
    const pauseUntilMs = now + pauseMs;
    const lastErrorCode = this.extractExchangeErrorCode(rawMessage);

    this.transientExchangeBackoffState = {
      errorCount,
      lastErrorAtMs: now,
      pauseUntilMs,
      lastErrorCode,
      lastErrorMessage: safeMessage
    };

    return {
      pauseMs,
      pauseUntilIso: new Date(pauseUntilMs).toISOString(),
      errorCount,
      ...(lastErrorCode ? { lastErrorCode } : {})
    };
  }

  private clearTransientExchangeBackoff(): void {
    this.transientExchangeBackoffState = null;
  }

  private async withTimeout<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    try {
      return await Promise.race([
        work,
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`${label} request timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private ensureLoopTimer(): void {
    if (this.loopTimer) return;
    this.loopTimer = setInterval(() => {
      void this.tick();
    }, 5000);
  }

  private scheduleExamineTransition(): void {
    if (this.examineTimer) {
      clearTimeout(this.examineTimer);
      this.examineTimer = null;
    }

    this.examineTimer = setTimeout(() => {
      void (async () => {
        try {
          const snap = await this.universe.scanAndWait();
          const top = snap.candidates?.[0];
          const summary = top
            ? `Universe scan finished: top ${top.symbol} (ADX ${top.adx14?.toFixed(1) ?? "—"} · RSI ${top.rsi14?.toFixed(1) ?? "—"})`
            : "Universe scan finished (no candidates)";
          this.addDecision("EXAMINE", summary);
        } catch (err) {
          this.addDecision("EXAMINE", `Universe scan failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          this.save({ ...this.getState(), phase: "TRADING" });
        }
      })();
    }, 250);
  }

  private getRecentSymbolOrders(state: BotState, symbol: string): Order[] {
    const normalized = symbol.trim().toUpperCase();
    return [...state.activeOrders, ...state.orderHistory]
      .filter((o) => o.symbol.trim().toUpperCase() === normalized && (o.status === "NEW" || o.status === "FILLED"))
      .sort((a, b) => {
        const ta = Date.parse(a.ts);
        const tb = Date.parse(b.ts);
        if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
        if (!Number.isFinite(ta)) return 1;
        if (!Number.isFinite(tb)) return -1;
        return tb - ta;
      });
  }

  private getEntryGuard(params: { symbol: string; state: BotState }): { summary: string; details?: Record<string, unknown> } | null {
    const config = this.configService.load();
    if (!config) return null;

    const history = this.getRecentSymbolOrders(params.state, params.symbol);
    const normalizedSymbol = params.symbol.trim().toUpperCase();
    const cooldownMs = config.advanced.symbolEntryCooldownMs;
    if (cooldownMs > 0) {
      const lastBuy = history.find((o) => o.side === "BUY");
      const lastBuyAt = lastBuy ? Date.parse(lastBuy.ts) : Number.NaN;
      if (Number.isFinite(lastBuyAt)) {
        const elapsed = Date.now() - lastBuyAt;
        if (elapsed < cooldownMs) {
          return {
            summary: "Entry cooldown active",
            details: {
              cooldownMs,
              remainingMs: Math.max(0, Math.round(cooldownMs - elapsed)),
              lastBuyTs: lastBuy?.ts
            }
          };
        }
      }
    }

    const configuredRisk = (config as Partial<AppConfig>).basic?.risk;
    const riskForEntryGuard = typeof configuredRisk === "number" && Number.isFinite(configuredRisk) ? configuredRisk : 50;
    const stopLossEntryCooldownMs = this.deriveStopLossEntryCooldownMs(riskForEntryGuard);
    if (stopLossEntryCooldownMs > 0) {
      const lastStopLossExit = params.state.decisions.find((decision) => {
        if (decision.kind !== "TRADE") return false;
        const details = this.getDecisionDetails(decision);
        if (details?.reason !== "stop-loss-exit") return false;
        return decision.summary.toUpperCase().includes(normalizedSymbol);
      });
      if (lastStopLossExit) {
        const stopLossAt = Date.parse(lastStopLossExit.ts);
        if (Number.isFinite(stopLossAt)) {
          const elapsed = Date.now() - stopLossAt;
          if (elapsed < stopLossEntryCooldownMs) {
            return {
              summary: "Post stop-loss cooldown active",
              details: {
                stopLossEntryCooldownMs,
                remainingMs: Math.max(0, Math.round(stopLossEntryCooldownMs - elapsed)),
                lastStopLossTs: lastStopLossExit.ts
              }
            };
          }
        }
      }
    }

    const maxConsecutiveEntries = config.advanced.maxConsecutiveEntriesPerSymbol;
    if (maxConsecutiveEntries > 0) {
      let consecutiveBuys = 0;
      for (const order of history) {
        if (order.side === "SELL") break;
        if (order.side === "BUY") consecutiveBuys += 1;
      }
      if (consecutiveBuys >= maxConsecutiveEntries) {
        return {
          summary: `Max consecutive entries reached (${maxConsecutiveEntries})`,
          details: {
            consecutiveBuys,
            maxConsecutiveEntries
          }
        };
      }
    }

    return null;
  }

  private getManagedPositions(state: BotState): Map<string, ManagedPosition> {
    const positions = new Map<string, ManagedPosition>();
    const filledOrders = [...state.orderHistory]
      .filter((o) => o.status === "FILLED")
      .sort((a, b) => {
        const ta = Date.parse(a.ts);
        const tb = Date.parse(b.ts);
        if (!Number.isFinite(ta) && !Number.isFinite(tb)) return 0;
        if (!Number.isFinite(ta)) return -1;
        if (!Number.isFinite(tb)) return 1;
        return ta - tb;
      });

    for (const order of filledOrders) {
      const symbol = order.symbol.trim().toUpperCase();
      const position = positions.get(symbol) ?? {
        symbol,
        netQty: 0,
        costQuote: 0,
        lastBuyTs: undefined,
        lastSellTs: undefined
      };

      const qty = Number.isFinite(order.qty) ? Math.max(0, order.qty) : 0;
      const notional = Number.isFinite(order.price) ? qty * (order.price ?? 0) : 0;
      if (qty <= 0) continue;

      if (order.side === "BUY") {
        position.netQty += qty;
        if (Number.isFinite(notional) && notional > 0) {
          position.costQuote += notional;
        }
        position.lastBuyTs = order.ts;
      } else {
        const reduceQty = Math.min(qty, position.netQty);
        const avgCost = position.netQty > 0 ? position.costQuote / position.netQty : 0;
        position.netQty -= reduceQty;
        if (Number.isFinite(avgCost) && avgCost > 0) {
          position.costQuote = Math.max(0, position.costQuote - avgCost * reduceQty);
        }
        if (position.netQty <= 1e-12) {
          position.netQty = 0;
          position.costQuote = 0;
        }
        position.lastSellTs = order.ts;
      }

      positions.set(symbol, position);
    }

    return positions;
  }

  private pickManagedFallbackSymbol(params: {
    state: BotState;
    isExecutionQuoteSymbol: (symbol: string) => boolean;
    minExposureHome?: number;
  }): string | null {
    const minExposureHome = Number.isFinite(params.minExposureHome) ? Math.max(0, params.minExposureHome ?? 0) : 0;
    return (
      [...this.getManagedPositions(params.state).values()]
        .filter(
          (position) =>
            this.isManagedPositionCountable(position, minExposureHome) &&
            params.isExecutionQuoteSymbol(position.symbol) &&
            this.isSymbolBlocked(position.symbol, params.state) === null
        )
        .sort((left, right) => right.costQuote - left.costQuote)[0]?.symbol ?? null
    );
  }

  private async getPairPrice(baseAsset: string, quoteAsset: string): Promise<number | null> {
    const base = baseAsset.trim().toUpperCase();
    const quote = quoteAsset.trim().toUpperCase();
    if (!base || !quote) return null;
    if (base === quote) return 1;

    try {
      const direct = Number.parseFloat(await this.marketData.getTickerPrice(`${base}${quote}`));
      if (Number.isFinite(direct) && direct > 0) return direct;
    } catch {
      // ignore
    }

    try {
      const inverse = Number.parseFloat(await this.marketData.getTickerPrice(`${quote}${base}`));
      if (Number.isFinite(inverse) && inverse > 0) return 1 / inverse;
    } catch {
      // ignore
    }

    return null;
  }

  private async estimateAssetValueInHome(
    asset: string,
    amount: number,
    homeStable: string,
    bridgeAssets: string[]
  ): Promise<number | null> {
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const normalizedAsset = asset.trim().toUpperCase();
    const normalizedHome = homeStable.trim().toUpperCase();
    if (!normalizedAsset || !normalizedHome) return null;
    if (normalizedAsset === normalizedHome) return amount;

    const direct = await this.getPairPrice(normalizedAsset, normalizedHome);
    if (direct) return amount * direct;

    for (const bridge of bridgeAssets) {
      const normalizedBridge = bridge.trim().toUpperCase();
      if (!normalizedBridge || normalizedBridge === normalizedAsset || normalizedBridge === normalizedHome) continue;
      const p1 = await this.getPairPrice(normalizedAsset, normalizedBridge);
      if (!p1) continue;
      const p2 = await this.getPairPrice(normalizedBridge, normalizedHome);
      if (!p2) continue;
      return amount * p1 * p2;
    }

    return null;
  }

  private async estimateWalletTotalInHome(balances: BinanceBalanceSnapshot[], homeStable: string): Promise<number> {
    const bridgeAssets = resolveRouteBridgeAssets(this.configService.load(), homeStable);
    let total = 0;
    for (const balance of balances) {
      const qty = Number.isFinite(balance.total) ? balance.total : balance.free + balance.locked;
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const value = await this.estimateAssetValueInHome(balance.asset, qty, homeStable, bridgeAssets);
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      total += value;
    }
    return total;
  }

  private async normalizeHomeAmountToQuoteUnits(params: {
    amountHome: number;
    quoteAsset: string;
    homeStable: string;
    bridgeAssets: string[];
  }): Promise<number | null> {
    if (!Number.isFinite(params.amountHome) || params.amountHome < 0) return null;
    const normalizedQuote = params.quoteAsset.trim().toUpperCase();
    const normalizedHome = params.homeStable.trim().toUpperCase();
    if (!normalizedQuote || !normalizedHome) return null;
    if (normalizedQuote === normalizedHome) return params.amountHome;

    const quoteUnitValueHome = await this.estimateAssetValueInHome(normalizedQuote, 1, normalizedHome, params.bridgeAssets);
    if (typeof quoteUnitValueHome !== "number" || !Number.isFinite(quoteUnitValueHome) || quoteUnitValueHome <= 0) return null;
    return params.amountHome / quoteUnitValueHome;
  }

  private async deriveQuoteReserveTargets(params: {
    config?: AppConfig;
    walletTotalHome: number;
    capitalProfile: CapitalProfile;
    risk: number;
    quoteAsset: string;
    homeStable: string;
    bridgeAssets: string[];
  }): Promise<{
    floorTopUpTarget: number;
    reserveLowTarget: number;
    reserveHighTarget: number;
    reserveHardTarget: number;
  }> {
    const configuredMinTopUpTarget = params.config?.advanced.conversionTopUpMinTarget ?? 5;
    const floorTopUpTargetHome =
      Number.isFinite(configuredMinTopUpTarget) && configuredMinTopUpTarget > 0 ? configuredMinTopUpTarget : 5;
    const conversionTopUpReserveMultiplier = Math.max(1, params.config?.advanced.conversionTopUpReserveMultiplier ?? 2);
    const reserveScale = 1.8 - (params.risk / 100) * 0.8;
    const reserveLowTargetHome = Math.max(
      floorTopUpTargetHome,
      floorTopUpTargetHome * conversionTopUpReserveMultiplier,
      params.walletTotalHome * params.capitalProfile.reserveLowPct * reserveScale
    );
    const reserveHighTargetHome = Math.max(
      reserveLowTargetHome,
      reserveLowTargetHome * 2,
      params.walletTotalHome * params.capitalProfile.reserveHighPct * reserveScale
    );
    const reserveHardTargetHome = (() => {
      const t = Math.max(0, Math.min(1, params.risk / 100));
      return floorTopUpTargetHome + (reserveLowTargetHome - floorTopUpTargetHome) * (1 - t);
    })();

    const [floorTopUpTargetQuote, reserveLowTargetQuote, reserveHighTargetQuote, reserveHardTargetQuote] = await Promise.all([
      this.normalizeHomeAmountToQuoteUnits({
        amountHome: floorTopUpTargetHome,
        quoteAsset: params.quoteAsset,
        homeStable: params.homeStable,
        bridgeAssets: params.bridgeAssets
      }),
      this.normalizeHomeAmountToQuoteUnits({
        amountHome: reserveLowTargetHome,
        quoteAsset: params.quoteAsset,
        homeStable: params.homeStable,
        bridgeAssets: params.bridgeAssets
      }),
      this.normalizeHomeAmountToQuoteUnits({
        amountHome: reserveHighTargetHome,
        quoteAsset: params.quoteAsset,
        homeStable: params.homeStable,
        bridgeAssets: params.bridgeAssets
      }),
      this.normalizeHomeAmountToQuoteUnits({
        amountHome: reserveHardTargetHome,
        quoteAsset: params.quoteAsset,
        homeStable: params.homeStable,
        bridgeAssets: params.bridgeAssets
      })
    ]);

    return {
      floorTopUpTarget: floorTopUpTargetQuote ?? floorTopUpTargetHome,
      reserveLowTarget: reserveLowTargetQuote ?? reserveLowTargetHome,
      reserveHighTarget: reserveHighTargetQuote ?? reserveHighTargetHome,
      reserveHardTarget: reserveHardTargetQuote ?? reserveHardTargetHome
    };
  }

  private getSymbolQuoteAssetByPriority(symbol: string, quoteAssets: Iterable<string>): string | null {
    const normalizedSymbol = symbol.trim().toUpperCase();
    if (!normalizedSymbol) return null;
    const quotes = [...quoteAssets]
      .map((asset) => asset.trim().toUpperCase())
      .filter((asset) => asset.length > 0)
      .sort((left, right) => right.length - left.length);
    for (const quote of quotes) {
      if (normalizedSymbol.length <= quote.length) continue;
      if (normalizedSymbol.endsWith(quote)) return quote;
    }
    return null;
  }

  private getSymbolBaseAssetByPriority(symbol: string, quoteAssets: Iterable<string>): string | null {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const quote = this.getSymbolQuoteAssetByPriority(normalizedSymbol, quoteAssets);
    if (!quote) return null;
    const base = normalizedSymbol.slice(0, normalizedSymbol.length - quote.length).trim().toUpperCase();
    return base || null;
  }

  private getCapitalProfile(walletTotalHome: number): CapitalProfile {
    if (!Number.isFinite(walletTotalHome) || walletTotalHome <= 1_200) {
      return {
        tier: "MICRO",
        notionalCapMultiplier: 0.6,
        reserveLowPct: 0.005,
        reserveHighPct: 0.0125,
        minNetEdgePct: 0.35
      };
    }

    if (walletTotalHome <= 5_000) {
      return {
        tier: "SMALL",
        notionalCapMultiplier: 0.8,
        reserveLowPct: 0.003,
        reserveHighPct: 0.008,
        minNetEdgePct: 0.25
      };
    }

    return {
      tier: "STANDARD",
      notionalCapMultiplier: 1,
      reserveLowPct: 0.001,
      reserveHighPct: 0.0025,
      minNetEdgePct: 0.15
    };
  }

  private estimateCandidateEdgePct(candidate: UniverseCandidate | null): number | null {
    if (!candidate) return null;
    const atr = Number.isFinite(candidate.atrPct14) ? Math.max(0, Math.min(8, candidate.atrPct14 ?? 0)) : 0;
    const adx = Number.isFinite(candidate.adx14) ? Math.max(0, Math.min(100, candidate.adx14 ?? 0)) : 0;
    const rsi = Number.isFinite(candidate.rsi14) ? Math.max(0, Math.min(100, candidate.rsi14 ?? 50)) : 50;
    const score = Number.isFinite(candidate.score) ? Math.max(0, candidate.score) : 0;

    const atrComponent = atr * 0.35;
    const trendComponent = Math.min(1, Math.max(0, (adx - 15) / 35)) * 0.45;
    const rsiComponent = rsi <= 35 || rsi >= 65 ? 0.2 : 0.08;
    const scoreComponent = Math.min(1, score / 6) * 0.25;

    return atrComponent + trendComponent + rsiComponent + scoreComponent;
  }

  private resolveExecutionQuoteAssets(params: {
    config: AppConfig | null;
    homeStable: string;
    traderRegion: "EEA" | "NON_EEA";
    risk: number;
  }): Set<string> {
    const homeStable = params.homeStable.trim().toUpperCase();
    const defaults = resolveUniverseDefaultQuoteAssets({
      config: params.config,
      homeStableCoin: homeStable,
      traderRegion: params.traderRegion
    });
    const normalizedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const allowFiatQuotes = normalizedRisk >= 35;
    const maxNonStableQuotes = normalizedRisk >= 80 ? 3 : normalizedRisk >= 60 ? 2 : normalizedRisk >= 45 ? 1 : 0;

    const stableOrHome: string[] = [];
    const fiatQuotes: string[] = [];
    const nonStableQuotes: string[] = [];
    for (const asset of defaults) {
      const normalized = asset.trim().toUpperCase();
      if (!normalized) continue;
      if (normalized === homeStable || isStableAsset(normalized)) {
        stableOrHome.push(normalized);
        continue;
      }
      if (EXECUTION_FIAT_QUOTES.has(normalized)) {
        fiatQuotes.push(normalized);
        continue;
      }
      nonStableQuotes.push(normalized);
    }

    const finalQuotes = new Set<string>(stableOrHome.length > 0 ? stableOrHome : [homeStable]);
    if (allowFiatQuotes) {
      for (const quote of fiatQuotes) {
        finalQuotes.add(quote);
      }
    }
    for (const quote of nonStableQuotes.slice(0, maxNonStableQuotes)) {
      finalQuotes.add(quote);
    }
    if (finalQuotes.size === 0) {
      finalQuotes.add(homeStable);
    }

    return finalQuotes;
  }

  private derivePerQuoteExposureCapPct(params: { quoteAsset: string; homeStable: string; risk: number }): number | null {
    const quote = params.quoteAsset.trim().toUpperCase();
    const home = params.homeStable.trim().toUpperCase();
    if (!quote || !home) return null;
    if (quote === home) return null;

    const t = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50)) / 100;
    if (isStableAsset(quote)) {
      // Stable quote families can carry larger share, but still bounded to avoid single-quote lock-in.
      return Number((25 + t * 40).toFixed(4)); // 25% -> 65%
    }
    if (EXECUTION_FIAT_QUOTES.has(quote)) {
      return Number((15 + t * 25).toFixed(4)); // 15% -> 40%
    }
    // Non-stable crypto quote families are capped tighter by default.
    return Number((8 + t * 17).toFixed(4)); // 8% -> 25%
  }

  private async buildQuoteExposureHomeMap(params: {
    state: BotState;
    homeStable: string;
    allowedExecutionQuotes: Iterable<string>;
  }): Promise<Map<string, number>> {
    const normalizedHomeStable = params.homeStable.trim().toUpperCase();
    const exposureByQuote = new Map<string, number>();
    const quoteCandidates = [...params.allowedExecutionQuotes].map((asset) => asset.trim().toUpperCase());
    const bridgeAssets = resolveRouteBridgeAssets(this.configService.load(), normalizedHomeStable);
    const managedPositions = [...this.getManagedPositions(params.state).values()].filter(
      (position) => position.netQty > 0 && Number.isFinite(position.costQuote) && position.costQuote > 0
    );

    for (const position of managedPositions) {
      const quoteAsset = this.getSymbolQuoteAssetByPriority(position.symbol, quoteCandidates);
      if (!quoteAsset) continue;

      let exposureHome = position.costQuote;
      if (quoteAsset !== normalizedHomeStable) {
        const converted = await this.estimateAssetValueInHome(
          quoteAsset,
          position.costQuote,
          normalizedHomeStable,
          bridgeAssets
        );
        if (!Number.isFinite(converted ?? Number.NaN)) continue;
        exposureHome = Math.max(0, converted ?? 0);
      }
      exposureByQuote.set(quoteAsset, (exposureByQuote.get(quoteAsset) ?? 0) + exposureHome);
    }

    return exposureByQuote;
  }

  private pickExposureEligibleCandidate(params: {
    preferredCandidate: UniverseCandidate | null;
    snapshotCandidates: UniverseCandidate[];
    state: BotState;
    allowedExecutionQuotes: Set<string>;
    traderRegion: string;
    neverTradeSymbols: string[];
    excludeStableStablePairs: boolean;
    enforceRegionPolicy: boolean;
    balances: BinanceBalanceSnapshot[];
    walletTotalHome: number;
    maxPositionPct: number;
  }): UniverseCandidate | null {
    const {
      preferredCandidate,
      snapshotCandidates,
      state,
      allowedExecutionQuotes,
      traderRegion,
      neverTradeSymbols,
      excludeStableStablePairs,
      enforceRegionPolicy,
      balances,
      walletTotalHome,
      maxPositionPct
    } = params;

    const pool = [preferredCandidate, ...snapshotCandidates].filter(Boolean) as UniverseCandidate[];
    const seen = new Set<string>();
    const maxSymbolNotional = walletTotalHome * (maxPositionPct / 100);
    if (!Number.isFinite(maxSymbolNotional) || maxSymbolNotional <= 0) return null;

    for (const candidate of pool) {
      const symbol = candidate.symbol.trim().toUpperCase();
      if (!symbol || seen.has(symbol)) continue;
      seen.add(symbol);

      const quoteAsset = candidate.quoteAsset.trim().toUpperCase();
      if (!allowedExecutionQuotes.has(quoteAsset)) continue;
      if (this.isSymbolBlocked(symbol, state)) continue;
      if (this.getEntryGuard({ symbol, state })) continue;

      const policyReason = getPairPolicyBlockReason({
        symbol,
        baseAsset: candidate.baseAsset,
        quoteAsset: candidate.quoteAsset,
        traderRegion: traderRegion === "EEA" ? "EEA" : "NON_EEA",
        neverTradeSymbols,
        excludeStableStablePairs,
        enforceRegionPolicy
      });
      if (policyReason) continue;

      const price = Number.isFinite(candidate.lastPrice) ? candidate.lastPrice : Number.NaN;
      if (!Number.isFinite(price) || price <= 0) continue;

      const baseAsset = candidate.baseAsset.trim().toUpperCase();
      const baseTotal = balances.find((b) => b.asset.trim().toUpperCase() === baseAsset)?.total ?? 0;
      const currentNotional = Number.isFinite(baseTotal) && baseTotal > 0 ? baseTotal * price : 0;
      if (currentNotional >= maxSymbolNotional) continue;

      return candidate;
    }

    return null;
  }

  private async pickFeasibleLiveCandidate(params: {
    preferredCandidate: UniverseCandidate | null;
    snapshotCandidates: UniverseCandidate[];
    state: BotState;
    homeStable: string;
    allowedExecutionQuotes: Set<string>;
    traderRegion: string;
    neverTradeSymbols: string[];
    excludeStableStablePairs: boolean;
    enforceRegionPolicy: boolean;
    balances: BinanceBalanceSnapshot[];
    walletTotalHome: number;
    risk: number;
    maxPositionPct: number;
    minQuoteLiquidityHome: number;
    notionalCap: number;
    capitalNotionalCapMultiplier: number;
    bufferFactor: number;
    managedOpenSymbolsOnly?: Set<string> | null;
  }): Promise<{
    candidate: UniverseCandidate | null;
    reason?: string;
    sizingRejected: number;
    rejectionSamples: Array<{
      symbol: string;
      stage: string;
      reason: string;
      quoteAsset?: string;
      price?: number;
      targetNotional?: number;
      targetNotionalHome?: number;
      desiredQty?: number;
      normalizedQty?: string;
      requiredQty?: string;
      bufferedCost?: number;
      remainingSymbolNotional?: number;
      effectiveNotionalCap?: number;
      quoteExposureHome?: number;
      quoteExposureCapHome?: number;
      projectedQuoteExposureHome?: number;
    }>;
  }> {
    const {
      preferredCandidate,
      snapshotCandidates,
      state,
      homeStable,
      allowedExecutionQuotes,
      traderRegion,
      neverTradeSymbols,
      excludeStableStablePairs,
      enforceRegionPolicy,
      balances,
      walletTotalHome,
      risk,
      maxPositionPct,
      minQuoteLiquidityHome,
      notionalCap,
      capitalNotionalCapMultiplier,
      bufferFactor,
      managedOpenSymbolsOnly
    } = params;

    const pool = [preferredCandidate, ...snapshotCandidates].filter(Boolean) as UniverseCandidate[];
    const seen = new Set<string>();
    const managedSymbolsOnlySet = managedOpenSymbolsOnly
      ? new Set([...managedOpenSymbolsOnly].map((symbol) => symbol.trim().toUpperCase()).filter((symbol) => symbol.length > 0))
      : null;
    if (managedSymbolsOnlySet && managedSymbolsOnlySet.size === 0) {
      return {
        candidate: null,
        reason: "No feasible candidates: daily loss caution paused new symbols (no managed inventory)",
        sizingRejected: 0,
        rejectionSamples: []
      };
    }
    const maxSymbolNotional = walletTotalHome * (maxPositionPct / 100);
    if (!Number.isFinite(maxSymbolNotional) || maxSymbolNotional <= 0) {
      return { candidate: null, reason: "Max symbol exposure is zero", sizingRejected: 0, rejectionSamples: [] };
    }

    const effectiveNotionalCap =
      Number.isFinite(notionalCap) && notionalCap > 0 ? Math.max(1, notionalCap * capitalNotionalCapMultiplier) : null;
    const capForSizing = effectiveNotionalCap ? effectiveNotionalCap / bufferFactor : null;
    const rawTargetNotional = walletTotalHome * (maxPositionPct / 100);
    const normalizedHomeStable = homeStable.trim().toUpperCase();
    const liveConfig = this.configService.load() ?? undefined;
    const quoteBridgeAssets = resolveRouteBridgeAssets(liveConfig ?? null, normalizedHomeStable);
    const capitalProfile = this.getCapitalProfile(walletTotalHome);
    const quoteExposureHomeMap = await this.buildQuoteExposureHomeMap({
      state,
      homeStable: normalizedHomeStable,
      allowedExecutionQuotes
    });
    let sizingRejected = 0;
    let managedSymbolFiltered = 0;
    const rejectionSamples: Array<{
      symbol: string;
      stage: string;
      reason: string;
      quoteAsset?: string;
      price?: number;
      targetNotional?: number;
      targetNotionalHome?: number;
      desiredQty?: number;
      normalizedQty?: string;
      requiredQty?: string;
      bufferedCost?: number;
      remainingSymbolNotional?: number;
      effectiveNotionalCap?: number;
      quoteExposureHome?: number;
      quoteExposureCapHome?: number;
      projectedQuoteExposureHome?: number;
    }> = [];

    const recordRejection = (sample: (typeof rejectionSamples)[number]): void => {
      if (rejectionSamples.length >= 8) return;
      rejectionSamples.push(sample);
    };

    for (const candidate of pool) {
      const symbol = candidate.symbol.trim().toUpperCase();
      if (!symbol || seen.has(symbol)) continue;
      seen.add(symbol);
      if (managedSymbolsOnlySet && !managedSymbolsOnlySet.has(symbol)) {
        managedSymbolFiltered += 1;
        continue;
      }

      const quoteAsset = candidate.quoteAsset.trim().toUpperCase();
      if (!allowedExecutionQuotes.has(quoteAsset)) continue;
      if (this.isSymbolBlocked(symbol, state)) continue;
      if (this.getEntryGuard({ symbol, state })) continue;
      const quoteFree = balances.find((b) => b.asset.trim().toUpperCase() === quoteAsset)?.free ?? 0;
      if (!Number.isFinite(quoteFree) || quoteFree <= 0) continue;
      const quoteReserveTargets = await this.deriveQuoteReserveTargets({
        config: liveConfig,
        walletTotalHome,
        capitalProfile,
        risk,
        quoteAsset,
        homeStable: normalizedHomeStable,
        bridgeAssets: quoteBridgeAssets
      });
      const quoteSpendable = Math.max(0, quoteFree - quoteReserveTargets.reserveHardTarget);
      if (quoteSpendable <= 1e-8) {
        recordRejection({
          symbol,
          stage: "quote-spendable",
          reason: `Spendable ${quoteAsset} exhausted after reserve (${quoteFree.toFixed(8)} <= ${quoteReserveTargets.reserveHardTarget.toFixed(8)})`,
          quoteAsset
        });
        continue;
      }
      if (quoteSpendable + 1e-8 < quoteReserveTargets.floorTopUpTarget) {
        recordRejection({
          symbol,
          stage: "quote-spendable-floor",
          reason: `Spendable ${quoteAsset} below funding floor (${quoteSpendable.toFixed(8)} < ${quoteReserveTargets.floorTopUpTarget.toFixed(8)})`,
          quoteAsset
        });
        continue;
      }

      const policyReason = getPairPolicyBlockReason({
        symbol,
        baseAsset: candidate.baseAsset,
        quoteAsset: candidate.quoteAsset,
        traderRegion: traderRegion === "EEA" ? "EEA" : "NON_EEA",
        neverTradeSymbols,
        excludeStableStablePairs,
        enforceRegionPolicy
      });
      if (policyReason) continue;

      let check: MarketQtyValidation | null = null;
      try {
        const rules = await this.marketData.getSymbolRules(symbol);
        const rulesQuoteAsset = rules.quoteAsset.trim().toUpperCase();
        if (!allowedExecutionQuotes.has(rulesQuoteAsset)) continue;

        let price = Number.isFinite(candidate.lastPrice) ? candidate.lastPrice : Number.NaN;
        if (!Number.isFinite(price) || price <= 0) {
          const priceStr = await this.marketData.getTickerPrice(symbol);
          const parsed = Number.parseFloat(priceStr);
          price = Number.isFinite(parsed) ? parsed : Number.NaN;
        }
        if (!Number.isFinite(price) || price <= 0) continue;

        const baseAsset = rules.baseAsset.trim().toUpperCase();
        const baseTotal = balances.find((b) => b.asset.trim().toUpperCase() === baseAsset)?.total ?? 0;
        const hasInventory =
          Number.isFinite(baseTotal) &&
          baseTotal > Number.EPSILON;
        if (!hasInventory && quoteAsset !== normalizedHomeStable) {
          const quoteHomeValue = await this.estimateAssetValueInHome(
            quoteAsset,
            quoteSpendable,
            normalizedHomeStable,
            quoteBridgeAssets
          );
          const quoteLiquidityHome = Number.isFinite(quoteHomeValue ?? Number.NaN) ? quoteHomeValue ?? 0 : 0;
          if (!Number.isFinite(quoteLiquidityHome) || quoteLiquidityHome < minQuoteLiquidityHome) {
            sizingRejected += 1;
            recordRejection({
              symbol,
              stage: "quote-liquidity",
              reason: `Quote liquidity ${quoteLiquidityHome.toFixed(4)} ${normalizedHomeStable} < ${minQuoteLiquidityHome.toFixed(4)} ${normalizedHomeStable}`,
              quoteAsset,
              price: Number.isFinite(price) ? Number(price.toFixed(8)) : undefined
            });
            continue;
          }
        }
        const currentNotional = Number.isFinite(baseTotal) && baseTotal > 0 ? baseTotal * price : 0;
        const remainingSymbolNotional = Math.max(0, maxSymbolNotional - currentNotional);
        if (remainingSymbolNotional <= 0) continue;

        const targetNotional = Math.min(rawTargetNotional, capForSizing ?? rawTargetNotional, quoteSpendable, remainingSymbolNotional);
        if (!Number.isFinite(targetNotional) || targetNotional <= 0) continue;
        const quoteExposureCapPct = this.derivePerQuoteExposureCapPct({
          quoteAsset,
          homeStable: normalizedHomeStable,
          risk
        });
        if (quoteExposureCapPct !== null && walletTotalHome > 0) {
          let targetNotionalHome = targetNotional;
          if (quoteAsset !== normalizedHomeStable) {
            const convertedTarget = await this.estimateAssetValueInHome(
              quoteAsset,
              targetNotional,
              normalizedHomeStable,
              quoteBridgeAssets
            );
            if (Number.isFinite(convertedTarget ?? Number.NaN)) {
              targetNotionalHome = Math.max(0, convertedTarget ?? 0);
            }
          }

          const quoteExposureHome = quoteExposureHomeMap.get(quoteAsset) ?? 0;
          const quoteExposureCapHome = walletTotalHome * (quoteExposureCapPct / 100);
          const projectedQuoteExposureHome = quoteExposureHome + targetNotionalHome;
          if (projectedQuoteExposureHome > quoteExposureCapHome + Math.max(0.1, quoteExposureCapHome * 0.001)) {
            sizingRejected += 1;
            recordRejection({
              symbol,
              stage: "quote-exposure-cap",
              reason: `Quote exposure cap ${quoteAsset} ${(quoteExposureHome / walletTotalHome * 100).toFixed(2)}% + ${(targetNotionalHome / walletTotalHome * 100).toFixed(2)}% > ${quoteExposureCapPct.toFixed(2)}%`,
              quoteAsset,
              price: Number.isFinite(price) ? Number(price.toFixed(8)) : undefined,
              targetNotional: Number.isFinite(targetNotional) ? Number(targetNotional.toFixed(6)) : undefined,
              targetNotionalHome: Number.isFinite(targetNotionalHome) ? Number(targetNotionalHome.toFixed(6)) : undefined,
              quoteExposureHome: Number.isFinite(quoteExposureHome) ? Number(quoteExposureHome.toFixed(6)) : undefined,
              quoteExposureCapHome: Number.isFinite(quoteExposureCapHome) ? Number(quoteExposureCapHome.toFixed(6)) : undefined,
              projectedQuoteExposureHome: Number.isFinite(projectedQuoteExposureHome)
                ? Number(projectedQuoteExposureHome.toFixed(6))
                : undefined
            });
            continue;
          }
        }

        const desiredQty = targetNotional / price;
        check = await this.marketData.validateMarketOrderQty(symbol, desiredQty);
        const qtyStr = check.ok ? check.normalizedQty : check.requiredQty;
        if (!qtyStr) {
          sizingRejected += 1;
          recordRejection({
            symbol,
            stage: "validate-qty",
            reason: check.reason ?? "No qty returned",
            quoteAsset,
            price: Number.isFinite(price) ? Number(price.toFixed(8)) : undefined,
            targetNotional: Number.isFinite(targetNotional) ? Number(targetNotional.toFixed(6)) : undefined,
            desiredQty: Number.isFinite(desiredQty) ? Number(desiredQty.toFixed(8)) : undefined,
            normalizedQty: check.normalizedQty,
            requiredQty: check.requiredQty
          });
          continue;
        }

        const qty = Number.parseFloat(qtyStr);
        if (!Number.isFinite(qty) || qty <= 0) {
          sizingRejected += 1;
          recordRejection({
            symbol,
            stage: "parse-qty",
            reason: `Non-positive qty (${qtyStr})`,
            quoteAsset,
            price: Number.isFinite(price) ? Number(price.toFixed(8)) : undefined,
            targetNotional: Number.isFinite(targetNotional) ? Number(targetNotional.toFixed(6)) : undefined,
            desiredQty: Number.isFinite(desiredQty) ? Number(desiredQty.toFixed(8)) : undefined,
            normalizedQty: check.normalizedQty,
            requiredQty: check.requiredQty
          });
          continue;
        }

        const bufferedCost = qty * price * bufferFactor;
        if (!Number.isFinite(bufferedCost) || bufferedCost <= 0) {
          sizingRejected += 1;
          recordRejection({
            symbol,
            stage: "buffered-cost",
            reason: "Invalid buffered cost",
            quoteAsset,
            price: Number.isFinite(price) ? Number(price.toFixed(8)) : undefined,
            targetNotional: Number.isFinite(targetNotional) ? Number(targetNotional.toFixed(6)) : undefined,
            desiredQty: Number.isFinite(desiredQty) ? Number(desiredQty.toFixed(8)) : undefined,
            normalizedQty: check.normalizedQty,
            requiredQty: check.requiredQty
          });
          continue;
        }

        // Symbol exposure is mark-to-market notional (qty * price), not buffered cost.
        // Using buffered cost here can reject every candidate when `targetNotional` already equals the remaining cap.
        const notional = qty * price;
        if (remainingSymbolNotional > 0 && notional > remainingSymbolNotional + 1e-8) {
          sizingRejected += 1;
          recordRejection({
            symbol,
            stage: "max-symbol-exposure",
            reason: "Would exceed max symbol exposure",
            quoteAsset,
            price: Number.isFinite(price) ? Number(price.toFixed(8)) : undefined,
            targetNotional: Number.isFinite(targetNotional) ? Number(targetNotional.toFixed(6)) : undefined,
            desiredQty: Number.isFinite(desiredQty) ? Number(desiredQty.toFixed(8)) : undefined,
            normalizedQty: check.normalizedQty,
            requiredQty: check.requiredQty,
            bufferedCost: Number(bufferedCost.toFixed(6)),
            remainingSymbolNotional: Number(remainingSymbolNotional.toFixed(6))
          });
          continue;
        }

        if (effectiveNotionalCap) {
          const capTolerance = Math.max(0.01, effectiveNotionalCap * 0.001);
          if (bufferedCost > effectiveNotionalCap + capTolerance) {
            sizingRejected += 1;
            recordRejection({
              symbol,
              stage: "notional-cap",
              reason: "Would exceed live notional cap",
              quoteAsset,
              price: Number.isFinite(price) ? Number(price.toFixed(8)) : undefined,
              targetNotional: Number.isFinite(targetNotional) ? Number(targetNotional.toFixed(6)) : undefined,
              desiredQty: Number.isFinite(desiredQty) ? Number(desiredQty.toFixed(8)) : undefined,
              normalizedQty: check.normalizedQty,
              requiredQty: check.requiredQty,
              bufferedCost: Number(bufferedCost.toFixed(6)),
              effectiveNotionalCap: Number(effectiveNotionalCap.toFixed(6))
            });
            continue;
          }
        }

        return { candidate, sizingRejected, rejectionSamples };
      } catch {
        if (check && !check.ok) {
          sizingRejected += 1;
          recordRejection({
            symbol,
            stage: "exception",
            reason: check.reason ?? "Exception during sizing check",
            normalizedQty: check.normalizedQty,
            requiredQty: check.requiredQty
          });
        }
        continue;
      }
    }

    const reason =
      sizingRejected > 0
        ? `No feasible candidates after sizing/cap filters (${sizingRejected} rejected)`
        : managedSymbolsOnlySet && managedSymbolFiltered > 0
          ? `No feasible candidates: daily loss caution paused new symbols (${managedSymbolFiltered} filtered)`
          : "No feasible candidates after policy/exposure filters";
    return { candidate: null, reason, sizingRejected, rejectionSamples };
  }

  private ensureTelemetryDir(): void {
    fs.mkdirSync(this.telemetryDir, { recursive: true });
  }

  private clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  private toRounded(value: number, decimals = 6): number {
    if (!Number.isFinite(value)) return 0;
    const power = 10 ** decimals;
    return Math.round(value * power) / power;
  }

  private getDecisionDetails(decision: Decision): Record<string, unknown> | undefined {
    if (!decision.details || typeof decision.details !== "object") return undefined;
    return decision.details as Record<string, unknown>;
  }

  private isConversionTradeDecision(decision: Decision): boolean {
    if (decision.kind !== "TRADE") return false;
    const details = this.getDecisionDetails(decision);
    if (typeof details?.mode === "string" && (details.mode === "conversion-router" || details.mode === "wallet-sweep")) {
      return true;
    }
    if (typeof details?.reason === "string" && details.reason.toLowerCase().includes("convert ")) {
      return true;
    }
    return decision.summary.toLowerCase().includes("convert ");
  }

  private isEntryTradeDecision(decision: Decision): boolean {
    if (decision.kind !== "TRADE") return false;
    const details = this.getDecisionDetails(decision);
    if (typeof details?.reason !== "string") return false;
    return details.reason === "entry" || details.reason === "entry-retry-sizing";
  }

  private isSizingRejectSkipDecision(decision: Decision): boolean {
    if (decision.kind !== "SKIP") return false;
    const summary = decision.summary.toLowerCase();
    if (summary.includes("binance sizing filter")) return true;
    if (summary.includes("min order constraints")) return true;
    if (summary.includes("minqty")) return true;
    if (summary.includes("lot_size")) return true;
    if (summary.includes("market_lot_size")) return true;
    if (summary.includes("minnotional")) return true;
    if (summary.includes("notional")) return true;
    return false;
  }

  private classifySkipReasonCluster(summary: string): "FEE_EDGE" | "MIN_ORDER" | "INVENTORY_WAITING" | "OTHER" {
    const lower = summary.trim().toLowerCase();
    if (lower.includes("fee/edge filter")) return "FEE_EDGE";
    if (
      lower.includes("grid waiting for ladder slot or inventory") ||
      lower.includes("grid guard paused buy leg") ||
      lower.includes("grid guard active (no inventory to sell)") ||
      lower.includes("waiting for ladder slot") ||
      lower.includes("no inventory")
    ) {
      return "INVENTORY_WAITING";
    }
    if (
      lower.includes("binance sizing filter") ||
      lower.includes("min order constraints") ||
      lower.includes("minqty") ||
      lower.includes("lot_size") ||
      lower.includes("market_lot_size") ||
      lower.includes("minnotional") ||
      lower.includes("notional") ||
      lower.includes("sizing rejected")
    ) {
      return "MIN_ORDER";
    }
    return "OTHER";
  }

  private mapBinanceStatus(status: string | undefined): Order["status"] {
    const normalized = (status ?? "").trim().toUpperCase();
    if (normalized === "FILLED") return "FILLED";
    if (normalized === "NEW" || normalized === "PARTIALLY_FILLED") return "NEW";
    if (normalized === "CANCELED" || normalized === "EXPIRED") return "CANCELED";
    return "REJECTED";
  }

  private deriveOrderFeeHome(params: {
    symbol: string;
    homeStable: string;
    fills: Array<{ price?: string; qty?: string; commission?: string; commissionAsset?: string }>;
    fallbackPrice?: number;
  }): { feeHome: number; feeAsset?: string; feeQty?: number; hasUnconvertedFee: boolean } {
    const symbol = params.symbol.trim().toUpperCase();
    const homeStable = params.homeStable.trim().toUpperCase();
    if (!symbol || !homeStable || !Array.isArray(params.fills) || params.fills.length === 0) {
      return { feeHome: 0, hasUnconvertedFee: false };
    }

    let baseAsset = "";
    let quoteAsset = "";
    if (symbol.endsWith(homeStable) && symbol.length > homeStable.length) {
      baseAsset = symbol.slice(0, symbol.length - homeStable.length);
      quoteAsset = homeStable;
    } else if (symbol.startsWith(homeStable) && symbol.length > homeStable.length) {
      baseAsset = homeStable;
      quoteAsset = symbol.slice(homeStable.length);
    }

    let feeHome = 0;
    let hasUnconvertedFee = false;
    let feeAsset: string | undefined;
    let feeQty = 0;
    let mixedAssets = false;

    for (const fill of params.fills) {
      const commission = Number.parseFloat(fill.commission ?? "");
      const commissionAsset = (fill.commissionAsset ?? "").trim().toUpperCase();
      const fillPrice = Number.parseFloat(fill.price ?? "");
      const price =
        Number.isFinite(fillPrice) && fillPrice > 0
          ? fillPrice
          : Number.isFinite(params.fallbackPrice) && (params.fallbackPrice ?? 0) > 0
            ? (params.fallbackPrice as number)
            : Number.NaN;

      if (!Number.isFinite(commission) || commission <= 0 || !commissionAsset) continue;

      if (!feeAsset) {
        feeAsset = commissionAsset;
      } else if (feeAsset !== commissionAsset) {
        mixedAssets = true;
      }
      feeQty += commission;

      if (commissionAsset === homeStable) {
        feeHome += commission;
        continue;
      }

      if (!baseAsset || !quoteAsset) {
        hasUnconvertedFee = true;
        continue;
      }

      if (quoteAsset === homeStable) {
        if (commissionAsset === quoteAsset) {
          feeHome += commission;
          continue;
        }
        if (commissionAsset === baseAsset && Number.isFinite(price) && price > 0) {
          feeHome += commission * price;
          continue;
        }
      }

      if (baseAsset === homeStable) {
        if (commissionAsset === baseAsset) {
          feeHome += commission;
          continue;
        }
        if (commissionAsset === quoteAsset && Number.isFinite(price) && price > 0) {
          feeHome += commission / price;
          continue;
        }
      }

      hasUnconvertedFee = true;
    }

    return {
      feeHome: this.toRounded(Math.max(0, feeHome), 8),
      ...(feeAsset && !mixedAssets ? { feeAsset } : {}),
      ...(feeQty > 0 && !mixedAssets ? { feeQty: this.toRounded(feeQty, 8) } : {}),
      hasUnconvertedFee
    };
  }

  private resolveBotOrderClientIdPrefix(config: AppConfig | null): string {
    const raw = config?.advanced.botOrderClientIdPrefix ?? "ABOT";
    const trimmed = raw.trim().toUpperCase();
    return trimmed.length >= 3 ? trimmed.slice(0, 12) : "ABOT";
  }

  private isBotOwnedOrder(order: Order, prefix: string): boolean {
    const clientOrderId = typeof order.clientOrderId === "string" ? order.clientOrderId.trim().toUpperCase() : "";
    if (!clientOrderId) return false;
    if (clientOrderId.startsWith(`${prefix}-`)) return true;
    if (clientOrderId.startsWith("ABOT-")) return true; // legacy default prefix compatibility after prefix changes/reset
    // Signature fallback for previously generated bot client ids from older runs.
    // Format emitted by buildBotClientOrderId: <PREFIX>-<2 chars + side(B|S)>-<time36+rand>
    return /^[A-Z0-9]{3,12}-[A-Z0-9]{2}[BS]-[A-Z0-9]{8,}$/.test(clientOrderId);
  }

  private shouldAttemptBalanceDeltaSellFallback(required: number, available: number): boolean {
    if (!Number.isFinite(required) || !Number.isFinite(available)) return false;
    if (required <= 0 || available <= 0) return false;
    const shortfall = required - available;
    if (!(shortfall > 0)) return false;
    const shortfallRatio = shortfall / required;
    return Number.isFinite(shortfallRatio) && shortfallRatio <= 0.03; // up to 3% shortfall
  }

  private isNoFeasibleRecoveryReason(reason: string | undefined): boolean {
    const normalized = (reason ?? "").trim().toLowerCase();
    return (
      normalized.includes("no feasible candidates after sizing/cap filters") ||
      normalized.includes("no feasible candidates after policy/exposure filters")
    );
  }

  private deriveMinQuoteLiquidityHome(config: AppConfig | null | undefined, risk: number): number {
    const configuredMinTopUpTarget = config?.advanced.conversionTopUpMinTarget ?? 5;
    return Math.max(1, configuredMinTopUpTarget * (risk >= 80 ? 0.6 : risk >= 50 ? 0.8 : 1));
  }

  private isNoFeasibleRecoveryPressureStage(stage: string | undefined): boolean {
    const normalized = (stage ?? "").trim().toLowerCase();
    return normalized === "quote-spendable" || normalized === "quote-spendable-floor" || normalized === "quote-exposure-cap";
  }

  private shouldAttemptNoFeasibleRecovery(params: {
    policyEnabled: boolean;
    maxExecutionQuoteSpendableHome: number;
    quoteLiquidityThresholdHome: number;
    rejectionSamples?: Array<{ stage?: string }>;
  }): { attempt: boolean; thresholdHome: number; pressureDetected: boolean } {
    const thresholdHome = Number.isFinite(params.quoteLiquidityThresholdHome)
      ? Math.max(0, params.quoteLiquidityThresholdHome)
      : 0;
    const spendableHome = Number.isFinite(params.maxExecutionQuoteSpendableHome)
      ? Math.max(0, params.maxExecutionQuoteSpendableHome)
      : 0;
    const pressureDetected = (params.rejectionSamples ?? []).some((sample) =>
      this.isNoFeasibleRecoveryPressureStage(sample.stage)
    );
    return {
      attempt: params.policyEnabled && (spendableHome <= thresholdHome + 1e-8 || pressureDetected),
      thresholdHome,
      pressureDetected
    };
  }

  private async deriveMaxExecutionQuoteSpendableHome(params: {
    config: AppConfig | undefined;
    balances: BinanceBalanceSnapshot[];
    allowedExecutionQuotes: Iterable<string>;
    walletTotalHome: number;
    capitalProfile: CapitalProfile;
    risk: number;
    homeStable: string;
    bridgeAssets: string[];
  }): Promise<number> {
    const normalizedHomeStable = params.homeStable.trim().toUpperCase();
    let maxSpendableHome = 0;

    for (const asset of params.allowedExecutionQuotes) {
      const quoteAsset = asset.trim().toUpperCase();
      if (!quoteAsset) continue;

      const quoteFree = params.balances.find((balance) => balance.asset.trim().toUpperCase() === quoteAsset)?.free ?? 0;
      if (!Number.isFinite(quoteFree) || quoteFree <= 0) continue;

      const quoteReserveTargets = await this.deriveQuoteReserveTargets({
        config: params.config,
        walletTotalHome: params.walletTotalHome,
        capitalProfile: params.capitalProfile,
        risk: params.risk,
        quoteAsset,
        homeStable: normalizedHomeStable,
        bridgeAssets: params.bridgeAssets
      });
      const quoteSpendable = Math.max(0, quoteFree - quoteReserveTargets.reserveHardTarget);
      if (quoteSpendable <= 1e-8) continue;

      let spendableHome = quoteSpendable;
      if (quoteAsset !== normalizedHomeStable) {
        const estimatedHome = await this.estimateAssetValueInHome(
          quoteAsset,
          quoteSpendable,
          normalizedHomeStable,
          params.bridgeAssets
        );
        if (!Number.isFinite(estimatedHome ?? Number.NaN)) continue;
        spendableHome = Math.max(0, estimatedHome ?? 0);
      }

      maxSpendableHome = Math.max(maxSpendableHome, spendableHome);
    }

    return this.toRounded(maxSpendableHome, 8);
  }

  private deriveNoFeasibleRecoveryPolicy(params: {
    state: BotState;
    reason: string | undefined;
    risk: number;
    nowMs: number;
  }): { enabled: boolean; recentCount: number; threshold: number; cooldownMs: number; windowMs: number } {
    if (!this.isNoFeasibleRecoveryReason(params.reason)) {
      return { enabled: false, recentCount: 0, threshold: 0, cooldownMs: 0, windowMs: 0 };
    }

    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(params.risk) ? params.risk : 50));
    const threshold = Math.max(2, Math.round(4 - boundedRisk / 50)); // risk 0 -> 4, risk 100 -> 2
    const windowMs = 24 * 60 * 60_000;
    const mostRecentTradeMs = params.state.decisions.reduce<number | null>((latest, decision) => {
      if (decision.kind !== "TRADE") return latest;
      const ts = Date.parse(decision.ts);
      if (!Number.isFinite(ts)) return latest;
      if (ts > params.nowMs) return latest;
      return latest === null ? ts : Math.max(latest, ts);
    }, null);
    const windowStartMs =
      mostRecentTradeMs === null ? params.nowMs - windowMs : Math.max(params.nowMs - windowMs, mostRecentTradeMs);
    const recentSkips = params.state.decisions.filter((decision) => {
      if (decision.kind !== "SKIP") return false;
      if (!this.isNoFeasibleRecoveryReason(decision.summary)) return false;
      const ts = Date.parse(decision.ts);
      return Number.isFinite(ts) && ts >= windowStartMs && ts <= params.nowMs;
    }).length;
    const recentCount = recentSkips + 1; // include current skip

    const cooldownMs = Math.round(900_000 - (boundedRisk / 100) * 300_000); // risk 0 -> 15m, risk 100 -> 10m
    const recentRecoveryTrade = params.state.decisions.some((decision) => {
      if (decision.kind !== "TRADE") return false;
      const details = decision.details as Record<string, unknown> | undefined;
      if (details?.reason !== "no-feasible-liquidity-recovery") return false;
      const ts = Date.parse(decision.ts);
      return Number.isFinite(ts) && params.nowMs - ts <= cooldownMs;
    });

    return {
      enabled: recentCount >= threshold && !recentRecoveryTrade,
      recentCount,
      threshold,
      cooldownMs,
      windowMs
    };
  }

  private deriveNoFeasibleRecoverySellFraction(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    return this.toRounded(0.03 + (boundedRisk / 100) * 0.07, 4); // 3% .. 10%
  }

  private buildBotClientOrderId(params: { config: AppConfig; purpose: string; side: "BUY" | "SELL" }): string {
    const prefix = this.resolveBotOrderClientIdPrefix(params.config);
    const purposeCode = (params.purpose.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 2) || "O").padEnd(2, "O");
    const sideCode = params.side === "BUY" ? "B" : "S";
    const time36 = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    // Binance Spot newClientOrderId max length is small (commonly 36); keep it short and deterministic.
    return `${prefix}-${purposeCode}${sideCode}-${time36}${rand}`.slice(0, 36);
  }

  private getOrderAgeMs(order: Order): number | null {
    const ts = Date.parse(order.ts);
    if (!Number.isFinite(ts)) return null;
    const age = Date.now() - ts;
    return Number.isFinite(age) && age >= 0 ? age : null;
  }

  private async cancelBotOwnedOpenOrders(params: {
    config: AppConfig;
    state: BotState;
    orders: Order[];
    reason: string;
    details?: Record<string, unknown>;
    maxCancels: number;
  }): Promise<BotState> {
    const prefix = this.resolveBotOrderClientIdPrefix(params.config);
    const toCancel = params.orders
      .filter((o) => o.status === "NEW")
      .filter((o) => this.isBotOwnedOrder(o, prefix))
      .slice(0, Math.max(0, Math.floor(params.maxCancels)));

    if (toCancel.length === 0) return params.state;

    const finalized: Order[] = [];
    const canceledIds: string[] = [];
    for (const order of toCancel) {
      try {
        const latest = await this.trading.cancelOrder(order.symbol, order.id);
        const mapped = this.mapExchangeOrderToStateOrder(latest);
        finalized.push(mapped ?? { ...order, status: "CANCELED" });
      } catch {
        try {
          const latest = await this.trading.getOrder(order.symbol, order.id);
          const mapped = this.mapExchangeOrderToStateOrder(latest);
          if (mapped && mapped.status !== "NEW") {
            finalized.push(mapped);
          }
        } catch {
          // leave it in activeOrders; next sync will reconcile.
          continue;
        }
      }
      canceledIds.push(order.id);
    }

    if (finalized.length === 0) return params.state;

    const summary = `Canceled ${finalized.length} bot open order(s): ${params.reason}`;
    const alreadyLogged = params.state.decisions[0]?.kind === "ENGINE" && params.state.decisions[0]?.summary === summary;

    const nextActive = params.state.activeOrders.filter((o) => !canceledIds.includes(o.id));
    const next: BotState = {
      ...params.state,
      activeOrders: nextActive,
      orderHistory: this.dedupeOrderHistory([...finalized, ...params.state.orderHistory]).slice(0, 500),
      decisions: alreadyLogged
        ? params.state.decisions
        : [
            {
              id: crypto.randomUUID(),
              ts: new Date().toISOString(),
              kind: "ENGINE",
              summary,
              details: {
                stage: "order-maintenance",
                reason: params.reason,
                canceled: finalized.map((o) => ({
                  symbol: o.symbol,
                  id: o.id,
                  side: o.side,
                  type: o.type,
                  price: o.price,
                  clientOrderId: o.clientOrderId
                })),
                ...params.details
              }
            },
            ...params.state.decisions
          ].slice(0, 200)
    };

    return next;
  }

  private mapExchangeOrderToStateOrder(snapshot: BinanceOrderSnapshot): Order | null {
    const id = snapshot.orderId ? String(snapshot.orderId) : "";
    const symbol = snapshot.symbol?.trim().toUpperCase() ?? "";
    const clientOrderId = snapshot.clientOrderId?.trim() ?? "";
    const sideRaw = snapshot.side?.trim().toUpperCase();
    const side: "BUY" | "SELL" | null = sideRaw === "BUY" || sideRaw === "SELL" ? sideRaw : null;
    const executedQty = Number.parseFloat(snapshot.executedQty ?? "");
    const originalQty = Number.parseFloat(snapshot.origQty ?? "");
    const qty =
      Number.isFinite(executedQty) && executedQty > 0
        ? executedQty
        : Number.isFinite(originalQty) && originalQty > 0
          ? originalQty
          : Number.NaN;
    if (!id || !symbol || !side) return null;
    if (!Number.isFinite(qty) || qty <= 0) return null;

    const tsCandidate = typeof snapshot.transactTime === "number" ? snapshot.transactTime : Number.NaN;
    const ts = Number.isFinite(tsCandidate) ? new Date(tsCandidate).toISOString() : new Date().toISOString();
    const priceCandidate = Number.parseFloat(snapshot.price ?? "");
    const type = (snapshot.type?.trim().toUpperCase() ?? "MARKET") as Order["type"];

    return {
      id,
      ts,
      symbol,
      ...(clientOrderId ? { clientOrderId } : {}),
      side,
      type: type === "LIMIT" || type === "LIMIT_MAKER" ? type : "MARKET",
      status: this.mapBinanceStatus(snapshot.status),
      qty,
      ...(Number.isFinite(priceCandidate) && priceCandidate > 0 ? { price: priceCandidate } : {})
    };
  }

  private mergeOrderRecords(primary: Order, secondary: Order): Order {
    const mergedFeeHome =
      Number.isFinite(primary.feeHome) && (primary.feeHome ?? 0) > 0
        ? primary.feeHome
        : Number.isFinite(secondary.feeHome) && (secondary.feeHome ?? 0) > 0
          ? secondary.feeHome
          : primary.feeHome ?? secondary.feeHome;

    return {
      ...primary,
      ...(primary.clientOrderId ? {} : secondary.clientOrderId ? { clientOrderId: secondary.clientOrderId } : {}),
      ...(Number.isFinite(primary.price) && (primary.price ?? 0) > 0
        ? {}
        : Number.isFinite(secondary.price) && (secondary.price ?? 0) > 0
          ? { price: secondary.price }
          : {}),
      ...(Number.isFinite(mergedFeeHome) && (mergedFeeHome ?? 0) >= 0 ? { feeHome: mergedFeeHome } : {})
    };
  }

  private dedupeOrderHistory(orders: Order[]): Order[] {
    const indexByKey = new Map<string, number>();
    const out: Order[] = [];
    for (const order of orders) {
      const key = `${order.id}:${order.status}:${order.side}:${order.symbol}`;
      const existingIndex = indexByKey.get(key);
      if (existingIndex === undefined) {
        indexByKey.set(key, out.length);
        out.push(order);
        continue;
      }
      out[existingIndex] = this.mergeOrderRecords(out[existingIndex], order);
    }
    return out;
  }

  private pickOrderDiscoveryBatch(symbols: string[], batchSize: number): string[] {
    const normalizedBatchSize = Math.max(0, Math.min(batchSize, symbols.length));
    if (normalizedBatchSize === 0) return [];
    const batch: string[] = [];
    for (let i = 0; i < normalizedBatchSize; i += 1) {
      batch.push(symbols[(this.orderDiscoveryCursor + i) % symbols.length]);
    }
    this.orderDiscoveryCursor = (this.orderDiscoveryCursor + normalizedBatchSize) % symbols.length;
    return Array.from(new Set(batch));
  }

  private shouldRunSupplementalOrderDiscovery(nowMs: number): boolean {
    const intervalMs = 60_000;
    if (nowMs - this.lastSupplementalOrderDiscoveryAtMs < intervalMs) {
      return false;
    }
    this.lastSupplementalOrderDiscoveryAtMs = nowMs;
    return true;
  }

  private async syncLiveOrders(
    state: BotState,
    opts?: {
      symbolsHint?: string[];
    }
  ): Promise<BotState> {
    const activeSymbols = Array.from(
      new Set(
        state.activeOrders
          .map((order) => order.symbol.trim().toUpperCase())
          .filter((symbol) => symbol.length > 0)
      )
    );
    const hintSymbols = Array.from(
      new Set(
        (opts?.symbolsHint ?? [])
          .map((symbol) => symbol.trim().toUpperCase())
          .filter((symbol) => symbol.length > 0)
      )
    );

    let trackedSymbols = activeSymbols;
    const discoveryMode = trackedSymbols.length === 0 && hintSymbols.length > 0;
    const supplementalDiscoveryMode =
      trackedSymbols.length > 0 && hintSymbols.length > 0 && this.shouldRunSupplementalOrderDiscovery(Date.now());
    if (discoveryMode) {
      // After a state reset we can have real open orders on the exchange but none in `state.activeOrders`.
      // Discover them quickly by scanning a small batch of hint symbols per tick (symbol-scoped; no global fetch).
      trackedSymbols = this.pickOrderDiscoveryBatch(hintSymbols, 5);
    } else if (supplementalDiscoveryMode) {
      // While we already track some open orders, periodically scan additional hint symbols
      // so older/external exchange orders can still be discovered and reconciled.
      const discoveryBatch = this.pickOrderDiscoveryBatch(hintSymbols, 3);
      trackedSymbols = Array.from(new Set([...trackedSymbols, ...discoveryBatch]));
    }

    if (trackedSymbols.length === 0) return state;

    const syncResults = await Promise.all(
      trackedSymbols.map(async (symbol) => {
        try {
          const snapshots = await this.trading.getOpenOrders(symbol);
          return { symbol, snapshots, error: null as unknown };
        } catch (error) {
          return { symbol, snapshots: [] as BinanceOrderSnapshot[], error };
        }
      })
    );
    const successfulSyncs = syncResults.filter((result) => result.error === null);
    const failedSyncs = syncResults.filter((result) => result.error !== null);
    if (successfulSyncs.length === 0 && failedSyncs.length > 0) {
      throw failedSyncs[0].error;
    }

    const failedSymbols = new Set(failedSyncs.map((result) => result.symbol));
    const openSnapshots = successfulSyncs.flatMap((result) => result.snapshots);
    const openOrdersFromExchange = openSnapshots
      .map((snapshot) => this.mapExchangeOrderToStateOrder(snapshot))
      .filter((order): order is Order => Boolean(order))
      .filter((order) => order.status === "NEW")
      .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    const preservedFailedSymbolOrders =
      failedSymbols.size > 0
        ? state.activeOrders.filter(
            (order) => order.status === "NEW" && failedSymbols.has(order.symbol.trim().toUpperCase())
          )
        : [];
    const openOrders = Array.from(
      new Map<string, Order>(
        [...openOrdersFromExchange, ...preservedFailedSymbolOrders].map((order) => [order.id, order])
      ).values()
    ).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    const openById = new Set(openOrders.map((order) => order.id));

    const closedActiveOrders = state.activeOrders.filter((order) => !openById.has(order.id));
    if (closedActiveOrders.length === 0) {
      const previousActiveIds = new Set(state.activeOrders.map((order) => order.id));
      const supplementalDiscoveredOrders = supplementalDiscoveryMode
        ? openOrders.filter((order) => !previousActiveIds.has(order.id))
        : [];
      const summary =
        discoveryMode && openOrders.length > 0
          ? `Synced ${openOrders.length} existing open order(s) (discovery scan: ${trackedSymbols.length} symbol(s))`
          : supplementalDiscoveredOrders.length > 0
            ? `Discovered ${supplementalDiscoveredOrders.length} additional open order(s) during periodic scan`
            : null;
      const alreadyLogged =
        summary && state.decisions[0]?.kind === "ENGINE" && state.decisions[0]?.summary === summary;
      return {
        ...state,
        activeOrders: openOrders.slice(0, 50),
        ...(summary
          ? {
              decisions: alreadyLogged
                ? state.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "ENGINE",
                      summary,
                      details: {
                        stage: discoveryMode ? "order-discovery" : "order-discovery-periodic",
                        scannedSymbols: trackedSymbols,
                        foundSymbols:
                          discoveryMode
                            ? Array.from(new Set(openOrders.map((o) => o.symbol))).slice(0, 12)
                            : Array.from(new Set(supplementalDiscoveredOrders.map((o) => o.symbol))).slice(0, 12),
                        orderIds:
                          discoveryMode
                            ? openOrders.map((o) => o.id).slice(0, 20)
                            : supplementalDiscoveredOrders.map((o) => o.id).slice(0, 20)
                      }
                    },
                    ...state.decisions
                  ].slice(0, 200)
            }
          : {})
      };
    }

    const finalized: Order[] = [];
    for (const active of closedActiveOrders) {
      try {
        const latest = await this.trading.getOrder(active.symbol, active.id);
        const mapped = this.mapExchangeOrderToStateOrder(latest);
        if (mapped && mapped.status !== "NEW") {
          finalized.push(mapped);
        }
      } catch {
        finalized.push({ ...active, status: "CANCELED" });
      }
    }

    return {
      ...state,
      activeOrders: openOrders.slice(0, 50),
      orderHistory: this.dedupeOrderHistory([...finalized, ...state.orderHistory]).slice(0, 200)
    };
  }

  private buildRegimeSnapshot(candidate: UniverseCandidate | null): AdaptiveRegimeSnapshot {
    const inputs = {
      priceChangePct24h: candidate?.priceChangePct24h,
      rsi14: candidate?.rsi14,
      adx14: candidate?.adx14,
      atrPct14: candidate?.atrPct14
    };

    const change = typeof inputs.priceChangePct24h === "number" ? inputs.priceChangePct24h : Number.NaN;
    const rsi = typeof inputs.rsi14 === "number" ? inputs.rsi14 : Number.NaN;
    const adx = typeof inputs.adx14 === "number" ? inputs.adx14 : Number.NaN;
    const atr = typeof inputs.atrPct14 === "number" ? inputs.atrPct14 : Number.NaN;

    if (!Number.isFinite(change) || !Number.isFinite(rsi) || !Number.isFinite(adx)) {
      return {
        label: "NEUTRAL",
        confidence: 0.2,
        inputs
      };
    }

    if (adx >= 25 && change <= -1 && rsi <= 45) {
      const confidence = this.clamp01(0.55 + Math.min(0.35, ((adx - 25) / 40) + Math.abs(change) / 20));
      return { label: "BEAR_TREND", confidence: this.toRounded(confidence, 4), inputs };
    }
    if (adx >= 25 && change >= 1 && rsi >= 55) {
      const confidence = this.clamp01(0.55 + Math.min(0.35, ((adx - 25) / 40) + Math.abs(change) / 20));
      return { label: "BULL_TREND", confidence: this.toRounded(confidence, 4), inputs };
    }
    if (adx < 20 && rsi >= 40 && rsi <= 60) {
      const confidence = this.clamp01(0.45 + Math.min(0.3, (20 - adx) / 40 + (Number.isFinite(atr) ? atr / 20 : 0)));
      return { label: "RANGE", confidence: this.toRounded(confidence, 4), inputs };
    }

    return {
      label: "NEUTRAL",
      confidence: 0.4,
      inputs
    };
  }

  private getBearPauseConfidenceThreshold(risk: number): number {
    const t = Math.max(0, Math.min(1, Number.isFinite(risk) ? risk / 100 : 0.5));
    return this.toRounded(0.54 + t * 0.16, 4); // risk 0 -> 0.54, risk 100 -> 0.70
  }

  private getRegimeAdjustedStopLossPct(params: {
    risk: number;
    baseStopLossPct: number;
    regime: AdaptiveRegimeSnapshot;
  }): number {
    const { risk, baseStopLossPct, regime } = params;
    if (!Number.isFinite(baseStopLossPct)) return baseStopLossPct;
    if (regime.label !== "BEAR_TREND" || !Number.isFinite(regime.confidence)) return baseStopLossPct;

    const threshold = this.getBearPauseConfidenceThreshold(risk);
    if (regime.confidence < threshold) return baseStopLossPct;

    const t = Math.max(0, Math.min(1, Number.isFinite(risk) ? risk / 100 : 0.5));
    const tightenedStopLossPct = -(0.35 + t * 0.55); // risk 0 -> -0.35%, risk 100 -> -0.90%
    return Math.max(baseStopLossPct, tightenedStopLossPct);
  }

  private resolveExecutionLane(params: {
    tradeMode: "SPOT" | "SPOT_GRID";
    gridEnabled: boolean;
    risk: number;
    riskState: "NORMAL" | "CAUTION" | "HALT";
    managedOpenPositions: number;
    managedExposurePct: number;
    regime: AdaptiveRegimeSnapshot;
    strategy: AdaptiveStrategyScores;
  }): AdaptiveExecutionLane {
    if (params.tradeMode !== "SPOT_GRID" || !params.gridEnabled) return "MARKET";
    if (params.riskState === "HALT") return "DEFENSIVE";
    if (params.riskState === "CAUTION" && params.managedOpenPositions > 0) return "DEFENSIVE";

    const bearPauseThreshold = this.getBearPauseConfidenceThreshold(params.risk);
    const bullTrendThreshold = this.toRounded(0.56 + (Math.max(0, Math.min(100, params.risk)) / 100) * 0.18, 4); // 0.56..0.74
    const regimeConfidence = Number.isFinite(params.regime.confidence) ? params.regime.confidence : 0;
    const managedLoadThreshold = Math.max(3, Math.round(2 + Math.max(0, Math.min(100, params.risk)) / 40)); // risk 0 -> 3, risk 100 -> 5
    const managedLoadHigh = params.managedOpenPositions >= managedLoadThreshold;
    const managedExposureHigh =
      Number.isFinite(params.managedExposurePct) &&
      params.managedExposurePct >= Number((0.18 + (Math.max(0, Math.min(100, params.risk)) / 100) * 0.12).toFixed(4)); // 18%..30%
    const restrictMarketLane = managedLoadHigh || managedExposureHigh;

    if (params.regime.label === "BEAR_TREND" && regimeConfidence >= bearPauseThreshold) {
      return "DEFENSIVE";
    }

    if (params.regime.label === "BULL_TREND" && regimeConfidence >= bullTrendThreshold) {
      return restrictMarketLane ? "GRID" : "MARKET";
    }

    if (params.regime.label === "RANGE") {
      return "GRID";
    }

    if (params.strategy.recommended === "TREND" && params.strategy.trend >= params.strategy.grid + 0.08) {
      return restrictMarketLane ? "GRID" : "MARKET";
    }

    return "GRID";
  }

  private buildAdaptiveStrategyScores(candidate: UniverseCandidate | null, regime: RegimeLabel): AdaptiveStrategyScores {
    const adx = Number.isFinite(candidate?.adx14) ? Math.max(0, candidate?.adx14 ?? 0) : 0;
    const rsi = Number.isFinite(candidate?.rsi14) ? Math.max(0, Math.min(100, candidate?.rsi14 ?? 50)) : 50;
    const atr = Number.isFinite(candidate?.atrPct14) ? Math.max(0, candidate?.atrPct14 ?? 0) : 0;
    const change = Number.isFinite(candidate?.priceChangePct24h) ? Math.abs(candidate?.priceChangePct24h ?? 0) : 0;

    let trend = this.clamp01((adx / 45) * 0.65 + (Math.min(8, change) / 8) * 0.35);
    let meanReversion = this.clamp01((rsi <= 35 || rsi >= 65 ? 0.65 : 0.25) + Math.min(1.2, atr) * 0.25);
    let grid = this.clamp01((regime === "RANGE" ? 0.65 : 0.25) + Math.min(1.4, atr) * 0.2);

    if (regime === "BEAR_TREND") {
      trend *= 0.5;
      meanReversion = this.clamp01(meanReversion + 0.04);
      grid = this.clamp01(grid - 0.14);
    } else if (regime === "BULL_TREND") {
      trend = this.clamp01(trend + 0.12);
    }

    const candidates: Array<{ strategy: AdaptiveStrategy; score: number }> = [
      { strategy: "TREND", score: trend },
      { strategy: "MEAN_REVERSION", score: meanReversion },
      { strategy: "GRID", score: grid }
    ];
    candidates.sort((a, b) => b.score - a.score);

    return {
      trend: this.toRounded(trend, 4),
      meanReversion: this.toRounded(meanReversion, 4),
      grid: this.toRounded(grid, 4),
      recommended: candidates[0]?.strategy ?? "TREND"
    };
  }

  private buildBaselineStats(state: BotState): BaselineRunStats {
    const nowIso = new Date().toISOString();
    const decisionList = [...state.decisions];
    const decisionChronological = [...decisionList].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    const startedAt =
      state.startedAt && Number.isFinite(Date.parse(state.startedAt))
        ? state.startedAt
        : decisionChronological[0]?.ts ?? state.updatedAt;
    const runtimeSeconds = Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000));

    const byDecisionKind: Record<string, number> = {};
    const skipSummaryCounts = new Map<string, number>();
    const runtimeConfig = this.configService.load();
    const runtimeHomeStable = (runtimeConfig?.basic.homeStableCoin ?? "USDC").trim().toUpperCase();
    const runtimeTraderRegion = runtimeConfig?.basic.traderRegion === "EEA" ? "EEA" : "NON_EEA";
    const quoteCandidates = [
      ...new Set([
        ...resolveUniverseDefaultQuoteAssets({
          config: runtimeConfig,
          homeStableCoin: runtimeHomeStable,
          traderRegion: runtimeTraderRegion
        }),
        runtimeHomeStable,
        "USDC",
        "USDT",
        "FDUSD",
        "BUSD",
        "DAI",
        "TUSD",
        "USDP",
        "USD",
        "U",
        "BTC",
        "ETH",
        "BNB",
        "EUR",
        "JPY",
        "GBP",
        "TRY",
        "BRL",
        "AUD"
      ])
    ]
      .map((asset) => asset.trim().toUpperCase())
      .filter((asset) => asset.length > 0)
      .sort((left, right) => right.length - left.length);
    const quoteFamilyStats = new Map<
      string,
      {
        quoteAsset: string;
        filledOrders: number;
        buys: number;
        sells: number;
        skips: number;
        trades: number;
      }
    >();
    const ensureQuoteStats = (quoteAsset: string): {
      quoteAsset: string;
      filledOrders: number;
      buys: number;
      sells: number;
      skips: number;
      trades: number;
    } => {
      const normalized = quoteAsset.trim().toUpperCase();
      const existing = quoteFamilyStats.get(normalized);
      if (existing) return existing;
      const next = { quoteAsset: normalized, filledOrders: 0, buys: 0, sells: 0, skips: 0, trades: 0 };
      quoteFamilyStats.set(normalized, next);
      return next;
    };
    const extractSymbolFromSummary = (summary: string): string | null => {
      const raw = summary.trim();
      if (raw.length === 0) return null;
      if (raw.startsWith("Skip ")) {
        const rest = raw.slice(5);
        const colonIndex = rest.indexOf(":");
        const candidate = (colonIndex >= 0 ? rest.slice(0, colonIndex) : rest).trim().toUpperCase();
        return candidate.length >= 6 ? candidate : null;
      }
      const tradeMatch = raw.match(/\b([A-Z0-9]{6,20})\b/);
      return tradeMatch ? tradeMatch[1].trim().toUpperCase() : null;
    };
    const collectDecisionSymbol = (decision: Decision): string | null => {
      const details = this.getDecisionDetails(decision);
      const symbolFromDetails = typeof details?.symbol === "string" ? details.symbol.trim().toUpperCase() : "";
      if (symbolFromDetails.length >= 6) return symbolFromDetails;
      return extractSymbolFromSummary(decision.summary);
    };
    let trades = 0;
    let skips = 0;
    let conversions = 0;
    let entryTrades = 0;
    let sizingRejectSkips = 0;
    let feeEdgeSkips = 0;
    let minOrderSkips = 0;
    let inventoryWaitingSkips = 0;

    for (const decision of decisionList) {
      byDecisionKind[decision.kind] = (byDecisionKind[decision.kind] ?? 0) + 1;
      if (decision.kind === "TRADE") {
        trades += 1;
        const symbol = collectDecisionSymbol(decision);
        if (symbol) {
          const quoteAsset = this.getSymbolQuoteAssetByPriority(symbol, quoteCandidates);
          if (quoteAsset) {
            ensureQuoteStats(quoteAsset).trades += 1;
          }
        }
        if (this.isConversionTradeDecision(decision)) {
          conversions += 1;
        }
        if (this.isEntryTradeDecision(decision)) {
          entryTrades += 1;
        }
      }
      if (decision.kind === "SKIP") {
        skips += 1;
        if (this.isSizingRejectSkipDecision(decision)) {
          sizingRejectSkips += 1;
        }
        const cluster = this.classifySkipReasonCluster(decision.summary);
        if (cluster === "FEE_EDGE") feeEdgeSkips += 1;
        if (cluster === "MIN_ORDER") minOrderSkips += 1;
        if (cluster === "INVENTORY_WAITING") inventoryWaitingSkips += 1;
        const symbol = collectDecisionSymbol(decision);
        if (symbol) {
          const quoteAsset = this.getSymbolQuoteAssetByPriority(symbol, quoteCandidates);
          if (quoteAsset) {
            ensureQuoteStats(quoteAsset).skips += 1;
          }
        }
        skipSummaryCounts.set(decision.summary, (skipSummaryCounts.get(decision.summary) ?? 0) + 1);
      }
    }

    const topSkipSummaries = [...skipSummaryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([summary, count]) => ({ summary, count }));

    const filledOrders = [...state.orderHistory]
      .filter((o) => o.status === "FILLED")
      .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));

    const symbolMap = new Map<string, BaselineSymbolStats>();
    let buys = 0;
    let sells = 0;
    let buyNotional = 0;
    let sellNotional = 0;
    let feesHome = 0;

    for (const order of filledOrders) {
      const symbol = order.symbol.trim().toUpperCase();
      const qty = Number.isFinite(order.qty) ? Math.max(0, order.qty) : 0;
      const price = Number.isFinite(order.price) ? Math.max(0, order.price ?? 0) : 0;
      const notional = qty > 0 && price > 0 ? qty * price : 0;
      const orderFeeHome = Number.isFinite(order.feeHome) ? Math.max(0, order.feeHome ?? 0) : 0;
      if (qty <= 0) continue;
      const quoteAsset = this.getSymbolQuoteAssetByPriority(symbol, quoteCandidates);
      if (quoteAsset) {
        const bucket = ensureQuoteStats(quoteAsset);
        bucket.filledOrders += 1;
        if (order.side === "BUY") {
          bucket.buys += 1;
        } else {
          bucket.sells += 1;
        }
      }

      const next = symbolMap.get(symbol) ?? {
        symbol,
        buys: 0,
        sells: 0,
        buyNotional: 0,
        sellNotional: 0,
        netQty: 0,
        avgEntry: 0,
        openCost: 0,
        realizedPnl: 0,
        feesHome: 0,
        lastTradeTs: undefined
      };

      if (order.side === "BUY") {
        buys += 1;
        next.buys += 1;
        if (notional > 0) {
          buyNotional += notional;
          next.buyNotional += notional;
          next.openCost += notional;
        }
        if (orderFeeHome > 0) {
          next.openCost += orderFeeHome;
        }
        next.netQty += qty;
      } else {
        sells += 1;
        next.sells += 1;
        if (notional > 0) {
          sellNotional += notional;
          next.sellNotional += notional;
        }
        const closeQty = Math.min(qty, next.netQty);
        const avgCost = next.netQty > 0 ? next.openCost / next.netQty : 0;
        if (closeQty > 0 && avgCost > 0 && price > 0) {
          next.realizedPnl += (price - avgCost) * closeQty;
          next.openCost = Math.max(0, next.openCost - avgCost * closeQty);
          next.netQty = Math.max(0, next.netQty - closeQty);
        }
      }
      if (orderFeeHome > 0) {
        feesHome += orderFeeHome;
        next.feesHome += orderFeeHome;
      }

      next.avgEntry = next.netQty > 0 ? next.openCost / next.netQty : 0;
      next.lastTradeTs = order.ts;
      symbolMap.set(symbol, next);
    }

    const symbols = [...symbolMap.values()]
      .map((s) => ({
        ...s,
        buyNotional: this.toRounded(s.buyNotional, 8),
        sellNotional: this.toRounded(s.sellNotional, 8),
        netQty: this.toRounded(s.netQty, 8),
        avgEntry: this.toRounded(s.avgEntry, 8),
        openCost: this.toRounded(s.openCost, 8),
        realizedPnl: this.toRounded(s.realizedPnl, 8),
        feesHome: this.toRounded(s.feesHome, 8)
      }))
      .sort((a, b) => b.buyNotional + b.sellNotional - (a.buyNotional + a.sellNotional))
      .slice(0, 40);

    const realizedPnl = this.toRounded(symbols.reduce((sum, s) => sum + s.realizedPnl, 0), 8);
    const totalFeesHome = this.toRounded(feesHome, 8);
    const openExposureCost = this.toRounded(symbols.reduce((sum, s) => sum + (s.netQty > 0 ? s.openCost : 0), 0), 8);
    const openPositions = symbols.filter((s) => s.netQty > 0).length;
    const quoteFamilies = [...quoteFamilyStats.values()]
      .sort((left, right) => {
        const rightScore = right.filledOrders + right.skips + right.trades;
        const leftScore = left.filledOrders + left.skips + left.trades;
        return rightScore - leftScore;
      })
      .slice(0, 20);

    return {
      version: 1,
      generatedAt: nowIso,
      startedAt,
      runtimeSeconds,
      bot: {
        running: state.running,
        phase: state.phase,
        ...(state.lastError ? { lastError: state.lastError } : {})
      },
      totals: {
        decisions: decisionList.length,
        trades,
        skips,
        filledOrders: filledOrders.length,
        activeOrders: state.activeOrders.length,
        buys,
        sells,
        conversions,
        entryTrades,
        sizingRejectSkips,
        feeEdgeSkips,
        minOrderSkips,
        inventoryWaitingSkips,
        conversionTradePct: this.toRounded(trades > 0 ? (conversions / trades) * 100 : 0, 4),
        entryTradePct: this.toRounded(trades > 0 ? (entryTrades / trades) * 100 : 0, 4),
        sizingRejectSkipPct: this.toRounded(skips > 0 ? (sizingRejectSkips / skips) * 100 : 0, 4),
        feeEdgeSkipPct: this.toRounded(skips > 0 ? (feeEdgeSkips / skips) * 100 : 0, 4),
        minOrderSkipPct: this.toRounded(skips > 0 ? (minOrderSkips / skips) * 100 : 0, 4),
        inventoryWaitingSkipPct: this.toRounded(skips > 0 ? (inventoryWaitingSkips / skips) * 100 : 0, 4),
        buyNotional: this.toRounded(buyNotional, 8),
        sellNotional: this.toRounded(sellNotional, 8),
        realizedPnl,
        feesHome: totalFeesHome,
        openExposureCost,
        openPositions
      },
      byDecisionKind,
      topSkipSummaries,
      quoteFamilies,
      symbols
    };
  }

  private persistBaselineStats(state: BotState): void {
    const fingerprint = JSON.stringify({
      updatedAt: state.updatedAt,
      topDecision: state.decisions[0]?.id ?? null,
      topOrder: state.orderHistory[0]?.id ?? null,
      activeOrders: state.activeOrders.length,
      phase: state.phase,
      running: state.running,
      lastError: state.lastError ?? null
    });
    if (fingerprint === this.lastBaselineFingerprint) return;
    this.lastBaselineFingerprint = fingerprint;

    this.ensureTelemetryDir();
    const kpi = this.buildBaselineStats(state);
    atomicWriteFile(this.baselineStatsPath, JSON.stringify(kpi, null, 2));
  }

  private appendShadowEvent(event: AdaptiveShadowEvent): void {
    this.ensureTelemetryDir();
    fs.appendFileSync(this.adaptiveShadowPath, `${JSON.stringify(event)}\n`, { encoding: "utf-8" });
  }

  private persistShadowTelemetry(params: {
    beforeDecisionIds: Set<string>;
    afterState: BotState;
    tickContext: TickTelemetryContext;
    tickStartedAtMs: number;
  }): void {
    const { beforeDecisionIds, afterState, tickContext, tickStartedAtMs } = params;
    const newDecisions = afterState.decisions
      .filter((decision) => !beforeDecisionIds.has(decision.id))
      .sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    if (newDecisions.length === 0) return;

    const ordersById = new Map<string, Order>();
    for (const order of [...afterState.orderHistory, ...afterState.activeOrders]) {
      ordersById.set(order.id, order);
    }

    const regime = this.buildRegimeSnapshot(tickContext.candidate);
    const strategy = this.buildAdaptiveStrategyScores(tickContext.candidate, regime.label);
    const tickDurationMs = Math.max(0, Date.now() - tickStartedAtMs);

    for (const decision of newDecisions) {
      const details =
        decision.details && typeof decision.details === "object" ? (decision.details as Record<string, unknown>) : undefined;
      const orderId = typeof details?.orderId === "string" ? details.orderId : undefined;
      const linkedOrder = orderId ? ordersById.get(orderId) : undefined;
      const reason = typeof details?.reason === "string" ? details.reason : undefined;

      const event: AdaptiveShadowEvent = {
        version: 1,
        ts: new Date().toISOString(),
        tickStartedAt: tickContext.tickStartedAtIso,
        tickDurationMs,
        environment: tickContext.liveTrading ? "LIVE" : "PAPER",
        homeStableCoin: tickContext.homeStableCoin,
        candidateSymbol: tickContext.candidateSymbol,
        ...(tickContext.executionLane ? { executionLane: tickContext.executionLane } : {}),
        ...(tickContext.candidate
          ? {
              candidateFeatures: {
                score: tickContext.candidate.score,
                strategyHint: tickContext.candidate.strategyHint,
                priceChangePct24h: tickContext.candidate.priceChangePct24h,
                rsi14: tickContext.candidate.rsi14,
                adx14: tickContext.candidate.adx14,
                atrPct14: tickContext.candidate.atrPct14
              }
            }
          : {}),
        regime,
        strategy,
        risk: {
          risk: tickContext.risk,
          ...(typeof tickContext.maxOpenPositions === "number" ? { maxOpenPositions: tickContext.maxOpenPositions } : {}),
          ...(typeof tickContext.maxPositionPct === "number" ? { maxPositionPct: tickContext.maxPositionPct } : {}),
          ...(typeof tickContext.walletTotalHome === "number" ? { walletTotalHome: this.toRounded(tickContext.walletTotalHome, 8) } : {})
        },
        decision: {
          kind: decision.kind,
          summary: decision.summary,
          ...(reason ? { reason } : {}),
          ...(orderId ? { orderId } : {}),
          ...(linkedOrder
            ? {
                symbol: linkedOrder.symbol,
                side: linkedOrder.side,
                status: linkedOrder.status,
                qty: this.toRounded(linkedOrder.qty, 8),
                ...(typeof linkedOrder.price === "number" ? { price: this.toRounded(linkedOrder.price, 8) } : {})
              }
            : {})
        }
      };
      this.appendShadowEvent(event);
    }
  }

  private readAdaptiveShadowTail(maxItems: number): AdaptiveShadowEvent[] {
    if (!fs.existsSync(this.adaptiveShadowPath)) return [];
    try {
      const raw = fs.readFileSync(this.adaptiveShadowPath, "utf-8");
      const lines = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const tail = lines.slice(Math.max(0, lines.length - maxItems));
      const parsed: AdaptiveShadowEvent[] = [];
      for (const line of tail) {
        try {
          const event = JSON.parse(line) as Partial<AdaptiveShadowEvent>;
          const normalizedLabel = this.normalizeAdaptiveRegimeLabel(event.regime?.label);
          const normalizedKind = this.normalizeAdaptiveDecisionKind(event.decision?.kind);
          const regimeConfidence =
            typeof event.regime?.confidence === "number" && Number.isFinite(event.regime.confidence) ? event.regime.confidence : 0.2;
          const summary = typeof event.decision?.summary === "string" && event.decision.summary.trim() ? event.decision.summary : "Telemetry event";

          parsed.push({
            version: 1,
            ts: typeof event.ts === "string" && event.ts.trim() ? event.ts : new Date().toISOString(),
            tickStartedAt: typeof event.tickStartedAt === "string" && event.tickStartedAt.trim() ? event.tickStartedAt : new Date().toISOString(),
            tickDurationMs: typeof event.tickDurationMs === "number" && Number.isFinite(event.tickDurationMs) ? event.tickDurationMs : 0,
            environment: event.environment === "LIVE" ? "LIVE" : "PAPER",
            homeStableCoin:
              typeof event.homeStableCoin === "string" && event.homeStableCoin.trim() ? event.homeStableCoin : "USDC",
            candidateSymbol:
              typeof event.candidateSymbol === "string" && event.candidateSymbol.trim() ? event.candidateSymbol : "UNSET",
            ...(event.executionLane ? { executionLane: event.executionLane } : {}),
            ...(event.candidateFeatures ? { candidateFeatures: event.candidateFeatures } : {}),
            regime: {
              label: normalizedLabel,
              confidence: this.toRounded(Math.max(0, Math.min(1, regimeConfidence)), 4),
              inputs: event.regime?.inputs ?? {}
            },
            strategy: event.strategy ?? {
              trend: 0,
              meanReversion: 0,
              grid: 0,
              recommended: "MEAN_REVERSION"
            },
            risk: event.risk ?? {
              risk: 50
            },
            decision: {
              ...event.decision,
              kind: normalizedKind,
              summary
            }
          });
        } catch {
          // ignore invalid lines
        }
      }
      return parsed;
    } catch {
      return [];
    }
  }

  private normalizeAdaptiveRegimeLabel(label: unknown): RegimeLabel {
    const normalized = typeof label === "string" ? label.trim().toUpperCase() : "";
    if (normalized === "BULL_TREND") return "BULL_TREND";
    if (normalized === "BEAR_TREND") return "BEAR_TREND";
    if (normalized === "RANGE") return "RANGE";
    if (normalized === "NEUTRAL") return "NEUTRAL";
    return "NEUTRAL";
  }

  private normalizeAdaptiveDecisionKind(kind: unknown): "ENGINE" | "TRADE" | "SKIP" {
    const normalized = typeof kind === "string" ? kind.trim().toUpperCase() : "";
    if (normalized === "TRADE") return "TRADE";
    if (normalized === "SKIP") return "SKIP";
    return "ENGINE";
  }

  private isFeeEdgeSufficient(netEdgePct: number, minNetEdgePct: number): boolean {
    if (!Number.isFinite(netEdgePct) || !Number.isFinite(minNetEdgePct)) return false;
    const normalizedNetEdge = Number(netEdgePct.toFixed(3));
    const normalizedMinEdge = Number(minNetEdgePct.toFixed(3));
    return normalizedNetEdge >= normalizedMinEdge;
  }

  private readNumericDecisionDetail(details: Record<string, unknown> | undefined, key: string): number | null {
    const raw = details?.[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  private extractWalletPolicySnapshot(state: BotState): BotRunStatsResponse["walletPolicy"] {
    for (const decision of state.decisions) {
      if (decision.kind !== "TRADE") continue;
      const details = decision.details as Record<string, unknown> | undefined;
      if (typeof details?.mode !== "string" || details.mode !== "wallet-sweep") continue;

      const unmanagedExposurePct = this.readNumericDecisionDetail(details, "unmanagedExposurePct");
      const unmanagedExposureCapPct = this.readNumericDecisionDetail(details, "unmanagedExposureCapPct");
      if (unmanagedExposurePct === null || unmanagedExposureCapPct === null) continue;

      const unmanagedNonHomeValue = this.readNumericDecisionDetail(details, "unmanagedNonHomeValue");
      const unmanagedExposureCapHome = this.readNumericDecisionDetail(details, "unmanagedExposureCapHome");
      const category = typeof details.category === "string" ? details.category : undefined;
      const sourceAsset = typeof details.sourceAsset === "string" ? details.sourceAsset : undefined;
      const reason = typeof details.sweepReason === "string" ? details.sweepReason : undefined;

      return {
        observedAt: decision.ts,
        overCap: unmanagedExposurePct > unmanagedExposureCapPct,
        unmanagedExposurePct: Number(unmanagedExposurePct.toFixed(6)),
        unmanagedExposureCapPct: Number(unmanagedExposureCapPct.toFixed(6)),
        ...(unmanagedNonHomeValue === null ? {} : { unmanagedNonHomeValue: Number(unmanagedNonHomeValue.toFixed(6)) }),
        ...(unmanagedExposureCapHome === null
          ? {}
          : { unmanagedExposureCapHome: Number(unmanagedExposureCapHome.toFixed(6)) }),
        ...(category ? { category } : {}),
        ...(sourceAsset ? { sourceAsset } : {}),
        ...(reason ? { reason } : {})
      };
    }

    return null;
  }

  getRunStats(): BotRunStatsResponse {
    const state = this.getState();
    let kpi: BaselineRunStats | null = null;
    if (fs.existsSync(this.baselineStatsPath)) {
      try {
        const raw = fs.readFileSync(this.baselineStatsPath, "utf-8");
        kpi = JSON.parse(raw) as BaselineRunStats;
      } catch {
        kpi = null;
      }
    } else {
      this.persistBaselineStats(state);
      if (fs.existsSync(this.baselineStatsPath)) {
        try {
          const raw = fs.readFileSync(this.baselineStatsPath, "utf-8");
          kpi = JSON.parse(raw) as BaselineRunStats;
        } catch {
          kpi = null;
        }
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      kpi,
      adaptiveShadowTail: this.readAdaptiveShadowTail(200),
      walletPolicy: this.extractWalletPolicySnapshot(state),
      notes: {
        activeOrders:
          "SPOT mode uses MARKET execution (active may stay 0). SPOT_GRID keeps resting LIMIT orders, so active orders should be visible."
      }
    };
  }

  start(): void {
    const state = this.getState();
    if (state.running) {
      if (state.phase !== "TRADING") {
        this.scheduleExamineTransition();
      }
      this.ensureLoopTimer();
      return;
    }

    this.addDecision("ENGINE", "Start requested");
    this.save({
      ...this.getState(),
      running: true,
      phase: "EXAMINING",
      lastError: undefined,
      startedAt: new Date().toISOString()
    });

    this.scheduleExamineTransition();
    this.ensureLoopTimer();
  }

  private async tick(): Promise<void> {
    if (this.tickInFlight) return;
    this.tickInFlight = true;
    const tickStartedAtMs = Date.now();
    let beforeDecisionIds = new Set<string>();
    let tickContext: TickTelemetryContext | null = null;
    try {
      const config = this.configService.load();
      const protectionFingerprint = (state: BotState): string =>
        JSON.stringify(
          (state.protectionLocks ?? [])
            .map((lock) => `${lock.type}:${lock.scope}:${lock.symbol ?? "*"}:${lock.expiresAt}:${lock.reason}`)
            .sort()
        );

      let current = this.pruneExpiredProtectionLocks(this.pruneExpiredBlacklist(this.getState()));
      beforeDecisionIds = new Set(current.decisions.map((d) => d.id));
      if (!current.running) return;
      if (current.phase !== "TRADING") return;

      const homeStable = config?.basic.homeStableCoin ?? "USDT";
      const traderRegion = config?.basic.traderRegion ?? "NON_EEA";
      const risk = Math.max(0, Math.min(100, config?.basic.risk ?? 50));
      const allowedExecutionQuotes = this.resolveExecutionQuoteAssets({
        config,
        homeStable,
        traderRegion,
        risk
      });
      const executionQuoteList = [...allowedExecutionQuotes].sort((left, right) => right.length - left.length);
      const getExecutionQuoteFromSymbol = (symbol: string): string | null => {
        return this.getSymbolQuoteAssetByPriority(symbol, executionQuoteList);
      };
      const getExecutionBaseFromSymbol = (symbol: string): string | null => {
        return this.getSymbolBaseAssetByPriority(symbol, executionQuoteList);
      };
      const isExecutionQuoteSymbol = (symbol: string): boolean => getExecutionQuoteFromSymbol(symbol) !== null;
      const liveRequested = Boolean(config?.basic.liveTrading);
      const binanceEnvironment = config?.advanced.binanceEnvironment ?? "MAINNET";
      const allowMainnetLiveTrading = String(process.env.ALLOW_MAINNET_LIVE_TRADING ?? "false").toLowerCase() === "true";
      const liveTrading = liveRequested && (binanceEnvironment === "SPOT_TESTNET" || allowMainnetLiveTrading);
      tickContext = {
        tickStartedAtIso: new Date(tickStartedAtMs).toISOString(),
        homeStableCoin: homeStable,
        liveTrading,
        risk,
        candidateSymbol: "UNSET",
        candidate: null,
        maxOpenPositions: config?.derived.maxOpenPositions,
        maxPositionPct: config?.derived.maxPositionPct
      };

      const preProtectionFingerprint = protectionFingerprint(current);
      current = this.evaluateProtectionLocks({
        state: current,
        risk
      });
      if (preProtectionFingerprint !== protectionFingerprint(current)) {
        this.save(current);
      }

      if (liveRequested && !liveTrading) {
        const summary =
          "Live trading requested, but MAINNET live is disabled. Switch Advanced → Binance environment to Spot testnet, or set ALLOW_MAINNET_LIVE_TRADING=true.";
        const alreadyLogged = current.decisions[0]?.kind === "ENGINE" && current.decisions[0]?.summary === summary;
        if (!alreadyLogged) {
          current = {
            ...current,
            decisions: [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "ENGINE", summary }, ...current.decisions].slice(0, 200)
          };
        }
      }

      if (liveTrading) {
        const syncBackoff = this.getTransientBackoffInfo();
        if (syncBackoff.active) {
          const summary = "Skip: Transient exchange backoff active";
          const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
          const next = {
            ...current,
            decisions: alreadyLogged
              ? current.decisions
              : [
                  {
                    id: crypto.randomUUID(),
                    ts: new Date().toISOString(),
                    kind: "SKIP",
                    summary,
                    details: {
                      stage: "order-sync",
                      remainingMs: syncBackoff.remainingMs,
                      errorCount: syncBackoff.errorCount,
                      pauseUntil: syncBackoff.pauseUntilIso,
                      lastErrorCode: syncBackoff.lastErrorCode,
                      lastErrorMessage: syncBackoff.lastErrorMessage
                    }
                  },
                  ...current.decisions
                ].slice(0, 200),
            lastError: undefined
          } satisfies BotState;
          this.save(next);
          return;
        }

        try {
          const universeSnapshotForSync = await this.universe.getLatest().catch(() => null);
          const orderSyncSymbolsHint = Array.from(
            new Set([
              ...current.orderHistory
                .map((order) => order.symbol.trim().toUpperCase())
                .filter((symbol) => symbol.length > 0)
                .slice(0, 10),
              ...(universeSnapshotForSync?.candidates ?? [])
                .map((candidate) => candidate.symbol.trim().toUpperCase())
                .filter((symbol) => symbol.length > 0)
                .slice(0, 12)
            ])
          ).slice(0, 20);

          const synced = await this.withTimeout(
            this.syncLiveOrders(current, { symbolsHint: orderSyncSymbolsHint }),
            15_000,
            "Live order sync"
          );
          const changed =
            synced.activeOrders.length !== current.activeOrders.length ||
            synced.orderHistory.length !== current.orderHistory.length ||
            synced.activeOrders.some((order, index) => order.id !== current.activeOrders[index]?.id) ||
            synced.orderHistory.some((order, index) => order.id !== current.orderHistory[index]?.id);
          current = synced;
          this.clearTransientExchangeBackoff();
          if (changed) {
            this.save(current);
          }
        } catch (syncErr) {
          const rawMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
          const safeMsg = this.sanitizeUserErrorMessage(rawMsg);
          const backoffDetails = this.registerTransientExchangeError(rawMsg, safeMsg);
          const summary = "Skip: Live order sync failed";
          const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
          const next = {
            ...current,
            decisions: alreadyLogged
              ? current.decisions
              : [
                  {
                    id: crypto.randomUUID(),
                    ts: new Date().toISOString(),
                    kind: "SKIP",
                    summary,
                    details: {
                      stage: "order-sync",
                      error: safeMsg,
                      backoffMs: backoffDetails.pauseMs,
                      pauseUntil: backoffDetails.pauseUntilIso,
                      errorCount: backoffDetails.errorCount,
                      lastErrorCode: backoffDetails.lastErrorCode
                    }
                  },
                  ...current.decisions
                ].slice(0, 200),
            lastError: safeMsg
          } satisfies BotState;
          this.save(next);
          return;
        }
      }

      const globalLock = this.getActiveGlobalProtectionLock(current);
      if (globalLock) {
        const lockType = globalLock.type.trim().toUpperCase();
        const lockIsHardStop = lockType === "STOPLOSS_GUARD" || lockType === "MAX_DRAWDOWN";
        const effectiveRiskState: BotState["riskState"] = {
          state: current.riskState?.state === "HALT" ? "HALT" : lockIsHardStop ? "HALT" : "CAUTION",
          reason_codes: [
            ...new Set([
              ...(current.riskState?.reason_codes ?? []),
              `PROTECTION_LOCK_${lockType}`,
              `lockReason=${globalLock.reason}`
            ])
          ].slice(0, 12),
          unwind_only: Boolean(current.riskState?.unwind_only) || lockIsHardStop,
          resume_conditions: [
            ...new Set([
              ...(current.riskState?.resume_conditions ?? []),
              `Wait protection lock expiry (${globalLock.expiresAt})`
            ])
          ].slice(0, 8)
        };
        const riskStateChanged =
          JSON.stringify(current.riskState ?? null) !== JSON.stringify(effectiveRiskState);
        if (riskStateChanged) {
          current = {
            ...current,
            riskState: effectiveRiskState
          };
          this.save(current);
        }

        if (liveTrading && config && config.advanced.autoCancelBotOrdersOnGlobalProtectionLock) {
          current = await this.cancelBotOwnedOpenOrders({
            config,
            state: current,
            orders: current.activeOrders,
            reason: `global-lock ${globalLock.type}`,
            details: {
              lockType: globalLock.type,
              lockReason: globalLock.reason,
              lockExpiresAt: globalLock.expiresAt
            },
            maxCancels: 10
          });
          this.save(current);
        }

        const summary = `Skip: Protection lock ${globalLock.type} (GLOBAL)`;
        const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
        const next = {
          ...current,
          decisions: alreadyLogged
            ? current.decisions
            : [
                {
                  id: crypto.randomUUID(),
                  ts: new Date().toISOString(),
                  kind: "SKIP",
                  summary,
                  details: {
                    stage: "protection-lock",
                    lock: globalLock
                  }
                },
                ...current.decisions
              ].slice(0, 200),
          lastError: undefined
        } satisfies BotState;
        this.save(next);
        return;
      }

      const maybeFillOne = (state: BotState): { activeOrders: Order[]; orderHistory: Order[] } => {
        if (state.activeOrders.length === 0) {
          return { activeOrders: state.activeOrders, orderHistory: state.orderHistory };
        }
        if (Math.random() > 0.4) {
          return { activeOrders: state.activeOrders, orderHistory: state.orderHistory };
        }

        const [toFill, ...rest] = state.activeOrders;
        const filled: Order = { ...toFill, status: "FILLED" };
        return { activeOrders: rest, orderHistory: [filled, ...state.orderHistory].slice(0, 200) };
      };

      const filled = liveTrading ? { activeOrders: current.activeOrders, orderHistory: current.orderHistory } : maybeFillOne(current);
      const candidateSelection = await (async (): Promise<{
        symbol: string | null;
        candidate: UniverseCandidate | null;
        reason?: string;
      }> => {
        try {
          const snap = await this.universe.getLatest();
          const tradeMode = config?.basic.tradeMode ?? "SPOT";
          const manageExternalOpenOrders = Boolean(config?.advanced.manageExternalOpenOrders);
          const botPrefix = config ? this.resolveBotOrderClientIdPrefix(config) : "ABOT";
          const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));

          const maxGridOrdersPerSymbol = Math.max(2, Math.min(6, 2 + Math.round(boundedRisk / 25)));
          const positions = tradeMode === "SPOT_GRID" ? this.getManagedPositions(current) : null;
          const minCountableExposureHome = this.deriveManagedPositionMinCountableExposureHome(boundedRisk);
          const maxOpenPositions = Math.max(1, config?.derived.maxOpenPositions ?? 1);
          const activeReasonQuarantineFamilies = this.getActiveReasonQuarantineFamilies(current);
          const openHomePositionCount =
            positions?.size && tradeMode === "SPOT_GRID"
              ? [...positions.values()].filter(
                (position) =>
                  isExecutionQuoteSymbol(position.symbol) &&
                  this.isManagedPositionCountable(position, minCountableExposureHome)
              ).length
              : 0;
          const selectionRiskState = current.riskState?.state ?? "NORMAL";
          const selectionManagedExposurePct = this.extractRiskStateManagedExposurePct(current.riskState);
          const selectionTrigger = this.extractRiskStateTrigger(current.riskState) ?? "NONE";
          const selectionHaltExposureFloorPct = this.extractRiskStateHaltExposureFloorPct(current.riskState);
          const selectionCautionMinManagedExposurePct = this.deriveCautionPauseNewSymbolsMinExposurePct({
            risk: boundedRisk,
            trigger: selectionTrigger,
            haltExposureFloorPct: selectionHaltExposureFloorPct
          });
          const restrictToManagedSymbolsInCaution = this.shouldRestrictCautionToManagedSymbols({
            tradeMode,
            riskState: selectionRiskState,
            openHomePositionCount,
            managedExposurePct: selectionManagedExposurePct,
            minManagedExposurePct: selectionCautionMinManagedExposurePct
          });
          const recentMinOrderSkipsGlobal = this.countRecentSkipCluster({
            state: current,
            cluster: "MIN_ORDER",
            windowMs: 20 * 60_000
          });
          const minOrderPressureThreshold = Math.max(8, Math.round(16 - boundedRisk * 0.08)); // risk 0 -> 16, risk 100 -> 8
          const minOrderPressureActive = recentMinOrderSkipsGlobal >= minOrderPressureThreshold;
          const recentInventoryWaitingSkipsGlobal = this.countRecentSkipCluster({
            state: current,
            cluster: "INVENTORY_WAITING",
            windowMs: 20 * 60_000
          });
          const inventoryWaitingPressureThreshold = Math.max(6, Math.round(14 - boundedRisk * 0.08)); // risk 0 -> 14, risk 100 -> 6
          const inventoryWaitingPressureActive = recentInventoryWaitingSkipsGlobal >= inventoryWaitingPressureThreshold;
          let bestGridCandidate: { symbol: string; candidate: UniverseCandidate; score: number } | null = null;
          let bestActionableGridCandidate: { symbol: string; candidate: UniverseCandidate; score: number } | null = null;

          const seenSymbols = new Set<string>();
          for (const rawCandidate of snap.candidates ?? []) {
            if (!rawCandidate?.symbol) continue;
            const candidate = rawCandidate;
            const candidateQuote = candidate.quoteAsset.trim().toUpperCase();
            if (liveTrading && !allowedExecutionQuotes.has(candidateQuote)) continue;

            const symbol = candidate.symbol.trim().toUpperCase();
            if (!symbol || seenSymbols.has(symbol)) continue;
            seenSymbols.add(symbol);
            if (this.isSymbolBlocked(symbol, current)) continue;

            const policyReason = getPairPolicyBlockReason({
              symbol,
              baseAsset: candidate.baseAsset,
              quoteAsset: candidate.quoteAsset,
              traderRegion: config?.basic.traderRegion ?? "NON_EEA",
              neverTradeSymbols: config?.advanced.neverTradeSymbols,
              excludeStableStablePairs: config?.advanced.excludeStableStablePairs,
              enforceRegionPolicy: config?.advanced.enforceRegionPolicy
            });
            if (policyReason) continue;
            const entryGuard = this.getEntryGuard({ symbol, state: current });
            if (tradeMode !== "SPOT_GRID" && entryGuard) continue;

            if (tradeMode === "SPOT_GRID") {
              const symbolOpenLimitOrdersAll = current.activeOrders.filter((order) => {
                if (order.symbol !== symbol) return false;
                if (order.status !== "NEW") return false;
                const type = order.type.trim().toUpperCase();
                return type === "LIMIT" || type === "LIMIT_MAKER";
              });
              const externalOpenLimits = symbolOpenLimitOrdersAll.filter((order) => !this.isBotOwnedOrder(order, botPrefix));
              if (externalOpenLimits.length > 0 && !manageExternalOpenOrders) {
                continue;
              }

              const symbolOpenLimits = symbolOpenLimitOrdersAll.filter((order) => {
                return manageExternalOpenOrders ? true : this.isBotOwnedOrder(order, botPrefix);
              });
              const hasBuyLimit = symbolOpenLimits.some((order) => order.side === "BUY");
              const hasSellLimit = symbolOpenLimits.some((order) => order.side === "SELL");
              const openLimitCount = symbolOpenLimits.length;

              const regime = this.buildRegimeSnapshot(candidate);
              const scores = this.buildAdaptiveStrategyScores(candidate, regime.label);

              const existingBuyPauseLock = this.getActiveSymbolProtectionLock(current, symbol, { onlyTypes: ["GRID_GUARD_BUY_PAUSE"] });
              const pauseConfidenceThreshold = this.getBearPauseConfidenceThreshold(risk);
              const shouldPauseBuys =
                regime.label === "BEAR_TREND" &&
                typeof regime.confidence === "number" &&
                Number.isFinite(regime.confidence) &&
                regime.confidence >= pauseConfidenceThreshold;
              const buyPaused = Boolean(existingBuyPauseLock) || shouldPauseBuys;

              const netQty = positions?.get(symbol)?.netQty ?? 0;
              const hasInventory = Number.isFinite(netQty) && netQty > 0;
              const hasEntryGuard = Boolean(entryGuard);
              if (restrictToManagedSymbolsInCaution && !hasInventory) {
                continue;
              }
              const openPositionCapReached = openHomePositionCount >= maxOpenPositions;
              if (openPositionCapReached && !hasInventory) {
                continue;
              }

              const recentGridBuySizingRejects = this.countRecentSymbolSkipMatches({
                state: current,
                symbol,
                contains: "grid buy sizing rejected",
                windowMs: 15 * 60_000
              });
              const recentGridBuyQuoteInsufficient = this.countRecentSymbolSkipMatches({
                state: current,
                symbol,
                contains: "insufficient spendable",
                windowMs: 15 * 60_000
              });
              const recentQuoteAssetBuyQuoteInsufficient = this.countRecentQuoteAssetGridBuyQuoteSkips({
                state: current,
                quoteAsset: candidateQuote,
                windowMs: 15 * 60_000
              });
              const recentGridSellSizingRejects = this.countRecentSymbolSkipMatches({
                state: current,
                symbol,
                contains: "grid sell sizing rejected",
                windowMs: 15 * 60_000
              });
              const recentEntryGuardSkips = this.countRecentSymbolSkipMatches({
                state: current,
                symbol,
                contains: "entry cooldown active",
                windowMs: 20 * 60_000
              });
              const recentInventoryWaitingSkips = this.countRecentSymbolSkipMatches({
                state: current,
                symbol,
                contains: "grid waiting for ladder slot or inventory",
                windowMs: 20 * 60_000
              });
              const recentFeeEdgeRejects = this.countRecentSymbolSkipMatches({
                state: current,
                symbol,
                contains: "fee/edge filter",
                windowMs: 15 * 60_000
              });
              const feeEdgeQuarantined = activeReasonQuarantineFamilies.has("FEE_EDGE") && recentFeeEdgeRejects > 0;
              if (feeEdgeQuarantined) {
                continue;
              }
              const sizingRejectThreshold = Math.max(2, Math.round(4 - boundedRisk / 50)); // risk 0 -> 4, risk 100 -> 2
              const suppressBuyLegFromRejectStorm = recentGridBuySizingRejects >= sizingRejectThreshold;
              const suppressSellLegFromRejectStorm = recentGridSellSizingRejects >= sizingRejectThreshold;

              let sellLegLikelyFeasible = !hasInventory;
              if (!hasSellLimit && hasInventory) {
                sellLegLikelyFeasible = true;
                try {
                  const rules = await this.marketData.getSymbolRules(symbol);
                  const minQtyRaw = rules.lotSize?.minQty ?? rules.marketLotSize?.minQty;
                  const stepRaw = rules.lotSize?.stepSize ?? rules.marketLotSize?.stepSize;
                  const minQty = typeof minQtyRaw === "string" ? Number.parseFloat(minQtyRaw) : Number.NaN;
                  const step = typeof stepRaw === "string" ? Number.parseFloat(stepRaw) : Number.NaN;
                  let normalizedSellQty = netQty;
                  if (Number.isFinite(step) && step > 0) {
                    normalizedSellQty = Math.floor((normalizedSellQty + 1e-12) / step) * step;
                  }
                  const minNotional = typeof rules.notional?.minNotional === "string" ? Number.parseFloat(rules.notional.minNotional) : Number.NaN;
                  const candidatePrice = Number.isFinite(candidate.lastPrice) ? candidate.lastPrice : Number.NaN;
                  const estimatedNotional =
                    Number.isFinite(candidatePrice) && candidatePrice > 0 ? normalizedSellQty * candidatePrice : Number.NaN;
                  if (Number.isFinite(minQty) && normalizedSellQty + 1e-12 < minQty) {
                    sellLegLikelyFeasible = false;
                  } else if (Number.isFinite(minNotional) && Number.isFinite(estimatedNotional) && estimatedNotional + 1e-8 < minNotional) {
                    sellLegLikelyFeasible = false;
                  }
                } catch {
                  // keep current estimate if rules are temporarily unavailable
                }
              }

              if (
                activeReasonQuarantineFamilies.has("GRID_SELL_SIZING") &&
                recentGridSellSizingRejects > 0 &&
                !hasSellLimit &&
                hasInventory &&
                !sellLegLikelyFeasible
              ) {
                continue;
              }

              if (activeReasonQuarantineFamilies.has("GRID_BUY_SIZING") && recentGridBuySizingRejects > 0 && !hasBuyLimit) {
                continue;
              }
              if (minOrderPressureActive && recentGridBuySizingRejects > 0 && !hasInventory && !hasBuyLimit && !hasSellLimit) {
                continue;
              }

              const missingBuyLeg =
                !hasBuyLimit && !buyPaused && !suppressBuyLegFromRejectStorm && !hasEntryGuard && (!openPositionCapReached || hasInventory);
              const missingSellLeg = !hasSellLimit && hasInventory && sellLegLikelyFeasible && !suppressSellLegFromRejectStorm;
              if (
                this.shouldSuppressGridQuoteStarvedCandidate({
                  quoteQuarantineActive: activeReasonQuarantineFamilies.has("GRID_BUY_QUOTE"),
                  recentGridBuyQuoteInsufficient,
                  hasBuyLimit,
                  missingSellLeg,
                  risk: boundedRisk
                })
              ) {
                continue;
              }
              if (
                this.shouldSuppressGridEntryGuardCandidate({
                  hasEntryGuard,
                  missingSellLeg,
                  recentEntryGuardSkips,
                  risk: boundedRisk
                })
              ) {
                continue;
              }
              if (
                this.shouldSuppressGridQuoteAssetCandidate({
                  quoteQuarantineActive: activeReasonQuarantineFamilies.has("GRID_BUY_QUOTE"),
                  recentQuoteAssetBuyQuoteInsufficient,
                  missingSellLeg,
                  risk: boundedRisk
                })
              ) {
                continue;
              }
              if (
                this.shouldSuppressGridFeeEdgeCandidate({
                  feeEdgeQuarantineActive: activeReasonQuarantineFamilies.has("FEE_EDGE"),
                  recentFeeEdgeRejects,
                  missingSellLeg,
                  risk: boundedRisk
                })
              ) {
                continue;
              }
              const canTakeAction = missingBuyLeg || missingSellLeg;
              const waiting = hasBuyLimit && hasSellLimit;
              const hasGuardNoInventoryNoLadder = buyPaused && !hasInventory && !hasBuyLimit && !hasSellLimit;
              if (hasGuardNoInventoryNoLadder) {
                continue;
              }
              const suppressStalledCandidate = this.shouldSuppressGridStalledCandidate({
                canTakeAction,
                waiting,
                buyPaused,
                hasInventory,
                hasBuyLimit,
                hasSellLimit,
                recentInventoryWaitingSkips,
                inventoryWaitingPressureActive
              });
              if (suppressStalledCandidate) {
                continue;
              }

              const waitingPenalty = waiting ? 0.3 : 0;
              const guardNoInventoryPenalty = buyPaused && !hasInventory ? 0.45 : 0;
              const bearTrendGridPenalty =
                regime.label === "BEAR_TREND" ? this.toRounded(0.22 - (risk / 100) * 0.1, 4) : 0;
              const openLimitPenalty = Math.min(0.2, (openLimitCount / Math.max(1, maxGridOrdersPerSymbol)) * 0.2);
              const rejectPenalty = Math.min(
                0.55,
                recentGridBuySizingRejects * 0.06 +
                  recentGridBuyQuoteInsufficient * 0.05 +
                  recentGridSellSizingRejects * 0.08 +
                  recentFeeEdgeRejects * 0.04
              );
              const minOrderPressurePenalty =
                minOrderPressureActive && recentGridBuySizingRejects > 0 && !hasInventory ? 0.18 : 0;
              const inventoryWaitingPenalty = Math.min(
                0.45,
                recentInventoryWaitingSkips * 0.07 + (inventoryWaitingPressureActive && waiting ? 0.18 : 0)
              );
              const infeasibleSellPenalty = !sellLegLikelyFeasible && hasInventory ? 0.35 : 0;

              const actionability = canTakeAction ? 1 : waiting ? (inventoryWaitingPressureActive ? 0.01 : 0.05) : 0.3;
              const recommendedBonus = scores.recommended === "GRID" ? 0.15 : scores.recommended === "MEAN_REVERSION" ? 0.05 : 0;
              const score =
                scores.grid * 1.2 +
                actionability * 0.8 +
                recommendedBonus -
                waitingPenalty -
                guardNoInventoryPenalty -
                bearTrendGridPenalty -
                openLimitPenalty -
                rejectPenalty -
                minOrderPressurePenalty -
                inventoryWaitingPenalty -
                infeasibleSellPenalty;

              if (canTakeAction && (!bestActionableGridCandidate || score > bestActionableGridCandidate.score)) {
                bestActionableGridCandidate = { symbol, candidate, score };
              }
              if (!bestGridCandidate || score > bestGridCandidate.score) {
                bestGridCandidate = { symbol, candidate, score };
              }
              continue;
            }

            return { symbol, candidate };
          }

          if (tradeMode === "SPOT_GRID") {
            if (bestActionableGridCandidate) {
              return { symbol: bestActionableGridCandidate.symbol, candidate: bestActionableGridCandidate.candidate };
            }
            if (bestGridCandidate) {
              return { symbol: bestGridCandidate.symbol, candidate: bestGridCandidate.candidate };
            }
            if (restrictToManagedSymbolsInCaution) {
              return { symbol: null, candidate: null, reason: "Daily loss caution: no eligible managed symbols" };
            }
          }

          return { symbol: null, candidate: null, reason: "No eligible universe candidates after policy and lock filters" };
        } catch {
          return { symbol: null, candidate: null, reason: "Universe snapshot unavailable" };
        }
      })();
      let candidateSymbol: string | null = candidateSelection.symbol;
      let selectedCandidate = candidateSelection.candidate;
      if (!candidateSymbol && candidateSelection.reason === "Daily loss caution: no eligible managed symbols") {
        const managedFallbackSymbol = this.pickManagedFallbackSymbol({
          state: current,
          isExecutionQuoteSymbol,
          minExposureHome: this.deriveManagedPositionMinCountableExposureHome(risk)
        });
        if (managedFallbackSymbol) {
          candidateSymbol = managedFallbackSymbol;
          const fallbackSnapshot = await this.universe.getLatest().catch(() => null);
          selectedCandidate =
            (fallbackSnapshot?.candidates ?? []).find(
              (candidate) => candidate.symbol.trim().toUpperCase() === managedFallbackSymbol
            ) ?? null;
          const summary = `Caution fallback: evaluate managed symbol ${managedFallbackSymbol}`;
          const alreadyLogged = current.decisions[0]?.kind === "ENGINE" && current.decisions[0]?.summary === summary;
          if (!alreadyLogged) {
            current = {
              ...current,
              decisions: [
                {
                  id: crypto.randomUUID(),
                  ts: new Date().toISOString(),
                  kind: "ENGINE",
                  summary,
                  details: {
                    stage: "daily-loss-caution-managed-fallback",
                    reason: candidateSelection.reason
                  }
                },
                ...current.decisions
              ].slice(0, 200)
            } satisfies BotState;
            this.save(current);
          }
        }
      }
      if (!candidateSymbol) {
        const summary = `Skip: ${candidateSelection.reason ?? "No eligible trading candidate"}`;
        const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
        const next = {
          ...current,
          activeOrders: filled.activeOrders,
          orderHistory: filled.orderHistory,
          decisions: alreadyLogged
            ? current.decisions
            : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
        } satisfies BotState;
        this.save(next);
        return;
      }

      tickContext.candidateSymbol = candidateSymbol;
      tickContext.candidate = selectedCandidate;
      const blockedReason = this.isSymbolBlocked(candidateSymbol, current);
      if (blockedReason) {
        const summary = `Skip ${candidateSymbol}: ${blockedReason}`;
        const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
        const next = {
          ...current,
          activeOrders: filled.activeOrders,
          orderHistory: filled.orderHistory,
          decisions: alreadyLogged
            ? current.decisions
            : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
        } satisfies BotState;
        this.save(next);
        return;
      }

      const entryGuard = this.getEntryGuard({ symbol: candidateSymbol, state: current });
      if (entryGuard) {
        const summary = `Skip ${candidateSymbol}: ${entryGuard.summary}`;
        const isMaxConsecutiveEntryGuard = entryGuard.summary.trim().toLowerCase().includes("max consecutive entries reached");
        const baseCooldownMs = isMaxConsecutiveEntryGuard
          ? Math.max(this.deriveNoActionSymbolCooldownMs(risk), Math.round((45 - (risk / 100) * 30) * 60_000)) // 45m -> 15m
          : this.deriveNoActionSymbolCooldownMs(risk);
        const cooldown = this.deriveInfeasibleSymbolCooldown({
          state: current,
          symbol: candidateSymbol,
          risk,
          baseCooldownMs,
          summary
        });
        const cooldownMs = cooldown.cooldownMs;
        const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
        const next = {
          ...current,
          activeOrders: filled.activeOrders,
          orderHistory: filled.orderHistory,
          decisions: alreadyLogged
            ? current.decisions
            : [
                {
                  id: crypto.randomUUID(),
                  ts: new Date().toISOString(),
                  kind: "SKIP",
                  summary,
                  details: {
                    ...(entryGuard.details ?? {}),
                    ...(isMaxConsecutiveEntryGuard ? { cooldownMs } : {}),
                    ...(cooldown.storm ? { storm: cooldown.storm } : {})
                  }
                },
                ...current.decisions
              ].slice(0, 200)
        } satisfies BotState;
        const withCooldown = isMaxConsecutiveEntryGuard
          ? this.upsertProtectionLock(next, {
              type: "COOLDOWN",
              scope: "SYMBOL",
              symbol: candidateSymbol,
              reason: cooldown.storm
                ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                : `Cooldown after max-consecutive-entry guard (${Math.round(cooldownMs / 1000)}s)`,
              expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
              details: {
                category: "ENTRY_GUARD_MAX_CONSECUTIVE",
                cooldownMs,
                ...(entryGuard.details ?? {}),
                ...(cooldown.storm ? { storm: cooldown.storm } : {})
              }
            })
          : next;
        this.save(withCooldown);
        return;
      }

      const aiEnabled = Boolean(config?.basic.aiEnabled);
      const aiMin = config?.basic.aiMinTradeConfidence ?? 65;
      const aiConfidence = aiEnabled ? Math.floor(Math.random() * 101) : null;
      if (aiEnabled && aiConfidence !== null && aiConfidence < aiMin) {
        const next = {
          ...current,
          activeOrders: filled.activeOrders,
          orderHistory: filled.orderHistory,
          decisions: [
            {
              id: crypto.randomUUID(),
              ts: new Date().toISOString(),
              kind: "AI",
              summary: `AI gated trade (confidence ${aiConfidence}% < ${aiMin}%)`
            },
            ...current.decisions
          ].slice(0, 200)
        } satisfies BotState;
        this.save(next);
        return;
      }

      if (liveTrading) {
        const baseUrl = this.trading.getBaseUrl();
        const envLabel = isBinanceTestnetBaseUrl(baseUrl) ? "testnet" : "mainnet";
        current = {
          ...current,
          activeOrders: filled.activeOrders,
          orderHistory: filled.orderHistory
        };

        const cooldownMs = config?.advanced.liveTradeCooldownMs ?? 60_000;
        if (Number.isFinite(cooldownMs) && cooldownMs > 0) {
          const lastTrade = current.decisions.find((d) => d.kind === "TRADE");
          const lastTradeAt = lastTrade ? Date.parse(lastTrade.ts) : Number.NaN;
          if (Number.isFinite(lastTradeAt) && Date.now() - lastTradeAt < cooldownMs) {
            return;
          }
        }

        const transientBackoff = this.getTransientBackoffInfo();
        if (transientBackoff.active) {
          const summary = `Skip ${candidateSymbol}: Transient exchange backoff active`;
          const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
          const next = {
            ...current,
            activeOrders: filled.activeOrders,
            orderHistory: filled.orderHistory,
            decisions: alreadyLogged
              ? current.decisions
              : [
                  {
                    id: crypto.randomUUID(),
                    ts: new Date().toISOString(),
                    kind: "SKIP",
                    summary,
                    details: {
                      remainingMs: transientBackoff.remainingMs,
                      errorCount: transientBackoff.errorCount,
                      pauseUntil: transientBackoff.pauseUntilIso,
                      lastErrorCode: transientBackoff.lastErrorCode,
                      lastErrorMessage: transientBackoff.lastErrorMessage
                    }
                  },
                  ...current.decisions
                ].slice(0, 200),
            lastError: undefined
          } satisfies BotState;
          this.save(next);
          return;
        }

        type LiveOperationContext = {
          stage: string;
          symbol: string;
          side?: "BUY" | "SELL";
          asset?: string;
          required?: number;
          available?: number;
        };
        let liveOperation: LiveOperationContext = {
          stage: "candidate",
          symbol: candidateSymbol
        };
        const setLiveOperation = (patch: Partial<LiveOperationContext>): void => {
          liveOperation = {
            ...liveOperation,
            ...patch
          };
        };

        try {
          const persistLiveTrade = (params: {
            symbol: string;
            side: "BUY" | "SELL";
            requestedQty: string;
            fallbackQty: number;
            response: BinanceMarketOrderResponse | BinanceOrderSnapshot;
            reason: string;
            details?: Record<string, unknown>;
          }): void => {
            const { symbol, side, requestedQty, fallbackQty, response, reason, details } = params;
            const fills = "fills" in response && Array.isArray(response.fills) ? response.fills : [];
            const avgPrice = (() => {
              let qtySum = 0;
              let costSum = 0;
              for (const f of fills) {
                const fp = Number.parseFloat(f.price ?? "");
                const fq = Number.parseFloat(f.qty ?? "");
                if (!Number.isFinite(fp) || !Number.isFinite(fq) || fq <= 0) continue;
                qtySum += fq;
                costSum += fp * fq;
              }
              if (qtySum <= 0) return undefined;
              const ap = costSum / qtySum;
              return Number.isFinite(ap) && ap > 0 ? ap : undefined;
            })();
            const feeSummary = this.deriveOrderFeeHome({
              symbol,
              homeStable,
              fills,
              fallbackPrice: avgPrice
            });

            const executedQty = Number.parseFloat(response.executedQty ?? "");
            const origQty = Number.parseFloat(response.origQty ?? "");
            const finalQty =
              Number.isFinite(executedQty) && executedQty > 0
                ? executedQty
                : Number.isFinite(origQty) && origQty > 0
                  ? origQty
                  : fallbackQty;

            const clientOrderId = typeof response.clientOrderId === "string" ? response.clientOrderId.trim() : "";

            const order: Order = {
              id: response.orderId !== undefined ? String(response.orderId) : crypto.randomUUID(),
              ts: new Date().toISOString(),
              symbol,
              ...(clientOrderId ? { clientOrderId } : {}),
              side,
              type: (response.type?.toUpperCase() ?? "MARKET"),
              status: this.mapBinanceStatus(response.status),
              qty: finalQty,
              ...(avgPrice ? { price: avgPrice } : {}),
              ...(feeSummary.feeHome > 0 ? { feeHome: feeSummary.feeHome } : {})
            };

            const decisionSummary = `Binance ${envLabel} ${side} ${order.type} ${symbol} qty ${requestedQty} → ${order.status} (orderId ${order.id} · ${reason})`;

            let nextState: BotState = {
              ...current,
              lastError: undefined,
              decisions: [
                {
                  id: crypto.randomUUID(),
                  ts: new Date().toISOString(),
                  kind: "TRADE",
                  summary: decisionSummary,
                  details: {
                    baseUrl,
                    orderId: order.id,
                    status: response.status,
                    executedQty: response.executedQty,
                    cummulativeQuoteQty: response.cummulativeQuoteQty,
                    ...(feeSummary.feeHome > 0 ? { feeHome: feeSummary.feeHome } : {}),
                    ...(feeSummary.feeAsset ? { feeAsset: feeSummary.feeAsset } : {}),
                    ...(typeof feeSummary.feeQty === "number" ? { feeQty: feeSummary.feeQty } : {}),
                    ...(feeSummary.hasUnconvertedFee ? { hasUnconvertedFee: true } : {}),
                    reason,
                    ...details
                  }
                },
                ...current.decisions
              ].slice(0, 200),
              activeOrders: current.activeOrders,
              orderHistory: current.orderHistory
            };

            if (order.status === "NEW") {
              nextState = { ...nextState, activeOrders: [order, ...nextState.activeOrders].slice(0, 50) };
            } else {
              nextState = { ...nextState, orderHistory: [order, ...nextState.orderHistory].slice(0, 200) };
            }

            this.clearTransientExchangeBackoff();
            this.save(nextState);
            current = nextState;
          };

          let balances = await this.trading.getBalances();
          const getAssetFree = (asset: string): number => {
            const normalized = asset.trim().toUpperCase();
            if (!normalized) return 0;
            const value = balances.find((b) => b.asset.trim().toUpperCase() === normalized)?.free ?? 0;
            return Number.isFinite(value) ? value : 0;
          };
          const refreshBalances = async (): Promise<boolean> => {
            try {
              balances = await this.trading.getBalances();
              return true;
            } catch {
              return false;
            }
          };
          const ensureFundsBeforeOrder = async (params: {
            asset: string;
            required: number;
          }): Promise<{ ok: boolean; available: number; refreshed: boolean }> => {
            const required = Number.isFinite(params.required) ? Math.max(0, params.required) : 0;
            if (required <= 0) {
              return { ok: true, available: getAssetFree(params.asset), refreshed: false };
            }
            const refreshed = await refreshBalances();
            const available = getAssetFree(params.asset);
            return {
              ok: available + 1e-8 >= required,
              available,
              refreshed
            };
          };
          const buildInsufficientFundsSkipState = (params: {
            symbol: string;
            stage: string;
            side: "BUY" | "SELL";
            asset: string;
            required: number;
            available: number;
            details?: Record<string, unknown>;
          }): BotState => {
            const required = Number.isFinite(params.required) ? Math.max(0, params.required) : 0;
            const available = Number.isFinite(params.available) ? Math.max(0, params.available) : 0;
            const summary = `Skip ${params.symbol}: ${params.stage} pre-check insufficient ${params.asset} balance (need ${required.toFixed(6)}, free ${available.toFixed(6)})`;
            const baseCooldownMs = this.deriveNoActionSymbolCooldownMs(risk);
            const cooldown = this.deriveInfeasibleSymbolCooldown({
              state: current,
              symbol: params.symbol,
              risk,
              baseCooldownMs,
              summary
            });
            const cooldownMs = cooldown.cooldownMs;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: current.activeOrders,
              orderHistory: current.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        stage: params.stage,
                        side: params.side,
                        asset: params.asset,
                        required: Number(required.toFixed(8)),
                        available: Number(available.toFixed(8)),
                        ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                        cooldownMs,
                        ...params.details
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            return this.upsertProtectionLock(next, {
              type: "COOLDOWN",
              scope: "SYMBOL",
              symbol: params.symbol,
              reason: cooldown.storm
                ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                : `Cooldown after ${params.stage} insufficient ${params.asset} (${Math.round(cooldownMs / 1000)}s)`,
              expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
              details: {
                category: "PRECHECK_INSUFFICIENT_BALANCE",
                stage: params.stage,
                side: params.side,
                asset: params.asset,
                required: Number(required.toFixed(8)),
                available: Number(available.toFixed(8)),
                cooldownMs,
                ...(cooldown.storm ? { storm: cooldown.storm } : {})
              }
            });
          };

          const maxExecutionQuoteFree = [...allowedExecutionQuotes].reduce((maxValue, quoteAsset) => {
            const free = balances.find((b) => b.asset.trim().toUpperCase() === quoteAsset)?.free ?? 0;
            if (!Number.isFinite(free) || free < 0) return maxValue;
            return Math.max(maxValue, free);
          }, 0);
          let quoteFree = Number.isFinite(maxExecutionQuoteFree) && maxExecutionQuoteFree > 0 ? maxExecutionQuoteFree : 0;

          const walletTotalHome = await this.estimateWalletTotalInHome(balances, homeStable);
          const capitalProfile = this.getCapitalProfile(walletTotalHome);
          const executionBridgeAssets = resolveRouteBridgeAssets(config, homeStable);
          const dailyLossGuard = this.evaluateDailyLossGuard({
            state: current,
            risk,
            homeStable,
            allowedExecutionQuotes,
            walletTotalHome,
            nowMs: Date.now()
          });
          const nextRiskState = this.buildRuntimeRiskState({
            dailyLossGuard,
            homeStable
          });
          const riskStateChanged =
            JSON.stringify(current.riskState ?? null) !== JSON.stringify(nextRiskState);
          if (riskStateChanged) {
            current = {
              ...current,
              riskState: nextRiskState
            };
            this.save(current);
          }
          tickContext.walletTotalHome = walletTotalHome;
          const maxPositionPct = config?.derived.maxPositionPct ?? 1;
          tickContext.maxPositionPct = maxPositionPct;
          const managedPositions = this.getManagedPositions(current);
          const cautionManagedMinExposureHome = this.deriveManagedPositionMinCountableExposureHome(risk);
          const cautionPauseNewSymbolsMinExposurePct = this.deriveCautionPauseNewSymbolsMinExposurePct({
            risk,
            trigger: dailyLossGuard.trigger,
            haltExposureFloorPct: dailyLossGuard.profitGivebackHaltMinExposurePct
          });
          const cautionPauseNewSymbols =
            dailyLossGuard.state === "CAUTION" &&
            (dailyLossGuard.trigger !== "PROFIT_GIVEBACK" ||
              dailyLossGuard.managedExposurePct >= cautionPauseNewSymbolsMinExposurePct);
          const managedOpenSymbolsOnly = cautionPauseNewSymbols
            ? new Set(
                [...managedPositions.values()]
                  .filter(
                    (position) =>
                      isExecutionQuoteSymbol(position.symbol) &&
                      this.isManagedPositionCountable(position, cautionManagedMinExposureHome)
                  )
                  .map((position) => position.symbol.trim().toUpperCase())
              )
            : null;
          const cautionModeActive = dailyLossGuard.state === "CAUTION";

          const preDrawdownProtectionFingerprint = protectionFingerprint(current);
          current = this.evaluateProtectionLocks({
            state: current,
            risk,
            walletTotalHome
          });
          if (preDrawdownProtectionFingerprint !== protectionFingerprint(current)) {
            this.save(current);
          }

          const globalLockAfterDrawdown = this.getActiveGlobalProtectionLock(current);
          const effectiveRiskState = this.buildRuntimeRiskState({
            dailyLossGuard,
            homeStable,
            activeGlobalLock: globalLockAfterDrawdown
          });
          const effectiveRiskStateChanged =
            JSON.stringify(current.riskState ?? null) !== JSON.stringify(effectiveRiskState);
          if (effectiveRiskStateChanged) {
            current = {
              ...current,
              riskState: effectiveRiskState
            };
            this.save(current);
          }
          if (globalLockAfterDrawdown) {
            if (config?.advanced.autoCancelBotOrdersOnGlobalProtectionLock && config) {
              current = await this.cancelBotOwnedOpenOrders({
                config,
                state: current,
                orders: current.activeOrders,
                reason: `global-lock ${globalLockAfterDrawdown.type}`,
                details: {
                  lockType: globalLockAfterDrawdown.type,
                  lockReason: globalLockAfterDrawdown.reason,
                  lockExpiresAt: globalLockAfterDrawdown.expiresAt
                },
                maxCancels: 10
              });
              this.save(current);
            }

            const lockType = globalLockAfterDrawdown.type.trim().toUpperCase();
            const supportsUnwindOnly = lockType === "STOPLOSS_GUARD" || lockType === "MAX_DRAWDOWN";
            if (supportsUnwindOnly) {
              const managedForUnwind = [...this.getManagedPositions(current).values()]
                .filter((position) => position.netQty > 0 && isExecutionQuoteSymbol(position.symbol))
                .sort((left, right) => right.costQuote - left.costQuote);
              const unwindCooldownMs = this.deriveGlobalLockUnwindCooldownMs(risk);
              const unwindFraction = Number((0.2 + (1 - Math.max(0, Math.min(100, risk)) / 100) * 0.5).toFixed(4)); // 70% -> 20%

              for (const position of managedForUnwind) {
                const recentUnwind = current.decisions.find((decision) => {
                  if (decision.kind !== "TRADE") return false;
                  const details = decision.details as Record<string, unknown> | undefined;
                  if (details?.reason !== "global-lock-unwind") return false;
                  if (typeof details?.symbol !== "string" || details.symbol.trim().toUpperCase() !== position.symbol) return false;
                  const ts = Date.parse(decision.ts);
                  return Number.isFinite(ts) && Date.now() - ts < unwindCooldownMs;
                });
                if (recentUnwind) {
                  continue;
                }

                const baseAsset = getExecutionBaseFromSymbol(position.symbol);
                if (!baseAsset) continue;
                const baseFree = balances.find((b) => b.asset.toUpperCase() === baseAsset.toUpperCase())?.free ?? 0;
                if (!Number.isFinite(baseFree) || baseFree <= 0) continue;

                const desiredQty = Math.min(position.netQty, baseFree) * unwindFraction;
                if (!Number.isFinite(desiredQty) || desiredQty <= 0) continue;

                const sellCheck = await this.marketData.validateMarketOrderQty(position.symbol, desiredQty);
                let sellQtyStr = sellCheck.ok ? sellCheck.normalizedQty : undefined;
                if (!sellQtyStr && sellCheck.requiredQty) {
                  const requiredQty = Number.parseFloat(sellCheck.requiredQty);
                  if (Number.isFinite(requiredQty) && requiredQty > 0 && requiredQty <= Math.min(position.netQty, baseFree) + 1e-8) {
                    sellQtyStr = sellCheck.requiredQty;
                  }
                }
                if (!sellQtyStr) continue;

                const sellQty = Number.parseFloat(sellQtyStr);
                if (!Number.isFinite(sellQty) || sellQty <= 0) continue;

                setLiveOperation({
                  stage: "global-lock-unwind-market-sell",
                  symbol: position.symbol,
                  side: "SELL",
                  asset: baseAsset,
                  required: sellQty
                });
                const unwindFunds = await ensureFundsBeforeOrder({
                  asset: baseAsset,
                  required: sellQty
                });
                if (!unwindFunds.ok) continue;

                const unwindRes = await this.trading.placeSpotMarketOrder({
                  symbol: position.symbol,
                  side: "SELL",
                  quantity: sellQtyStr
                });
                persistLiveTrade({
                  symbol: position.symbol,
                  side: "SELL",
                  requestedQty: sellQtyStr,
                  fallbackQty: sellQty,
                  response: unwindRes,
                  reason: "global-lock-unwind",
                  details: {
                    reason: "global-lock-unwind",
                    lockType,
                    lockReason: globalLockAfterDrawdown.reason,
                    lockExpiresAt: globalLockAfterDrawdown.expiresAt,
                    symbol: position.symbol,
                    unwindFraction,
                    unwindCooldownMs,
                    managedPositionQty: Number(position.netQty.toFixed(8)),
                    managedPositionCost: Number(position.costQuote.toFixed(8))
                  }
                });
                return;
              }
            }

            const summary = `Skip: Protection lock ${globalLockAfterDrawdown.type} (GLOBAL)`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        stage: "protection-lock",
                        lock: globalLockAfterDrawdown
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            this.save(next);
            return;
          }

          const postProtectionBlockedReason = this.isSymbolBlocked(candidateSymbol, current);
          if (postProtectionBlockedReason) {
            const summary = `Skip ${candidateSymbol}: ${postProtectionBlockedReason}`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
            } satisfies BotState;
            this.save(next);
            return;
          }

          const universeSnapshot = await this.universe.getLatest().catch(() => null);
          const exposureEligibleCandidate = this.pickExposureEligibleCandidate({
            preferredCandidate: selectedCandidate,
            snapshotCandidates: universeSnapshot?.candidates ?? [],
            state: current,
            allowedExecutionQuotes,
            traderRegion,
            neverTradeSymbols: config?.advanced.neverTradeSymbols ?? [],
            excludeStableStablePairs: config?.advanced.excludeStableStablePairs ?? true,
            enforceRegionPolicy: config?.advanced.enforceRegionPolicy ?? true,
            balances,
            walletTotalHome,
            maxPositionPct
          });
          if (exposureEligibleCandidate && exposureEligibleCandidate.symbol !== candidateSymbol) {
            candidateSymbol = exposureEligibleCandidate.symbol;
            selectedCandidate = exposureEligibleCandidate;
            tickContext.candidateSymbol = candidateSymbol;
            tickContext.candidate = selectedCandidate;
          }

          const notionalCap = config?.advanced.liveTradeNotionalCap ?? 25;
          const slippageBuffer = config?.advanced.liveTradeSlippageBuffer ?? 1.005;
          const bufferFactor = Number.isFinite(slippageBuffer) && slippageBuffer > 0 ? slippageBuffer : 1;
          const minQuoteLiquidityHome = this.deriveMinQuoteLiquidityHome(config, risk);
          const feasibleCandidateSelection = await this.pickFeasibleLiveCandidate({
            preferredCandidate: selectedCandidate,
            snapshotCandidates: universeSnapshot?.candidates ?? [],
            state: current,
            homeStable,
            allowedExecutionQuotes,
            traderRegion,
            neverTradeSymbols: config?.advanced.neverTradeSymbols ?? [],
            excludeStableStablePairs: config?.advanced.excludeStableStablePairs ?? true,
            enforceRegionPolicy: config?.advanced.enforceRegionPolicy ?? true,
            balances,
            walletTotalHome,
            risk,
            maxPositionPct,
            minQuoteLiquidityHome,
            notionalCap,
            capitalNotionalCapMultiplier: capitalProfile.notionalCapMultiplier,
            bufferFactor,
            managedOpenSymbolsOnly
          });
          if (!feasibleCandidateSelection.candidate) {
            const nowMs = Date.now();
            const noFeasibleRecoveryPolicy = this.deriveNoFeasibleRecoveryPolicy({
              state: current,
              reason: feasibleCandidateSelection.reason,
              risk,
              nowMs
            });
            const maxExecutionQuoteSpendableHome = await this.deriveMaxExecutionQuoteSpendableHome({
              config: config ?? undefined,
              balances,
              allowedExecutionQuotes,
              walletTotalHome,
              capitalProfile,
              risk,
              homeStable,
              bridgeAssets: executionBridgeAssets
            });
            const noFeasibleRecoveryGate = this.shouldAttemptNoFeasibleRecovery({
              policyEnabled: noFeasibleRecoveryPolicy.enabled,
              maxExecutionQuoteSpendableHome,
              quoteLiquidityThresholdHome: minQuoteLiquidityHome,
              rejectionSamples: feasibleCandidateSelection.rejectionSamples
            });
            let noFeasibleRecoveryAttempt:
              | {
                  symbol?: string;
                  reason: string;
                }
              | null = null;
            if (noFeasibleRecoveryGate.attempt) {
              const managedPositions = [...this.getManagedPositions(current).values()]
                .filter((position) => {
                  if (position.netQty <= 0) return false;
                  if (!isExecutionQuoteSymbol(position.symbol)) return false;
                  return this.isSymbolBlocked(position.symbol, current) === null;
                })
                .sort((left, right) => right.costQuote - left.costQuote);
              if (managedPositions.length === 0) {
                noFeasibleRecoveryAttempt = {
                  reason: "No eligible managed positions available for recovery sell"
                };
              }
              const recoverySellFraction = this.deriveNoFeasibleRecoverySellFraction(risk);
              for (const position of managedPositions) {
                const baseAsset = getExecutionBaseFromSymbol(position.symbol);
                if (!baseAsset) continue;
                const baseFree = getAssetFree(baseAsset);
                if (!Number.isFinite(baseFree) || baseFree <= 0) {
                  noFeasibleRecoveryAttempt = {
                    symbol: position.symbol,
                    reason: `No free ${baseAsset} balance for recovery sell`
                  };
                  continue;
                }
                const desiredQty = Math.min(position.netQty, baseFree) * recoverySellFraction;
                if (!Number.isFinite(desiredQty) || desiredQty <= 0) {
                  noFeasibleRecoveryAttempt = {
                    symbol: position.symbol,
                    reason: "Recovery sell qty is non-positive after free-balance clamp"
                  };
                  continue;
                }
                const sellCheck = await this.marketData.validateMarketOrderQty(position.symbol, desiredQty);
                let sellQtyStr = sellCheck.ok ? sellCheck.normalizedQty : undefined;
                if (!sellQtyStr && sellCheck.requiredQty) {
                  const requiredQty = Number.parseFloat(sellCheck.requiredQty);
                  if (
                    Number.isFinite(requiredQty) &&
                    requiredQty > 0 &&
                    requiredQty <= Math.min(position.netQty, baseFree) + 1e-8
                  ) {
                    sellQtyStr = sellCheck.requiredQty;
                  }
                }
                if (!sellQtyStr) {
                  noFeasibleRecoveryAttempt = {
                    symbol: position.symbol,
                    reason: sellCheck.reason ?? "Recovery sell min-order validation failed"
                  };
                  continue;
                }

                const sellQty = Number.parseFloat(sellQtyStr);
                if (!Number.isFinite(sellQty) || sellQty <= 0) continue;

                setLiveOperation({
                  stage: "no-feasible-liquidity-recovery-market-sell",
                  symbol: position.symbol,
                  side: "SELL",
                  asset: baseAsset,
                  required: sellQty
                });
                const recoveryFunds = await ensureFundsBeforeOrder({
                  asset: baseAsset,
                  required: sellQty
                });
                if (!recoveryFunds.ok) {
                  noFeasibleRecoveryAttempt = {
                    symbol: position.symbol,
                    reason: `No spendable ${baseAsset} for recovery sell (need ${sellQty.toFixed(8)}, free ${recoveryFunds.available.toFixed(8)})`
                  };
                  continue;
                }

                const sellRes = await this.trading.placeSpotMarketOrder({
                  symbol: position.symbol,
                  side: "SELL",
                  quantity: sellQtyStr
                });
                persistLiveTrade({
                  symbol: position.symbol,
                  side: "SELL",
                  requestedQty: sellQtyStr,
                  fallbackQty: sellQty,
                  response: sellRes,
                  reason: "no-feasible-liquidity-recovery",
                  details: {
                    mode: "liquidity-recovery",
                    triggerReason: feasibleCandidateSelection.reason ?? null,
                    quoteFree: Number(quoteFree.toFixed(8)),
                    quoteLiquidityThreshold: Number(noFeasibleRecoveryGate.thresholdHome.toFixed(8)),
                    maxExecutionQuoteSpendableHome: Number(maxExecutionQuoteSpendableHome.toFixed(8)),
                    recoverySellFraction,
                    managedPositionCost: Number(position.costQuote.toFixed(8)),
                    managedPositionQty: Number(position.netQty.toFixed(8)),
                    noFeasibleRecentCount: noFeasibleRecoveryPolicy.recentCount,
                    noFeasibleThreshold: noFeasibleRecoveryPolicy.threshold,
                    noFeasibleCooldownMs: noFeasibleRecoveryPolicy.cooldownMs
                  }
                });
                return;
              }
            }

            const primaryRejectionSample = feasibleCandidateSelection.rejectionSamples[0];
            const primaryRejectionSymbol = primaryRejectionSample?.symbol?.trim().toUpperCase() ?? "";
            const primaryRejectionStage = primaryRejectionSample?.stage ?? "";
            const primaryRejectionReason = primaryRejectionSample?.reason ?? "";
            const noFeasibleSizingRejectCooldownMs =
              primaryRejectionSymbol && feasibleCandidateSelection.sizingRejected > 0
                ? this.deriveNoFeasibleSizingRejectCooldownMs({
                    risk,
                    stage: primaryRejectionStage,
                    reason: primaryRejectionReason
                  })
                : 0;

            const summary = `Skip: ${feasibleCandidateSelection.reason ?? "No feasible live candidate"}`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        rejectedBySizing: feasibleCandidateSelection.sizingRejected,
                        capitalTier: capitalProfile.tier,
                        walletTotalHome: Number(walletTotalHome.toFixed(6)),
                        maxPositionPct,
                        maxSymbolNotional: Number((walletTotalHome * (maxPositionPct / 100)).toFixed(6)),
                        quoteFree: Number(quoteFree.toFixed(6)),
                        liveTradeNotionalCap: Number.isFinite(notionalCap) ? notionalCap : null,
                        bufferFactor,
                        rejectionSamples: feasibleCandidateSelection.rejectionSamples,
                        primaryRejectionCooldownMs:
                          noFeasibleSizingRejectCooldownMs > 0 ? noFeasibleSizingRejectCooldownMs : undefined,
                        noFeasibleRecovery: {
                          enabled: noFeasibleRecoveryPolicy.enabled,
                          recentCount: noFeasibleRecoveryPolicy.recentCount,
                          threshold: noFeasibleRecoveryPolicy.threshold,
                          cooldownMs: noFeasibleRecoveryPolicy.cooldownMs,
                          windowMs: noFeasibleRecoveryPolicy.windowMs,
                          gateAttempted: noFeasibleRecoveryGate.attempt,
                          pressureDetected: noFeasibleRecoveryGate.pressureDetected,
                          quoteLiquidityThreshold: Number(noFeasibleRecoveryGate.thresholdHome.toFixed(6)),
                          maxExecutionQuoteSpendableHome: Number(maxExecutionQuoteSpendableHome.toFixed(6)),
                          attemptedSymbol: noFeasibleRecoveryAttempt?.symbol ?? null,
                          attemptedReason: noFeasibleRecoveryAttempt?.reason ?? null
                        }
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200)
            } satisfies BotState;
            const nextWithSizingCooldown =
              primaryRejectionSymbol && noFeasibleSizingRejectCooldownMs > 0
                ? this.upsertProtectionLock(next, {
                    type: "COOLDOWN",
                    scope: "SYMBOL",
                    symbol: primaryRejectionSymbol,
                    reason: `No-feasible sizing reject (${Math.round(noFeasibleSizingRejectCooldownMs / 1000)}s)`,
                    expiresAt: new Date(Date.now() + noFeasibleSizingRejectCooldownMs).toISOString(),
                    details: {
                      category: "NO_FEASIBLE_SIZING_REJECT",
                      stage: primaryRejectionStage,
                      reason: primaryRejectionReason,
                      cooldownMs: noFeasibleSizingRejectCooldownMs
                    }
                  })
                : next;
            this.save(nextWithSizingCooldown);
            return;
          }

          if (feasibleCandidateSelection.candidate.symbol !== candidateSymbol) {
            candidateSymbol = feasibleCandidateSelection.candidate.symbol;
            selectedCandidate = feasibleCandidateSelection.candidate;
            tickContext.candidateSymbol = candidateSymbol;
            tickContext.candidate = selectedCandidate;
          }

          const rules = await this.marketData.getSymbolRules(candidateSymbol);
          const pairPolicyReason = getPairPolicyBlockReason({
            symbol: candidateSymbol,
            baseAsset: rules.baseAsset,
            quoteAsset: rules.quoteAsset,
            traderRegion: config?.basic.traderRegion ?? "NON_EEA",
            neverTradeSymbols: config?.advanced.neverTradeSymbols,
            excludeStableStablePairs: config?.advanced.excludeStableStablePairs,
            enforceRegionPolicy: config?.advanced.enforceRegionPolicy
          });
          if (pairPolicyReason) {
            const summary = `Skip ${candidateSymbol}: ${pairPolicyReason}`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
            } satisfies BotState;
            this.save(next);
            return;
          }
          const candidateQuoteAsset = rules.quoteAsset.trim().toUpperCase();
          if (!allowedExecutionQuotes.has(candidateQuoteAsset)) {
            const summary = `Skip ${candidateSymbol}: Quote asset ${candidateQuoteAsset} is not enabled for execution`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
            } satisfies BotState;
            this.save(next);
            return;
          }
          quoteFree = balances.find((b) => b.asset.trim().toUpperCase() === candidateQuoteAsset)?.free ?? 0;
          if (!Number.isFinite(quoteFree) || quoteFree < 0) {
            const summary = `Skip ${candidateSymbol}: Invalid ${candidateQuoteAsset} balance`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            this.save(next);
            return;
          }
          const candidateBaseAsset = rules.baseAsset.toUpperCase();
          const tradeMode = config?.basic.tradeMode ?? "SPOT";
          const configuredGridEnabled = Boolean(config?.derived.allowGrid && tradeMode === "SPOT_GRID");
          const managedOpenHomeSymbols = [...managedPositions.values()].filter(
            (position) => position.netQty > 0 && isExecutionQuoteSymbol(position.symbol)
          );
          const minCountableExposureHome = this.deriveManagedPositionMinCountableExposureHome(risk);
          const countableOpenHomePositions = managedOpenHomeSymbols.filter((position) =>
            this.isManagedPositionCountable(position, minCountableExposureHome)
          );
          const selectedRegime = this.buildRegimeSnapshot(selectedCandidate ?? null);
          const selectedStrategy = this.buildAdaptiveStrategyScores(selectedCandidate ?? null, selectedRegime.label);
          const executionLane = this.resolveExecutionLane({
            tradeMode,
            gridEnabled: configuredGridEnabled,
            risk,
            riskState: dailyLossGuard.state,
            managedOpenPositions: countableOpenHomePositions.length,
            managedExposurePct: Number.isFinite(dailyLossGuard.managedExposurePct) ? dailyLossGuard.managedExposurePct : 0,
            regime: selectedRegime,
            strategy: selectedStrategy
          });
          tickContext.executionLane = executionLane;
          const gridEnabled = configuredGridEnabled && executionLane !== "MARKET";

          const maxOpenPositions = Math.max(1, config?.derived.maxOpenPositions ?? 1);
          tickContext.maxOpenPositions = maxOpenPositions;
          const candidateIsOpen = (managedPositions.get(candidateSymbol)?.netQty ?? 0) > 0;
          if (cautionPauseNewSymbols && !candidateIsOpen) {
            const summary = `Skip ${candidateSymbol}: Daily loss caution (new symbols paused)`;
            const baseCooldownMs = Math.max(this.deriveNoActionSymbolCooldownMs(risk), this.deriveCautionEntryPauseCooldownMs(risk));
            const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
            const cooldownMs = cooldown.cooldownMs;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        stage: "daily-loss-caution",
                        candidateSymbol,
                        riskState: dailyLossGuard.state,
                        trigger: dailyLossGuard.trigger,
                        dailyRealizedPnl: dailyLossGuard.dailyRealizedPnl,
                        maxDailyLossAbs: dailyLossGuard.maxDailyLossAbs,
                        maxDailyLossPct: dailyLossGuard.maxDailyLossPct,
                        managedExposurePct: dailyLossGuard.managedExposurePct,
                        cautionManagedSymbolOnlyMinExposurePct: cautionPauseNewSymbolsMinExposurePct,
                        cautionPauseNewSymbolsMinExposurePct,
                        lookbackMs: dailyLossGuard.lookbackMs,
                        windowStart: dailyLossGuard.windowStartIso,
                        cooldownMs
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            const nextWithCooldown = this.upsertProtectionLock(next, {
              type: "COOLDOWN",
              scope: "SYMBOL",
              symbol: candidateSymbol,
              reason: `Daily loss caution pause (${Math.round(cooldownMs / 1000)}s)`,
              expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
              details: {
                category: "DAILY_LOSS_CAUTION_NEW_SYMBOL",
                cooldownMs,
                riskState: dailyLossGuard.state
              }
            });
            this.save(nextWithCooldown);
            return;
          }

          const rebalanceSellCooldownMs = config?.advanced.liveTradeRebalanceSellCooldownMs ?? 900_000;
          const takeProfitPct = 0.35 + (risk / 100) * 0.9; // 0.35% .. 1.25%
          const stopLossPct = -(0.8 + (risk / 100) * 1.2); // -0.8% .. -2.0%
          const maxSymbolConcentrationPct = this.deriveMaxSymbolConcentrationPct(risk);
          const positionExitBridgeAssets = resolveRouteBridgeAssets(config, homeStable);

          for (const position of managedOpenHomeSymbols) {
            const baseAsset = getExecutionBaseFromSymbol(position.symbol);
            if (!baseAsset) continue;
            if (this.isSymbolBlocked(position.symbol, current)) continue;
            const baseFree = balances.find((b) => b.asset.toUpperCase() === baseAsset.toUpperCase())?.free ?? 0;
            if (!Number.isFinite(baseFree) || baseFree <= 0) continue;

            if (Number.isFinite(rebalanceSellCooldownMs) && rebalanceSellCooldownMs > 0 && position.lastBuyTs) {
              const lastBuyAt = Date.parse(position.lastBuyTs);
              if (Number.isFinite(lastBuyAt) && Date.now() - lastBuyAt < rebalanceSellCooldownMs) {
                continue;
              }
            }

            const avgEntryPrice = position.netQty > 0 ? position.costQuote / position.netQty : Number.NaN;
            if (!Number.isFinite(avgEntryPrice) || avgEntryPrice <= 0) continue;

            const nowPriceStr = await this.marketData.getTickerPrice(position.symbol);
            const nowPrice = Number.parseFloat(nowPriceStr);
            if (!Number.isFinite(nowPrice) || nowPrice <= 0) continue;

            const positionCandidate =
              (universeSnapshot?.candidates ?? []).find(
                (candidate) => candidate.symbol.trim().toUpperCase() === position.symbol.trim().toUpperCase()
              ) ?? null;
            const positionRegime = this.buildRegimeSnapshot(positionCandidate);
            const adjustedStopLossPct = this.getRegimeAdjustedStopLossPct({
              risk,
              baseStopLossPct: stopLossPct,
              regime: positionRegime
            });
            const pnlPct = ((nowPrice - avgEntryPrice) / avgEntryPrice) * 100;
            const tradableQty = Math.min(position.netQty, baseFree);
            const concentrationExposureHome = await this.estimateAssetValueInHome(
              baseAsset,
              tradableQty,
              homeStable,
              positionExitBridgeAssets
            );
            const concentrationExposurePct =
              walletTotalHome > 0 && Number.isFinite(concentrationExposureHome ?? Number.NaN)
                ? ((concentrationExposureHome ?? 0) / walletTotalHome) * 100
                : 0;
            const shouldConcentrationTrim = concentrationExposurePct > maxSymbolConcentrationPct;
            const concentrationTrimFraction = shouldConcentrationTrim
              ? this.deriveConcentrationTrimFraction({
                  risk,
                  exposurePct: concentrationExposurePct,
                  capPct: maxSymbolConcentrationPct,
                  pnlPct
                })
              : 0;
            const shouldTakeProfit = pnlPct >= takeProfitPct;
            const shouldStopLoss = pnlPct <= adjustedStopLossPct;
            if (!shouldTakeProfit && !shouldStopLoss && !shouldConcentrationTrim) continue;
            const exitReason = shouldStopLoss
              ? "stop-loss-exit"
              : shouldTakeProfit
                ? "take-profit-exit"
                : "concentration-rebalance-exit";

            const sellQtyDesired =
              shouldConcentrationTrim && !shouldTakeProfit && !shouldStopLoss
                ? Math.min(position.netQty, baseFree) * concentrationTrimFraction
                : Math.min(position.netQty, baseFree);
            if (!Number.isFinite(sellQtyDesired) || sellQtyDesired <= 0) continue;

            const sellCheck = await this.marketData.validateMarketOrderQty(position.symbol, sellQtyDesired);
            let sellQtyStr = sellCheck.ok ? sellCheck.normalizedQty : undefined;
            if (!sellQtyStr && sellCheck.requiredQty) {
              const requiredQty = Number.parseFloat(sellCheck.requiredQty);
              if (Number.isFinite(requiredQty) && requiredQty > 0 && requiredQty <= sellQtyDesired) {
                sellQtyStr = sellCheck.requiredQty;
              }
            }
            if (!sellQtyStr) continue;

            const sellQty = Number.parseFloat(sellQtyStr);
            if (!Number.isFinite(sellQty) || sellQty <= 0) continue;

            setLiveOperation({
              stage: "position-exit-market-sell",
              symbol: position.symbol,
              side: "SELL",
              asset: baseAsset,
              required: sellQty
            });
            const exitFunds = await ensureFundsBeforeOrder({ asset: baseAsset, required: sellQty });
            if (!exitFunds.ok) {
              if (this.shouldAttemptBalanceDeltaSellFallback(sellQty, exitFunds.available)) {
                const adjustedCheck = await this.marketData.validateMarketOrderQty(position.symbol, exitFunds.available);
                let adjustedQtyStr = adjustedCheck.ok ? adjustedCheck.normalizedQty : undefined;
                if (!adjustedQtyStr && adjustedCheck.requiredQty) {
                  const requiredQty = Number.parseFloat(adjustedCheck.requiredQty);
                  if (Number.isFinite(requiredQty) && requiredQty > 0 && requiredQty <= exitFunds.available) {
                    adjustedQtyStr = adjustedCheck.requiredQty;
                  }
                }

                const adjustedQty = adjustedQtyStr ? Number.parseFloat(adjustedQtyStr) : Number.NaN;
                if (
                  adjustedQtyStr &&
                  Number.isFinite(adjustedQty) &&
                  adjustedQty > 0 &&
                  adjustedQty <= exitFunds.available + 1e-8
                ) {
                  setLiveOperation({
                    stage: "position-exit-market-sell",
                    symbol: position.symbol,
                    side: "SELL",
                    asset: baseAsset,
                    required: adjustedQty
                  });
                  const sellRes = await this.trading.placeSpotMarketOrder({
                    symbol: position.symbol,
                    side: "SELL",
                    quantity: adjustedQtyStr
                  });
                  persistLiveTrade({
                    symbol: position.symbol,
                    side: "SELL",
                    requestedQty: adjustedQtyStr,
                    fallbackQty: adjustedQty,
                    response: sellRes,
                    reason: exitReason,
                    details: {
                      mode: "position-exit",
                      partialExitDueToBalanceDelta: true,
                      originalRequiredQty: Number(sellQty.toFixed(8)),
                      availableQty: Number(exitFunds.available.toFixed(8)),
                      pnlPct: Number(pnlPct.toFixed(4)),
                      concentrationExposurePct: Number(concentrationExposurePct.toFixed(4)),
                      maxSymbolConcentrationPct: Number(maxSymbolConcentrationPct.toFixed(4)),
                      concentrationTrimFraction:
                        shouldConcentrationTrim && !shouldTakeProfit && !shouldStopLoss
                          ? Number(concentrationTrimFraction.toFixed(4))
                          : null,
                      avgEntryPrice: Number(avgEntryPrice.toFixed(8)),
                      marketPrice: Number(nowPrice.toFixed(8)),
                      takeProfitPct: Number(takeProfitPct.toFixed(4)),
                      stopLossPct: Number(adjustedStopLossPct.toFixed(4)),
                      regime: positionRegime
                    }
                  });
                  return;
                }
              }

              current = buildInsufficientFundsSkipState({
                symbol: position.symbol,
                stage: "position-exit-market-sell",
                side: "SELL",
                asset: baseAsset,
                required: sellQty,
                available: exitFunds.available,
                details: {
                  avgEntryPrice: Number(avgEntryPrice.toFixed(8)),
                  marketPrice: Number(nowPrice.toFixed(8)),
                  pnlPct: Number(pnlPct.toFixed(4)),
                  takeProfitPct: Number(takeProfitPct.toFixed(4)),
                  stopLossPct: Number(adjustedStopLossPct.toFixed(4)),
                  regime: positionRegime,
                  refreshedBalances: exitFunds.refreshed
                }
              });
              this.save(current);
              continue;
            }

            const sellRes = await this.trading.placeSpotMarketOrder({
              symbol: position.symbol,
              side: "SELL",
              quantity: sellQtyStr
            });
            persistLiveTrade({
              symbol: position.symbol,
              side: "SELL",
              requestedQty: sellQtyStr,
              fallbackQty: sellQty,
              response: sellRes,
              reason: exitReason,
              details: {
                mode: "position-exit",
                concentrationExposurePct: Number(concentrationExposurePct.toFixed(4)),
                maxSymbolConcentrationPct: Number(maxSymbolConcentrationPct.toFixed(4)),
                concentrationTrimFraction:
                  shouldConcentrationTrim && !shouldTakeProfit && !shouldStopLoss
                    ? Number(concentrationTrimFraction.toFixed(4))
                    : null,
                pnlPct: Number(pnlPct.toFixed(4)),
                avgEntryPrice: Number(avgEntryPrice.toFixed(8)),
                marketPrice: Number(nowPrice.toFixed(8)),
                takeProfitPct: Number(takeProfitPct.toFixed(4)),
                stopLossPct: Number(adjustedStopLossPct.toFixed(4)),
                regime: positionRegime
              }
            });
            return;
          }

          if ((universeSnapshot?.candidates?.length ?? 0) > 0) {
            const protectedHomeBaseAssets = new Set<string>();
            for (const order of current.activeOrders) {
              const symbol = order.symbol.trim().toUpperCase();
              const baseAsset = getExecutionBaseFromSymbol(symbol);
              if (baseAsset) protectedHomeBaseAssets.add(baseAsset);
            }
            for (const position of managedOpenHomeSymbols) {
              const baseAsset = getExecutionBaseFromSymbol(position.symbol);
              if (baseAsset) protectedHomeBaseAssets.add(baseAsset);
            }

            const sweepBootstrapMode = protectedHomeBaseAssets.size === 0 && managedOpenHomeSymbols.length === 0;
            if (!sweepBootstrapMode) {
              protectedHomeBaseAssets.add(candidateBaseAsset);
            }

            const sweepFloorPct = risk >= 80 ? 0.002 : risk >= 50 ? 0.0035 : 0.006;
            const minSweepTargetHome = config?.advanced.conversionTopUpMinTarget ?? 5;
            const sweepMinValueHomeRaw = walletTotalHome * sweepFloorPct;
            const sweepCapMultiplier = risk >= 80 ? 2 : risk >= 50 ? 3 : 4; // caps at 2x/3x/4x min target
            const sweepMinValueHome = Math.max(minSweepTargetHome, Math.min(sweepMinValueHomeRaw, minSweepTargetHome * sweepCapMultiplier));
            const sourceBridgeAssets = resolveRouteBridgeAssets(config, homeStable);
            const unmanagedExposureCapPct = this.toRounded(12 + (risk / 100) * 38, 2); // 12% -> 50%
            const unmanagedExposureCapHome = walletTotalHome * (unmanagedExposureCapPct / 100);

            const valuedNonHomeBalances: Array<{
              asset: string;
              free: number;
              estimatedValueHome: number;
              sourceHomeSymbol: string;
              change24hPct: number | null;
              isProtected: boolean;
            }> = [];

            for (const balance of balances) {
              const asset = balance.asset.trim().toUpperCase();
              const free = Number.isFinite(balance.free) ? balance.free : 0;
              if (!asset || asset === homeStable || free <= 0) continue;

              const estimatedValueHome = await this.estimateAssetValueInHome(asset, free, homeStable, sourceBridgeAssets);
              if (!Number.isFinite(estimatedValueHome ?? Number.NaN) || (estimatedValueHome ?? 0) <= 0) continue;

              const sourceHomeSymbol = `${asset}${homeStable}`;
              const marketCandidate = (universeSnapshot?.candidates ?? []).find(
                (candidate) => candidate.symbol.trim().toUpperCase() === sourceHomeSymbol
              );
              const change24hPct = typeof marketCandidate?.priceChangePct24h === "number" ? marketCandidate.priceChangePct24h : null;

              valuedNonHomeBalances.push({
                asset,
                free,
                estimatedValueHome: estimatedValueHome ?? 0,
                sourceHomeSymbol,
                change24hPct,
                isProtected: protectedHomeBaseAssets.has(asset)
              });
            }

            const unmanagedNonHomeValue = valuedNonHomeBalances.reduce((sum, item) => {
              return item.isProtected ? sum : sum + item.estimatedValueHome;
            }, 0);
            const unmanagedExposurePct = walletTotalHome > 0 ? (unmanagedNonHomeValue / walletTotalHome) * 100 : 0;
            const unmanagedExposureOverCap = unmanagedNonHomeValue > unmanagedExposureCapHome + minSweepTargetHome * 0.5;

            const staleSources: Array<{
              asset: string;
              free: number;
              estimatedValueHome: number;
              sourceHomeSymbol: string;
              change24hPct: number | null;
              reason: string;
              category: "stale" | "dust" | "rebalance";
            }> = [];

            for (const valued of valuedNonHomeBalances) {
              if (valued.isProtected) continue;
              const valueHome = valued.estimatedValueHome;
              const isDustBand = valueHome >= minSweepTargetHome && valueHome < sweepMinValueHome;
              if (valueHome < minSweepTargetHome) continue;

              const weakTrend = valued.change24hPct === null || valued.change24hPct <= -0.35;
              const eligible = unmanagedExposureOverCap ? true : isDustBand ? true : valueHome >= sweepMinValueHome ? weakTrend : false;
              if (!eligible) continue;

              staleSources.push({
                asset: valued.asset,
                free: valued.free,
                estimatedValueHome: valueHome,
                sourceHomeSymbol: valued.sourceHomeSymbol,
                change24hPct: valued.change24hPct,
                category: unmanagedExposureOverCap ? "rebalance" : isDustBand ? "dust" : "stale",
                reason: unmanagedExposureOverCap
                  ? `unmanaged exposure ${unmanagedExposurePct.toFixed(2)}% > cap ${unmanagedExposureCapPct.toFixed(2)}%`
                  : isDustBand
                    ? "dust cleanup"
                    : valued.change24hPct === null
                      ? "weak trend (no 24h data)"
                      : `24h change ${valued.change24hPct.toFixed(2)}%`
              });
            }

            staleSources.sort((a, b) => b.estimatedValueHome - a.estimatedValueHome);

            for (const source of staleSources) {
              if (Number.isFinite(rebalanceSellCooldownMs) && rebalanceSellCooldownMs > 0) {
                const hasRecentHomeBuy = current.orderHistory.some((order) => {
                  if (order.symbol !== source.sourceHomeSymbol) return false;
                  if (order.side !== "BUY") return false;
                  if (order.status !== "FILLED" && order.status !== "NEW") return false;
                  const ts = Date.parse(order.ts);
                  return Number.isFinite(ts) && Date.now() - ts < rebalanceSellCooldownMs;
                });
                if (hasRecentHomeBuy) continue;

                const hasRecentSweepConversion = current.decisions.some((decision) => {
                  if (decision.kind !== "TRADE") return false;
                  const details = decision.details as Record<string, unknown> | undefined;
                  if (typeof details?.mode !== "string" || details.mode !== "wallet-sweep") return false;
                  if (typeof details?.sourceAsset !== "string" || details.sourceAsset.trim().toUpperCase() !== source.asset) return false;
                  const ts = Date.parse(decision.ts);
                  return Number.isFinite(ts) && Date.now() - ts < rebalanceSellCooldownMs;
                });
                if (hasRecentSweepConversion) continue;
              }

              const conversionTarget = Math.max(config?.advanced.conversionTopUpMinTarget ?? 5, source.estimatedValueHome * 0.98);
              setLiveOperation({
                stage: "wallet-sweep-conversion",
                symbol: source.sourceHomeSymbol,
                side: "SELL",
                asset: source.asset,
                required: source.free
              });
              const conversion = await this.conversionRouter.convertFromSourceToTarget({
                sourceAsset: source.asset,
                sourceFree: source.free,
                targetAsset: homeStable,
                requiredTarget: conversionTarget,
                allowTwoHop: true
              });
              if (!conversion.ok || conversion.legs.length === 0) continue;

              conversion.legs.forEach((leg, idx) => {
                const fallbackQty = Number.parseFloat(leg.quantity);
                persistLiveTrade({
                  symbol: leg.symbol,
                  side: leg.side,
                  requestedQty: leg.quantity,
                  fallbackQty: Number.isFinite(fallbackQty) && fallbackQty > 0 ? fallbackQty : 0,
                  response: leg.response,
                  reason: `wallet-sweep ${source.asset} -> ${homeStable}`,
                  details: {
                    mode: "wallet-sweep",
                    category: source.category,
                    sourceAsset: source.asset,
                    sourceHomeSymbol: source.sourceHomeSymbol,
                    sourceEstimatedValueHome: Number(source.estimatedValueHome.toFixed(6)),
                    sweepMinValueHome: Number(sweepMinValueHome.toFixed(6)),
                    unmanagedNonHomeValue: Number(unmanagedNonHomeValue.toFixed(6)),
                    unmanagedExposurePct: Number(unmanagedExposurePct.toFixed(6)),
                    unmanagedExposureCapPct: Number(unmanagedExposureCapPct.toFixed(6)),
                    unmanagedExposureCapHome: Number(unmanagedExposureCapHome.toFixed(6)),
                    change24hPct: source.change24hPct === null ? null : Number(source.change24hPct.toFixed(6)),
                    sweepReason: source.reason,
                    route: leg.route,
                    bridgeAsset: leg.bridgeAsset,
                    leg: idx + 1,
                    legs: conversion.legs.length,
                    obtainedTarget: Number(leg.obtainedTarget.toFixed(8))
                  }
                });
              });
              return;
            }
          }

          const cautionUnwindActive = this.shouldRunDailyLossCautionUnwind({
            guard: dailyLossGuard,
            risk
          });

          if (dailyLossGuard.active || cautionUnwindActive) {
            if (config?.advanced.autoCancelBotOrdersOnGlobalProtectionLock && config) {
              if (dailyLossGuard.active) {
                current = await this.cancelBotOwnedOpenOrders({
                  config,
                  state: current,
                  orders: current.activeOrders,
                  reason: "daily-loss-halt",
                  details: {
                    trigger: dailyLossGuard.trigger,
                    dailyRealizedPnl: dailyLossGuard.dailyRealizedPnl,
                    maxDailyLossAbs: dailyLossGuard.maxDailyLossAbs
                  },
                  maxCancels: 10
                });
                this.save(current);
              }
            }

            const managedForUnwind = [...this.getManagedPositions(current).values()].filter(
              (position) => position.netQty > 0 && isExecutionQuoteSymbol(position.symbol)
            );
            const unwindPolicy = dailyLossGuard.active
              ? this.deriveDailyLossHaltUnwindPolicy({
                  risk,
                  trigger: dailyLossGuard.trigger
                })
              : this.deriveDailyLossCautionUnwindPolicy({
                  risk,
                  trigger: dailyLossGuard.trigger
                });
            const baseUnwindCooldownMs = unwindPolicy.cooldownMs;
            const baseUnwindFraction = unwindPolicy.fraction;
            const unwindBridgeAssets = resolveRouteBridgeAssets(config, homeStable);
            const unwindCandidates = (
              await Promise.all(
                managedForUnwind.map(async (position) => {
                  const baseAsset = getExecutionBaseFromSymbol(position.symbol);
                  if (!baseAsset) return null;
                  const baseFree = balances.find((b) => b.asset.toUpperCase() === baseAsset.toUpperCase())?.free ?? 0;
                  if (!Number.isFinite(baseFree) || baseFree <= 0) return null;

                  const tradableQty = Math.min(position.netQty, baseFree);
                  if (!Number.isFinite(tradableQty) || tradableQty <= 0) return null;

                  let exposureHome = await this.estimateAssetValueInHome(baseAsset, tradableQty, homeStable, unwindBridgeAssets);
                  const quoteAsset = getExecutionQuoteFromSymbol(position.symbol);
                  if ((!Number.isFinite(exposureHome ?? Number.NaN) || (exposureHome ?? 0) <= 0) && quoteAsset === homeStable) {
                    exposureHome = position.costQuote;
                  }
                  const normalizedExposureHome = Number.isFinite(exposureHome ?? Number.NaN) ? Math.max(0, exposureHome ?? 0) : 0;
                  const exposurePct = walletTotalHome > 0 ? (normalizedExposureHome / walletTotalHome) * 100 : 0;

                  const avgEntry = position.netQty > 0 ? position.costQuote / position.netQty : Number.NaN;
                  let unrealizedPct: number | null = null;
                  if (Number.isFinite(avgEntry) && avgEntry > 0) {
                    try {
                      const markPrice = Number.parseFloat(await this.marketData.getTickerPrice(position.symbol));
                      if (Number.isFinite(markPrice) && markPrice > 0) {
                        unrealizedPct = ((markPrice - avgEntry) / avgEntry) * 100;
                      }
                    } catch {
                      unrealizedPct = null;
                    }
                  }

                  const unwindExecution = this.deriveDailyLossHaltUnwindExecution({
                    baseFraction: baseUnwindFraction,
                    baseCooldownMs: baseUnwindCooldownMs,
                    risk,
                    exposurePct,
                    unrealizedPct
                  });

                  return {
                    position,
                    baseAsset,
                    baseFree,
                    exposureHome: normalizedExposureHome,
                    exposurePct,
                    unrealizedPct,
                    unwindFraction: unwindExecution.fraction,
                    unwindCooldownMs: unwindExecution.cooldownMs,
                    unwindPriority: unwindExecution.priority
                  };
                })
              )
            )
              .filter((candidate): candidate is {
                position: ManagedPosition;
                baseAsset: string;
                baseFree: number;
                exposureHome: number;
                exposurePct: number;
                unrealizedPct: number | null;
                unwindFraction: number;
                unwindCooldownMs: number;
                unwindPriority: number;
              } => Boolean(candidate))
              .sort((left, right) => right.unwindPriority - left.unwindPriority);

            for (const unwindCandidate of unwindCandidates) {
              const unwindReason = dailyLossGuard.active ? "daily-loss-halt-unwind" : "daily-loss-caution-unwind";
              const recentUnwind = current.decisions.find((decision) => {
                if (decision.kind !== "TRADE") return false;
                const details = decision.details as Record<string, unknown> | undefined;
                if (details?.reason !== unwindReason) return false;
                if (
                  typeof details?.symbol !== "string" ||
                  details.symbol.trim().toUpperCase() !== unwindCandidate.position.symbol
                ) {
                  return false;
                }
                const ts = Date.parse(decision.ts);
                return Number.isFinite(ts) && Date.now() - ts < unwindCandidate.unwindCooldownMs;
              });
              if (recentUnwind) {
                continue;
              }

              const desiredQty = Math.min(unwindCandidate.position.netQty, unwindCandidate.baseFree) * unwindCandidate.unwindFraction;
              if (!Number.isFinite(desiredQty) || desiredQty <= 0) continue;

              const sellCheck = await this.marketData.validateMarketOrderQty(unwindCandidate.position.symbol, desiredQty);
              let sellQtyStr = sellCheck.ok ? sellCheck.normalizedQty : undefined;
              if (!sellQtyStr && sellCheck.requiredQty) {
                const requiredQty = Number.parseFloat(sellCheck.requiredQty);
                if (
                  Number.isFinite(requiredQty) &&
                  requiredQty > 0 &&
                  requiredQty <= Math.min(unwindCandidate.position.netQty, unwindCandidate.baseFree) + 1e-8
                ) {
                  sellQtyStr = sellCheck.requiredQty;
                }
              }
              if (!sellQtyStr) continue;

              const sellQty = Number.parseFloat(sellQtyStr);
              if (!Number.isFinite(sellQty) || sellQty <= 0) continue;

              setLiveOperation({
                stage: dailyLossGuard.active ? "daily-loss-halt-unwind-market-sell" : "daily-loss-caution-unwind-market-sell",
                symbol: unwindCandidate.position.symbol,
                side: "SELL",
                asset: unwindCandidate.baseAsset,
                required: sellQty
              });
              const unwindFunds = await ensureFundsBeforeOrder({
                asset: unwindCandidate.baseAsset,
                required: sellQty
              });
              if (!unwindFunds.ok) continue;

              if (!dailyLossGuard.active && config) {
                current = await this.cancelBotOwnedOpenOrders({
                  config,
                  state: current,
                  orders: current.activeOrders.filter((order) => order.symbol === unwindCandidate.position.symbol),
                  reason: `daily-loss-caution-unwind ${unwindCandidate.position.symbol}`,
                  details: {
                    trigger: dailyLossGuard.trigger,
                    managedExposurePct: dailyLossGuard.managedExposurePct,
                    symbol: unwindCandidate.position.symbol
                  },
                  maxCancels: 4
                });
                this.save(current);
              }

              const unwindRes = await this.trading.placeSpotMarketOrder({
                symbol: unwindCandidate.position.symbol,
                side: "SELL",
                quantity: sellQtyStr
              });
              persistLiveTrade({
                symbol: unwindCandidate.position.symbol,
                side: "SELL",
                requestedQty: sellQtyStr,
                fallbackQty: sellQty,
                response: unwindRes,
                reason: unwindReason,
                details: {
                  reason: unwindReason,
                  trigger: dailyLossGuard.trigger,
                  symbol: unwindCandidate.position.symbol,
                  unwindFraction: unwindCandidate.unwindFraction,
                  unwindCooldownMs: unwindCandidate.unwindCooldownMs,
                  baseUnwindFraction,
                  baseUnwindCooldownMs,
                  unwindPriority: unwindCandidate.unwindPriority,
                  exposureHome: Number(unwindCandidate.exposureHome.toFixed(8)),
                  exposurePct: Number(unwindCandidate.exposurePct.toFixed(8)),
                  unrealizedPct:
                    unwindCandidate.unrealizedPct === null ? null : Number(unwindCandidate.unrealizedPct.toFixed(8)),
                  managedExposurePct: dailyLossGuard.managedExposurePct,
                  profitGivebackHaltMinExposurePct: dailyLossGuard.profitGivebackHaltMinExposurePct,
                  managedPositionQty: Number(unwindCandidate.position.netQty.toFixed(8)),
                  managedPositionCost: Number(unwindCandidate.position.costQuote.toFixed(8))
                }
              });
              return;
            }

            if (!dailyLossGuard.active) {
              // CAUTION unwind is best-effort. If no unwind candidate is available, continue normal cycle.
            } else {
            const summary = this.buildDailyLossGuardSkipSummary(dailyLossGuard, homeStable);
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        stage: "daily-loss-guard",
                        dailyRealizedPnl: dailyLossGuard.dailyRealizedPnl,
                        maxDailyLossAbs: dailyLossGuard.maxDailyLossAbs,
                        maxDailyLossPct: dailyLossGuard.maxDailyLossPct,
                        trigger: dailyLossGuard.trigger,
                        peakDailyRealizedPnl: dailyLossGuard.peakDailyRealizedPnl,
                        profitGivebackAbs: dailyLossGuard.profitGivebackAbs,
                        profitGivebackPct: dailyLossGuard.profitGivebackPct,
                        profitGivebackActivationAbs: dailyLossGuard.profitGivebackActivationAbs,
                        profitGivebackCautionPct: dailyLossGuard.profitGivebackCautionPct,
                        profitGivebackHaltPct: dailyLossGuard.profitGivebackHaltPct,
                        profitGivebackHaltMinExposurePct: dailyLossGuard.profitGivebackHaltMinExposurePct,
                        managedExposurePct: dailyLossGuard.managedExposurePct,
                        lookbackMs: dailyLossGuard.lookbackMs,
                        windowStart: dailyLossGuard.windowStartIso,
                        candidateSymbol,
                        unwindFraction: baseUnwindFraction,
                        unwindCooldownMs: baseUnwindCooldownMs
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            this.save(next);
            return;
            }
          }

          if (countableOpenHomePositions.length >= maxOpenPositions && !candidateIsOpen) {
            const summary = `Skip ${candidateSymbol}: Max open positions reached (${maxOpenPositions})`;
            const baseCooldownMs = this.deriveNoActionSymbolCooldownMs(risk);
            const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
            const cooldownMs = cooldown.cooldownMs;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        openPositions: countableOpenHomePositions.length,
                        rawOpenPositions: managedOpenHomeSymbols.length,
                        maxOpenPositions,
                        minCountableExposureHome,
                        cooldownMs,
                        ...(cooldown.storm ? { storm: cooldown.storm } : {})
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            const nextWithCooldown = this.upsertProtectionLock(next, {
              type: "COOLDOWN",
              scope: "SYMBOL",
              symbol: candidateSymbol,
              reason: cooldown.storm
                ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                : `Cooldown after max-open-position skip (${Math.round(cooldownMs / 1000)}s)`,
              expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
              details: {
                category: "MAX_OPEN_POSITIONS",
                openPositions: countableOpenHomePositions.length,
                rawOpenPositions: managedOpenHomeSymbols.length,
                maxOpenPositions,
                minCountableExposureHome,
                cooldownMs,
                ...(cooldown.storm ? { storm: cooldown.storm } : {})
              }
            });
            this.save(nextWithCooldown);
            return;
          }

          const priceStr = await this.marketData.getTickerPrice(candidateSymbol);
          const price = Number.parseFloat(priceStr);
          if (!Number.isFinite(price) || price <= 0) {
            throw new Error(`Invalid ticker price: ${priceStr}`);
          }

          const takerFeeRate = Math.max(0, Number.parseFloat(process.env.BINANCE_TAKER_FEE_RATE ?? "0.001"));
          const spreadBufferRate = Math.max(0, Number.parseFloat(process.env.ESTIMATED_SPREAD_BUFFER_RATE ?? "0.0006"));
          const roundTripCostPct = ((takerFeeRate * 2) + spreadBufferRate + Math.max(0, bufferFactor - 1)) * 100;
          const estimatedEdgePct = this.estimateCandidateEdgePct(selectedCandidate);
          const riskNormalized = Math.max(0, Math.min(1, risk / 100));
          const riskAdjustedMinNetEdgePct = Math.max(0.05, capitalProfile.minNetEdgePct * (1 - riskNormalized * 0.65));
          if (Number.isFinite(estimatedEdgePct)) {
            const netEdgePct = (estimatedEdgePct ?? 0) - roundTripCostPct;
            if (!this.isFeeEdgeSufficient(netEdgePct, riskAdjustedMinNetEdgePct)) {
              const summary = `Skip ${candidateSymbol}: Fee/edge filter (net ${netEdgePct.toFixed(3)}% < ${riskAdjustedMinNetEdgePct.toFixed(3)}%)`;
              const baseCooldownMs = Math.max(this.deriveNoActionSymbolCooldownMs(risk), this.deriveFeeEdgeCooldownMs(risk));
              const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
              const cooldownMs = cooldown.cooldownMs;
              const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
              const next = {
                ...current,
                activeOrders: filled.activeOrders,
                orderHistory: filled.orderHistory,
                decisions: alreadyLogged
                  ? current.decisions
                  : [
                      {
                        id: crypto.randomUUID(),
                        ts: new Date().toISOString(),
                        kind: "SKIP",
                        summary,
                        details: {
                          capitalTier: capitalProfile.tier,
                          estimatedEdgePct: Number((estimatedEdgePct ?? 0).toFixed(6)),
                          roundTripCostPct: Number(roundTripCostPct.toFixed(6)),
                          minNetEdgePct: Number(riskAdjustedMinNetEdgePct.toFixed(6)),
                          baseMinNetEdgePct: Number(capitalProfile.minNetEdgePct.toFixed(6)),
                          risk,
                          rsi14: selectedCandidate?.rsi14,
                          adx14: selectedCandidate?.adx14,
                          atrPct14: selectedCandidate?.atrPct14,
                          score: selectedCandidate?.score,
                          cooldownMs,
                          ...(cooldown.storm ? { storm: cooldown.storm } : {})
                        }
                      },
                      ...current.decisions
                    ].slice(0, 200),
                lastError: undefined
              } satisfies BotState;
              const nextWithCooldown = this.upsertProtectionLock(next, {
                type: "COOLDOWN",
                scope: "SYMBOL",
                symbol: candidateSymbol,
                reason: cooldown.storm
                  ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                  : `Cooldown after fee/edge filter (${Math.round(cooldownMs / 1000)}s)`,
                expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                details: {
                  category: "FEE_EDGE_FILTER",
                  cooldownMs,
                  netEdgePct: Number(netEdgePct.toFixed(6)),
                  minNetEdgePct: Number(riskAdjustedMinNetEdgePct.toFixed(6)),
                  ...(cooldown.storm ? { storm: cooldown.storm } : {})
                }
              });
              this.save(this.maybeApplyReasonQuarantineLock({ state: nextWithCooldown, summary, risk }));
              return;
            }
          }
          const candidateBaseTotal = balances.find((b) => b.asset.toUpperCase() === candidateBaseAsset)?.total ?? 0;
          const currentCandidateNotional =
            Number.isFinite(candidateBaseTotal) && candidateBaseTotal > 0 ? candidateBaseTotal * price : 0;
          const maxSymbolNotional = walletTotalHome * (maxPositionPct / 100);
          const remainingSymbolNotional = Math.max(0, maxSymbolNotional - currentCandidateNotional);

          if (remainingSymbolNotional <= 0) {
            const summary = `Skip ${candidateSymbol}: Max symbol exposure reached (${maxPositionPct.toFixed(2)}%)`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        maxPositionPct,
                        walletTotalHome: Number(walletTotalHome.toFixed(6)),
                        currentCandidateNotional: Number(currentCandidateNotional.toFixed(6))
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            this.save(next);
            return;
          }

          const rawTargetNotional = walletTotalHome * (maxPositionPct / 100);
          const effectiveNotionalCap =
            Number.isFinite(notionalCap) && notionalCap > 0 ? Math.max(1, notionalCap * capitalProfile.notionalCapMultiplier) : null;
          const enforcedCap = effectiveNotionalCap;
          const capForSizing = enforcedCap ? enforcedCap / bufferFactor : null;
          const targetNotional = Math.min(rawTargetNotional, capForSizing ?? rawTargetNotional, quoteFree, remainingSymbolNotional);
          if (!Number.isFinite(targetNotional) || targetNotional <= 0) {
            const summary = `Skip ${candidateSymbol}: Target notional is zero`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            this.save(next);
            return;
          }
          const desiredQty = targetNotional / price;

          const check = await this.marketData.validateMarketOrderQty(candidateSymbol, desiredQty);
          let qtyStr = check.ok ? check.normalizedQty : check.requiredQty;
          if (!qtyStr) {
            const minQtyHint = [rules.marketLotSize?.minQty, rules.lotSize?.minQty]
              .map((v) => (typeof v === "string" ? Number.parseFloat(v) : Number.NaN))
              .find((v) => Number.isFinite(v) && v > 0);
            if (typeof minQtyHint === "number" && Number.isFinite(minQtyHint) && minQtyHint > 0) {
              const minCheck = await this.marketData.validateMarketOrderQty(candidateSymbol, minQtyHint);
              qtyStr = minCheck.ok ? minCheck.normalizedQty : minCheck.requiredQty;
            }
          }
          if (!qtyStr) {
            const reason = check.reason ?? "Binance min order constraints";
            const summary = `Skip ${candidateSymbol}: ${reason}`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            this.save(next);
            return;
          }

          let qty = Number.parseFloat(qtyStr);
          if (!Number.isFinite(qty) || qty <= 0) {
            throw new Error(`Invalid normalized quantity: ${qtyStr}`);
          }

          let bufferedCost = qty * price * bufferFactor;
          if (!gridEnabled && Number.isFinite(bufferedCost) && bufferedCost > quoteFree) {
            const affordableQtyTarget = quoteFree / (price * bufferFactor);
            if (Number.isFinite(affordableQtyTarget) && affordableQtyTarget > 0) {
              const affordableCheck = await this.marketData.validateMarketOrderQty(candidateSymbol, affordableQtyTarget);
              const affordableQtyStr = affordableCheck.ok ? affordableCheck.normalizedQty : undefined;
              const affordableQty = affordableQtyStr ? Number.parseFloat(affordableQtyStr) : Number.NaN;
              const affordableBufferedCost =
                Number.isFinite(affordableQty) && affordableQty > 0 ? affordableQty * price * bufferFactor : Number.NaN;
              if (
                affordableQtyStr &&
                Number.isFinite(affordableQty) &&
                affordableQty > 0 &&
                Number.isFinite(affordableBufferedCost) &&
                affordableBufferedCost <= quoteFree + 1e-8
              ) {
                qtyStr = affordableQtyStr;
                qty = affordableQty;
                bufferedCost = affordableBufferedCost;
              }
            }
          }

          if (enforcedCap && Number.isFinite(bufferedCost)) {
            const capTolerance = Math.max(0.01, enforcedCap * 0.001);
            if (bufferedCost > enforcedCap + capTolerance) {
              const summary = `Skip ${candidateSymbol}: Would exceed live notional cap (cap ${enforcedCap.toFixed(2)} ${candidateQuoteAsset})`;
              const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
              const next = {
                ...current,
                activeOrders: filled.activeOrders,
                orderHistory: filled.orderHistory,
                decisions: alreadyLogged
                  ? current.decisions
                  : [
                      {
                        id: crypto.randomUUID(),
                        ts: new Date().toISOString(),
                        kind: "SKIP",
                        summary,
                        details: {
                          bufferedCost: Number(bufferedCost.toFixed(6)),
                          cap: Number(enforcedCap.toFixed(6)),
                          price: Number(price.toFixed(8)),
                          qty: Number(qty.toFixed(8)),
                          bufferFactor
                        }
                      },
                      ...current.decisions
                    ].slice(0, 200),
                lastError: undefined
              } satisfies BotState;
              this.save(next);
              return;
            }
          }
          if (!gridEnabled && Number.isFinite(bufferedCost) && bufferedCost > quoteFree) {
            const shortfall = bufferedCost - quoteFree;
            const conversionTopUpReserveMultiplier = Math.max(1, config?.advanced.conversionTopUpReserveMultiplier ?? 2);
            const minOrderNotional = check.minNotional ? Number.parseFloat(check.minNotional) : Number.NaN;
            const configuredMinTopUpTarget = config?.advanced.conversionTopUpMinTarget ?? 5;
            const floorTopUpTarget = Number.isFinite(minOrderNotional) && minOrderNotional > 0
              ? minOrderNotional
              : Number.isFinite(configuredMinTopUpTarget) && configuredMinTopUpTarget > 0
                ? configuredMinTopUpTarget
                : 5;
            const reserveLowTarget = Math.max(
              floorTopUpTarget,
              floorTopUpTarget * conversionTopUpReserveMultiplier,
              walletTotalHome * capitalProfile.reserveLowPct
            );
            const reserveHighTarget = Math.max(
              reserveLowTarget,
              reserveLowTarget * 2,
              walletTotalHome * capitalProfile.reserveHighPct
            );
            const reserveTopUpNeeded = quoteFree < reserveLowTarget ? Math.max(0, reserveHighTarget - quoteFree) : 0;
            const requiresReserveRecovery = quoteFree < reserveLowTarget;
            const shortfallTriggerRatio = Math.max(0.3, 0.8 - (risk / 100) * 0.5); // risk 0 -> 80%, risk 100 -> 30%
            const minShortfallToConvert = floorTopUpTarget * shortfallTriggerRatio;
            if (!requiresReserveRecovery && shortfall < minShortfallToConvert) {
              const summary = `Skip ${candidateSymbol}: Insufficient ${candidateQuoteAsset} for estimated cost`;
              const baseCooldownMs = this.deriveNoActionSymbolCooldownMs(risk);
              const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
              const cooldownMs = cooldown.cooldownMs;
              const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
              const next = {
                ...current,
                activeOrders: filled.activeOrders,
                orderHistory: filled.orderHistory,
                decisions: alreadyLogged
                  ? current.decisions
                  : [
                      {
                        id: crypto.randomUUID(),
                        ts: new Date().toISOString(),
                        kind: "SKIP",
                        summary,
                        details: {
                          shortfall: Number(shortfall.toFixed(6)),
                          minShortfallToConvert: Number(minShortfallToConvert.toFixed(6)),
                          floorTopUpTarget: Number(floorTopUpTarget.toFixed(6)),
                          shortfallTriggerRatio: Number(shortfallTriggerRatio.toFixed(6)),
                          reserveLowTarget: Number(reserveLowTarget.toFixed(6)),
                          reserveHighTarget: Number(reserveHighTarget.toFixed(6)),
                          reserveTopUpNeeded: Number(reserveTopUpNeeded.toFixed(6)),
                          capitalTier: capitalProfile.tier,
                          ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                          cooldownMs
                        }
                      },
                      ...current.decisions
                    ].slice(0, 200),
                lastError: undefined
              } satisfies BotState;
              const nextWithCooldown = this.upsertProtectionLock(next, {
                type: "COOLDOWN",
                scope: "SYMBOL",
                symbol: candidateSymbol,
                reason: cooldown.storm
                  ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                  : `Cooldown after quote shortfall skip (${Math.round(cooldownMs / 1000)}s)`,
                expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                details: {
                  category: "SKIP_QUOTE_SHORTFALL",
                  cooldownMs,
                  shortfall: Number(shortfall.toFixed(6)),
                  minShortfallToConvert: Number(minShortfallToConvert.toFixed(6)),
                  ...(cooldown.storm ? { storm: cooldown.storm } : {})
                }
              });
              this.save(nextWithCooldown);
              return;
            }
            const conversionTarget = Math.max(shortfall * conversionTopUpReserveMultiplier, floorTopUpTarget, reserveTopUpNeeded);
            const conversionTopUpCooldownMs = Math.max(0, config?.advanced.conversionTopUpCooldownMs ?? 90_000);
            const nowMs = Date.now();
            if (conversionTopUpCooldownMs > 0) {
              const lastConversionTrade = current.decisions.find((d) => {
                if (d.kind !== "TRADE") return false;
                const details = d.details as Record<string, unknown> | undefined;
                return details?.mode === "conversion-router";
              });
              const lastConversionAt = lastConversionTrade ? Date.parse(lastConversionTrade.ts) : Number.NaN;
              if (Number.isFinite(lastConversionAt) && nowMs - lastConversionAt < conversionTopUpCooldownMs) {
                const summary = `Skip ${candidateSymbol}: Conversion cooldown active`;
                const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
                const next = {
                  ...current,
                  activeOrders: current.activeOrders,
                  orderHistory: current.orderHistory,
                  decisions: alreadyLogged
                    ? current.decisions
                    : [
                        {
                          id: crypto.randomUUID(),
                          ts: new Date().toISOString(),
                          kind: "SKIP",
                          summary,
                          details: {
                            conversionTopUpCooldownMs,
                            remainingMs: Math.max(0, Math.round(conversionTopUpCooldownMs - (nowMs - lastConversionAt))),
                            shortfall: Number(shortfall.toFixed(6)),
                            conversionTarget: Number(conversionTarget.toFixed(6)),
                            floorTopUpTarget: Number(floorTopUpTarget.toFixed(6)),
                            reserveLowTarget: Number(reserveLowTarget.toFixed(6)),
                            reserveHighTarget: Number(reserveHighTarget.toFixed(6)),
                            reserveTopUpNeeded: Number(reserveTopUpNeeded.toFixed(6)),
                            capitalTier: capitalProfile.tier
                          }
                        },
                        ...current.decisions
                      ].slice(0, 200),
                  lastError: undefined
                } satisfies BotState;
                this.save(next);
                return;
              }
            }

            const hasRecentCandidateBuy =
              Number.isFinite(rebalanceSellCooldownMs) && rebalanceSellCooldownMs > 0
                ? current.orderHistory.some((o) => {
                    if (o.symbol !== candidateSymbol) return false;
                    if (o.side !== "BUY") return false;
                    if (o.status !== "FILLED" && o.status !== "NEW") return false;
                    const ts = Date.parse(o.ts);
                    return Number.isFinite(ts) && Date.now() - ts < rebalanceSellCooldownMs;
                  })
                : false;

            const sourceBalances = balances
              .filter((b) => b.asset.toUpperCase() !== candidateQuoteAsset && b.free > 0)
              .sort((a, b) => {
                const aIsCandidateBase = a.asset.toUpperCase() === candidateBaseAsset ? 1 : 0;
                const bIsCandidateBase = b.asset.toUpperCase() === candidateBaseAsset ? 1 : 0;
                if (aIsCandidateBase !== bIsCandidateBase) return aIsCandidateBase - bIsCandidateBase;
                const aManagedOpen = (managedPositions.get(`${a.asset.toUpperCase()}${candidateQuoteAsset}`)?.netQty ?? 0) > 0 ? 1 : 0;
                const bManagedOpen = (managedPositions.get(`${b.asset.toUpperCase()}${candidateQuoteAsset}`)?.netQty ?? 0) > 0 ? 1 : 0;
                if (aManagedOpen !== bManagedOpen) return aManagedOpen - bManagedOpen;
                const aIsStable = isStableAsset(a.asset) ? 1 : 0;
                const bIsStable = isStableAsset(b.asset) ? 1 : 0;
                if (aIsStable !== bIsStable) return bIsStable - aIsStable;
                return b.free - a.free;
              });

            const sourceConversionCooldownMs = Math.max(60_000, conversionTopUpCooldownMs * 3);
            for (const source of sourceBalances) {
              const sourceAsset = source.asset.toUpperCase();
              const sourceFree = source.free;
              if (sourceFree <= 0) continue;
              if (sourceAsset === candidateBaseAsset && hasRecentCandidateBuy) continue;
              const sourceQuoteSymbol = `${sourceAsset}${candidateQuoteAsset}`;
              const sourceOpenManagedPosition = (managedPositions.get(sourceQuoteSymbol)?.netQty ?? 0) > 0;
              if (sourceOpenManagedPosition && !requiresReserveRecovery) continue;
              const hasRecentSourceBuy =
                Number.isFinite(rebalanceSellCooldownMs) && rebalanceSellCooldownMs > 0
                  ? current.orderHistory.some((o) => {
                      if (o.symbol !== sourceQuoteSymbol) return false;
                      if (o.side !== "BUY") return false;
                      if (o.status !== "FILLED" && o.status !== "NEW") return false;
                      const ts = Date.parse(o.ts);
                      return Number.isFinite(ts) && nowMs - ts < rebalanceSellCooldownMs;
                    })
                  : false;
              if (hasRecentSourceBuy) continue;
              const hasRecentSourceConversion =
                sourceConversionCooldownMs > 0
                  ? current.decisions.some((d) => {
                      if (d.kind !== "TRADE") return false;
                      const details = d.details as Record<string, unknown> | undefined;
                      if (details?.mode !== "conversion-router") return false;
                      if (typeof details?.sourceAsset !== "string" || details.sourceAsset.trim().toUpperCase() !== sourceAsset) {
                        return false;
                      }
                      const ts = Date.parse(d.ts);
                      return Number.isFinite(ts) && nowMs - ts < sourceConversionCooldownMs;
                    })
                  : false;
              if (hasRecentSourceConversion) continue;

              const conversion = await this.conversionRouter.convertFromSourceToTarget({
                sourceAsset,
                sourceFree,
                targetAsset: candidateQuoteAsset,
                requiredTarget: conversionTarget,
                allowTwoHop: true
              });
              if (!conversion.ok || conversion.legs.length === 0) continue;

              conversion.legs.forEach((leg, idx) => {
                const fallbackQty = Number.parseFloat(leg.quantity);
                persistLiveTrade({
                  symbol: leg.symbol,
                  side: leg.side,
                  requestedQty: leg.quantity,
                  fallbackQty: Number.isFinite(fallbackQty) && fallbackQty > 0 ? fallbackQty : 0,
                  response: leg.response,
                  reason: `${leg.reason}${leg.bridgeAsset ? ` via ${leg.bridgeAsset}` : ""}`,
                  details: {
                    shortfall: Number(shortfall.toFixed(6)),
                    conversionTarget: Number(conversionTarget.toFixed(6)),
                    floorTopUpTarget: Number(floorTopUpTarget.toFixed(6)),
                    reserveLowTarget: Number(reserveLowTarget.toFixed(6)),
                    reserveHighTarget: Number(reserveHighTarget.toFixed(6)),
                    reserveTopUpNeeded: Number(reserveTopUpNeeded.toFixed(6)),
                    reserveMultiplier: conversionTopUpReserveMultiplier,
                    capitalTier: capitalProfile.tier,
                    walletTotalHome: Number(walletTotalHome.toFixed(6)),
                    sourceAsset,
                    route: leg.route,
                    bridgeAsset: leg.bridgeAsset,
                    mode: "conversion-router",
                    leg: idx + 1,
                    legs: conversion.legs.length,
                    obtainedTarget: Number(leg.obtainedTarget.toFixed(8))
                  }
                });
              });
              return;
            }

            const summary = `Skip ${candidateSymbol}: Insufficient ${candidateQuoteAsset} for estimated cost`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const baseCooldownMs = this.deriveNoActionSymbolCooldownMs(risk);
            const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
            const cooldownMs = cooldown.cooldownMs;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        bufferedCost: Number(bufferedCost.toFixed(6)),
                        availableQuote: Number(quoteFree.toFixed(6)),
                        shortfall: Number(shortfall.toFixed(6)),
                        conversionTarget: Number(conversionTarget.toFixed(6)),
                        floorTopUpTarget: Number(floorTopUpTarget.toFixed(6)),
                        reserveLowTarget: Number(reserveLowTarget.toFixed(6)),
                        reserveHighTarget: Number(reserveHighTarget.toFixed(6)),
                        reserveTopUpNeeded: Number(reserveTopUpNeeded.toFixed(6)),
                        reserveMultiplier: conversionTopUpReserveMultiplier,
                        capitalTier: capitalProfile.tier,
                        walletTotalHome: Number(walletTotalHome.toFixed(6)),
                        price: Number(price.toFixed(8)),
                        qty: Number(qty.toFixed(8)),
                        bufferFactor,
                        ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                        cooldownMs
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            const nextWithCooldown = this.upsertProtectionLock(next, {
              type: "COOLDOWN",
              scope: "SYMBOL",
              symbol: candidateSymbol,
              reason: cooldown.storm
                ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                : `Cooldown after quote-insufficient (no conversion route) (${Math.round(cooldownMs / 1000)}s)`,
              expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
              details: {
                category: "SKIP_QUOTE_INSUFFICIENT",
                cooldownMs,
                shortfall: Number(shortfall.toFixed(6)),
                conversionTarget: Number(conversionTarget.toFixed(6)),
                ...(cooldown.storm ? { storm: cooldown.storm } : {})
              }
            });
            this.save(nextWithCooldown);
            return;
          }

          if (gridEnabled) {
            const botPrefix = config ? this.resolveBotOrderClientIdPrefix(config) : "ABOT";
            const manageExternalOpenOrders = Boolean(config?.advanced.manageExternalOpenOrders);
            const botOrderAutoCancelEnabled = Boolean(config?.advanced.botOrderAutoCancelEnabled);
            const baseFree = balances.find((b) => b.asset.toUpperCase() === candidateBaseAsset)?.free ?? 0;

            const conversionTopUpReserveMultiplier = Math.max(1, config?.advanced.conversionTopUpReserveMultiplier ?? 2);
            const { floorTopUpTarget, reserveLowTarget, reserveHighTarget, reserveHardTarget } = await this.deriveQuoteReserveTargets({
              config: config ?? undefined,
              walletTotalHome,
              capitalProfile,
              risk,
              quoteAsset: candidateQuoteAsset,
              homeStable,
              bridgeAssets: executionBridgeAssets
            });
            const quoteSpendable = Math.max(0, quoteFree - reserveHardTarget);

            if (botOrderAutoCancelEnabled && config) {
              const ttlMs = Math.max(60_000, Math.round(config.advanced.botOrderStaleTtlMinutes * 60_000));
              const staleAcrossSymbols = current.activeOrders
                .filter((order) => order.status === "NEW")
                .filter((order) => {
                  const orderType = order.type.trim().toUpperCase();
                  return orderType === "LIMIT" || orderType === "LIMIT_MAKER";
                })
                .filter((order) => this.isBotOwnedOrder(order, botPrefix))
                .map((order) => {
                  const ageMs = this.getOrderAgeMs(order);
                  return { order, ageMs };
                })
                .filter((item) => typeof item.ageMs === "number" && item.ageMs > ttlMs)
                .sort((a, b) => (b.ageMs ?? 0) - (a.ageMs ?? 0))
                .map((item) => item.order);

              if (staleAcrossSymbols.length > 0) {
                const staleBySymbol = staleAcrossSymbols.reduce<Record<string, number>>((acc, order) => {
                  acc[order.symbol] = (acc[order.symbol] ?? 0) + 1;
                  return acc;
                }, {});
                current = await this.cancelBotOwnedOpenOrders({
                  config,
                  state: current,
                  orders: staleAcrossSymbols,
                  reason: "stale-grid-order ttl-sweep",
                  details: {
                    staleTtlMinutes: config.advanced.botOrderStaleTtlMinutes,
                    staleCount: staleAcrossSymbols.length,
                    staleBySymbol
                  },
                  maxCancels: Math.min(4, staleAcrossSymbols.length)
                });
                this.save(current);
              }
            }

            let symbolOpenLimitOrdersAll = current.activeOrders.filter((order) => {
              if (order.symbol !== candidateSymbol) return false;
              if (order.status !== "NEW") return false;
              const t = order.type.trim().toUpperCase();
              return t === "LIMIT" || t === "LIMIT_MAKER";
            });

            const externalOpenLimits = symbolOpenLimitOrdersAll.filter((order) => !this.isBotOwnedOrder(order, botPrefix));
            if (externalOpenLimits.length > 0 && !manageExternalOpenOrders) {
              const summary = `Skip ${candidateSymbol}: External open LIMIT order(s) detected`;
              const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
              const next = {
                ...current,
                decisions: alreadyLogged
                  ? current.decisions
                  : [
                      {
                        id: crypto.randomUUID(),
                        ts: new Date().toISOString(),
                        kind: "SKIP",
                        summary,
                        details: {
                          externalOpenOrders: externalOpenLimits.map((o) => ({
                            id: o.id,
                            side: o.side,
                            type: o.type,
                            price: o.price,
                            qty: o.qty,
                            clientOrderId: o.clientOrderId
                          })),
                          guidance: "Cancel the external order(s), or enable Advanced → Manage external/manual open orders."
                        }
                      },
                      ...current.decisions
                    ].slice(0, 200),
                lastError: undefined
              } satisfies BotState;
              this.save(next);
              return;
            }

            const existingBuyPauseLock = this.getActiveSymbolProtectionLock(current, candidateSymbol, {
              onlyTypes: ["GRID_GUARD_BUY_PAUSE"]
            });
            const regime = selectedRegime;
            const t = risk / 100;
            const pauseConfidenceThreshold = this.getBearPauseConfidenceThreshold(risk);
            const shouldPauseBuys =
              regime.label === "BEAR_TREND" &&
              typeof regime.confidence === "number" &&
              Number.isFinite(regime.confidence) &&
              regime.confidence >= pauseConfidenceThreshold;
            const buyPausedByCaution = cautionPauseNewSymbols;
            const buyPaused = buyPausedByCaution || Boolean(existingBuyPauseLock) || shouldPauseBuys;

            const defensiveBuyOrders = symbolOpenLimitOrdersAll.filter(
              (order) => order.side === "BUY" && this.isBotOwnedOrder(order, botPrefix)
            );
            if (
              config &&
              this.shouldCancelDefensiveGridBuyOrders({
                executionLane,
                hasBotBuyOrders: defensiveBuyOrders.length > 0,
                buyPaused
              })
            ) {
              current = await this.cancelBotOwnedOpenOrders({
                config,
                state: current,
                orders: defensiveBuyOrders,
                reason: `defensive-buy-pause-cancel-buy ${candidateSymbol}`,
                details: {
                  executionLane,
                  regime,
                  strategy: selectedStrategy,
                  buyPaused,
                  buyPausedByCaution,
                  pauseConfidenceThreshold,
                  existingBuyPauseLock: Boolean(existingBuyPauseLock),
                  canceledBuyOrders: defensiveBuyOrders.length
                },
                maxCancels: Math.min(5, defensiveBuyOrders.length)
              });
              symbolOpenLimitOrdersAll = current.activeOrders.filter((order) => {
                if (order.symbol !== candidateSymbol) return false;
                if (order.status !== "NEW") return false;
                const t = order.type.trim().toUpperCase();
                return t === "LIMIT" || t === "LIMIT_MAKER";
              });
              this.save(current);
            }

            const guardLockMs = Math.max(60_000, Math.round((3 - t * 2) * 60_000)); // 3m -> 1m
            if (shouldPauseBuys) {
              current = this.upsertProtectionLock(current, {
                type: "GRID_GUARD_BUY_PAUSE",
                scope: "SYMBOL",
                symbol: candidateSymbol,
                reason: `Grid guard: pause BUY legs (${regime.label} ${Math.round(regime.confidence * 100)}%)`,
                expiresAt: new Date(Date.now() + guardLockMs).toISOString(),
                details: {
                  regime,
                  pauseConfidenceThreshold,
                  guardLockMs
                }
              });
            }

            const atr = Number.isFinite(selectedCandidate?.atrPct14) ? Math.max(0.1, selectedCandidate?.atrPct14 ?? 0.4) : 0.4;
            const gridSpacingPct = Math.max(0.2, Math.min(2.5, atr * (0.6 - (risk / 100) * 0.25)));

            if (botOrderAutoCancelEnabled && config) {
              const ttlMs = Math.max(60_000, Math.round(config.advanced.botOrderStaleTtlMinutes * 60_000));
              const maxDistancePct = Math.max(0.1, config.advanced.botOrderMaxDistancePct);
              const cancelDistancePct = Math.max(maxDistancePct, gridSpacingPct * 3);

              const stale = symbolOpenLimitOrdersAll
                .filter((order) => this.isBotOwnedOrder(order, botPrefix))
                .map((order) => {
                  const ageMs = this.getOrderAgeMs(order);
                  const orderPrice = typeof order.price === "number" && Number.isFinite(order.price) ? order.price : Number.NaN;
                  const distancePct =
                    Number.isFinite(orderPrice) && orderPrice > 0 && Number.isFinite(price) && price > 0
                      ? (Math.abs(orderPrice - price) / price) * 100
                      : Number.NaN;
                  const tooOld = typeof ageMs === "number" && ageMs > ttlMs;
                  const tooFar = Number.isFinite(distancePct) && distancePct > cancelDistancePct;
                  return { order, ageMs, distancePct, tooOld, tooFar };
                })
                .filter((item) => item.tooOld || item.tooFar)
	                .sort((a, b) => {
	                  const da = Number.isFinite(a.distancePct) ? a.distancePct : -1;
	                  const db = Number.isFinite(b.distancePct) ? b.distancePct : -1;
	                  if (db !== da) return db - da;
	                  const aa = typeof a.ageMs === "number" ? a.ageMs : -1;
	                  const ab = typeof b.ageMs === "number" ? b.ageMs : -1;
	                  return ab - aa;
	                })
	                .map((item) => item.order);

              if (stale.length > 0) {
                current = await this.cancelBotOwnedOpenOrders({
                  config,
                  state: current,
                  orders: stale,
                  reason: `stale-grid-order ${candidateSymbol}`,
                  details: {
                    symbol: candidateSymbol,
                    marketPrice: Number(price.toFixed(8)),
                    gridSpacingPct: Number(gridSpacingPct.toFixed(6)),
                    staleTtlMinutes: config.advanced.botOrderStaleTtlMinutes,
                    cancelDistancePct: Number(cancelDistancePct.toFixed(6))
                  },
                  maxCancels: 2
                });
                this.save(current);
              }
            }

            const symbolOpenLimits = current.activeOrders.filter((order) => {
              if (order.symbol !== candidateSymbol) return false;
              if (order.status !== "NEW") return false;
              const t = order.type.trim().toUpperCase();
              if (t !== "LIMIT" && t !== "LIMIT_MAKER") return false;
              return manageExternalOpenOrders ? true : this.isBotOwnedOrder(order, botPrefix);
            });

            const hasBuyLimit = symbolOpenLimits.some((order) => order.side === "BUY");
            const hasSellLimit = symbolOpenLimits.some((order) => order.side === "SELL");
            const maxGridOrdersPerSymbol = Math.max(2, Math.min(6, 2 + Math.round(risk / 25)));
            const recentGridGuardPausedSkips = this.countRecentSymbolSkipMatches({
              state: current,
              symbol: candidateSymbol,
              contains: "grid guard paused buy leg",
              windowMs: 30 * 60_000
            });
            const recentInventoryWaitingSkips = this.countRecentSymbolSkipMatches({
              state: current,
              symbol: candidateSymbol,
              contains: "grid waiting for ladder slot or inventory",
              windowMs: 30 * 60_000
            });
            const recentGridSellSizingRejects = this.countRecentSymbolSkipMatches({
              state: current,
              symbol: candidateSymbol,
              contains: "grid sell sizing rejected",
              windowMs: 30 * 60_000
            });

            const managedCandidatePosition = managedPositions.get(candidateSymbol);
            const tradableManagedQty =
              managedCandidatePosition && managedCandidatePosition.netQty > 0 ? Math.min(managedCandidatePosition.netQty, baseFree) : 0;
            const positionExposureHome =
              isExecutionQuoteSymbol(candidateSymbol) && Number.isFinite(price) && price > 0
                ? tradableManagedQty * price
                : 0;
            const positionExposurePct = walletTotalHome > 0 ? (positionExposureHome / walletTotalHome) * 100 : 0;

            if (
              this.shouldRunDefensiveGridGuardUnwind({
                executionLane,
                riskState: dailyLossGuard.state,
                buyPaused,
                hasInventory: tradableManagedQty > 0,
                quoteIsHome: isExecutionQuoteSymbol(candidateSymbol),
                recentBuyPauseSkips: recentGridGuardPausedSkips,
                recentInventoryWaitingSkips,
                recentGridSellSizingRejects,
                risk
              })
            ) {
              const unwindPolicy = this.deriveDefensiveGridGuardUnwindPolicy({
                risk,
                regimeConfidence: regime.confidence,
                positionExposurePct
              });
              const unwindReason = "grid-guard-defensive-unwind";
              const recentUnwind = current.decisions.find((decision) => {
                if (decision.kind !== "TRADE") return false;
                const details = decision.details as Record<string, unknown> | undefined;
                if (details?.reason !== unwindReason) return false;
                if (typeof details?.symbol !== "string" || details.symbol.trim().toUpperCase() !== candidateSymbol) {
                  return false;
                }
                const ts = Date.parse(decision.ts);
                return Number.isFinite(ts) && Date.now() - ts < unwindPolicy.cooldownMs;
              });

              if (!recentUnwind) {
                const desiredQty = tradableManagedQty * unwindPolicy.fraction;
                if (Number.isFinite(desiredQty) && desiredQty > 0) {
                  const sellCheck = await this.marketData.validateMarketOrderQty(candidateSymbol, desiredQty);
                  let sellQtyStr = sellCheck.ok ? sellCheck.normalizedQty : undefined;
                  if (!sellQtyStr && sellCheck.requiredQty) {
                    const requiredQty = Number.parseFloat(sellCheck.requiredQty);
                    if (Number.isFinite(requiredQty) && requiredQty > 0 && requiredQty <= tradableManagedQty + 1e-8) {
                      sellQtyStr = sellCheck.requiredQty;
                    }
                  }

                  if (sellQtyStr) {
                    const sellQty = Number.parseFloat(sellQtyStr);
                    if (Number.isFinite(sellQty) && sellQty > 0) {
                      setLiveOperation({
                        stage: "grid-guard-defensive-unwind-market-sell",
                        symbol: candidateSymbol,
                        side: "SELL",
                        asset: candidateBaseAsset,
                        required: sellQty
                      });
                      const unwindFunds = await ensureFundsBeforeOrder({
                        asset: candidateBaseAsset,
                        required: sellQty
                      });
                      if (unwindFunds.ok) {
                        if (config) {
                          current = await this.cancelBotOwnedOpenOrders({
                            config,
                            state: current,
                            orders: current.activeOrders.filter((order) => order.symbol === candidateSymbol),
                            reason: `grid-guard-defensive-unwind ${candidateSymbol}`,
                            details: {
                              executionLane,
                              symbol: candidateSymbol,
                              recentBuyPauseSkips: recentGridGuardPausedSkips,
                              recentInventoryWaitingSkips,
                              recentGridSellSizingRejects
                            },
                            maxCancels: 4
                          });
                          this.save(current);
                        }

                        const unwindRes = await this.trading.placeSpotMarketOrder({
                          symbol: candidateSymbol,
                          side: "SELL",
                          quantity: sellQtyStr
                        });
                        persistLiveTrade({
                          symbol: candidateSymbol,
                          side: "SELL",
                          requestedQty: sellQtyStr,
                          fallbackQty: sellQty,
                          response: unwindRes,
                          reason: unwindReason,
                          details: {
                            reason: unwindReason,
                            symbol: candidateSymbol,
                            executionLane,
                            unwindFraction: unwindPolicy.fraction,
                            unwindCooldownMs: unwindPolicy.cooldownMs,
                            recentBuyPauseSkips: recentGridGuardPausedSkips,
                            recentInventoryWaitingSkips,
                            recentGridSellSizingRejects,
                            positionExposureHome: Number(positionExposureHome.toFixed(8)),
                            positionExposurePct: Number(positionExposurePct.toFixed(8)),
                            managedPositionQty: Number((managedCandidatePosition?.netQty ?? 0).toFixed(8)),
                            managedPositionCost: Number((managedCandidatePosition?.costQuote ?? 0).toFixed(8)),
                            regime,
                            pauseConfidenceThreshold
                          }
                        });
                        return;
                      }
                    }
                  }
                }
              }
            }

            // If we have no BUY ladder and quote is below reserve, try a reserve recovery conversion
            // (stable-like -> candidate quote asset) to reduce repeated minQty affordability rejects.
            if (!hasBuyLimit && quoteFree < reserveLowTarget && symbolOpenLimits.length < maxGridOrdersPerSymbol && config) {
              const conversionTarget = Math.max(floorTopUpTarget, reserveHighTarget - quoteFree);
              const conversionTopUpCooldownMs = Math.max(0, config.advanced.conversionTopUpCooldownMs ?? 90_000);
              const nowMs = Date.now();
              const lastConversionTrade = conversionTopUpCooldownMs
                ? current.decisions.find((d) => {
                    if (d.kind !== "TRADE") return false;
                    const details = d.details as Record<string, unknown> | undefined;
                    return details?.mode === "conversion-router";
                  })
                : null;
              const lastConversionAt = lastConversionTrade ? Date.parse(lastConversionTrade.ts) : Number.NaN;
              const conversionCooldownActive =
                conversionTopUpCooldownMs > 0 && Number.isFinite(lastConversionAt) && nowMs - lastConversionAt < conversionTopUpCooldownMs;

              if (!conversionCooldownActive) {
                const stableSources = balances
                  .filter((b) => b.free > 0 && isStableAsset(b.asset) && b.asset.trim().toUpperCase() !== candidateQuoteAsset)
                  .sort((a, b) => b.free - a.free);

                for (const source of stableSources) {
                  setLiveOperation({
                    stage: "grid-reserve-recovery-conversion",
                    symbol: `${source.asset.trim().toUpperCase()}${candidateQuoteAsset}`,
                    side: "SELL",
                    asset: source.asset.trim().toUpperCase(),
                    required: source.free
                  });
                  const conversion = await this.conversionRouter.convertFromSourceToTarget({
                    sourceAsset: source.asset,
                    sourceFree: source.free,
                    targetAsset: candidateQuoteAsset,
                    requiredTarget: conversionTarget,
                    allowTwoHop: true
                  });
                  if (!conversion.ok || conversion.legs.length === 0) continue;

                  conversion.legs.forEach((leg, idx) => {
                    const fallbackQty = Number.parseFloat(leg.quantity);
                    persistLiveTrade({
                      symbol: leg.symbol,
                      side: leg.side,
                      requestedQty: leg.quantity,
                      fallbackQty: Number.isFinite(fallbackQty) && fallbackQty > 0 ? fallbackQty : 0,
                      response: leg.response,
                      reason: `${leg.reason}${leg.bridgeAsset ? ` via ${leg.bridgeAsset}` : ""}`,
                      details: {
                        mode: "conversion-router",
                        stage: "grid-reserve-recovery",
                        requiredTarget: Number(conversionTarget.toFixed(6)),
                        floorTopUpTarget: Number(floorTopUpTarget.toFixed(6)),
                        reserveLowTarget: Number(reserveLowTarget.toFixed(6)),
                        reserveHardTarget: Number(reserveHardTarget.toFixed(6)),
                        reserveHighTarget: Number(reserveHighTarget.toFixed(6)),
                        quoteFree: Number(quoteFree.toFixed(6)),
                        quoteSpendable: Number(quoteSpendable.toFixed(6)),
                        reserveMultiplier: conversionTopUpReserveMultiplier,
                        capitalTier: capitalProfile.tier,
                        walletTotalHome: Number(walletTotalHome.toFixed(6)),
                        sourceAsset: source.asset.trim().toUpperCase(),
                        route: leg.route,
                        bridgeAsset: leg.bridgeAsset,
                        leg: idx + 1,
                        legs: conversion.legs.length,
                        obtainedTarget: Number(leg.obtainedTarget.toFixed(8))
                      }
                    });
                  });
                  return;
                }
              }
            }

            if (symbolOpenLimits.length >= maxGridOrdersPerSymbol) {
              const summary = `Skip ${candidateSymbol}: Grid ladder full (${symbolOpenLimits.length}/${maxGridOrdersPerSymbol})`;
              const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
              const next = {
                ...current,
                activeOrders: current.activeOrders,
                orderHistory: current.orderHistory,
                decisions: alreadyLogged
                  ? current.decisions
                  : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200),
                lastError: undefined
              } satisfies BotState;
              this.save(next);
              return;
            }
            const buyLimitPrice = Number((price * (1 - gridSpacingPct / 100)).toFixed(8));
            const sellLimitPrice = Number((price * (1 + gridSpacingPct / 100)).toFixed(8));
            let placedGridOrder = false;
            let pendingNoActionState: BotState | null = null;

            if (!hasBuyLimit && buyPaused) {
              const summary = buyPausedByCaution
                ? `Skip ${candidateSymbol}: Daily loss caution paused GRID BUY leg`
                : `Skip ${candidateSymbol}: Grid guard paused BUY leg`;
              const baseCooldownMs = Math.max(this.deriveNoActionSymbolCooldownMs(risk), guardLockMs);
              const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
              const cooldownMs = cooldown.cooldownMs;
              const nowMs = Date.now();
              const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
              const lastSimilar = current.decisions.find((d) => d.kind === "SKIP" && d.summary === summary);
              const lastSimilarAt = lastSimilar ? Date.parse(lastSimilar.ts) : Number.NaN;
              const throttleMs = 60_000;
              const throttled = Number.isFinite(lastSimilarAt) && nowMs - lastSimilarAt < throttleMs;
              if (!alreadyLogged && !throttled) {
                current = {
                  ...current,
                  decisions: [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        regime,
                        pauseConfidenceThreshold,
                        cautionModeActive,
                        buyPausedByCaution,
                        buyPaused,
                        hasBuyLimit,
                        hasSellLimit,
                        ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                        cooldownMs
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
                  lastError: undefined
                } satisfies BotState;
                const nextWithCooldown = this.upsertProtectionLock(current, {
                  type: "COOLDOWN",
                  scope: "SYMBOL",
                  symbol: candidateSymbol,
                  reason: cooldown.storm
                    ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                    : `Cooldown after grid guard buy pause (${Math.round(cooldownMs / 1000)}s)`,
                  expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                  details: {
                    category: "GRID_GUARD_BUY_PAUSE",
                    cooldownMs,
                    hasSellLimit,
                    buyPausedByCaution,
                    ...(cooldown.storm ? { storm: cooldown.storm } : {})
                  }
                });
                if (buyPausedByCaution && !pendingNoActionState) {
                  pendingNoActionState = nextWithCooldown;
                }
              }
            }

            if (!hasBuyLimit && !buyPaused && Number.isFinite(buyLimitPrice) && buyLimitPrice > 0) {
              const buyPriceNorm = await this.marketData.normalizeLimitPrice(candidateSymbol, buyLimitPrice, "BUY");
	              if (!buyPriceNorm.ok) {
	                const summary = `Skip ${candidateSymbol}: Grid buy price invalid (${buyPriceNorm.reason})`;
	                const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
	                const next = {
	                  ...current,
	                  decisions: alreadyLogged
	                    ? current.decisions
	                    : [
	                        {
                          id: crypto.randomUUID(),
                          ts: new Date().toISOString(),
                          kind: "SKIP",
                          summary,
                          details: { ...buyPriceNorm, desiredPrice: buyLimitPrice }
                        },
                        ...current.decisions
                      ].slice(0, 200),
                  lastError: undefined
                } satisfies BotState;
                this.save(next);
                return;
              }

              const buyPrice = Number.parseFloat(buyPriceNorm.normalizedPrice);
              const maxAffordableQty = buyPrice > 0 ? quoteSpendable / (buyPrice * bufferFactor) : 0;
              const buyQtyTarget = Math.min(qty, maxAffordableQty);
              if (!Number.isFinite(buyQtyTarget) || buyQtyTarget <= 0) {
                const summary = `Skip ${candidateSymbol}: Insufficient spendable ${candidateQuoteAsset} for grid BUY`;
                const baseCooldownMs = this.deriveNoActionSymbolCooldownMs(risk);
                const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
                const cooldownMs = cooldown.cooldownMs;
                const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
                const next = {
                  ...current,
                  activeOrders: current.activeOrders,
                  orderHistory: current.orderHistory,
                  decisions: alreadyLogged
                    ? current.decisions
                    : [
                        {
                          id: crypto.randomUUID(),
                          ts: new Date().toISOString(),
                          kind: "SKIP",
                          summary,
                          details: {
                            desiredQty: Number(qty.toFixed(8)),
                            maxAffordableQty: Number(maxAffordableQty.toFixed(8)),
                            limitPrice: buyPriceNorm.normalizedPrice,
                            quoteFree: Number(quoteFree.toFixed(6)),
                            quoteSpendable: Number(quoteSpendable.toFixed(6)),
                            reserveHardTarget: Number(reserveHardTarget.toFixed(6)),
                            reserveLowTarget: Number(reserveLowTarget.toFixed(6)),
                            ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                            cooldownMs
                          }
                        },
                        ...current.decisions
                      ].slice(0, 200),
                  lastError: undefined
                } satisfies BotState;
                pendingNoActionState = this.upsertProtectionLock(next, {
                  type: "COOLDOWN",
                  scope: "SYMBOL",
                  symbol: candidateSymbol,
                  reason: cooldown.storm
                    ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                    : `Cooldown after grid quote insufficiency (${Math.round(cooldownMs / 1000)}s)`,
                  expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                  details: {
                    category: "GRID_BUY_QUOTE_INSUFFICIENT",
                    cooldownMs,
                    limitPrice: buyPriceNorm.normalizedPrice,
                    ...(cooldown.storm ? { storm: cooldown.storm } : {})
                  }
                });
                pendingNoActionState = this.maybeApplyReasonQuarantineLock({ state: pendingNoActionState, summary, risk });
              } else {
                const buyCheck = await this.marketData.validateLimitOrderQty(candidateSymbol, buyQtyTarget, buyPriceNorm.normalizedPrice);
              let buyQtyStr: string | undefined = buyCheck.ok ? buyCheck.normalizedQty : undefined;
              if (!buyQtyStr && buyCheck.requiredQty) {
                const requiredQty = Number.parseFloat(buyCheck.requiredQty);
                if (Number.isFinite(requiredQty) && requiredQty > 0 && requiredQty <= maxAffordableQty + 1e-12) {
                  buyQtyStr = buyCheck.requiredQty;
                }
              }
              const buyQty = buyQtyStr ? Number.parseFloat(buyQtyStr) : Number.NaN;

              if (buyQtyStr && Number.isFinite(buyQty) && buyQty > 0) {
                const buyNotionalEstimate = buyQty * buyPrice * bufferFactor;
                if (Number.isFinite(buyNotionalEstimate) && buyNotionalEstimate <= quoteSpendable + 1e-8) {
                  setLiveOperation({
                    stage: "grid-buy-limit",
                    symbol: candidateSymbol,
                    side: "BUY",
                    asset: candidateQuoteAsset,
                    required: buyNotionalEstimate
                  });
                  const buyFunds = await ensureFundsBeforeOrder({ asset: candidateQuoteAsset, required: buyNotionalEstimate });
                  if (!buyFunds.ok) {
                    pendingNoActionState = buildInsufficientFundsSkipState({
                      symbol: candidateSymbol,
                      stage: "grid-buy-limit",
                      side: "BUY",
                      asset: candidateQuoteAsset,
                      required: buyNotionalEstimate,
                      available: buyFunds.available,
                      details: {
                        desiredQty: Number(qty.toFixed(8)),
                        normalizedQty: buyQtyStr,
                        limitPrice: buyPriceNorm.normalizedPrice,
                        quoteSpendable: Number(quoteSpendable.toFixed(8)),
                        reserveHardTarget: Number(reserveHardTarget.toFixed(8)),
                        refreshedBalances: buyFunds.refreshed
                      }
                    });
                  } else {
                  const buyOrder = await this.trading.placeSpotLimitOrder({
                    symbol: candidateSymbol,
                    side: "BUY",
                    quantity: buyQtyStr,
                    price: buyPriceNorm.normalizedPrice,
                    timeInForce: "GTC",
                    clientOrderId: config ? this.buildBotClientOrderId({ config, purpose: "GRID", side: "BUY" }) : undefined
                  });
                  persistLiveTrade({
                    symbol: candidateSymbol,
                    side: "BUY",
                    requestedQty: buyQtyStr,
                    fallbackQty: buyQty,
                    response: buyOrder,
                    reason: "grid-ladder-buy",
                    details: {
                      mode: "grid-ladder",
                      gridSide: "BUY",
                      anchorPrice: Number(price.toFixed(8)),
                      gridSpacingPct: Number(gridSpacingPct.toFixed(6)),
                      limitPrice: buyPriceNorm.normalizedPrice,
                      validation: {
                        ok: buyCheck.ok,
                        normalizedQty: buyCheck.normalizedQty,
                        requiredQty: buyCheck.requiredQty,
                        notional: buyCheck.notional,
                        minNotional: buyCheck.minNotional
                      }
                    }
                  });
                  placedGridOrder = true;
                  }
                }
              } else if (buyCheck.reason) {
                const sizingIsQuoteInsufficient = this.shouldTreatGridBuySizingRejectAsQuoteInsufficient({
                  check: buyCheck,
                  price: buyPrice,
                  bufferFactor,
                  quoteSpendable
                });
                if (sizingIsQuoteInsufficient) {
                  const summary = `Skip ${candidateSymbol}: Insufficient spendable ${candidateQuoteAsset} for grid BUY`;
                  const baseCooldownMs = this.deriveNoActionSymbolCooldownMs(risk);
                  const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
                  const cooldownMs = cooldown.cooldownMs;
                  const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
                  const next = {
                    ...current,
                    activeOrders: current.activeOrders,
                    orderHistory: current.orderHistory,
                    decisions: alreadyLogged
                      ? current.decisions
                      : [
                          {
                            id: crypto.randomUUID(),
                            ts: new Date().toISOString(),
                            kind: "SKIP",
                            summary,
                            details: {
                              ...buyCheck,
                              desiredQty: Number(qty.toFixed(8)),
                              maxAffordableQty: Number(maxAffordableQty.toFixed(8)),
                              limitPrice: buyPriceNorm.normalizedPrice,
                              quoteFree: Number(quoteFree.toFixed(6)),
                              quoteSpendable: Number(quoteSpendable.toFixed(6)),
                              reserveHardTarget: Number(reserveHardTarget.toFixed(6)),
                              reserveLowTarget: Number(reserveLowTarget.toFixed(6)),
                              derivedFromSizingReject: true,
                              ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                              cooldownMs
                            }
                          },
                          ...current.decisions
                        ].slice(0, 200),
                    lastError: undefined
                  } satisfies BotState;
                  pendingNoActionState = this.upsertProtectionLock(next, {
                    type: "COOLDOWN",
                    scope: "SYMBOL",
                    symbol: candidateSymbol,
                    reason: cooldown.storm
                      ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                      : `Cooldown after grid quote insufficiency (${Math.round(cooldownMs / 1000)}s)`,
                    expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                    details: {
                      category: "GRID_BUY_QUOTE_INSUFFICIENT",
                      cooldownMs,
                      limitPrice: buyPriceNorm.normalizedPrice,
                      derivedFromSizingReject: true,
                      ...(cooldown.storm ? { storm: cooldown.storm } : {})
                    }
                  });
                  pendingNoActionState = this.maybeApplyReasonQuarantineLock({ state: pendingNoActionState, summary, risk });
                } else {
                const summary = `Skip ${candidateSymbol}: Grid buy sizing rejected (${buyCheck.reason})`;
                const baseCooldownMs = Math.max(
                  this.deriveNoActionSymbolCooldownMs(risk),
                  this.deriveGridSizingRejectCooldownMs({ risk, side: "BUY", reason: buyCheck.reason })
                );
                const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
                const cooldownMs = cooldown.cooldownMs;
                const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
                const next = {
                  ...current,
                  activeOrders: current.activeOrders,
                  orderHistory: current.orderHistory,
                  decisions: alreadyLogged
                    ? current.decisions
                    : [
                        {
                          id: crypto.randomUUID(),
                          ts: new Date().toISOString(),
                          kind: "SKIP",
                          summary,
                          details: {
                            ...buyCheck,
                            desiredQty: Number(qty.toFixed(8)),
                            maxAffordableQty: Number(maxAffordableQty.toFixed(8)),
                            limitPrice: buyPriceNorm.normalizedPrice,
                            quoteFree: Number(quoteFree.toFixed(6)),
                            quoteSpendable: Number(quoteSpendable.toFixed(6)),
                            reserveHardTarget: Number(reserveHardTarget.toFixed(6)),
                            reserveLowTarget: Number(reserveLowTarget.toFixed(6)),
                            ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                            cooldownMs
                          }
                        },
                        ...current.decisions
                      ].slice(0, 200),
                  lastError: undefined
                } satisfies BotState;
                pendingNoActionState = this.upsertProtectionLock(next, {
                  type: "COOLDOWN",
                  scope: "SYMBOL",
                  symbol: candidateSymbol,
                  reason: cooldown.storm
                    ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                    : `Cooldown after grid buy sizing reject (${Math.round(cooldownMs / 1000)}s)`,
                  expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                  details: {
                    category: "GRID_BUY_SIZING_REJECT",
                    cooldownMs,
                    reason: buyCheck.reason,
                    limitPrice: buyPriceNorm.normalizedPrice,
                    ...(cooldown.storm ? { storm: cooldown.storm } : {})
                  }
                });
                pendingNoActionState = this.maybeApplyReasonQuarantineLock({ state: pendingNoActionState, summary, risk });
                }
              }
              }
            }

            if (!hasSellLimit && Number.isFinite(sellLimitPrice) && sellLimitPrice > 0) {
              const desiredSellQty = Math.min(baseFree, qty);
              if (Number.isFinite(desiredSellQty) && desiredSellQty > 0) {
                const sellPriceNorm = await this.marketData.normalizeLimitPrice(candidateSymbol, sellLimitPrice, "SELL");
                if (!sellPriceNorm.ok) {
                  const summary = `Skip ${candidateSymbol}: Grid sell price invalid (${sellPriceNorm.reason})`;
                  const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
                  const next = {
                    ...current,
                    activeOrders: current.activeOrders,
                    orderHistory: current.orderHistory,
                    decisions: alreadyLogged
                      ? current.decisions
                      : [
                          {
                            id: crypto.randomUUID(),
                            ts: new Date().toISOString(),
                            kind: "SKIP",
                            summary,
                            details: { ...sellPriceNorm, desiredPrice: sellLimitPrice }
                          },
                          ...current.decisions
                        ].slice(0, 200),
                    lastError: undefined
                  } satisfies BotState;
                  this.save(next);
                  return;
                }

                const sellCheck = await this.marketData.validateLimitOrderQty(candidateSymbol, desiredSellQty, sellPriceNorm.normalizedPrice);
                const sellQtyStr = sellCheck.ok ? sellCheck.normalizedQty : sellCheck.requiredQty;
                const sellQty = sellQtyStr ? Number.parseFloat(sellQtyStr) : Number.NaN;
                if (sellQtyStr && Number.isFinite(sellQty) && sellQty > 0 && sellQty <= desiredSellQty + 1e-8) {
                  setLiveOperation({
                    stage: "grid-sell-limit",
                    symbol: candidateSymbol,
                    side: "SELL",
                    asset: candidateBaseAsset,
                    required: sellQty
                  });
                  const sellFunds = await ensureFundsBeforeOrder({ asset: candidateBaseAsset, required: sellQty });
                  if (!sellFunds.ok) {
                    const nextWithInsufficient = buildInsufficientFundsSkipState({
                      symbol: candidateSymbol,
                      stage: "grid-sell-limit",
                      side: "SELL",
                      asset: candidateBaseAsset,
                      required: sellQty,
                      available: sellFunds.available,
                      details: {
                        desiredQty: Number(desiredSellQty.toFixed(8)),
                        normalizedQty: sellQtyStr,
                        limitPrice: sellPriceNorm.normalizedPrice,
                        refreshedBalances: sellFunds.refreshed
                      }
                    });
                    if (!pendingNoActionState) pendingNoActionState = nextWithInsufficient;
                  } else {
                    const sellOrder = await this.trading.placeSpotLimitOrder({
                      symbol: candidateSymbol,
                      side: "SELL",
                      quantity: sellQtyStr,
                      price: sellPriceNorm.normalizedPrice,
                      timeInForce: "GTC",
                      clientOrderId: config ? this.buildBotClientOrderId({ config, purpose: "GRID", side: "SELL" }) : undefined
                    });
                    persistLiveTrade({
                      symbol: candidateSymbol,
                      side: "SELL",
                      requestedQty: sellQtyStr,
                      fallbackQty: sellQty,
                      response: sellOrder,
                      reason: "grid-ladder-sell",
                      details: {
                        mode: "grid-ladder",
                        gridSide: "SELL",
                        anchorPrice: Number(price.toFixed(8)),
                        gridSpacingPct: Number(gridSpacingPct.toFixed(6)),
                        limitPrice: sellPriceNorm.normalizedPrice,
                        validation: {
                          ok: sellCheck.ok,
                          normalizedQty: sellCheck.normalizedQty,
                          requiredQty: sellCheck.requiredQty,
                          notional: sellCheck.notional,
                          minNotional: sellCheck.minNotional
                        }
                      }
                    });
                    placedGridOrder = true;
                  }
                } else if (sellCheck.reason) {
                  const summary = `Skip ${candidateSymbol}: Grid sell sizing rejected (${sellCheck.reason})`;
                  const baseCooldownMs = Math.max(
                    this.deriveNoActionSymbolCooldownMs(risk),
                    this.deriveGridSizingRejectCooldownMs({ risk, side: "SELL", reason: sellCheck.reason })
                  );
                  const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
                  const cooldownMs = cooldown.cooldownMs;
                  const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
                  const next = {
                    ...current,
                    activeOrders: current.activeOrders,
                    orderHistory: current.orderHistory,
                    decisions: alreadyLogged
                      ? current.decisions
                      : [
                          {
                            id: crypto.randomUUID(),
                            ts: new Date().toISOString(),
                            kind: "SKIP",
                            summary,
                            details: {
                              ...sellCheck,
                              desiredQty: Number(desiredSellQty.toFixed(8)),
                              baseFree: Number(baseFree.toFixed(8)),
                              limitPrice: sellPriceNorm.normalizedPrice,
                              ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                              cooldownMs
                            }
                          },
                          ...current.decisions
                        ].slice(0, 200),
                    lastError: undefined
                  } satisfies BotState;
                  const nextWithCooldown = this.upsertProtectionLock(next, {
                    type: "COOLDOWN",
                    scope: "SYMBOL",
                    symbol: candidateSymbol,
                    reason: cooldown.storm
                      ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                      : `Cooldown after grid sell sizing reject (${Math.round(cooldownMs / 1000)}s)`,
                    expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                    details: {
                      category: "GRID_SELL_SIZING_REJECT",
                      cooldownMs,
                      reason: sellCheck.reason,
                      limitPrice: sellPriceNorm.normalizedPrice,
                      ...(cooldown.storm ? { storm: cooldown.storm } : {})
                    }
                  });
                  const withReasonQuarantine = this.maybeApplyReasonQuarantineLock({ state: nextWithCooldown, summary, risk });
                  if (!pendingNoActionState) pendingNoActionState = withReasonQuarantine;
                }
              }
            }

            if (placedGridOrder) {
              return;
            }

            if (pendingNoActionState) {
              this.save(pendingNoActionState);
              return;
            }

            if (buyPaused && !hasSellLimit && (!Number.isFinite(baseFree) || baseFree <= 0)) {
              const summary = `Skip ${candidateSymbol}: Grid guard active (no inventory to sell)`;
              const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
              const baseCooldownMs = Math.max(
                this.deriveNoActionSymbolCooldownMs(risk),
                this.deriveGridGuardNoInventoryCooldownMs(risk)
              );
              const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
              const cooldownMs = cooldown.cooldownMs;
              const next = {
                ...current,
                decisions: alreadyLogged
                  ? current.decisions
                  : [
                      {
                        id: crypto.randomUUID(),
                        ts: new Date().toISOString(),
                        kind: "SKIP",
                        summary,
                        details: {
                          baseFree: Number((Number.isFinite(baseFree) ? baseFree : 0).toFixed(8)),
                          cooldownMs,
                          regime,
                          pauseConfidenceThreshold,
                          ...(cooldown.storm ? { storm: cooldown.storm } : {})
                        }
                      },
                      ...current.decisions
                    ].slice(0, 200),
                lastError: undefined
              } satisfies BotState;
              const nextWithCooldown = this.upsertProtectionLock(next, {
                type: "COOLDOWN",
                scope: "SYMBOL",
                symbol: candidateSymbol,
                reason: cooldown.storm
                  ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                  : `Grid guard active; rotating away (${Math.round(cooldownMs / 1000)}s)`,
                expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                details: {
                  category: "GRID_GUARD_ROTATE",
                  cooldownMs,
                  regime,
                  pauseConfidenceThreshold,
                  ...(cooldown.storm ? { storm: cooldown.storm } : {})
                }
              });
              this.save(nextWithCooldown);
              return;
            }

            const summary = `Skip ${candidateSymbol}: Grid waiting for ladder slot or inventory`;
            const nowMs = Date.now();
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const lastSimilar = current.decisions.find((d) => d.kind === "SKIP" && d.summary === summary);
            const lastSimilarAt = lastSimilar ? Date.parse(lastSimilar.ts) : Number.NaN;
            const waitingThrottleMs = 60_000;
            const throttled = Number.isFinite(lastSimilarAt) && nowMs - lastSimilarAt < waitingThrottleMs;
            const baseCooldownMs = this.deriveGridWaitingRotationCooldownMs({
              risk,
              hasBuyLimit,
              hasSellLimit,
              staleTtlMinutes: config?.advanced.botOrderStaleTtlMinutes
            });
            const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
            const cooldownMs = cooldown.cooldownMs;
            const next = {
              ...current,
              decisions: alreadyLogged || throttled
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        hasBuyLimit,
                        hasSellLimit,
                        openLimitOrders: symbolOpenLimits.length,
                        maxGridOrdersPerSymbol,
                        ...(cooldown.storm ? { storm: cooldown.storm } : {}),
                        cooldownMs
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            const applyWaitingCooldown = cooldown.storm || hasBuyLimit || hasSellLimit;
            if (applyWaitingCooldown) {
              const nextWithCooldown = this.upsertProtectionLock(next, {
                type: "COOLDOWN",
                scope: "SYMBOL",
                symbol: candidateSymbol,
                reason: cooldown.storm
                  ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                  : `Grid ladder waiting; rotating away (${Math.round(cooldownMs / 1000)}s)`,
                expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                details: {
                  category: "GRID_WAIT_ROTATE",
                  cooldownMs,
                  hasBuyLimit,
                  hasSellLimit,
                  openLimitOrders: symbolOpenLimits.length,
                  ...(cooldown.storm ? { storm: cooldown.storm } : {})
                }
              });
              this.save(nextWithCooldown);
              return;
            }
            this.save(next);
            return;
          }

          if (cautionPauseNewSymbols) {
            const summary = `Skip ${candidateSymbol}: Daily loss caution paused MARKET entry`;
            const baseCooldownMs = Math.max(this.deriveNoActionSymbolCooldownMs(risk), this.deriveCautionEntryPauseCooldownMs(risk));
            const cooldown = this.deriveInfeasibleSymbolCooldown({ state: current, symbol: candidateSymbol, risk, baseCooldownMs, summary });
            const cooldownMs = cooldown.cooldownMs;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [
                    {
                      id: crypto.randomUUID(),
                      ts: new Date().toISOString(),
                      kind: "SKIP",
                      summary,
                      details: {
                        stage: "daily-loss-caution-market-entry",
                        candidateSymbol,
                        riskState: dailyLossGuard.state,
                        trigger: dailyLossGuard.trigger,
                        dailyRealizedPnl: dailyLossGuard.dailyRealizedPnl,
                        maxDailyLossAbs: dailyLossGuard.maxDailyLossAbs,
                        maxDailyLossPct: dailyLossGuard.maxDailyLossPct,
                        managedExposurePct: dailyLossGuard.managedExposurePct,
                        cautionManagedSymbolOnlyMinExposurePct: cautionPauseNewSymbolsMinExposurePct,
                        cautionPauseNewSymbolsMinExposurePct,
                        lookbackMs: dailyLossGuard.lookbackMs,
                        windowStart: dailyLossGuard.windowStartIso,
                        cooldownMs
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            const nextWithCooldown = this.upsertProtectionLock(next, {
              type: "COOLDOWN",
              scope: "SYMBOL",
              symbol: candidateSymbol,
              reason: `Daily loss caution paused market entry (${Math.round(cooldownMs / 1000)}s)`,
              expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
              details: {
                category: "DAILY_LOSS_CAUTION_MARKET_ENTRY",
                cooldownMs,
                riskState: dailyLossGuard.state
              }
            });
            this.save(nextWithCooldown);
            return;
          }

          let entryQtyStr = qtyStr;
          let entryQty = qty;
          let retriedSizing = false;
          while (true) {
            const entryRequiredQuote = entryQty * price * bufferFactor;
            setLiveOperation({
              stage: "entry-market-buy",
              symbol: candidateSymbol,
              side: "BUY",
              asset: candidateQuoteAsset,
              required: entryRequiredQuote
            });
            const entryFunds = await ensureFundsBeforeOrder({ asset: candidateQuoteAsset, required: entryRequiredQuote });
            if (!entryFunds.ok) {
              const nextWithInsufficient = buildInsufficientFundsSkipState({
                symbol: candidateSymbol,
                stage: "entry-market-buy",
                side: "BUY",
                asset: candidateQuoteAsset,
                required: entryRequiredQuote,
                available: entryFunds.available,
                details: {
                  desiredQty: Number(qty.toFixed(8)),
                  normalizedQty: entryQtyStr,
                  price: Number(price.toFixed(8)),
                  bufferFactor,
                  retriedSizing,
                  refreshedBalances: entryFunds.refreshed
                }
              });
              this.save(nextWithInsufficient);
              return;
            }

            try {
              const res = await this.trading.placeSpotMarketOrder({ symbol: candidateSymbol, side: "BUY", quantity: entryQtyStr });
              persistLiveTrade({
                symbol: candidateSymbol,
                side: "BUY",
                requestedQty: entryQtyStr,
                fallbackQty: entryQty,
                response: res,
                reason: retriedSizing ? "entry-retry-sizing" : "entry"
              });
              break;
            } catch (entryErr) {
              const msg = entryErr instanceof Error ? entryErr.message : String(entryErr);
              const canRetrySizing = !retriedSizing && this.isSizingFilterError(msg);
              if (!canRetrySizing) {
                throw entryErr;
              }

              const retryCheck = await this.marketData.validateMarketOrderQty(candidateSymbol, entryQty * 1.03);
              const retryQtyStr = retryCheck.ok ? retryCheck.normalizedQty : retryCheck.requiredQty;
              const retryQty = retryQtyStr ? Number.parseFloat(retryQtyStr) : Number.NaN;
              const retryBufferedCost = retryQty * price * bufferFactor;
              if (!retryQtyStr || !Number.isFinite(retryQty) || retryQty <= entryQty || retryBufferedCost > quoteFree) {
                throw entryErr;
              }

              entryQtyStr = retryQtyStr;
              entryQty = retryQty;
              retriedSizing = true;
            }
          }
          return;
        } catch (err) {
          const rawMsg = err instanceof Error ? err.message : String(err);
          const safeMsg = this.sanitizeUserErrorMessage(rawMsg);
          const transient = this.isTransientExchangeError(rawMsg);
          const sizingFilterError = this.isSizingFilterError(rawMsg);
          const insufficientBalanceError = this.isInsufficientBalanceError(rawMsg);
          const operationStage = liveOperation.stage || "unknown";
          const operationSide = liveOperation.side;
          const operationSymbol = liveOperation.symbol?.trim().toUpperCase() || candidateSymbol;
          const operationTag = operationSide ? `${operationStage}:${operationSide}` : operationStage;
          const recentInsufficientCount = insufficientBalanceError
            ? this.countRecentSymbolErrorSkips({
                state: current,
                symbol: operationSymbol,
                matcher: /INSUFFICIENT BALANCE/i,
                windowMs: 30 * 60_000
              }) + 1
            : 0;
          const backoffDetails = transient ? this.registerTransientExchangeError(rawMsg, safeMsg) : null;
          const summary = sizingFilterError
            ? `Skip ${operationSymbol}: Binance sizing filter (${safeMsg})`
            : transient
              ? `Skip ${operationSymbol}: Temporary exchange/network issue (${safeMsg})`
              : `Order rejected (${operationTag}) for ${operationSymbol} (${envLabel}): ${safeMsg}`;
          const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
          const decisionDetails: Record<string, unknown> = {
            stage: operationStage,
            ...(operationSide ? { side: operationSide } : {}),
            ...(liveOperation.asset ? { asset: liveOperation.asset } : {}),
            ...(Number.isFinite(liveOperation.required) ? { required: Number((liveOperation.required ?? 0).toFixed(8)) } : {}),
            ...(Number.isFinite(liveOperation.available) ? { available: Number((liveOperation.available ?? 0).toFixed(8)) } : {}),
            ...(insufficientBalanceError ? { insufficientBalanceRejectCount30m: recentInsufficientCount } : {})
          };
          const skipDecision = {
            id: crypto.randomUUID(),
            ts: new Date().toISOString(),
            kind: "SKIP",
            summary,
            details: {
              ...decisionDetails,
              ...(backoffDetails
                ? {
                    backoffMs: backoffDetails.pauseMs,
                    pauseUntil: backoffDetails.pauseUntilIso,
                    errorCount: backoffDetails.errorCount,
                    lastErrorCode: backoffDetails.lastErrorCode
                  }
                : {})
            }
          } satisfies Decision;
	          let nextState: BotState = {
	            ...current,
	            lastError: safeMsg,
	            decisions: alreadyLogged
	              ? current.decisions
	              : [skipDecision, ...current.decisions].slice(0, 200)
	          };

          if (sizingFilterError) {
            const boundedRisk = Math.max(0, Math.min(100, config?.basic.risk ?? 50));
            const sizingCooldownMs = Math.round(120_000 - (boundedRisk / 100) * 80_000); // 120s -> 40s
            nextState = this.upsertProtectionLock(nextState, {
              type: "COOLDOWN",
              scope: "SYMBOL",
              symbol: operationSymbol,
              reason: `Sizing cooldown after Binance filter error (${Math.round(sizingCooldownMs / 1000)}s)`,
              expiresAt: new Date(Date.now() + sizingCooldownMs).toISOString(),
              details: {
                category: "SIZING_FILTER",
                cooldownMs: sizingCooldownMs,
                exchangeError: safeMsg
              }
            });
          }

          if (insufficientBalanceError) {
            const baseCooldownMs = Math.max(this.deriveNoActionSymbolCooldownMs(risk), 60_000);
            const repeatMultiplier = Math.max(1, Math.min(4, recentInsufficientCount));
            const insufficientBaseCooldownMs = baseCooldownMs * repeatMultiplier;
            const cooldown = this.deriveInfeasibleSymbolCooldown({
              state: current,
              symbol: operationSymbol,
              risk,
              baseCooldownMs: insufficientBaseCooldownMs,
              summary
            });
            const cooldownMs = Math.max(cooldown.cooldownMs, insufficientBaseCooldownMs);
            nextState = this.upsertProtectionLock(nextState, {
              type: "COOLDOWN",
              scope: "SYMBOL",
              symbol: operationSymbol,
              reason: cooldown.storm
                ? `Skip storm (${cooldown.storm.count}/${cooldown.storm.threshold}): ${cooldown.storm.problem} (${Math.round(cooldownMs / 1000)}s)`
                : `Cooldown after insufficient balance (${operationTag}, ${Math.round(cooldownMs / 1000)}s)`,
              expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
              details: {
                category: "INSUFFICIENT_BALANCE",
                stage: operationStage,
                ...(operationSide ? { side: operationSide } : {}),
                cooldownMs,
                recentCount30m: recentInsufficientCount,
                ...(cooldown.storm ? { storm: cooldown.storm } : {})
              }
            });
          }

          if (config?.advanced.autoBlacklistEnabled && this.shouldAutoBlacklistError(rawMsg)) {
            const baseTtlMinutes = config.advanced.autoBlacklistTtlMinutes ?? 180;
            const ttlMinutes = insufficientBalanceError
              ? this.deriveInsufficientBalanceBlacklistTtlMinutes(baseTtlMinutes, recentInsufficientCount)
              : baseTtlMinutes;
            const now = new Date();
            nextState = this.addSymbolBlacklist(nextState, {
              symbol: operationSymbol,
              reason: safeMsg.slice(0, 120),
              createdAt: now.toISOString(),
              expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString()
            });
          }

          this.save(nextState);
          return;
        }
      }

      // Paper mode (stub execution)
      const orderStatusRoll = Math.random();
      const status: Order["status"] = orderStatusRoll < 0.35 ? "FILLED" : "NEW";
      const desiredQty = 0.001;
      let normalizedQty = desiredQty;
      try {
        const check = await this.marketData.validateMarketOrderQty(candidateSymbol, desiredQty);
        if (!check.ok) {
          if (check.requiredQty) {
            const req = Number.parseFloat(check.requiredQty);
            if (Number.isFinite(req) && req > 0) {
              normalizedQty = req;
            } else {
              const summary = `Skip ${candidateSymbol}: Invalid suggested qty for minNotional`;
              const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
              const next = {
                ...current,
                activeOrders: filled.activeOrders,
                orderHistory: filled.orderHistory,
                decisions: alreadyLogged
                  ? current.decisions
                  : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
              } satisfies BotState;
              this.save(next);
              return;
            }
          } else {
            const reason = check.reason ?? "Binance min order constraints";
            const details =
              check.minNotional || check.notional || check.price
                ? ` (${[
                    check.minNotional ? `minNotional ${check.minNotional}` : null,
                    check.notional ? `notional ${check.notional}` : null,
                    check.price ? `price ${check.price}` : null
                  ]
                    .filter(Boolean)
                    .join(" · ")})`
                : "";
            const summary = `Skip ${candidateSymbol}: ${reason}${details}`;
            const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
            const next = {
              ...current,
              activeOrders: filled.activeOrders,
              orderHistory: filled.orderHistory,
              decisions: alreadyLogged
                ? current.decisions
                : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
            } satisfies BotState;
            this.save(next);
            return;
          }
        }
        if (check.normalizedQty) {
          normalizedQty = Number.parseFloat(check.normalizedQty);
        }
      } catch {
        // ignore in paper mode
      }

      const order: Order = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        symbol: candidateSymbol,
        side: "BUY",
        type: "MARKET",
        status,
        qty: normalizedQty
      };

      const decisionSummary =
        status === "FILLED" ? `Order filled (stub) for ${candidateSymbol}` : `Placed a stub order candidate for ${candidateSymbol}`;

      let nextState: BotState = {
        ...current,
        decisions: [
          {
            id: crypto.randomUUID(),
            ts: new Date().toISOString(),
            kind: "PAPER",
            summary:
              aiEnabled && aiConfidence !== null
                ? `${decisionSummary} (paper · AI ${aiConfidence}%)`
                : `${decisionSummary} (paper)`
          },
          ...current.decisions
        ].slice(0, 200),
        activeOrders: filled.activeOrders,
        orderHistory: filled.orderHistory,
        lastError: undefined
      };

      if (status === "NEW") {
        nextState = { ...nextState, activeOrders: [order, ...nextState.activeOrders].slice(0, 50) };
      } else {
        nextState = { ...nextState, orderHistory: [order, ...nextState.orderHistory].slice(0, 200) };
      }

      this.save(nextState);
    } finally {
      const afterState = this.getState();
      this.persistBaselineStats(afterState);
      if (tickContext) {
        this.persistShadowTelemetry({
          beforeDecisionIds,
          afterState,
          tickContext,
          tickStartedAtMs
        });
      }
      this.tickInFlight = false;
    }
  }

  async stop(): Promise<void> {
    let state = this.getState();
    if (!state.running) return;

    // Stop the loop first; then cancel bot-owned open orders best-effort.
    this.addDecision("ENGINE", "Stop requested");

    if (this.loopTimer) clearInterval(this.loopTimer);
    if (this.examineTimer) clearTimeout(this.examineTimer);
    this.loopTimer = null;
    this.examineTimer = null;

    state = this.getState();
    this.save({
      ...state,
      running: false,
      phase: "STOPPED"
    });

    const config = this.configService.load();
    if (config?.advanced.autoCancelBotOrdersOnStop) {
      const prefix = this.resolveBotOrderClientIdPrefix(config);
      const waitUntil = Date.now() + 5_000;
      while (this.tickInFlight && Date.now() < waitUntil) {
        await new Promise((r) => setTimeout(r, 100));
      }

      const stoppedState = this.getState();
      const botOwnedOpenOrders = stoppedState.activeOrders.filter(
        (order) => order.status === "NEW" && this.isBotOwnedOrder(order, prefix)
      );
      if (botOwnedOpenOrders.length === 0) {
        this.persistBaselineStats(stoppedState);
        return;
      }

      try {
        const next = await this.cancelBotOwnedOpenOrders({
          config,
          state: stoppedState,
          orders: botOwnedOpenOrders,
          reason: "stop",
          details: {
            stage: "stop"
          },
          maxCancels: 50
        });
        this.save({
          ...next,
          running: false,
          phase: "STOPPED"
        });
      } catch (cancelErr) {
        const rawMsg = cancelErr instanceof Error ? cancelErr.message : String(cancelErr);
        const safeMsg = this.sanitizeUserErrorMessage(rawMsg);
        const summary = "Stop: failed to cancel bot open orders";
        const latest = this.getState();
        const alreadyLogged = latest.decisions[0]?.kind === "ENGINE" && latest.decisions[0]?.summary === summary;
        const withDecision: BotState = {
          ...latest,
          lastError: safeMsg,
          decisions: alreadyLogged
            ? latest.decisions
            : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "ENGINE", summary }, ...latest.decisions].slice(0, 200)
        };
        this.save({
          ...withDecision,
          running: false,
          phase: "STOPPED"
        });
      }
    }

    this.persistBaselineStats(this.getState());
  }

  addDecision(kind: Decision["kind"], summary: Decision["summary"]): void {
    const state = this.getState();
    const decision: Decision = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind,
      summary
    };
    this.save({ ...state, decisions: [decision, ...state.decisions].slice(0, 500) });
    this.persistBaselineStats(this.getState());
  }
}
