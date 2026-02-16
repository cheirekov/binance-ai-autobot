import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Injectable, OnModuleInit } from "@nestjs/common";
import type { AppConfig, BotState, Decision, Order, ProtectionLockEntry, SymbolBlacklistEntry, UniverseCandidate } from "@autobot/shared";
import { BotStateSchema, defaultBotState } from "@autobot/shared";

import { ConfigService } from "../config/config.service";
import { resolveRouteBridgeAssets } from "../config/asset-routing";
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
    conversionTradePct: number;
    entryTradePct: number;
    sizingRejectSkipPct: number;
    buyNotional: number;
    sellNotional: number;
    realizedPnl: number;
    openExposureCost: number;
    openPositions: number;
  };
  byDecisionKind: Record<string, number>;
  topSkipSummaries: Array<{ summary: string; count: number }>;
  symbols: BaselineSymbolStats[];
};

type TickTelemetryContext = {
  tickStartedAtIso: string;
  homeStableCoin: string;
  liveTrading: boolean;
  risk: number;
  candidateSymbol: string;
  candidate: UniverseCandidate | null;
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
  lowProfitLookbackMs: number;
  lowProfitTradeLimit: number;
  lowProfitThresholdPct: number;
  lowProfitLockMs: number;
};

export type BotRunStatsResponse = {
  generatedAt: string;
  kpi: BaselineRunStats | null;
  adaptiveShadowTail: AdaptiveShadowEvent[];
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

  private getActiveGlobalProtectionLock(state: BotState): ProtectionLockEntry | null {
    const now = Date.now();
    return (
      (state.protectionLocks ?? []).find(
        (lock) => lock.scope === "GLOBAL" && Number.isFinite(Date.parse(lock.expiresAt)) && Date.parse(lock.expiresAt) > now
      ) ?? null
    );
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
      lowProfitLookbackMs: Math.round((180 - t * 135) * 60_000), // 180m -> 45m
      lowProfitTradeLimit: Math.max(2, Math.round(2 + t * 3)), // 2 -> 5
      lowProfitThresholdPct: Number((-0.5 - t * 2).toFixed(2)), // -0.5% -> -2.5%
      lowProfitLockMs: Math.round((120 - t * 90) * 60_000) // 120m -> 30m
    };
  }

  private deriveNoActionSymbolCooldownMs(risk: number): number {
    const boundedRisk = Math.max(0, Math.min(100, Number.isFinite(risk) ? risk : 50));
    const t = boundedRisk / 100;
    // Used to avoid cycling on repeatedly infeasible symbols (quote shortfalls, dust sell constraints, etc.).
    // Lower risk = longer cooldown (less thrash), higher risk = shorter cooldown (more aggressive rotation).
    return Math.round(90_000 - t * 75_000); // 90s -> 15s
  }

  private getSkipStormKey(summary: string): string | null {
    const raw = summary.trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    if (!lower.startsWith("skip ")) return null;
    if (lower.startsWith("skip:")) return null; // global skips, not symbol-specific
    if (lower.includes("waiting for ladder slot or inventory")) return null; // normal idle state

    const key = (lower.includes("(") ? lower.slice(0, lower.indexOf("(")) : lower).trim();
    const eligible =
      key.includes("sizing rejected") ||
      key.includes("insufficient") ||
      key.includes("conversion cooldown") ||
      key.includes("binance sizing filter") ||
      key.includes("temporarily blacklisted") ||
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
    const windowMs = 2 * 60_000;
    const threshold = Math.max(2, Math.round(4 - t * 2)); // risk 0 -> 4, risk 100 -> 2
    const stormCooldownMs = Math.round(60_000 + t * 180_000); // risk 0 -> 60s, risk 100 -> 240s

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

    const symbolLock = this.getActiveSymbolProtectionLock(state, symbol, { excludeTypes: ["GRID_GUARD_BUY_PAUSE"] });
    if (symbolLock) {
      return `Protection lock ${symbolLock.type}: ${symbolLock.reason}`;
    }

    const now = Date.now();
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

  private pickExposureEligibleCandidate(params: {
    preferredCandidate: UniverseCandidate | null;
    snapshotCandidates: UniverseCandidate[];
    state: BotState;
    homeStable: string;
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
      homeStable,
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

      if (candidate.quoteAsset.trim().toUpperCase() !== homeStable) continue;
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
    traderRegion: string;
    neverTradeSymbols: string[];
    excludeStableStablePairs: boolean;
    enforceRegionPolicy: boolean;
    balances: BinanceBalanceSnapshot[];
    walletTotalHome: number;
    maxPositionPct: number;
    quoteFree: number;
    notionalCap: number;
    capitalNotionalCapMultiplier: number;
    bufferFactor: number;
  }): Promise<{
    candidate: UniverseCandidate | null;
    reason?: string;
    sizingRejected: number;
    rejectionSamples: Array<{
      symbol: string;
      stage: string;
      reason: string;
      price?: number;
      targetNotional?: number;
      desiredQty?: number;
      normalizedQty?: string;
      requiredQty?: string;
      bufferedCost?: number;
      remainingSymbolNotional?: number;
      effectiveNotionalCap?: number;
    }>;
  }> {
    const {
      preferredCandidate,
      snapshotCandidates,
      state,
      homeStable,
      traderRegion,
      neverTradeSymbols,
      excludeStableStablePairs,
      enforceRegionPolicy,
      balances,
      walletTotalHome,
      maxPositionPct,
      quoteFree,
      notionalCap,
      capitalNotionalCapMultiplier,
      bufferFactor
    } = params;

    const pool = [preferredCandidate, ...snapshotCandidates].filter(Boolean) as UniverseCandidate[];
    const seen = new Set<string>();
    const maxSymbolNotional = walletTotalHome * (maxPositionPct / 100);
    if (!Number.isFinite(maxSymbolNotional) || maxSymbolNotional <= 0) {
      return { candidate: null, reason: "Max symbol exposure is zero", sizingRejected: 0, rejectionSamples: [] };
    }

    const effectiveNotionalCap =
      Number.isFinite(notionalCap) && notionalCap > 0 ? Math.max(1, notionalCap * capitalNotionalCapMultiplier) : null;
    const capForSizing = effectiveNotionalCap ? effectiveNotionalCap / bufferFactor : null;
    const rawTargetNotional = walletTotalHome * (maxPositionPct / 100);
    let sizingRejected = 0;
    const rejectionSamples: Array<{
      symbol: string;
      stage: string;
      reason: string;
      price?: number;
      targetNotional?: number;
      desiredQty?: number;
      normalizedQty?: string;
      requiredQty?: string;
      bufferedCost?: number;
      remainingSymbolNotional?: number;
      effectiveNotionalCap?: number;
    }> = [];

    const recordRejection = (sample: (typeof rejectionSamples)[number]): void => {
      if (rejectionSamples.length >= 8) return;
      rejectionSamples.push(sample);
    };

    for (const candidate of pool) {
      const symbol = candidate.symbol.trim().toUpperCase();
      if (!symbol || seen.has(symbol)) continue;
      seen.add(symbol);

      if (candidate.quoteAsset.trim().toUpperCase() !== homeStable) continue;
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

      let check: MarketQtyValidation | null = null;
      try {
        const rules = await this.marketData.getSymbolRules(symbol);
        if (rules.quoteAsset.trim().toUpperCase() !== homeStable) continue;

        let price = Number.isFinite(candidate.lastPrice) ? candidate.lastPrice : Number.NaN;
        if (!Number.isFinite(price) || price <= 0) {
          const priceStr = await this.marketData.getTickerPrice(symbol);
          const parsed = Number.parseFloat(priceStr);
          price = Number.isFinite(parsed) ? parsed : Number.NaN;
        }
        if (!Number.isFinite(price) || price <= 0) continue;

        const baseAsset = rules.baseAsset.trim().toUpperCase();
        const baseTotal = balances.find((b) => b.asset.trim().toUpperCase() === baseAsset)?.total ?? 0;
        const currentNotional = Number.isFinite(baseTotal) && baseTotal > 0 ? baseTotal * price : 0;
        const remainingSymbolNotional = Math.max(0, maxSymbolNotional - currentNotional);
        if (remainingSymbolNotional <= 0) continue;

        const targetNotional = Math.min(rawTargetNotional, capForSizing ?? rawTargetNotional, quoteFree, remainingSymbolNotional);
        if (!Number.isFinite(targetNotional) || targetNotional <= 0) continue;

        const desiredQty = targetNotional / price;
        check = await this.marketData.validateMarketOrderQty(symbol, desiredQty);
        const qtyStr = check.ok ? check.normalizedQty : check.requiredQty;
        if (!qtyStr) {
          sizingRejected += 1;
          recordRejection({
            symbol,
            stage: "validate-qty",
            reason: check.reason ?? "No qty returned",
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

  private mapBinanceStatus(status: string | undefined): Order["status"] {
    const normalized = (status ?? "").trim().toUpperCase();
    if (normalized === "FILLED") return "FILLED";
    if (normalized === "NEW" || normalized === "PARTIALLY_FILLED") return "NEW";
    if (normalized === "CANCELED" || normalized === "EXPIRED") return "CANCELED";
    return "REJECTED";
  }

  private resolveBotOrderClientIdPrefix(config: AppConfig | null): string {
    const raw = config?.advanced.botOrderClientIdPrefix ?? "ABOT";
    const trimmed = raw.trim().toUpperCase();
    return trimmed.length >= 3 ? trimmed.slice(0, 12) : "ABOT";
  }

  private isBotOwnedOrder(order: Order, prefix: string): boolean {
    const clientOrderId = typeof order.clientOrderId === "string" ? order.clientOrderId.trim().toUpperCase() : "";
    if (!clientOrderId) return false;
    return clientOrderId.startsWith(`${prefix}-`);
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

  private dedupeOrderHistory(orders: Order[]): Order[] {
    const seen = new Set<string>();
    const out: Order[] = [];
    for (const order of orders) {
      const key = `${order.id}:${order.status}:${order.side}:${order.symbol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(order);
    }
    return out;
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
    if (discoveryMode) {
      // After a state reset we can have real open orders on the exchange but none in `state.activeOrders`.
      // Discover them quickly by scanning a small batch of hint symbols per tick (symbol-scoped; no global fetch).
      const batchSize = Math.min(5, hintSymbols.length);
      const batch: string[] = [];
      for (let i = 0; i < batchSize; i += 1) {
        batch.push(hintSymbols[(this.orderDiscoveryCursor + i) % hintSymbols.length]);
      }
      this.orderDiscoveryCursor += batchSize;
      trackedSymbols = Array.from(new Set(batch));
    }

    if (trackedSymbols.length === 0) return state;

    const openSnapshots = (
      await Promise.all(
        trackedSymbols.map(async (symbol) => {
          return await this.trading.getOpenOrders(symbol);
        })
      )
    ).flat();
    const openOrders = openSnapshots
      .map((snapshot) => this.mapExchangeOrderToStateOrder(snapshot))
      .filter((order): order is Order => Boolean(order))
      .filter((order) => order.status === "NEW")
      .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
    const openById = new Set(openOrders.map((order) => order.id));

    const closedActiveOrders = state.activeOrders.filter((order) => !openById.has(order.id));
    if (closedActiveOrders.length === 0) {
      const summary =
        discoveryMode && openOrders.length > 0
          ? `Synced ${openOrders.length} existing open order(s) (discovery scan: ${trackedSymbols.length} symbol(s))`
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
                        stage: "order-discovery",
                        scannedSymbols: trackedSymbols,
                        foundSymbols: Array.from(new Set(openOrders.map((o) => o.symbol))).slice(0, 12),
                        orderIds: openOrders.map((o) => o.id).slice(0, 20)
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
        label: "UNKNOWN",
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

  private buildAdaptiveStrategyScores(candidate: UniverseCandidate | null, regime: RegimeLabel): AdaptiveStrategyScores {
    const adx = Number.isFinite(candidate?.adx14) ? Math.max(0, candidate?.adx14 ?? 0) : 0;
    const rsi = Number.isFinite(candidate?.rsi14) ? Math.max(0, Math.min(100, candidate?.rsi14 ?? 50)) : 50;
    const atr = Number.isFinite(candidate?.atrPct14) ? Math.max(0, candidate?.atrPct14 ?? 0) : 0;
    const change = Number.isFinite(candidate?.priceChangePct24h) ? Math.abs(candidate?.priceChangePct24h ?? 0) : 0;

    let trend = this.clamp01((adx / 45) * 0.65 + (Math.min(8, change) / 8) * 0.35);
    let meanReversion = this.clamp01((rsi <= 35 || rsi >= 65 ? 0.65 : 0.25) + Math.min(1.2, atr) * 0.25);
    let grid = this.clamp01((regime === "RANGE" ? 0.65 : 0.25) + Math.min(1.4, atr) * 0.2);

    if (regime === "BEAR_TREND") {
      trend *= 0.45;
      meanReversion = this.clamp01(meanReversion + 0.1);
      grid = this.clamp01(grid + 0.08);
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
    let trades = 0;
    let skips = 0;
    let conversions = 0;
    let entryTrades = 0;
    let sizingRejectSkips = 0;

    for (const decision of decisionList) {
      byDecisionKind[decision.kind] = (byDecisionKind[decision.kind] ?? 0) + 1;
      if (decision.kind === "TRADE") {
        trades += 1;
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

    for (const order of filledOrders) {
      const symbol = order.symbol.trim().toUpperCase();
      const qty = Number.isFinite(order.qty) ? Math.max(0, order.qty) : 0;
      const price = Number.isFinite(order.price) ? Math.max(0, order.price ?? 0) : 0;
      const notional = qty > 0 && price > 0 ? qty * price : 0;
      if (qty <= 0) continue;

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
        realizedPnl: this.toRounded(s.realizedPnl, 8)
      }))
      .sort((a, b) => b.buyNotional + b.sellNotional - (a.buyNotional + a.sellNotional))
      .slice(0, 40);

    const realizedPnl = this.toRounded(symbols.reduce((sum, s) => sum + s.realizedPnl, 0), 8);
    const openExposureCost = this.toRounded(symbols.reduce((sum, s) => sum + (s.netQty > 0 ? s.openCost : 0), 0), 8);
    const openPositions = symbols.filter((s) => s.netQty > 0).length;

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
        conversionTradePct: this.toRounded(trades > 0 ? (conversions / trades) * 100 : 0, 4),
        entryTradePct: this.toRounded(trades > 0 ? (entryTrades / trades) * 100 : 0, 4),
        sizingRejectSkipPct: this.toRounded(skips > 0 ? (sizingRejectSkips / skips) * 100 : 0, 4),
        buyNotional: this.toRounded(buyNotional, 8),
        sellNotional: this.toRounded(sellNotional, 8),
        realizedPnl,
        openExposureCost,
        openPositions
      },
      byDecisionKind,
      topSkipSummaries,
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
          parsed.push(JSON.parse(line) as AdaptiveShadowEvent);
        } catch {
          // ignore invalid lines
        }
      }
      return parsed;
    } catch {
      return [];
    }
  }

  getRunStats(): BotRunStatsResponse {
    let kpi: BaselineRunStats | null = null;
    if (fs.existsSync(this.baselineStatsPath)) {
      try {
        const raw = fs.readFileSync(this.baselineStatsPath, "utf-8");
        kpi = JSON.parse(raw) as BaselineRunStats;
      } catch {
        kpi = null;
      }
    } else {
      this.persistBaselineStats(this.getState());
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
      const liveRequested = Boolean(config?.basic.liveTrading);
      const binanceEnvironment = config?.advanced.binanceEnvironment ?? "MAINNET";
      const allowMainnetLiveTrading = String(process.env.ALLOW_MAINNET_LIVE_TRADING ?? "false").toLowerCase() === "true";
      const liveTrading = liveRequested && (binanceEnvironment === "SPOT_TESTNET" || allowMainnetLiveTrading);
      const risk = Math.max(0, Math.min(100, config?.basic.risk ?? 50));
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

          const byHomeQuoteBase = new Map<string, UniverseCandidate>();
          for (const candidate of snap.candidates ?? []) {
            const quote = candidate.quoteAsset.trim().toUpperCase();
            const base = candidate.baseAsset.trim().toUpperCase();
            if (!base || quote !== homeStable) continue;
            byHomeQuoteBase.set(base, candidate);
          }

          const maxGridOrdersPerSymbol = Math.max(2, Math.min(6, 2 + Math.round(boundedRisk / 25)));
          const positions = tradeMode === "SPOT_GRID" ? this.getManagedPositions(current) : null;
          let bestGridCandidate: { symbol: string; candidate: UniverseCandidate; score: number } | null = null;
          let firstEligibleGridCandidate: { symbol: string; candidate: UniverseCandidate } | null = null;

          const seenSymbols = new Set<string>();
          for (const rawCandidate of snap.candidates ?? []) {
            if (!rawCandidate?.symbol) continue;

            let candidate = rawCandidate;
            if (liveTrading && rawCandidate.quoteAsset.trim().toUpperCase() !== homeStable) {
              const mapped = byHomeQuoteBase.get(rawCandidate.baseAsset.trim().toUpperCase());
              if (!mapped) continue;
              candidate = mapped;
            }

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
            if (this.getEntryGuard({ symbol, state: current })) continue;

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
              const t = boundedRisk / 100;
              const pauseConfidenceThreshold = this.toRounded(0.6 + t * 0.2, 4); // risk 0 -> 0.60, risk 100 -> 0.80
              const shouldPauseBuys =
                regime.label === "BEAR_TREND" &&
                typeof regime.confidence === "number" &&
                Number.isFinite(regime.confidence) &&
                regime.confidence >= pauseConfidenceThreshold;
              const buyPaused = Boolean(existingBuyPauseLock) || shouldPauseBuys;

              const netQty = positions?.get(symbol)?.netQty ?? 0;
              const hasInventory = Number.isFinite(netQty) && netQty > 0;

              if (!firstEligibleGridCandidate) {
                firstEligibleGridCandidate = { symbol, candidate };
              }

              const missingBuyLeg = !hasBuyLimit && !buyPaused;
              const missingSellLeg = !hasSellLimit && hasInventory;
              const canTakeAction = missingBuyLeg || missingSellLeg;

              const waiting = hasBuyLimit && hasSellLimit;
              const waitingPenalty = waiting ? 0.3 : 0;
              const guardNoInventoryPenalty = buyPaused && !hasInventory ? 0.45 : 0;
              const openLimitPenalty = Math.min(0.2, (openLimitCount / Math.max(1, maxGridOrdersPerSymbol)) * 0.2);

              const actionability = canTakeAction ? 1 : waiting ? 0.05 : 0.3;
              const recommendedBonus = scores.recommended === "GRID" ? 0.15 : scores.recommended === "MEAN_REVERSION" ? 0.05 : 0;
              const score = scores.grid * 1.2 + actionability * 0.8 + recommendedBonus - waitingPenalty - guardNoInventoryPenalty - openLimitPenalty;

              if (!bestGridCandidate || score > bestGridCandidate.score) {
                bestGridCandidate = { symbol, candidate, score };
              }
              continue;
            }

            return { symbol, candidate };
          }

          if (tradeMode === "SPOT_GRID") {
            if (bestGridCandidate) {
              return { symbol: bestGridCandidate.symbol, candidate: bestGridCandidate.candidate };
            }
            if (firstEligibleGridCandidate) {
              return firstEligibleGridCandidate;
            }
          }

          return { symbol: null, candidate: null, reason: "No eligible universe candidates after policy and lock filters" };
        } catch {
          return { symbol: null, candidate: null, reason: "Universe snapshot unavailable" };
        }
      })();
      if (!candidateSelection.symbol) {
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

      let candidateSymbol = candidateSelection.symbol;
      let selectedCandidate = candidateSelection.candidate;
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
                  details: entryGuard.details
                },
                ...current.decisions
              ].slice(0, 200)
        } satisfies BotState;
        this.save(next);
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
            const avgPrice = (() => {
              const fills = "fills" in response && Array.isArray(response.fills) ? response.fills : [];
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
              ...(avgPrice ? { price: avgPrice } : {})
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

          const quoteFree = balances.find((b) => b.asset === homeStable)?.free ?? 0;
          if (!Number.isFinite(quoteFree) || quoteFree < 0) {
            const summary = `Skip ${candidateSymbol}: Invalid ${homeStable} balance`;
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

          const walletTotalHome = await this.estimateWalletTotalInHome(balances, homeStable);
          const capitalProfile = this.getCapitalProfile(walletTotalHome);
          tickContext.walletTotalHome = walletTotalHome;
          const maxPositionPct = config?.derived.maxPositionPct ?? 1;
          tickContext.maxPositionPct = maxPositionPct;

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
            homeStable,
            traderRegion: config?.basic.traderRegion ?? "NON_EEA",
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
          const feasibleCandidateSelection = await this.pickFeasibleLiveCandidate({
            preferredCandidate: selectedCandidate,
            snapshotCandidates: universeSnapshot?.candidates ?? [],
            state: current,
            homeStable,
            traderRegion: config?.basic.traderRegion ?? "NON_EEA",
            neverTradeSymbols: config?.advanced.neverTradeSymbols ?? [],
            excludeStableStablePairs: config?.advanced.excludeStableStablePairs ?? true,
            enforceRegionPolicy: config?.advanced.enforceRegionPolicy ?? true,
            balances,
            walletTotalHome,
            maxPositionPct,
            quoteFree,
            notionalCap,
            capitalNotionalCapMultiplier: capitalProfile.notionalCapMultiplier,
            bufferFactor
          });
          if (!feasibleCandidateSelection.candidate) {
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
                        rejectionSamples: feasibleCandidateSelection.rejectionSamples
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200)
            } satisfies BotState;
            this.save(next);
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
          if (rules.quoteAsset !== homeStable) {
            const summary = `Skip ${candidateSymbol}: Quote asset ${rules.quoteAsset} ≠ home stable ${homeStable}`;
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
          const candidateBaseAsset = rules.baseAsset.toUpperCase();
          const gridEnabled = Boolean(config?.derived.allowGrid && config?.basic.tradeMode === "SPOT_GRID");

          const managedPositions = this.getManagedPositions(current);
          const managedOpenHomeSymbols = [...managedPositions.values()].filter((p) => p.netQty > 0 && p.symbol.endsWith(homeStable));
          const maxOpenPositions = Math.max(1, config?.derived.maxOpenPositions ?? 1);
          tickContext.maxOpenPositions = maxOpenPositions;
          const candidateIsOpen = (managedPositions.get(candidateSymbol)?.netQty ?? 0) > 0;

          const rebalanceSellCooldownMs = config?.advanced.liveTradeRebalanceSellCooldownMs ?? 900_000;
          const takeProfitPct = 0.35 + (risk / 100) * 0.9; // 0.35% .. 1.25%
          const stopLossPct = -(0.8 + (risk / 100) * 1.2); // -0.8% .. -2.0%

          for (const position of managedOpenHomeSymbols) {
            const baseAsset = position.symbol.slice(0, Math.max(0, position.symbol.length - homeStable.length));
            if (!baseAsset) continue;
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

            const pnlPct = ((nowPrice - avgEntryPrice) / avgEntryPrice) * 100;
            const shouldTakeProfit = pnlPct >= takeProfitPct;
            const shouldStopLoss = pnlPct <= stopLossPct;
            if (!shouldTakeProfit && !shouldStopLoss) continue;

            const sellQtyDesired = Math.min(position.netQty, baseFree);
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
                  stopLossPct: Number(stopLossPct.toFixed(4)),
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
              reason: shouldTakeProfit ? "take-profit-exit" : "stop-loss-exit",
              details: {
                mode: "position-exit",
                pnlPct: Number(pnlPct.toFixed(4)),
                avgEntryPrice: Number(avgEntryPrice.toFixed(8)),
                marketPrice: Number(nowPrice.toFixed(8)),
                takeProfitPct: Number(takeProfitPct.toFixed(4)),
                stopLossPct: Number(stopLossPct.toFixed(4))
              }
            });
            return;
          }

          if ((universeSnapshot?.candidates?.length ?? 0) > 0) {
            const protectedHomeBaseAssets = new Set<string>();
            for (const order of current.activeOrders) {
              const symbol = order.symbol.trim().toUpperCase();
              if (!symbol || !symbol.endsWith(homeStable)) continue;
              const baseAsset = symbol.slice(0, Math.max(0, symbol.length - homeStable.length)).trim().toUpperCase();
              if (baseAsset) protectedHomeBaseAssets.add(baseAsset);
            }
            for (const position of managedOpenHomeSymbols) {
              const baseAsset = position.symbol.slice(0, Math.max(0, position.symbol.length - homeStable.length)).trim().toUpperCase();
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
            const staleSources: Array<{
              asset: string;
              free: number;
              estimatedValueHome: number;
              sourceHomeSymbol: string;
              change24hPct: number | null;
              reason: string;
              category: "stale" | "dust";
            }> = [];

            for (const balance of balances) {
              const asset = balance.asset.trim().toUpperCase();
              const free = Number.isFinite(balance.free) ? balance.free : 0;
              if (!asset || asset === homeStable || free <= 0) continue;
              if (protectedHomeBaseAssets.has(asset)) continue;

              const estimatedValueHome = await this.estimateAssetValueInHome(asset, free, homeStable, sourceBridgeAssets);
              if (!Number.isFinite(estimatedValueHome ?? Number.NaN) || (estimatedValueHome ?? 0) <= 0) continue;
              const valueHome = estimatedValueHome ?? 0;
              const isDustBand = valueHome >= minSweepTargetHome && valueHome < sweepMinValueHome;
              if (valueHome < minSweepTargetHome) continue;

              const sourceHomeSymbol = `${asset}${homeStable}`;
              const marketCandidate = (universeSnapshot?.candidates ?? []).find(
                (candidate) => candidate.symbol.trim().toUpperCase() === sourceHomeSymbol
              );
              const change24hPct = typeof marketCandidate?.priceChangePct24h === "number" ? marketCandidate.priceChangePct24h : null;
              const weakTrend = change24hPct === null || change24hPct <= -0.35;
              const eligible = isDustBand ? true : valueHome >= sweepMinValueHome ? weakTrend : false;
              if (!eligible) continue;

              staleSources.push({
                asset,
                free,
                estimatedValueHome: valueHome,
                sourceHomeSymbol,
                change24hPct,
                category: isDustBand ? "dust" : "stale",
                reason: isDustBand
                  ? "dust cleanup"
                  : change24hPct === null
                    ? "weak trend (no 24h data)"
                    : `24h change ${change24hPct.toFixed(2)}%`
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

          if (managedOpenHomeSymbols.length >= maxOpenPositions && !candidateIsOpen) {
            const summary = `Skip ${candidateSymbol}: Max open positions reached (${maxOpenPositions})`;
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
                        openPositions: managedOpenHomeSymbols.length,
                        maxOpenPositions
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            this.save(next);
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
            if (netEdgePct < riskAdjustedMinNetEdgePct) {
              const summary = `Skip ${candidateSymbol}: Fee/edge filter (net ${netEdgePct.toFixed(3)}% < ${riskAdjustedMinNetEdgePct.toFixed(3)}%)`;
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
                          score: selectedCandidate?.score
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
              const summary = `Skip ${candidateSymbol}: Would exceed live notional cap (cap ${enforcedCap.toFixed(2)} ${homeStable})`;
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
              const summary = `Skip ${candidateSymbol}: Insufficient ${homeStable} for estimated cost`;
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
              .filter((b) => b.asset.toUpperCase() !== homeStable && b.free > 0)
              .sort((a, b) => {
                const aIsCandidateBase = a.asset.toUpperCase() === candidateBaseAsset ? 1 : 0;
                const bIsCandidateBase = b.asset.toUpperCase() === candidateBaseAsset ? 1 : 0;
                if (aIsCandidateBase !== bIsCandidateBase) return aIsCandidateBase - bIsCandidateBase;
                const aManagedOpen = (managedPositions.get(`${a.asset.toUpperCase()}${homeStable}`)?.netQty ?? 0) > 0 ? 1 : 0;
                const bManagedOpen = (managedPositions.get(`${b.asset.toUpperCase()}${homeStable}`)?.netQty ?? 0) > 0 ? 1 : 0;
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
              const sourceHomeSymbol = `${sourceAsset}${homeStable}`;
              const sourceOpenManagedPosition = (managedPositions.get(sourceHomeSymbol)?.netQty ?? 0) > 0;
              if (sourceOpenManagedPosition && !requiresReserveRecovery) continue;
              const hasRecentSourceBuy =
                Number.isFinite(rebalanceSellCooldownMs) && rebalanceSellCooldownMs > 0
                  ? current.orderHistory.some((o) => {
                      if (o.symbol !== sourceHomeSymbol) return false;
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

            const summary = `Skip ${candidateSymbol}: Insufficient ${homeStable} for estimated cost`;
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

            // Wallet reserve policy (T-004 slice):
            // Keep some free home-stable liquidity so grid BUY legs don't consume the last quote and then spam minQty rejects.
            const configuredMinTopUpTarget = config?.advanced.conversionTopUpMinTarget ?? 5;
            const floorTopUpTarget =
              Number.isFinite(configuredMinTopUpTarget) && configuredMinTopUpTarget > 0 ? configuredMinTopUpTarget : 5;
            const conversionTopUpReserveMultiplier = Math.max(1, config?.advanced.conversionTopUpReserveMultiplier ?? 2);
            const reserveScale = 1.8 - (risk / 100) * 0.8; // risk 0 -> 1.8x, risk 100 -> 1.0x
            const reserveLowTarget = Math.max(
              floorTopUpTarget,
              floorTopUpTarget * conversionTopUpReserveMultiplier,
              walletTotalHome * capitalProfile.reserveLowPct * reserveScale
            );
            const reserveHighTarget = Math.max(
              reserveLowTarget,
              reserveLowTarget * 2,
              walletTotalHome * capitalProfile.reserveHighPct * reserveScale
            );
            const reserveHardTarget = (() => {
              const t = Math.max(0, Math.min(1, risk / 100));
              // risk=0 => hard reserve ~= low target (conservative), risk=100 => hard reserve ~= floor (aggressive)
              return floorTopUpTarget + (reserveLowTarget - floorTopUpTarget) * (1 - t);
            })();
            const quoteSpendable = Math.max(0, quoteFree - reserveHardTarget);

            const symbolOpenLimitOrdersAll = current.activeOrders.filter((order) => {
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
            const regime = this.buildRegimeSnapshot(selectedCandidate ?? null);
            const t = risk / 100;
            const pauseConfidenceThreshold = this.toRounded(0.6 + t * 0.2, 4); // risk 0 -> 0.60, risk 100 -> 0.80
            const shouldPauseBuys =
              regime.label === "BEAR_TREND" &&
              typeof regime.confidence === "number" &&
              Number.isFinite(regime.confidence) &&
              regime.confidence >= pauseConfidenceThreshold;
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
            const buyPaused = Boolean(existingBuyPauseLock) || shouldPauseBuys;

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

            // If we have no BUY ladder and quote is below reserve, try a reserve recovery conversion (stable-like -> home stable).
            // This supports wallets holding e.g. USDT while home stable is USDC, and reduces repeated minQty affordability rejects.
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
                  .filter((b) => b.free > 0 && isStableAsset(b.asset) && b.asset.trim().toUpperCase() !== homeStable)
                  .sort((a, b) => b.free - a.free);

                for (const source of stableSources) {
                  setLiveOperation({
                    stage: "grid-reserve-recovery-conversion",
                    symbol: `${source.asset.trim().toUpperCase()}${homeStable}`,
                    side: "SELL",
                    asset: source.asset.trim().toUpperCase(),
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
              const summary = `Skip ${candidateSymbol}: Grid guard paused BUY leg`;
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
                        buyPaused,
                        hasBuyLimit,
                        hasSellLimit
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
                  lastError: undefined
                } satisfies BotState;
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
                const summary = `Skip ${candidateSymbol}: Insufficient spendable ${homeStable} for grid BUY`;
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
                    asset: homeStable,
                    required: buyNotionalEstimate
                  });
                  const buyFunds = await ensureFundsBeforeOrder({ asset: homeStable, required: buyNotionalEstimate });
                  if (!buyFunds.ok) {
                    pendingNoActionState = buildInsufficientFundsSkipState({
                      symbol: candidateSymbol,
                      stage: "grid-buy-limit",
                      side: "BUY",
                      asset: homeStable,
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
                const summary = `Skip ${candidateSymbol}: Grid buy sizing rejected (${buyCheck.reason})`;
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
                  if (!pendingNoActionState) pendingNoActionState = nextWithCooldown;
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
              const cooldownMs = Math.max(this.deriveNoActionSymbolCooldownMs(risk), 60_000);
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
                          pauseConfidenceThreshold
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
                reason: `Grid guard active; rotating away (${Math.round(cooldownMs / 1000)}s)`,
                expiresAt: new Date(Date.now() + cooldownMs).toISOString(),
                details: {
                  category: "GRID_GUARD_ROTATE",
                  cooldownMs,
                  regime,
                  pauseConfidenceThreshold
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
                        maxGridOrdersPerSymbol
                      }
                    },
                    ...current.decisions
                  ].slice(0, 200),
              lastError: undefined
            } satisfies BotState;
            this.save(next);
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
              asset: homeStable,
              required: entryRequiredQuote
            });
            const entryFunds = await ensureFundsBeforeOrder({ asset: homeStable, required: entryRequiredQuote });
            if (!entryFunds.ok) {
              const nextWithInsufficient = buildInsufficientFundsSkipState({
                symbol: candidateSymbol,
                stage: "entry-market-buy",
                side: "BUY",
                asset: homeStable,
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
