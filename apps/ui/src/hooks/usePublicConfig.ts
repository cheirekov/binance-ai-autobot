import { useEffect, useState } from "react";

import { apiGet } from "../api/http";

export type PublicConfig = {
  initialized: boolean;
  basic?: {
    traderRegion: string;
    homeStableCoin: string;
    tradeMode: "SPOT" | "SPOT_GRID";
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
    excludeStableStablePairs: boolean;
    enforceRegionPolicy: boolean;
    symbolEntryCooldownMs: number;
    maxConsecutiveEntriesPerSymbol: number;
    conversionTopUpReserveMultiplier: number;
    conversionTopUpCooldownMs: number;
    conversionTopUpMinTarget: number;
  };
};

export function usePublicConfig(options?: { pollMs?: number }): { loading: boolean; config: PublicConfig | null; error?: string } {
  const pollMs = options?.pollMs ?? 10_000;
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const next = await apiGet<PublicConfig>("/config/public");
        if (!cancelled) {
          setConfig(next);
          setError(undefined);
        }
      } catch (e) {
        if (!cancelled) {
          setConfig(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pollMs <= 0) return;

    let cancelled = false;
    const t = setInterval(() => {
      if (cancelled) return;
      void apiGet<PublicConfig>("/config/public")
        .then((next) => {
          if (cancelled) return;
          setConfig(next);
          setError(undefined);
        })
        .catch((e) => {
          if (cancelled) return;
          setError(e instanceof Error ? e.message : String(e));
        });
    }, pollMs);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pollMs]);

  return { loading, config, error };
}
