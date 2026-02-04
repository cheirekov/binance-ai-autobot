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
  advanced?: { neverTradeSymbols: string[]; autoBlacklistEnabled: boolean; autoBlacklistTtlMinutes: number };
};

export function usePublicConfig(): { loading: boolean; config: PublicConfig | null; error?: string } {
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
    const t = setInterval(run, 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { loading, config, error };
}
