import { useEffect, useState } from "react";

import { apiGet } from "../api/http";

export type UniverseCandidate = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: number;
  quoteVolume24h: number;
  priceChangePct24h: number;
  rsi14?: number;
  adx14?: number;
  atrPct14?: number;
  strategyHint?: "TREND" | "RANGE" | "MEAN_REVERSION";
  score: number;
  reasons: string[];
};

export type UniverseSnapshot = {
  version: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  baseUrl: string;
  interval: string;
  quoteAssets: string[];
  candidates: UniverseCandidate[];
  errors: Array<{ symbol?: string; error: string }>;
};

export function useUniverseSnapshot(): {
  loading: boolean;
  snapshot?: UniverseSnapshot;
  error?: string;
} {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<UniverseSnapshot | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const next = await apiGet<UniverseSnapshot>("/universe/latest");
        if (!cancelled) {
          setSnapshot(next);
          setError(undefined);
        }
      } catch (e) {
        if (!cancelled) {
          setSnapshot(undefined);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    const t = setInterval(run, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { loading, snapshot, error };
}

