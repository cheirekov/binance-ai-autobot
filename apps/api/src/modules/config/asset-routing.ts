import type { AppConfig, TraderRegion } from "@autobot/shared";

const DEFAULT_ROUTE_BRIDGES = ["USDT", "USDC", "BTC", "ETH", "BNB"];

function uniqueAssets(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const normalized = item.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function normalizeAssetList(items: string[] | undefined): string[] {
  return uniqueAssets(items ?? []);
}

export function resolveRouteBridgeAssets(config: AppConfig | null, homeStableCoin: string): string[] {
  const home = homeStableCoin.trim().toUpperCase();
  const configured = normalizeAssetList(config?.advanced.routingBridgeAssets);
  return uniqueAssets([home, ...configured, ...DEFAULT_ROUTE_BRIDGES]);
}

export function resolveUniverseDefaultQuoteAssets(params: {
  config: AppConfig | null;
  homeStableCoin: string;
  traderRegion: TraderRegion;
}): string[] {
  const home = params.homeStableCoin.trim().toUpperCase();
  const configured = normalizeAssetList(params.config?.advanced.universeQuoteAssets);
  if (configured.length > 0) {
    return uniqueAssets([home, ...configured]);
  }

  const regionalAnchor = params.traderRegion === "EEA" ? "EUR" : "USDT";
  return uniqueAssets([home, regionalAnchor, "BTC", "ETH", "BNB", "JPY"]);
}

export function resolveWalletQuoteHintLimit(config: AppConfig | null): number {
  const value = config?.advanced.walletQuoteHintLimit;
  if (!Number.isFinite(value)) return 8;
  return Math.max(0, Math.min(20, Math.floor(value ?? 0)));
}
