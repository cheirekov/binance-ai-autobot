import { Body, ConflictException, Controller, Get, Post } from "@nestjs/common";
import type { AppConfig, BasicSetupRequest } from "@autobot/shared";
import { AppConfigSchema, BasicSetupRequestSchema, defaultHomeStableCoin, deriveSettings } from "@autobot/shared";

import { ConfigService } from "../config/config.service";

@Controller("setup")
export class SetupController {
  constructor(private readonly configService: ConfigService) {}

  @Get("status")
  getStatus(): { initialized: boolean } {
    return { initialized: this.configService.isInitialized() };
  }

  @Post("basic")
  setupBasic(@Body() body: unknown): { initialized: true } {
    if (this.configService.isInitialized()) {
      throw new ConflictException("Already initialized.");
    }

    const request = BasicSetupRequestSchema.parse(body) satisfies BasicSetupRequest;

    const normalized: BasicSetupRequest = {
      ...request,
      homeStableCoin: request.homeStableCoin ?? defaultHomeStableCoin(request.traderRegion)
    };

    const config = this.configService.createInitialConfig(normalized);
    this.configService.save(config);

    return { initialized: true };
  }

  @Post("import")
  importConfig(@Body() body: unknown): { initialized: true } {
    if (this.configService.isInitialized()) {
      throw new ConflictException("Already initialized.");
    }

    const config = AppConfigSchema.parse(body) satisfies AppConfig;
    const derived = deriveSettings({ risk: config.basic.risk, tradeMode: config.basic.tradeMode });
    this.configService.save({ ...config, updatedAt: new Date().toISOString(), derived });
    return { initialized: true };
  }
}
