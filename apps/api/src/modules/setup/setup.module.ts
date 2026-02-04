import { Module } from "@nestjs/common";

import { ConfigModule } from "../config/config.module";
import { SetupController } from "./setup.controller";

@Module({
  imports: [ConfigModule],
  controllers: [SetupController]
})
export class SetupModule {}
