import { Body, Controller, Get, Post } from "@nestjs/common";
import type { BotState } from "@autobot/shared";

import { BotEngineService, type BotRunStatsResponse } from "./bot-engine.service";

@Controller()
export class BotController {
  constructor(private readonly botEngine: BotEngineService) {}

  @Get("bot/status")
  getStatus(): BotState {
    return this.botEngine.getState();
  }

  @Get("bot/run-stats")
  getRunStats(): BotRunStatsResponse {
    return this.botEngine.getRunStats();
  }

  @Post("bot/start")
  start(): { ok: true } {
    this.botEngine.start();
    return { ok: true };
  }

  @Post("bot/stop")
  async stop(): Promise<{ ok: true }> {
    await this.botEngine.stop();
    return { ok: true };
  }

  @Get("bot/decisions")
  getDecisions(): BotState["decisions"] {
    return this.botEngine.getState().decisions;
  }

  @Get("orders/active")
  getActiveOrders(): BotState["activeOrders"] {
    return this.botEngine.getState().activeOrders;
  }

  @Get("orders/history")
  getOrderHistory(): BotState["orderHistory"] {
    return this.botEngine.getState().orderHistory;
  }

  @Post("bot/debug/decision")
  addDecision(@Body() body: { summary?: string } | undefined): { ok: true } {
    this.botEngine.addDecision("DEBUG", body?.summary ?? "Manual debug decision");
    return { ok: true };
  }
}
