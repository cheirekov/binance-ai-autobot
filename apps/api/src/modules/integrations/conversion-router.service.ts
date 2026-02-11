import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import { getPairPolicyBlockReason } from "../policy/trading-policy";
import { BinanceMarketDataService } from "./binance-market-data.service";
import type { BinanceMarketOrderResponse } from "./binance-trading.service";
import { BinanceTradingService } from "./binance-trading.service";

export type ConversionLeg = {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
  sourceAsset: string;
  targetAsset: string;
  obtainedTarget: number;
  response: BinanceMarketOrderResponse;
  reason: string;
  route: "DIRECT" | "TWO_HOP";
  bridgeAsset?: string;
};

export type ConversionResult = {
  ok: boolean;
  obtainedTarget: number;
  legs: ConversionLeg[];
};

type DirectConversionInput = {
  sourceAsset: string;
  sourceFree: number;
  targetAsset: string;
  requiredTarget: number;
  reason: string;
  route: "DIRECT" | "TWO_HOP";
  bridgeAsset?: string;
};

type DirectConversionResult = {
  ok: boolean;
  obtainedTarget: number;
  leg?: ConversionLeg;
};

@Injectable()
export class ConversionRouterService {
  constructor(
    private readonly configService: ConfigService,
    private readonly marketData: BinanceMarketDataService,
    private readonly trading: BinanceTradingService
  ) {}

  async convertFromSourceToTarget(params: {
    sourceAsset: string;
    sourceFree: number;
    targetAsset: string;
    requiredTarget: number;
    bridgeAssets?: string[];
    allowTwoHop?: boolean;
  }): Promise<ConversionResult> {
    const sourceAsset = params.sourceAsset.trim().toUpperCase();
    const targetAsset = params.targetAsset.trim().toUpperCase();
    const requiredTarget = Number.isFinite(params.requiredTarget) ? Math.max(params.requiredTarget, 0) : 0;
    const sourceFree = Number.isFinite(params.sourceFree) ? Math.max(params.sourceFree, 0) : 0;

    if (!sourceAsset || !targetAsset || sourceAsset === targetAsset || sourceFree <= 0 || requiredTarget <= 0) {
      return { ok: false, obtainedTarget: 0, legs: [] };
    }

    const direct = await this.convertDirect({
      sourceAsset,
      sourceFree,
      targetAsset,
      requiredTarget,
      reason: `convert ${sourceAsset} -> ${targetAsset}`,
      route: "DIRECT"
    });
    if (direct.ok && direct.leg) {
      return { ok: true, obtainedTarget: direct.obtainedTarget, legs: [direct.leg] };
    }

    if (!params.allowTwoHop) {
      return { ok: false, obtainedTarget: 0, legs: [] };
    }

    const defaultBridges = ["USDT", "USDC", "BTC", "ETH", "BNB"];
    const bridges = (params.bridgeAssets ?? defaultBridges)
      .map((v) => v.trim().toUpperCase())
      .filter((v, idx, arr) => v && arr.indexOf(v) === idx && v !== sourceAsset && v !== targetAsset);

    for (const bridgeAsset of bridges) {
      const estimate = await this.estimateBridgeRequired({
        bridgeAsset,
        targetAsset,
        requiredTarget
      });
      if (!estimate.ok || !Number.isFinite(estimate.requiredBridge) || estimate.requiredBridge <= 0) {
        continue;
      }

      const firstLeg = await this.convertDirect({
        sourceAsset,
        sourceFree,
        targetAsset: bridgeAsset,
        requiredTarget: estimate.requiredBridge,
        reason: `bridge leg 1 (${sourceAsset} -> ${bridgeAsset})`,
        route: "TWO_HOP",
        bridgeAsset
      });
      if (!firstLeg.ok || !firstLeg.leg || firstLeg.obtainedTarget <= 0) {
        continue;
      }

      const secondLeg = await this.convertDirect({
        sourceAsset: bridgeAsset,
        sourceFree: firstLeg.obtainedTarget,
        targetAsset,
        requiredTarget,
        reason: `bridge leg 2 (${bridgeAsset} -> ${targetAsset})`,
        route: "TWO_HOP",
        bridgeAsset
      });
      if (!secondLeg.ok || !secondLeg.leg || secondLeg.obtainedTarget <= 0) {
        continue;
      }

      return {
        ok: true,
        obtainedTarget: secondLeg.obtainedTarget,
        legs: [firstLeg.leg, secondLeg.leg]
      };
    }

    return { ok: false, obtainedTarget: 0, legs: [] };
  }

  private get buyBuffer(): number {
    const fromConfig = this.configService.load()?.advanced.conversionBuyBuffer ?? null;
    const fromEnv = Number.parseFloat(process.env.CONVERSION_BUY_BUFFER ?? process.env.LIVE_TRADE_SLIPPAGE_BUFFER ?? "1.005");
    if (fromConfig !== null && Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
    return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1.005;
  }

  private get sellBuffer(): number {
    const fromConfig = this.configService.load()?.advanced.conversionSellBuffer ?? null;
    const fromEnv = Number.parseFloat(process.env.CONVERSION_SELL_BUFFER ?? "1.002");
    if (fromConfig !== null && Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
    return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1.002;
  }

  private get feeBuffer(): number {
    const fromConfig = this.configService.load()?.advanced.conversionFeeBuffer ?? null;
    const fromEnv = Number.parseFloat(process.env.CONVERSION_FEE_BUFFER ?? "1.002");
    if (fromConfig !== null && Number.isFinite(fromConfig) && fromConfig > 0) return fromConfig;
    return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 1.002;
  }

  private chooseQtyWithin(candidates: Array<string | undefined>, maxQty: number): string | null {
    const parsed = candidates
      .filter(Boolean)
      .map((v) => Number.parseFloat(v ?? ""))
      .filter((v) => Number.isFinite(v) && v > 0 && v <= maxQty + 1e-12)
      .sort((a, b) => b - a);

    if (parsed.length === 0) return null;
    return String(parsed[0]);
  }

  private parsePositiveFloat(value: string | undefined): number | null {
    if (!value) return null;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private async getRulesSafe(symbol: string): Promise<Awaited<ReturnType<BinanceMarketDataService["getSymbolRules"]>> | null> {
    try {
      return await this.marketData.getSymbolRules(symbol);
    } catch {
      return null;
    }
  }

  private isConversionPairBlocked(params: {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
  }): boolean {
    const config = this.configService.load();
    if (!config) return false;

    const blockReason = getPairPolicyBlockReason({
      symbol: params.symbol,
      baseAsset: params.baseAsset,
      quoteAsset: params.quoteAsset,
      traderRegion: config.basic.traderRegion,
      neverTradeSymbols: config.advanced.neverTradeSymbols,
      excludeStableStablePairs: false,
      enforceRegionPolicy: config.advanced.enforceRegionPolicy
    });

    return blockReason !== null;
  }

  private async estimateBridgeRequired(params: {
    bridgeAsset: string;
    targetAsset: string;
    requiredTarget: number;
  }): Promise<{ ok: boolean; requiredBridge: number }> {
    const { bridgeAsset, targetAsset, requiredTarget } = params;

    const buySymbol = `${targetAsset}${bridgeAsset}`;
    const buyRules = await this.getRulesSafe(buySymbol);
    if (buyRules && buyRules.baseAsset.toUpperCase() === targetAsset && buyRules.quoteAsset.toUpperCase() === bridgeAsset) {
      const price = this.parsePositiveFloat(await this.marketData.getTickerPrice(buySymbol));
      if (!price) return { ok: false, requiredBridge: 0 };

      const check = await this.marketData.validateMarketOrderQty(buySymbol, requiredTarget);
      const qtyStr = check.ok ? check.normalizedQty : check.requiredQty;
      const qty = this.parsePositiveFloat(qtyStr);
      if (!qty) return { ok: false, requiredBridge: 0 };

      return { ok: true, requiredBridge: qty * price * this.buyBuffer * this.feeBuffer };
    }

    const sellSymbol = `${bridgeAsset}${targetAsset}`;
    const sellRules = await this.getRulesSafe(sellSymbol);
    if (sellRules && sellRules.baseAsset.toUpperCase() === bridgeAsset && sellRules.quoteAsset.toUpperCase() === targetAsset) {
      const price = this.parsePositiveFloat(await this.marketData.getTickerPrice(sellSymbol));
      if (!price) return { ok: false, requiredBridge: 0 };

      const desiredQty = (requiredTarget / price) * this.sellBuffer * this.feeBuffer;
      const check = await this.marketData.validateMarketOrderQty(sellSymbol, desiredQty);
      const qtyStr = check.ok ? check.normalizedQty : check.requiredQty;
      const qty = this.parsePositiveFloat(qtyStr);
      if (!qty) return { ok: false, requiredBridge: 0 };

      return { ok: true, requiredBridge: qty };
    }

    return { ok: false, requiredBridge: 0 };
  }

  private async convertDirect(params: DirectConversionInput): Promise<DirectConversionResult> {
    const { sourceAsset, sourceFree, targetAsset, requiredTarget, reason, route, bridgeAsset } = params;

    const buySymbol = `${targetAsset}${sourceAsset}`;
    const buyRules = await this.getRulesSafe(buySymbol);
    if (buyRules && buyRules.baseAsset.toUpperCase() === targetAsset && buyRules.quoteAsset.toUpperCase() === sourceAsset) {
      if (
        this.isConversionPairBlocked({
          symbol: buySymbol,
          baseAsset: buyRules.baseAsset,
          quoteAsset: buyRules.quoteAsset
        })
      ) {
        return { ok: false, obtainedTarget: 0 };
      }
      const price = this.parsePositiveFloat(await this.marketData.getTickerPrice(buySymbol));
      if (price) {
        const maxAffordableQty = sourceFree / (price * this.buyBuffer * this.feeBuffer);
        const desiredQty = Math.min(requiredTarget, maxAffordableQty);
        if (Number.isFinite(desiredQty) && desiredQty > 0) {
          const check = await this.marketData.validateMarketOrderQty(buySymbol, desiredQty);
          const qtyStr = this.chooseQtyWithin(
            [check.ok ? check.normalizedQty : undefined, check.requiredQty],
            maxAffordableQty
          );
          if (qtyStr) {
            const response = await this.trading.placeSpotMarketOrder({ symbol: buySymbol, side: "BUY", quantity: qtyStr });
            const obtained = this.parsePositiveFloat(response.executedQty) ?? this.parsePositiveFloat(qtyStr) ?? 0;
            return {
              ok: obtained > 0,
              obtainedTarget: obtained,
              leg:
                obtained > 0
                  ? {
                      symbol: buySymbol,
                      side: "BUY",
                      quantity: qtyStr,
                      sourceAsset,
                      targetAsset,
                      obtainedTarget: obtained,
                      response,
                      reason,
                      route,
                      bridgeAsset
                    }
                  : undefined
            };
          }
        }
      }
    }

    const sellSymbol = `${sourceAsset}${targetAsset}`;
    const sellRules = await this.getRulesSafe(sellSymbol);
    if (sellRules && sellRules.baseAsset.toUpperCase() === sourceAsset && sellRules.quoteAsset.toUpperCase() === targetAsset) {
      if (
        this.isConversionPairBlocked({
          symbol: sellSymbol,
          baseAsset: sellRules.baseAsset,
          quoteAsset: sellRules.quoteAsset
        })
      ) {
        return { ok: false, obtainedTarget: 0 };
      }
      const price = this.parsePositiveFloat(await this.marketData.getTickerPrice(sellSymbol));
      if (price) {
        const desiredQty = Math.min(sourceFree, (requiredTarget / price) * this.sellBuffer * this.feeBuffer);
        if (Number.isFinite(desiredQty) && desiredQty > 0) {
          const check = await this.marketData.validateMarketOrderQty(sellSymbol, desiredQty);
          const qtyStr = this.chooseQtyWithin(
            [check.ok ? check.normalizedQty : undefined, check.requiredQty],
            sourceFree
          );
          if (qtyStr) {
            const response = await this.trading.placeSpotMarketOrder({ symbol: sellSymbol, side: "SELL", quantity: qtyStr });
            const quoteQty = this.parsePositiveFloat(response.cummulativeQuoteQty);
            const executedBase = this.parsePositiveFloat(response.executedQty) ?? this.parsePositiveFloat(qtyStr) ?? 0;
            const obtained = quoteQty ?? executedBase * price;
            return {
              ok: obtained > 0,
              obtainedTarget: obtained,
              leg:
                obtained > 0
                  ? {
                      symbol: sellSymbol,
                      side: "SELL",
                      quantity: qtyStr,
                      sourceAsset,
                      targetAsset,
                      obtainedTarget: obtained,
                      response,
                      reason,
                      route,
                      bridgeAsset
                    }
                  : undefined
            };
          }
        }
      }
    }

    return { ok: false, obtainedTarget: 0 };
  }
}
