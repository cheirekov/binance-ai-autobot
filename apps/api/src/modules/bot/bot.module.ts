import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { ConfigModule } from "../config/config.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { ApiKeyGuard } from "../security/api-key.guard";
import { UniverseModule } from "../universe/universe.module";
import { BotController } from "./bot.controller";
import { BotEngineService } from "./bot-engine.service";

@Module({
  imports: [ConfigModule, IntegrationsModule, UniverseModule],
  controllers: [BotController],
  providers: [
    BotEngineService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard
    }
  ],
  exports: [BotEngineService]
})
export class BotModule {}
