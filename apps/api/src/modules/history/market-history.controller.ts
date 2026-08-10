import { BadRequestException, Controller, Get, Query } from "@nestjs/common";

import { MarketHistoryService } from "./market-history.service";
import { StrategyEvaluationService } from "./strategy-evaluation.service";

@Controller("history")
export class MarketHistoryController {
  constructor(
    private readonly history: MarketHistoryService,
    private readonly strategyEvaluation: StrategyEvaluationService
  ) {}

  @Get("stats")
  getStats() {
    return this.history.getStats();
  }

  @Get("candles")
  getCandles(
    @Query("symbol") symbol?: string,
    @Query("interval") interval = "1h",
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("limit") limit?: string
  ) {
    if (!symbol?.trim()) throw new BadRequestException("symbol is required");
    const fromTime = from === undefined ? undefined : Number(from);
    const toTime = to === undefined ? undefined : Number(to);
    const parsedLimit = limit === undefined ? undefined : Number(limit);
    if ((fromTime !== undefined && !Number.isFinite(fromTime)) ||
        (toTime !== undefined && !Number.isFinite(toTime)) ||
        (parsedLimit !== undefined && !Number.isFinite(parsedLimit))) {
      throw new BadRequestException("from, to, and limit must be numeric");
    }
    return this.history.getCandles({ symbol, interval, fromTime, toTime, limit: parsedLimit });
  }

  @Get("evaluate-signals")
  evaluateSignals(
    @Query("symbol") symbol?: string,
    @Query("interval") interval = "1h",
    @Query("limit") limit?: string,
    @Query("feeBps") feeBps?: string
  ) {
    if (!symbol?.trim()) throw new BadRequestException("symbol is required");
    const parsedLimit = limit === undefined ? undefined : Number(limit);
    const parsedFeeBps = feeBps === undefined ? undefined : Number(feeBps);
    if ((parsedLimit !== undefined && !Number.isFinite(parsedLimit)) ||
        (parsedFeeBps !== undefined && !Number.isFinite(parsedFeeBps))) {
      throw new BadRequestException("limit and feeBps must be numeric");
    }
    return this.strategyEvaluation.evaluate({ symbol, interval, limit: parsedLimit, feeBps: parsedFeeBps });
  }
}
