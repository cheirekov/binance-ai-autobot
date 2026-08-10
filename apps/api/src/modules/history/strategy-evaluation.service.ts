import { Injectable } from "@nestjs/common";
import type { UniverseCandidate } from "@autobot/shared";
import {
  computeBollingerSignal,
  computeDonchianBreakoutPct,
  computeEmaTrendSpreadPct,
  computeRangeCycleScore
} from "@autobot/shared";

import { getFreshLongBlockReason, scoreAdaptiveStrategy, type AdaptiveRegime } from "../bot/adaptive-strategy";
import { computeAdx, computeAtrPct, computeRsi } from "../universe/market-indicators";
import { MarketHistoryService } from "./market-history.service";

type StrategyMetrics = {
  signals: number;
  wins: number;
  winRatePct: number;
  averageNetReturnPct: number;
  compoundedNetReturnPct: number;
};

type MutableMetrics = { signals: number; wins: number; netReturnSum: number; compounded: number };

@Injectable()
export class StrategyEvaluationService {
  constructor(private readonly history: MarketHistoryService) {}

  evaluate(params: { symbol: string; interval?: string; limit?: number; feeBps?: number }) {
    const symbol = params.symbol.trim().toUpperCase();
    const interval = params.interval?.trim() || "1h";
    const limit = Math.max(80, Math.min(10_000, Math.floor(params.limit ?? 1000)));
    const feeBps = Math.max(0, Math.min(100, params.feeBps ?? 10));
    const candles = this.history.getCandles({ symbol, interval, limit });

    const totals: Record<"TREND" | "MEAN_REVERSION", MutableMetrics> = {
      TREND: { signals: 0, wins: 0, netReturnSum: 0, compounded: 1 },
      MEAN_REVERSION: { signals: 0, wins: 0, netReturnSum: 0, compounded: 1 }
    };
    let freshLongBlocked = 0;
    const feeRate = feeBps / 10_000;

    for (let index = 60; index < candles.length - 1; index += 1) {
      const window = candles.slice(Math.max(0, index - 79), index + 1);
      const highs = window.map((candle) => candle.high);
      const lows = window.map((candle) => candle.low);
      const closes = window.map((candle) => candle.close);
      const current = candles[index];
      const previous24h = candles[index - 24];
      if (!current || !previous24h || current.close <= 0 || previous24h.close <= 0) continue;

      const bollinger = computeBollingerSignal(closes, 20, 2);
      const candidate: UniverseCandidate = {
        symbol,
        baseAsset: symbol,
        quoteAsset: interval,
        lastPrice: current.close,
        quoteVolume24h: 0,
        priceChangePct24h: ((current.close / previous24h.close) - 1) * 100,
        rsi14: computeRsi(closes, 14) ?? undefined,
        adx14: computeAdx(highs, lows, closes, 14) ?? undefined,
        atrPct14: computeAtrPct(highs, lows, closes, 14) ?? undefined,
        donchianBreakoutPct20: computeDonchianBreakoutPct(highs, lows, closes, 20) ?? undefined,
        bollingerPosition20: bollinger?.position,
        bollingerWidthPct20: bollinger?.widthPct,
        emaTrendSpreadPct: computeEmaTrendSpreadPct(closes, 12, 26) ?? undefined,
        rangeCycleScore20: computeRangeCycleScore(closes, 20) ?? undefined,
        score: 0,
        reasons: []
      };
      const regime = this.resolveRegime(candidate);
      const scores = scoreAdaptiveStrategy(candidate, regime);
      if (getFreshLongBlockReason(candidate)) {
        freshLongBlocked += 1;
        continue;
      }

      const strategy = scores.recommended;
      if (strategy === "GRID") continue;
      const signalScore = strategy === "TREND" ? scores.trend : scores.meanReversion;
      const minimumScore = strategy === "TREND" ? 0.45 : 0.5;
      if (signalScore < minimumScore) continue;

      const next = candles[index + 1];
      if (!next || next.close <= 0) continue;
      const netReturn = (next.close / current.close) - 1 - feeRate * 2;
      const metrics = totals[strategy];
      metrics.signals += 1;
      metrics.netReturnSum += netReturn;
      metrics.compounded *= 1 + netReturn;
      if (netReturn > 0) metrics.wins += 1;
    }

    const first = candles[0];
    const last = candles[candles.length - 1];
    const buyHoldReturn = first && last && first.close > 0
      ? ((last.close / first.close) - 1 - feeRate * 2) * 100
      : null;

    return {
      symbol,
      interval,
      candles: candles.length,
      sufficientHistory: candles.length >= 80,
      feeBpsPerSide: feeBps,
      evaluation: "one-candle forward signal quality; GRID execution is not simulated",
      freshLongBlocked,
      buyHoldReturnPct: buyHoldReturn === null ? null : Number(buyHoldReturn.toFixed(4)),
      strategies: {
        TREND: this.finalize(totals.TREND),
        MEAN_REVERSION: this.finalize(totals.MEAN_REVERSION)
      }
    };
  }

  private resolveRegime(candidate: UniverseCandidate): AdaptiveRegime {
    const adx = candidate.adx14 ?? 0;
    const ema = candidate.emaTrendSpreadPct ?? 0;
    const change = candidate.priceChangePct24h;
    if (adx >= 22 && ema >= 0.25 && change > 0) return "BULL_TREND";
    if (adx >= 22 && ema <= -0.25 && change < 0) return "BEAR_TREND";
    if (adx < 18 || (candidate.rangeCycleScore20 ?? 0) >= 0.6) return "RANGE";
    return "NEUTRAL";
  }

  private finalize(metrics: MutableMetrics): StrategyMetrics {
    return {
      signals: metrics.signals,
      wins: metrics.wins,
      winRatePct: metrics.signals > 0 ? Number(((metrics.wins / metrics.signals) * 100).toFixed(2)) : 0,
      averageNetReturnPct: metrics.signals > 0 ? Number(((metrics.netReturnSum / metrics.signals) * 100).toFixed(4)) : 0,
      compoundedNetReturnPct: Number(((metrics.compounded - 1) * 100).toFixed(4))
    };
  }
}
