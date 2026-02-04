import { Module } from "@nestjs/common";

import { ConfigModule } from "../config/config.module";
import { BinanceStatusService } from "./binance-status.service";
import { IntegrationsController } from "./integrations.controller";

@Module({
  imports: [ConfigModule],
  controllers: [IntegrationsController],
  providers: [BinanceStatusService]
})
export class IntegrationsModule {}

