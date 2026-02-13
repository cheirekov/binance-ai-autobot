import { Module } from "@nestjs/common";

import { BotModule } from "../bot/bot.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { PortfolioModule } from "../portfolio/portfolio.module";
import { UniverseModule } from "../universe/universe.module";
import { DashboardController } from "./dashboard.controller";

@Module({
  imports: [BotModule, IntegrationsModule, PortfolioModule, UniverseModule],
  controllers: [DashboardController]
})
export class DashboardModule {}

