import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import type { BotState, Decision, Order, SymbolBlacklistEntry } from "@autobot/shared";
import { BotStateSchema, defaultBotState } from "@autobot/shared";

import { ConfigService } from "../config/config.service";
import { BinanceMarketDataService } from "../integrations/binance-market-data.service";
import {
  BinanceTradingService,
  isBinanceTestnetBaseUrl,
  type BinanceMarketOrderResponse
} from "../integrations/binance-trading.service";
import { ConversionRouterService } from "../integrations/conversion-router.service";
import { UniverseService } from "../universe/universe.service";

function atomicWriteFile(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, data, { encoding: "utf-8" });
  fs.renameSync(tmpPath, filePath);
}

@Injectable()
export class BotEngineService {
  private readonly dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  private readonly statePath = path.join(this.dataDir, "state.json");

  private loopTimer: NodeJS.Timeout | null = null;
  private examineTimer: NodeJS.Timeout | null = null;
  private tickInFlight = false;

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
    try {
      const config = this.configService.load();
      let current = this.pruneExpiredBlacklist(this.getState());
      if (!current.running) return;
      if (current.phase !== "TRADING") return;

      const homeStable = config?.basic.homeStableCoin ?? "USDT";
      const liveRequested = Boolean(config?.basic.liveTrading);
      const binanceEnvironment = config?.advanced.binanceEnvironment ?? "MAINNET";
      const allowMainnetLiveTrading = String(process.env.ALLOW_MAINNET_LIVE_TRADING ?? "false").toLowerCase() === "true";
      const liveTrading = liveRequested && (binanceEnvironment === "SPOT_TESTNET" || allowMainnetLiveTrading);

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
      const candidateSymbol = await (async () => {
        try {
          const snap = await this.universe.getLatest();
          const best = snap.candidates?.find((c) => {
            if (!c.symbol) return false;
            if (this.isSymbolBlocked(c.symbol, current)) return false;
            if (liveTrading && c.quoteAsset && c.quoteAsset.toUpperCase() !== homeStable) return false;
            return true;
          });
          return best?.symbol ?? `BTC${homeStable}`;
        } catch {
          return `BTC${homeStable}`;
        }
      })();
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
          const rules = await this.marketData.getSymbolRules(candidateSymbol);
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

          const priceStr = await this.marketData.getTickerPrice(candidateSymbol);
          const price = Number.parseFloat(priceStr);
          if (!Number.isFinite(price) || price <= 0) {
            throw new Error(`Invalid ticker price: ${priceStr}`);
          }

          const maxPositionPct = config?.derived.maxPositionPct ?? 1;
          const notionalCap =
            config?.advanced.liveTradeNotionalCap ?? Number.parseFloat(process.env.LIVE_TRADE_NOTIONAL_CAP ?? "25");
          const slippageBuffer =
            config?.advanced.liveTradeSlippageBuffer ?? Number.parseFloat(process.env.LIVE_TRADE_SLIPPAGE_BUFFER ?? "1.005");
          const bufferFactor = Number.isFinite(slippageBuffer) && slippageBuffer > 0 ? slippageBuffer : 1;
          const rawTargetNotional = quoteFree * (maxPositionPct / 100);
          const enforcedCap = Number.isFinite(notionalCap) && notionalCap > 0 ? notionalCap : null;
          const capForSizing = enforcedCap ? enforcedCap / bufferFactor : null;
          const targetNotional = Math.min(rawTargetNotional, capForSizing ?? rawTargetNotional, quoteFree);
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
            const candidateBaseAsset = rules.baseAsset.toUpperCase();
            const rebalanceSellCooldownMs =
              config?.advanced.liveTradeRebalanceSellCooldownMs ??
              Number.parseInt(process.env.LIVE_TRADE_REBALANCE_SELL_COOLDOWN_MS ?? "900000", 10);
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
                requiredTarget: shortfall,
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

          const res = await this.trading.placeSpotMarketOrder({ symbol: candidateSymbol, side: "BUY", quantity: qtyStr });
          persistLiveTrade({
            symbol: candidateSymbol,
            side: "BUY",
            requestedQty: qtyStr,
            fallbackQty: qty,
            response: res,
            reason: "entry"
          });
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const summary = `Order rejected for ${candidateSymbol} (${envLabel}): ${msg}`;
          const alreadyLogged = current.decisions[0]?.kind === "SKIP" && current.decisions[0]?.summary === summary;
          let nextState: BotState = {
            ...current,
            lastError: msg,
            activeOrders: filled.activeOrders,
            orderHistory: filled.orderHistory,
            decisions: alreadyLogged
              ? current.decisions
              : [{ id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary }, ...current.decisions].slice(0, 200)
          };

          if (config?.advanced.autoBlacklistEnabled) {
            const ttlMinutes = config.advanced.autoBlacklistTtlMinutes ?? 180;
            const now = new Date();
            nextState = this.addSymbolBlacklist(nextState, {
              symbol: candidateSymbol,
              reason: msg.slice(0, 120),
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
  }
}
