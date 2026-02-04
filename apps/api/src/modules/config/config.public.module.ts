import { Module } from "@nestjs/common";

import { ConfigController } from "./config.controller";
import { ConfigModule } from "./config.module";

@Module({
  imports: [ConfigModule],
  controllers: [ConfigController]
})
export class ConfigPublicModule {}

