import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { BadRequestException, Injectable } from "@nestjs/common";
import type { AppConfig, BasicSetupRequest, DerivedSettings } from "@autobot/shared";
import { AppConfigSchema, CONFIG_VERSION, defaultHomeStableCoin, deriveSettings } from "@autobot/shared";
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
        apiHost: process.env.API_HOST ?? "0.0.0.0",
        apiPort: Number.parseInt(process.env.PORT ?? "8148", 10),
        uiHost: process.env.UI_HOST ?? "0.0.0.0",
        uiPort: Number.parseInt(process.env.UI_PORT ?? "4173", 10),
        neverTradeSymbols: [],
        autoBlacklistEnabled: true,
        autoBlacklistTtlMinutes: 180
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
    const next = AppConfigSchema.parse({
      ...current,
      updatedAt: new Date().toISOString(),
      basic: nextBasic,
      derived
    });

    this.save(next);
    return next;
  }

  updateAdvanced(patch: {
    neverTradeSymbols?: string[];
    autoBlacklistEnabled?: boolean;
    autoBlacklistTtlMinutes?: number;
  }): AppConfig {
    const current = this.load();
    if (!current) {
      throw new BadRequestException("Bot is not initialized.");
    }

    const neverTradeSymbols = patch.neverTradeSymbols
      ? patch.neverTradeSymbols.map((s) => s.trim()).filter(Boolean)
      : undefined;

    const nextAdvanced = {
      ...current.advanced,
      ...patch,
      ...(neverTradeSymbols ? { neverTradeSymbols } : {})
    };

    const next = AppConfigSchema.parse({
      ...current,
      updatedAt: new Date().toISOString(),
      advanced: nextAdvanced
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

  importConfig(config: AppConfig): AppConfig {
    const derived = deriveSettings({ risk: config.basic.risk, tradeMode: config.basic.tradeMode });
    const next = AppConfigSchema.parse({
      ...config,
      version: CONFIG_VERSION,
      updatedAt: new Date().toISOString(),
      derived
    });
    this.save(next);
    return next;
  }
}
