import { Controller, Get } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import type { BinanceStatus } from "./binance-status.service";
import { BinanceStatusService } from "./binance-status.service";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly configService: ConfigService,
    private readonly binanceStatus: BinanceStatusService
  ) {}

  @Get("status")
  async getStatus(): Promise<{
    binance: BinanceStatus;
    openai: { enabled: boolean; configured: boolean };
  }> {
    const config = this.configService.load();
    const binance = await this.binanceStatus.getStatus();

    return {
      binance,
      openai: {
        enabled: Boolean(config?.basic.aiEnabled),
        configured: Boolean(config?.basic.openai.apiKey)
      }
    };
  }

  @Get("binance/status")
  async getBinanceStatus(): Promise<BinanceStatus> {
    return await this.binanceStatus.getStatus();
  }
}

