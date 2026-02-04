import { z } from "zod";

export const CONFIG_VERSION = 1 as const;

export const TraderRegionSchema = z.enum(["EEA", "NON_EEA"]);
export type TraderRegion = z.infer<typeof TraderRegionSchema>;

export const TradeModeSchema = z.enum(["SPOT", "SPOT_GRID"]);
export type TradeMode = z.infer<typeof TradeModeSchema>;

export const BinanceEnvironmentSchema = z.enum(["MAINNET", "SPOT_TESTNET"]);
export type BinanceEnvironment = z.infer<typeof BinanceEnvironmentSchema>;

export const BasicSetupRequestSchema = z
  .object({
    binanceApiKey: z.string().min(1),
    binanceApiSecret: z.string().min(1),
    openaiApiKey: z.string().optional(),
    uiUsername: z.string().min(1),
    uiPassword: z.string().min(8),
    traderRegion: TraderRegionSchema,
    homeStableCoin: z.string().min(2).optional(),
    tradeMode: TradeModeSchema.default("SPOT"),
    risk: z.number().int().min(0).max(100),
    liveTrading: z.boolean(),
    aiEnabled: z.boolean(),
    aiMinTradeConfidence: z.number().int().min(0).max(100).default(65)
  })
  .superRefine((value, ctx) => {
    if (value.aiEnabled && !value.openaiApiKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "openaiApiKey is required when aiEnabled=true",
        path: ["openaiApiKey"]
      });
    }
  });

export type BasicSetupRequest = z.infer<typeof BasicSetupRequestSchema>;

export const UiAuthSchema = z.object({
  username: z.string().min(1),
  passwordHash: z.string().min(1),
  passwordHashAlgo: z.literal("bcrypt"),
  enabled: z.boolean()
});
export type UiAuth = z.infer<typeof UiAuthSchema>;

export const BinanceCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1)
});
export type BinanceCredentials = z.infer<typeof BinanceCredentialsSchema>;

export const OpenAiConfigSchema = z.object({
  apiKey: z.string().min(1).optional(),
  model: z.string().min(1).optional()
});
export type OpenAiConfig = z.infer<typeof OpenAiConfigSchema>;

export const BasicSettingsSchema = z.object({
  binance: BinanceCredentialsSchema,
  openai: OpenAiConfigSchema,
  uiAuth: UiAuthSchema,
  traderRegion: TraderRegionSchema,
  homeStableCoin: z.string().min(2),
  tradeMode: TradeModeSchema,
  risk: z.number().int().min(0).max(100),
  liveTrading: z.boolean(),
  aiEnabled: z.boolean(),
  aiMinTradeConfidence: z.number().int().min(0).max(100).default(65)
});
export type BasicSettings = z.infer<typeof BasicSettingsSchema>;

export const AdvancedSettingsSchema = z.object({
  apiKey: z.string().min(16),
  apiBaseUrl: z.string().url().optional(),
  binanceEnvironment: BinanceEnvironmentSchema.default("MAINNET"),
  binanceBaseUrlOverride: z.string().url().optional(),
  apiHost: z.string().min(1),
  apiPort: z.number().int().min(1).max(65535),
  uiHost: z.string().min(1),
  uiPort: z.number().int().min(1).max(65535),
  neverTradeSymbols: z.array(z.string().min(1)).default([]),
  autoBlacklistEnabled: z.boolean().default(true),
  autoBlacklistTtlMinutes: z.number().int().min(1).max(43200).default(180)
});
export type AdvancedSettings = z.infer<typeof AdvancedSettingsSchema>;

export const DerivedSettingsSchema = z.object({
  maxOpenPositions: z.number().int().min(1).max(50),
  maxPositionPct: z.number().min(0.1).max(100),
  allowSpot: z.boolean(),
  allowGrid: z.boolean(),
  allowFutures: z.boolean()
});
export type DerivedSettings = z.infer<typeof DerivedSettingsSchema>;

export const ExpertSettingsSchema = z.record(z.unknown());
export type ExpertSettings = z.infer<typeof ExpertSettingsSchema>;

export const AppConfigSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  basic: BasicSettingsSchema,
  advanced: AdvancedSettingsSchema,
  expert: ExpertSettingsSchema,
  derived: DerivedSettingsSchema
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

export function defaultHomeStableCoin(traderRegion: TraderRegion): string {
  // NOTE: This is a *default only*. Regulation and product availability must be verified by the user.
  return traderRegion === "EEA" ? "USDC" : "USDT";
}

export function deriveSettings(basic: Pick<BasicSettings, "risk" | "tradeMode">): DerivedSettings {
  const { risk, tradeMode } = basic;

  const maxOpenPositions = Math.max(1, Math.round(1 + (risk / 100) * 9));
  const maxPositionPct = Math.round((1 + (risk / 100) * 19) * 10) / 10; // 1.0% .. 20.0%

  return {
    maxOpenPositions,
    maxPositionPct,
    allowSpot: true,
    allowGrid: tradeMode === "SPOT_GRID",
    allowFutures: false
  };
}
