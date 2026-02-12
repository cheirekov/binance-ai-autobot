import { BadRequestException, Body, Controller, Get, Post, Put } from "@nestjs/common";
import { z } from "zod";
import type { AppConfig } from "@autobot/shared";
import { AppConfigSchema } from "@autobot/shared";

import { ConfigService } from "./config.service";

const AdvancedUpdateSchema = z.object({
  apiBaseUrl: z.union([z.string().url(), z.literal("")]).optional(),
  binanceEnvironment: z.enum(["MAINNET", "SPOT_TESTNET"]).optional(),
  binanceBaseUrlOverride: z.union([z.string().url(), z.literal("")]).optional(),
  apiHost: z.string().min(1).optional(),
  apiPort: z.number().int().min(1).max(65535).optional(),
  uiHost: z.string().min(1).optional(),
  uiPort: z.number().int().min(1).max(65535).optional(),
  neverTradeSymbols: z.array(z.string().min(1)).optional(),
  autoBlacklistEnabled: z.boolean().optional(),
  autoBlacklistTtlMinutes: z.number().int().min(1).max(43200).optional(),
  followRiskProfile: z.boolean().optional(),
  liveTradeCooldownMs: z.number().int().min(5_000).max(86_400_000).optional(),
  liveTradeNotionalCap: z.number().min(1).max(1_000_000).optional(),
  liveTradeSlippageBuffer: z.number().min(1).max(1.1).optional(),
  liveTradeRebalanceSellCooldownMs: z.number().int().min(0).max(86_400_000).optional(),
  conversionBuyBuffer: z.number().min(1).max(1.1).optional(),
  conversionSellBuffer: z.number().min(1).max(1.1).optional(),
  conversionFeeBuffer: z.number().min(1).max(1.1).optional(),
  routingBridgeAssets: z.array(z.string().min(1)).max(20).optional(),
  universeQuoteAssets: z.array(z.string().min(1)).max(20).optional(),
  walletQuoteHintLimit: z.number().int().min(0).max(20).optional(),
  excludeStableStablePairs: z.boolean().optional(),
  enforceRegionPolicy: z.boolean().optional(),
  symbolEntryCooldownMs: z.number().int().min(0).max(86_400_000).optional(),
  maxConsecutiveEntriesPerSymbol: z.number().int().min(1).max(50).optional(),
  conversionTopUpReserveMultiplier: z.number().min(1).max(10).optional(),
  conversionTopUpCooldownMs: z.number().int().min(0).max(86_400_000).optional(),
  conversionTopUpMinTarget: z.number().min(1).max(100_000).optional()
});

const BasicUpdateSchema = z.object({
  homeStableCoin: z.string().min(2).optional(),
  risk: z.number().int().min(0).max(100).optional(),
  tradeMode: z.enum(["SPOT", "SPOT_GRID"]).optional(),
  aiEnabled: z.boolean().optional(),
  aiMinTradeConfidence: z.number().int().min(0).max(100).optional(),
  liveTrading: z.boolean().optional()
});

const UiAuthUpdateSchema = z.object({
  username: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  enabled: z.boolean().optional()
});

const BinanceCredentialsUpdateSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1)
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
      uiAuth?: { username: string; enabled: boolean };
    };
    derived?: {
      maxOpenPositions: number;
      maxPositionPct: number;
      allowSpot: boolean;
      allowGrid: boolean;
      allowFutures: boolean;
    };
    integrations?: { binanceConfigured: boolean; openaiConfigured: boolean };
    advanced?: {
      apiHost: string;
      apiPort: number;
      uiHost: string;
      uiPort: number;
      apiBaseUrl?: string;
      binanceEnvironment: "MAINNET" | "SPOT_TESTNET";
      binanceBaseUrlOverride?: string;
      apiKeyHint: string;
      neverTradeSymbols: string[];
      autoBlacklistEnabled: boolean;
      autoBlacklistTtlMinutes: number;
      followRiskProfile: boolean;
      liveTradeCooldownMs: number;
      liveTradeNotionalCap: number;
      liveTradeSlippageBuffer: number;
      liveTradeRebalanceSellCooldownMs: number;
      conversionBuyBuffer: number;
      conversionSellBuffer: number;
      conversionFeeBuffer: number;
      routingBridgeAssets: string[];
      universeQuoteAssets: string[];
      walletQuoteHintLimit: number;
      excludeStableStablePairs: boolean;
      enforceRegionPolicy: boolean;
      symbolEntryCooldownMs: number;
      maxConsecutiveEntriesPerSymbol: number;
      conversionTopUpReserveMultiplier: number;
      conversionTopUpCooldownMs: number;
      conversionTopUpMinTarget: number;
    };
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
        aiMinTradeConfidence: config.basic.aiMinTradeConfidence,
        uiAuth: { username: config.basic.uiAuth.username, enabled: config.basic.uiAuth.enabled }
      },
      derived: config.derived,
      integrations: {
        binanceConfigured: Boolean(config.basic.binance.apiKey && config.basic.binance.apiSecret),
        openaiConfigured: Boolean(config.basic.openai.apiKey)
      },
      advanced: {
        apiHost: config.advanced.apiHost,
        apiPort: config.advanced.apiPort,
        uiHost: config.advanced.uiHost,
        uiPort: config.advanced.uiPort,
        apiBaseUrl: config.advanced.apiBaseUrl,
        binanceEnvironment: config.advanced.binanceEnvironment,
        binanceBaseUrlOverride: config.advanced.binanceBaseUrlOverride,
        apiKeyHint: config.advanced.apiKey.slice(-6),
        neverTradeSymbols: config.advanced.neverTradeSymbols,
        autoBlacklistEnabled: config.advanced.autoBlacklistEnabled,
        autoBlacklistTtlMinutes: config.advanced.autoBlacklistTtlMinutes,
        followRiskProfile: config.advanced.followRiskProfile,
        liveTradeCooldownMs: config.advanced.liveTradeCooldownMs,
        liveTradeNotionalCap: config.advanced.liveTradeNotionalCap,
        liveTradeSlippageBuffer: config.advanced.liveTradeSlippageBuffer,
        liveTradeRebalanceSellCooldownMs: config.advanced.liveTradeRebalanceSellCooldownMs,
        conversionBuyBuffer: config.advanced.conversionBuyBuffer,
        conversionSellBuffer: config.advanced.conversionSellBuffer,
        conversionFeeBuffer: config.advanced.conversionFeeBuffer,
        routingBridgeAssets: config.advanced.routingBridgeAssets,
        universeQuoteAssets: config.advanced.universeQuoteAssets,
        walletQuoteHintLimit: config.advanced.walletQuoteHintLimit,
        excludeStableStablePairs: config.advanced.excludeStableStablePairs,
        enforceRegionPolicy: config.advanced.enforceRegionPolicy,
        symbolEntryCooldownMs: config.advanced.symbolEntryCooldownMs,
        maxConsecutiveEntriesPerSymbol: config.advanced.maxConsecutiveEntriesPerSymbol,
        conversionTopUpReserveMultiplier: config.advanced.conversionTopUpReserveMultiplier,
        conversionTopUpCooldownMs: config.advanced.conversionTopUpCooldownMs,
        conversionTopUpMinTarget: config.advanced.conversionTopUpMinTarget
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

  @Put("ui-auth")
  updateUiAuth(@Body() body: unknown): { ok: true } {
    const patch = UiAuthUpdateSchema.parse(body);
    this.configService.updateUiAuth(patch);
    return { ok: true };
  }

  @Put("binance-credentials")
  updateBinanceCredentials(@Body() body: unknown): { ok: true } {
    const patch = BinanceCredentialsUpdateSchema.parse(body);
    this.configService.updateBinanceCredentials(patch);
    return { ok: true };
  }

  @Get("export")
  exportConfig(): AppConfig {
    const config = this.configService.load();
    if (!config) {
      throw new BadRequestException("Bot is not initialized.");
    }
    return config;
  }

  @Put("import")
  importConfig(@Body() body: unknown): { ok: true } {
    const config = AppConfigSchema.parse(body);
    this.configService.importConfig(config);
    return { ok: true };
  }

  @Post("rotate-api-key")
  rotateApiKey(): { apiKey: string } {
    const next = this.configService.rotateApiKey();
    return { apiKey: next.advanced.apiKey };
  }
}
