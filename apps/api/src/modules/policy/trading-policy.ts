import type { TraderRegion } from "@autobot/shared";

const STABLE_ASSETS = new Set([
  "USDT",
  "USDC",
  "FDUSD",
  "USD1",
  "BUSD",
  "TUSD",
  "USDP",
  "USDS",
  "DAI",
  "PYUSD",
  "EUR",
  "EURC",
  "AEUR"
]);

const EEA_BLOCKED_QUOTE_ASSETS = new Set([
  "USDT",
  "USD1",
  "FDUSD",
  "FUSD",
  "BUSD",
  "TUSD",
  "USDP",
  "USDS"
]);

export function isStableAsset(asset: string | undefined): boolean {
  if (!asset) return false;
  return STABLE_ASSETS.has(asset.trim().toUpperCase());
}

export function getPairPolicyBlockReason(params: {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  traderRegion: TraderRegion;
  neverTradeSymbols?: string[];
  excludeStableStablePairs?: boolean;
  enforceRegionPolicy?: boolean;
}): string | null {
  const symbol = params.symbol.trim().toUpperCase();
  const baseAsset = params.baseAsset.trim().toUpperCase();
  const quoteAsset = params.quoteAsset.trim().toUpperCase();

  const neverTradeSymbols = (params.neverTradeSymbols ?? []).map((s) => s.trim().toUpperCase());
  if (neverTradeSymbols.includes(symbol)) {
    return "Blocked by never-trade list";
  }

  if ((params.excludeStableStablePairs ?? true) && isStableAsset(baseAsset) && isStableAsset(quoteAsset)) {
    return "Stable/stable pair filtered";
  }

  if ((params.enforceRegionPolicy ?? true) && params.traderRegion === "EEA" && EEA_BLOCKED_QUOTE_ASSETS.has(quoteAsset)) {
    return `EEA policy filtered quote asset ${quoteAsset}`;
  }

  return null;
}

