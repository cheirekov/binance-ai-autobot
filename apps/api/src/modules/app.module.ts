import { Module } from "@nestjs/common";

import { BotModule } from "./bot/bot.module";
import { ConfigPublicModule } from "./config/config.public.module";
import { HealthModule } from "./health/health.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { NewsModule } from "./news/news.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { SetupModule } from "./setup/setup.module";

@Module({
  imports: [HealthModule, SetupModule, ConfigPublicModule, IntegrationsModule, NewsModule, PortfolioModule, BotModule]
})
export class AppModule {}
