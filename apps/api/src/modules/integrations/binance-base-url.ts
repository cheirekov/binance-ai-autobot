import type { AppConfig } from "@autobot/shared";

export function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolveBinanceBaseUrl(config: AppConfig | null): string {
  const override = config?.advanced.binanceBaseUrlOverride?.trim();
  if (override) return normalizeBaseUrl(override);

  if (config?.advanced.binanceEnvironment === "SPOT_TESTNET") {
    return "https://testnet.binance.vision";
  }

  const env = (process.env.BINANCE_BASE_URL ?? "").trim();
  if (env) return normalizeBaseUrl(env);

  return "https://api.binance.com";
}

