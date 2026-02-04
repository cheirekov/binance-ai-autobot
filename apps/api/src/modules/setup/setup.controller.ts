import { Body, ConflictException, Controller, Get, Post } from "@nestjs/common";
import type { BasicSetupRequest } from "@autobot/shared";
import { BasicSetupRequestSchema, defaultHomeStableCoin } from "@autobot/shared";

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
}
