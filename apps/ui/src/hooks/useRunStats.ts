import { useEffect, useState } from "react";

import { apiGet } from "../api/http";

export type BaselineRunStats = {
  generatedAt: string;
  startedAt: string;
  runtimeSeconds: number;
  totals: {
    decisions: number;
    trades: number;
    skips: number;
    buys: number;
    sells: number;
    conversions: number;
    realizedPnl: number;
    openExposureCost: number;
  };
  topSkipSummaries: Array<{ summary: string; count: number }>;
};

export type AdaptiveShadowEvent = {
  ts: string;
  regime: { label: string; confidence: number };
  strategy: { recommended: string; trend: number; meanReversion: number; grid: number };
  decision: { kind: string; summary: string; reason?: string };
};

export type RunStatsSnapshot = {
  generatedAt: string;
  kpi: BaselineRunStats | null;
  adaptiveShadowTail: AdaptiveShadowEvent[];
  notes: {
    activeOrders: string;
  };
};

export function useRunStats(): {
  loading: boolean;
  stats: RunStatsSnapshot | null;
  error?: string;
} {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RunStatsSnapshot | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const next = await apiGet<RunStatsSnapshot>("/bot/run-stats");
        if (!cancelled) {
          setStats(next);
          setError(undefined);
        }
      } catch (e) {
        if (!cancelled) {
          setStats(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    const timer = setInterval(run, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { loading, stats, error };
}
