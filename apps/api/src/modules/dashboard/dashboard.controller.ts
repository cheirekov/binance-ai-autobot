import { Controller, Get } from "@nestjs/common";
import type { AppConfig, BotState, UniverseSnapshot } from "@autobot/shared";

import { BotEngineService, type BotRunStatsResponse } from "../bot/bot-engine.service";
import { ConfigService } from "../config/config.service";
import type { BinanceStatus } from "../integrations/binance-status.service";
import { BinanceStatusService } from "../integrations/binance-status.service";
import type { WalletSnapshot } from "../portfolio/portfolio.service";
import { PortfolioService } from "../portfolio/portfolio.service";
import { UniverseService } from "../universe/universe.service";

type PublicConfigView = {
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
    botOrderClientIdPrefix: string;
    botOrderAutoCancelEnabled: boolean;
    botOrderStaleTtlMinutes: number;
    botOrderMaxDistancePct: number;
    autoCancelBotOrdersOnStop: boolean;
    autoCancelBotOrdersOnGlobalProtectionLock: boolean;
    manageExternalOpenOrders: boolean;
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
};

type IntegrationsStatusView = {
  binance: BinanceStatus;
  openai: { enabled: boolean; configured: boolean };
};

type DashboardSnapshot = {
  generatedAt: string;
  config: PublicConfigView;
  integrations: IntegrationsStatusView;
  wallet: WalletSnapshot;
  universe: UniverseSnapshot;
  bot: BotState;
  runStats: BotRunStatsResponse;
};

function toPublicConfigView(config: AppConfig | null): PublicConfigView {
  if (!config) return { initialized: false };

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
      botOrderClientIdPrefix: config.advanced.botOrderClientIdPrefix,
      botOrderAutoCancelEnabled: config.advanced.botOrderAutoCancelEnabled,
      botOrderStaleTtlMinutes: config.advanced.botOrderStaleTtlMinutes,
      botOrderMaxDistancePct: config.advanced.botOrderMaxDistancePct,
      autoCancelBotOrdersOnStop: config.advanced.autoCancelBotOrdersOnStop,
      autoCancelBotOrdersOnGlobalProtectionLock: config.advanced.autoCancelBotOrdersOnGlobalProtectionLock,
      manageExternalOpenOrders: config.advanced.manageExternalOpenOrders,
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

@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly botEngine: BotEngineService,
    private readonly configService: ConfigService,
    private readonly binanceStatus: BinanceStatusService,
    private readonly portfolio: PortfolioService,
    private readonly universe: UniverseService
  ) {}

  @Get("snapshot")
  async getSnapshot(): Promise<DashboardSnapshot> {
    const generatedAt = new Date().toISOString();
    const config = this.configService.load();

    const [binance, wallet, universe] = await Promise.all([
      this.binanceStatus.getStatus(),
      this.portfolio.getWallet(),
      this.universe.getLatest()
    ]);

    return {
      generatedAt,
      config: toPublicConfigView(config),
      integrations: {
        binance,
        openai: {
          enabled: Boolean(config?.basic.aiEnabled),
          configured: Boolean(config?.basic.openai.apiKey)
        }
      },
      wallet,
      universe,
      bot: this.botEngine.getState(),
      runStats: this.botEngine.getRunStats()
    };
  }
}
