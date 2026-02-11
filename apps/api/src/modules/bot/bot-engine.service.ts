import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import type { BotState, Decision, Order, SymbolBlacklistEntry, UniverseCandidate } from "@autobot/shared";
import { BotStateSchema, defaultBotState } from "@autobot/shared";

import { ConfigService } from "../config/config.service";
import { BinanceMarketDataService } from "../integrations/binance-market-data.service";
import {
  BinanceTradingService,
  isBinanceTestnetBaseUrl,
  type BinanceBalanceSnapshot,
  type BinanceMarketOrderResponse
} from "../integrations/binance-trading.service";
import { ConversionRouterService } from "../integrations/conversion-router.service";
import { getPairPolicyBlockReason } from "../policy/trading-policy";
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

export type BotRunStatsResponse = {
  generatedAt: string;
  kpi: BaselineRunStats | null;
  adaptiveShadowTail: AdaptiveShadowEvent[];
  notes: {
    activeOrders: string;
  };
};

@Injectable()
export class BotEngineService {
  private readonly dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  private readonly statePath = path.join(this.dataDir, "state.json");
  private readonly telemetryDir = path.join(this.dataDir, "telemetry");
  private readonly baselineStatsPath = path.join(this.telemetryDir, "baseline-kpis.json");
  private readonly adaptiveShadowPath = path.join(this.telemetryDir, "adaptive-shadow.jsonl");

  private loopTimer: NodeJS.Timeout | null = null;
  private examineTimer: NodeJS.Timeout | null = null;
  private tickInFlight = false;
  private lastBaselineFingerprint: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly marketData: BinanceMarketDataService,
    private readonly trading: BinanceTradingService,
    private readonly conversionRouter: ConversionRouterService,
    private readonly universe: UniverseService
  ) {}

  getState(): BotState {
    if (!fs.existsSync(this.statePath)) {
      return defaultBotState();
    }

    try {
      const raw = fs.readFileSync(this.statePath, "utf-8");
      return BotStateSchema.parse(JSON.parse(raw));
    } catch (err) {
      const fallback = defaultBotState();
      return {
        ...fallback,
        lastError: err instanceof Error ? err.message : "Failed to load state.json"
      };
    }
  }

  private save(state: BotState): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const next: BotState = { ...state, updatedAt: new Date().toISOString() };
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

  private isSymbolBlocked(symbol: string, state: BotState): string | null {
    const config = this.configService.load();
    if (!config) return "Bot is not initialized";

    if (config.advanced.neverTradeSymbols.includes(symbol)) {
      return "Blocked by Advanced never-trade list";
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

  private shouldAutoBlacklistError(rawMessage: string): boolean {
    if (this.isSizingFilterError(rawMessage)) return false;
    if (this.isTransientExchangeError(rawMessage)) return false;
    return true;
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
    const bridgeAssets = [homeStable, "USDT", "USDC", "BTC", "ETH", "BNB"];
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
    const startedAt = decisionChronological[0]?.ts ?? state.updatedAt;
    const runtimeSeconds = Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000));

    const byDecisionKind: Record<string, number> = {};
    const skipSummaryCounts = new Map<string, number>();
    let trades = 0;
    let skips = 0;
    let conversions = 0;

    for (const decision of decisionList) {
      byDecisionKind[decision.kind] = (byDecisionKind[decision.kind] ?? 0) + 1;
      if (decision.kind === "TRADE") {
        trades += 1;
        if (decision.summary.toLowerCase().includes("convert ")) {
          conversions += 1;
        } else {
          const details = decision.details as Record<string, unknown> | undefined;
          if (typeof details?.reason === "string" && details.reason.toLowerCase().includes("convert ")) {
            conversions += 1;
          }
        }
      }
      if (decision.kind === "SKIP") {
        skips += 1;
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
      adaptiveShadowTail: this.readAdaptiveShadowTail(60),
      notes: {
        activeOrders: "Spot MARKET orders are usually filled immediately, so active order lists can stay at 0 while order history increases."
      }
    };
  }

  start(): void {
    const state = this.getState();
    if (state.running) return;

    this.addDecision("ENGINE", "Start requested");
    this.save({ ...this.getState(), running: true, phase: "EXAMINING", lastError: undefined });

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

    this.loopTimer = setInterval(() => {
      void this.tick();
    }, 5000);
  }

  private async tick(): Promise<void> {
    if (this.tickInFlight) return;
    this.tickInFlight = true;
    const tickStartedAtMs = Date.now();
    let beforeDecisionIds = new Set<string>();
    let tickContext: TickTelemetryContext | null = null;
    try {
      const config = this.configService.load();
      let current = this.pruneExpiredBlacklist(this.getState());
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
        candidateSymbol: `BTC${homeStable}`,
        candidate: null,
        maxOpenPositions: config?.derived.maxOpenPositions,
        maxPositionPct: config?.derived.maxPositionPct
      };

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

      if (liveTrading && current.activeOrders.length > 0) {
        const canceledOrders: Order[] = current.activeOrders.map((o) => ({ ...o, status: "CANCELED" }));
        current = {
          ...current,
          activeOrders: [],
          orderHistory: [...canceledOrders, ...current.orderHistory].slice(0, 200)
        };
        this.save(current);
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
      const candidateSelection = await (async (): Promise<{ symbol: string; candidate: UniverseCandidate | null }> => {
        try {
          const snap = await this.universe.getLatest();
          const best = snap.candidates?.find((c) => {
            if (!c.symbol) return false;
            if (this.isSymbolBlocked(c.symbol, current)) return false;
            const policyReason = getPairPolicyBlockReason({
              symbol: c.symbol,
              baseAsset: c.baseAsset,
              quoteAsset: c.quoteAsset,
              traderRegion: config?.basic.traderRegion ?? "NON_EEA",
              neverTradeSymbols: config?.advanced.neverTradeSymbols,
              excludeStableStablePairs: config?.advanced.excludeStableStablePairs,
              enforceRegionPolicy: config?.advanced.enforceRegionPolicy
            });
            if (policyReason) return false;
            if (this.getEntryGuard({ symbol: c.symbol, state: current })) return false;
            if (liveTrading && c.quoteAsset && c.quoteAsset.toUpperCase() !== homeStable) return false;
            return true;
          });
          return { symbol: best?.symbol ?? `BTC${homeStable}`, candidate: best ?? null };
        } catch {
          return { symbol: `BTC${homeStable}`, candidate: null };
        }
      })();
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

        const cooldownMs =
          config?.advanced.liveTradeCooldownMs ?? Number.parseInt(process.env.LIVE_TRADE_COOLDOWN_MS ?? "60000", 10);
        if (Number.isFinite(cooldownMs) && cooldownMs > 0) {
          const lastTrade = current.decisions.find((d) => d.kind === "TRADE");
          const lastTradeAt = lastTrade ? Date.parse(lastTrade.ts) : Number.NaN;
          if (Number.isFinite(lastTradeAt) && Date.now() - lastTradeAt < cooldownMs) {
            return;
          }
        }

        try {
          const mapStatus = (s: string | undefined): Order["status"] => {
            const st = (s ?? "").toUpperCase();
            if (st === "FILLED") return "FILLED";
            if (st === "NEW" || st === "PARTIALLY_FILLED") return "NEW";
            if (st === "CANCELED" || st === "EXPIRED") return "CANCELED";
            return "REJECTED";
          };

          const persistLiveTrade = (params: {
            symbol: string;
            side: "BUY" | "SELL";
            requestedQty: string;
            fallbackQty: number;
            response: BinanceMarketOrderResponse;
            reason: string;
            details?: Record<string, unknown>;
          }): void => {
            const { symbol, side, requestedQty, fallbackQty, response, reason, details } = params;
            const avgPrice = (() => {
              const fills = response.fills ?? [];
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

            const order: Order = {
              id: response.orderId !== undefined ? String(response.orderId) : crypto.randomUUID(),
              ts: new Date().toISOString(),
              symbol,
              side,
              type: "MARKET",
              status: mapStatus(response.status),
              qty: finalQty,
              ...(avgPrice ? { price: avgPrice } : {})
            };

            const decisionSummary = `Binance ${envLabel} ${side} MARKET ${symbol} qty ${requestedQty} → ${order.status} (orderId ${order.id} · ${reason})`;

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

            this.save(nextState);
            current = nextState;
          };

          const balances = await this.trading.getBalances();
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

          const managedPositions = this.getManagedPositions(current);
          const managedOpenHomeSymbols = [...managedPositions.values()].filter((p) => p.netQty > 0 && p.symbol.endsWith(homeStable));
          const maxOpenPositions = Math.max(1, config?.derived.maxOpenPositions ?? 1);
          tickContext.maxOpenPositions = maxOpenPositions;
          const candidateIsOpen = (managedPositions.get(candidateSymbol)?.netQty ?? 0) > 0;

          const rebalanceSellCooldownMs =
            config?.advanced.liveTradeRebalanceSellCooldownMs ??
            Number.parseInt(process.env.LIVE_TRADE_REBALANCE_SELL_COOLDOWN_MS ?? "900000", 10);
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

          const notionalCap =
            config?.advanced.liveTradeNotionalCap ?? Number.parseFloat(process.env.LIVE_TRADE_NOTIONAL_CAP ?? "25");
          const slippageBuffer =
            config?.advanced.liveTradeSlippageBuffer ?? Number.parseFloat(process.env.LIVE_TRADE_SLIPPAGE_BUFFER ?? "1.005");
          const bufferFactor = Number.isFinite(slippageBuffer) && slippageBuffer > 0 ? slippageBuffer : 1;
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

          const qty = Number.parseFloat(qtyStr);
          if (!Number.isFinite(qty) || qty <= 0) {
            throw new Error(`Invalid normalized quantity: ${qtyStr}`);
          }

          const bufferedCost = qty * price * bufferFactor;
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
          if (Number.isFinite(bufferedCost) && bufferedCost > quoteFree) {
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
            const conversionTarget = Math.max(shortfall * conversionTopUpReserveMultiplier, floorTopUpTarget, reserveTopUpNeeded);
            const conversionTopUpCooldownMs = Math.max(
              0,
              config?.advanced.conversionTopUpCooldownMs ??
                Number.parseInt(process.env.CONVERSION_TOP_UP_COOLDOWN_MS ?? "90000", 10)
            );
            if (conversionTopUpCooldownMs > 0) {
              const lastConversionTrade = current.decisions.find((d) => {
                if (d.kind !== "TRADE") return false;
                const details = d.details as Record<string, unknown> | undefined;
                return details?.mode === "conversion-router";
              });
              const lastConversionAt = lastConversionTrade ? Date.parse(lastConversionTrade.ts) : Number.NaN;
              if (Number.isFinite(lastConversionAt) && Date.now() - lastConversionAt < conversionTopUpCooldownMs) {
                const summary = `Skip ${candidateSymbol}: Conversion cooldown active`;
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
                            conversionTopUpCooldownMs,
                            remainingMs: Math.max(0, Math.round(conversionTopUpCooldownMs - (Date.now() - lastConversionAt))),
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
                return b.free - a.free;
              });

            for (const source of sourceBalances) {
              const sourceAsset = source.asset.toUpperCase();
              const sourceFree = source.free;
              if (sourceFree <= 0) continue;
              if (sourceAsset === candidateBaseAsset && hasRecentCandidateBuy) continue;

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

          let entryQtyStr = qtyStr;
          let entryQty = qty;
          let retriedSizing = false;
          while (true) {
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
          const summary = this.isSizingFilterError(rawMsg)
            ? `Skip ${candidateSymbol}: Binance sizing filter (${safeMsg})`
            : this.isTransientExchangeError(rawMsg)
              ? `Skip ${candidateSymbol}: Temporary exchange/network issue (${safeMsg})`
              : `Order rejected for ${candidateSymbol} (${envLabel}): ${safeMsg}`;
          const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
          let nextState: BotState = {
            ...current,
            lastError: safeMsg,
            activeOrders: filled.activeOrders,
            orderHistory: filled.orderHistory,
            decisions: alreadyLogged
              ? current.decisions
              : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
          };

          if (config?.advanced.autoBlacklistEnabled && this.shouldAutoBlacklistError(rawMsg)) {
            const ttlMinutes = config.advanced.autoBlacklistTtlMinutes ?? 180;
            const now = new Date();
            nextState = this.addSymbolBlacklist(nextState, {
              symbol: candidateSymbol,
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

  stop(): void {
    const state = this.getState();
    if (!state.running) return;

    this.addDecision("ENGINE", "Stop requested");

    if (this.loopTimer) clearInterval(this.loopTimer);
    if (this.examineTimer) clearTimeout(this.examineTimer);
    this.loopTimer = null;
    this.examineTimer = null;

    const next = this.getState();
    const canceledOrders: Order[] = next.activeOrders.map((o) => ({ ...o, status: "CANCELED" }));
    this.save({
      ...next,
      running: false,
      phase: "STOPPED",
      activeOrders: [],
      orderHistory: [...canceledOrders, ...next.orderHistory].slice(0, 500)
    });
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
