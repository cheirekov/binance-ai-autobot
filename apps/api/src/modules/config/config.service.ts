import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { BadRequestException, Injectable } from "@nestjs/common";
import type { AppConfig, BasicSetupRequest, DerivedSettings } from "@autobot/shared";
import { AppConfigSchema, CONFIG_VERSION, defaultHomeStableCoin, deriveAdvancedRiskProfile, deriveSettings } from "@autobot/shared";
import bcrypt from "bcryptjs";

type Writeable<T> = { -readonly [K in keyof T]: T[K] };

function atomicWriteFile(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, data, { encoding: "utf-8" });
  fs.renameSync(tmpPath, filePath);
}

@Injectable()
export class ConfigService {
  private cachedConfig: AppConfig | null = null;
  private cachedMtimeMs: number | null = null;

  get dataDir(): string {
    return process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  }

  private get configPath(): string {
    return path.join(this.dataDir, "config.json");
  }

  isInitialized(): boolean {
    return fs.existsSync(this.configPath);
  }

  migrateOnStartup(): { migrated: boolean; reason: "not_initialized" | "up_to_date" | "normalized" } {
    if (!fs.existsSync(this.configPath)) {
      this.cachedConfig = null;
      this.cachedMtimeMs = null;
      return { migrated: false, reason: "not_initialized" };
    }

    const raw = fs.readFileSync(this.configPath, "utf-8");
    const parsed = AppConfigSchema.parse(JSON.parse(raw));
    const normalized = parsed.advanced.followRiskProfile
      ? AppConfigSchema.parse({
          ...parsed,
          advanced: {
            ...parsed.advanced,
            ...deriveAdvancedRiskProfile(parsed.basic.risk)
          }
        })
      : parsed;

    const nextJson = JSON.stringify(normalized, null, 2);
    if (raw.trim() === nextJson.trim()) {
      const stat = fs.statSync(this.configPath);
      this.cachedConfig = normalized;
      this.cachedMtimeMs = stat.mtimeMs;
      return { migrated: false, reason: "up_to_date" };
    }

    atomicWriteFile(this.configPath, nextJson);
    const stat = fs.statSync(this.configPath);
    this.cachedConfig = normalized;
    this.cachedMtimeMs = stat.mtimeMs;
    return { migrated: true, reason: "normalized" };
  }

  load(): AppConfig | null {
    if (!fs.existsSync(this.configPath)) {
      this.cachedConfig = null;
      this.cachedMtimeMs = null;
      return null;
    }

    const stat = fs.statSync(this.configPath);
    if (this.cachedConfig && this.cachedMtimeMs === stat.mtimeMs) {
      return this.cachedConfig;
    }

    const raw = fs.readFileSync(this.configPath, "utf-8");
    const parsed = AppConfigSchema.parse(JSON.parse(raw)) as AppConfig;
    this.cachedConfig = parsed;
    this.cachedMtimeMs = stat.mtimeMs;
    return parsed;
  }

  save(config: AppConfig): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    atomicWriteFile(this.configPath, JSON.stringify(config, null, 2));
    this.cachedConfig = config;
    this.cachedMtimeMs = fs.statSync(this.configPath).mtimeMs;
  }

  createInitialConfig(request: BasicSetupRequest): AppConfig {
    const now = new Date().toISOString();
    const apiKey = crypto.randomBytes(32).toString("hex");

    const passwordHash = bcrypt.hashSync(request.uiPassword, 12);

    const derived: DerivedSettings = deriveSettings({ risk: request.risk, tradeMode: request.tradeMode });
    const riskProfile = deriveAdvancedRiskProfile(request.risk);

    const config: Writeable<AppConfig> = {
      version: CONFIG_VERSION,
      createdAt: now,
      updatedAt: now,
      basic: {
        binance: { apiKey: request.binanceApiKey, apiSecret: request.binanceApiSecret },
        openai: { apiKey: request.openaiApiKey, model: undefined },
        uiAuth: {
          username: request.uiUsername,
          passwordHash,
          passwordHashAlgo: "bcrypt",
          enabled: true
        },
        traderRegion: request.traderRegion,
        homeStableCoin: request.homeStableCoin ?? defaultHomeStableCoin(request.traderRegion),
        tradeMode: request.tradeMode,
        risk: request.risk,
        liveTrading: request.liveTrading,
        aiEnabled: request.aiEnabled,
        aiMinTradeConfidence: request.aiMinTradeConfidence
      },
      advanced: {
        apiKey,
        binanceEnvironment: "MAINNET",
        binanceBaseUrlOverride: undefined,
        apiBaseUrl: undefined,
        apiHost: process.env.API_HOST ?? "0.0.0.0",
        apiPort: Number.parseInt(process.env.PORT ?? "8148", 10),
        uiHost: process.env.UI_HOST ?? "0.0.0.0",
        uiPort: Number.parseInt(process.env.UI_PORT ?? "4173", 10),
        neverTradeSymbols: [],
        autoBlacklistEnabled: true,
        autoBlacklistTtlMinutes: 180,
        followRiskProfile: true,
        excludeStableStablePairs: true,
        enforceRegionPolicy: true,
        conversionTopUpMinTarget: 5,
        ...riskProfile
      },
      expert: {},
      derived
    };

    return AppConfigSchema.parse(config);
  }

  updateBasic(patch: {
    homeStableCoin?: string;
    risk?: number;
    tradeMode?: "SPOT" | "SPOT_GRID";
    aiEnabled?: boolean;
    aiMinTradeConfidence?: number;
    liveTrading?: boolean;
  }): AppConfig {
    const current = this.load();
    if (!current) {
      throw new BadRequestException("Bot is not initialized.");
    }

    const nextBasic = {
      ...current.basic,
      ...patch
    };

    if (nextBasic.aiEnabled && !nextBasic.openai.apiKey) {
      throw new BadRequestException("OpenAI API key is required when aiEnabled=true.");
    }

    const derived = deriveSettings({ risk: nextBasic.risk, tradeMode: nextBasic.tradeMode });
    const nextAdvanced = current.advanced.followRiskProfile
      ? {
          ...current.advanced,
          ...deriveAdvancedRiskProfile(nextBasic.risk)
        }
      : current.advanced;

    const next = AppConfigSchema.parse({
      ...current,
      updatedAt: new Date().toISOString(),
      basic: nextBasic,
      advanced: nextAdvanced,
      derived
    });

    this.save(next);
    return next;
  }

  updateAdvanced(patch: {
    apiBaseUrl?: string;
    binanceEnvironment?: "MAINNET" | "SPOT_TESTNET";
    binanceBaseUrlOverride?: string;
    apiHost?: string;
    apiPort?: number;
    uiHost?: string;
    uiPort?: number;
    neverTradeSymbols?: string[];
    autoBlacklistEnabled?: boolean;
    autoBlacklistTtlMinutes?: number;
    followRiskProfile?: boolean;
    liveTradeCooldownMs?: number;
    liveTradeNotionalCap?: number;
    liveTradeSlippageBuffer?: number;
    liveTradeRebalanceSellCooldownMs?: number;
    conversionBuyBuffer?: number;
    conversionSellBuffer?: number;
    conversionFeeBuffer?: number;
    excludeStableStablePairs?: boolean;
    enforceRegionPolicy?: boolean;
    symbolEntryCooldownMs?: number;
    maxConsecutiveEntriesPerSymbol?: number;
    conversionTopUpReserveMultiplier?: number;
    conversionTopUpCooldownMs?: number;
    conversionTopUpMinTarget?: number;
  }): AppConfig {
    const current = this.load();
    if (!current) {
      throw new BadRequestException("Bot is not initialized.");
    }

    const neverTradeSymbols = patch.neverTradeSymbols
      ? patch.neverTradeSymbols.map((s) => s.trim()).filter(Boolean)
      : undefined;

    const apiHost = patch.apiHost?.trim();
    const uiHost = patch.uiHost?.trim();

    const apiBaseUrl = (() => {
      if (patch.apiBaseUrl === undefined) return undefined;
      const trimmed = patch.apiBaseUrl.trim();
      if (!trimmed) return undefined;
      try {
        const u = new URL(trimmed);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          throw new Error("Only http/https URLs are allowed.");
        }
      } catch (e) {
        throw new BadRequestException(`Invalid apiBaseUrl: ${e instanceof Error ? e.message : String(e)}`);
      }
      return trimmed;
    })();

    const binanceBaseUrlOverride = (() => {
      if (patch.binanceBaseUrlOverride === undefined) return undefined;
      const trimmed = patch.binanceBaseUrlOverride.trim();
      if (!trimmed) return undefined;
      try {
        const u = new URL(trimmed);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          throw new Error("Only http/https URLs are allowed.");
        }
      } catch (e) {
        throw new BadRequestException(`Invalid binanceBaseUrlOverride: ${e instanceof Error ? e.message : String(e)}`);
      }
      return trimmed;
    })();

    const nextAdvancedBase = {
      ...current.advanced,
      ...patch,
      ...(apiBaseUrl === undefined && patch.apiBaseUrl !== undefined ? { apiBaseUrl: undefined } : {}),
      ...(apiBaseUrl ? { apiBaseUrl } : {}),
      ...(binanceBaseUrlOverride === undefined && patch.binanceBaseUrlOverride !== undefined ? { binanceBaseUrlOverride: undefined } : {}),
      ...(binanceBaseUrlOverride ? { binanceBaseUrlOverride } : {}),
      ...(apiHost ? { apiHost } : {}),
      ...(uiHost ? { uiHost } : {}),
      ...(neverTradeSymbols ? { neverTradeSymbols } : {})
    };

    const nextAdvanced = nextAdvancedBase.followRiskProfile
      ? {
          ...nextAdvancedBase,
          ...deriveAdvancedRiskProfile(current.basic.risk)
        }
      : nextAdvancedBase;

    const next = AppConfigSchema.parse({
      ...current,
      updatedAt: new Date().toISOString(),
      advanced: nextAdvanced
    });

    this.save(next);
    return next;
  }

  rotateApiKey(): AppConfig {
    const current = this.load();
    if (!current) {
      throw new BadRequestException("Bot is not initialized.");
    }

    const apiKey = crypto.randomBytes(32).toString("hex");
    const next = AppConfigSchema.parse({
      ...current,
      updatedAt: new Date().toISOString(),
      advanced: {
        ...current.advanced,
        apiKey
      }
    });

    this.save(next);
    return next;
  }

  updateUiAuth(patch: { username?: string; password?: string; enabled?: boolean }): AppConfig {
    const current = this.load();
    if (!current) {
      throw new BadRequestException("Bot is not initialized.");
    }

    const nextUiAuth = {
      ...current.basic.uiAuth,
      ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
      ...(patch.username === undefined ? {} : { username: patch.username.trim() }),
      ...(patch.password === undefined
        ? {}
        : { passwordHash: bcrypt.hashSync(patch.password, 12), passwordHashAlgo: "bcrypt" as const })
    };

    const next = AppConfigSchema.parse({
      ...current,
      updatedAt: new Date().toISOString(),
      basic: {
        ...current.basic,
        uiAuth: nextUiAuth
      }
    });

    this.save(next);
    return next;
  }

  updateBinanceCredentials(patch: { apiKey: string; apiSecret: string }): AppConfig {
    const current = this.load();
    if (!current) {
      throw new BadRequestException("Bot is not initialized.");
    }

    const next = AppConfigSchema.parse({
      ...current,
      updatedAt: new Date().toISOString(),
      basic: {
        ...current.basic,
        binance: {
          apiKey: patch.apiKey.trim(),
          apiSecret: patch.apiSecret.trim()
        }
      }
    });

    this.save(next);
    return next;
  }

  importConfig(config: AppConfig): AppConfig {
    const derived = deriveSettings({ risk: config.basic.risk, tradeMode: config.basic.tradeMode });
    const parsed = AppConfigSchema.parse({
      ...config,
      version: CONFIG_VERSION,
      updatedAt: new Date().toISOString(),
      derived
    });
    const next = parsed.advanced.followRiskProfile
      ? AppConfigSchema.parse({
          ...parsed,
          advanced: {
            ...parsed.advanced,
            ...deriveAdvancedRiskProfile(parsed.basic.risk)
          }
        })
      : parsed;
    this.save(next);
    return next;
  }
}
