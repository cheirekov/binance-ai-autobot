import { Module } from "@nestjs/common";

import { ConfigModule } from "../config/config.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { UniverseController } from "./universe.controller";
import { UniverseService } from "./universe.service";

@Module({
  imports: [ConfigModule, IntegrationsModule],
  controllers: [UniverseController],
  providers: [UniverseService],
  exports: [UniverseService]
})
export class UniverseModule {}
