import { Module } from "@nestjs/common";

import { ConfigModule } from "../config/config.module";
import { BinanceMarketDataService } from "./binance-market-data.service";
import { BinanceStatusService } from "./binance-status.service";
import { BinanceTradingService } from "./binance-trading.service";
import { IntegrationsController } from "./integrations.controller";

@Module({
  imports: [ConfigModule],
  controllers: [IntegrationsController],
  providers: [BinanceStatusService, BinanceMarketDataService, BinanceTradingService],
  exports: [BinanceMarketDataService, BinanceTradingService]
})
export class IntegrationsModule {}
