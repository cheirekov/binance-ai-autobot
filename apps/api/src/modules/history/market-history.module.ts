import { Module } from "@nestjs/common";

import { ConfigModule } from "../config/config.module";
import { MarketHistoryController } from "./market-history.controller";
import { MarketHistoryService } from "./market-history.service";
import { StrategyEvaluationService } from "./strategy-evaluation.service";

@Module({
  imports: [ConfigModule],
  controllers: [MarketHistoryController],
  providers: [MarketHistoryService, StrategyEvaluationService],
  exports: [MarketHistoryService]
})
export class MarketHistoryModule {}
