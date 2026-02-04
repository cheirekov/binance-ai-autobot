import { Body, Controller, Get, Put } from "@nestjs/common";
import { z } from "zod";

import { ConfigService } from "./config.service";

const AdvancedUpdateSchema = z.object({
  neverTradeSymbols: z.array(z.string().min(1)).optional(),
  autoBlacklistEnabled: z.boolean().optional(),
  autoBlacklistTtlMinutes: z.number().int().min(1).max(43200).optional()
});

const BasicUpdateSchema = z.object({
  homeStableCoin: z.string().min(2).optional(),
  risk: z.number().int().min(0).max(100).optional(),
  tradeMode: z.enum(["SPOT", "SPOT_GRID"]).optional(),
  aiEnabled: z.boolean().optional(),
  aiMinTradeConfidence: z.number().int().min(0).max(100).optional(),
  liveTrading: z.boolean().optional()
});

@Controller("config")
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get("public")
  getPublic(): {
    initialized: boolean;
    basic?: {
      traderRegion: string;
      homeStableCoin: string;
      tradeMode: string;
      risk: number;
      liveTrading: boolean;
      aiEnabled: boolean;
      aiMinTradeConfidence: number;
    };
    derived?: {
      maxOpenPositions: number;
      maxPositionPct: number;
      allowSpot: boolean;
      allowGrid: boolean;
      allowFutures: boolean;
    };
    integrations?: { binanceConfigured: boolean; openaiConfigured: boolean };
    advanced?: { neverTradeSymbols: string[]; autoBlacklistEnabled: boolean; autoBlacklistTtlMinutes: number };
  } {
    const config = this.configService.load();
    if (!config) {
      return { initialized: false };
    }

    return {
      initialized: true,
      basic: {
        traderRegion: config.basic.traderRegion,
        homeStableCoin: config.basic.homeStableCoin,
        tradeMode: config.basic.tradeMode,
        risk: config.basic.risk,
        liveTrading: config.basic.liveTrading,
        aiEnabled: config.basic.aiEnabled,
        aiMinTradeConfidence: config.basic.aiMinTradeConfidence
      },
      derived: config.derived,
      integrations: {
        binanceConfigured: Boolean(config.basic.binance.apiKey && config.basic.binance.apiSecret),
        openaiConfigured: Boolean(config.basic.openai.apiKey)
      },
      advanced: {
        neverTradeSymbols: config.advanced.neverTradeSymbols,
        autoBlacklistEnabled: config.advanced.autoBlacklistEnabled,
        autoBlacklistTtlMinutes: config.advanced.autoBlacklistTtlMinutes
      }
    };
  }

  @Put("basic")
  updateBasic(@Body() body: unknown): { ok: true } {
    const patch = BasicUpdateSchema.parse(body);
    this.configService.updateBasic(patch);
    return { ok: true };
  }

  @Put("advanced")
  updateAdvanced(@Body() body: unknown): { ok: true } {
    const patch = AdvancedUpdateSchema.parse(body);
    this.configService.updateAdvanced(patch);
    return { ok: true };
  }
}

