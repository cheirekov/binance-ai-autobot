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
    entryTrades?: number;
    sizingRejectSkips?: number;
    feeEdgeSkips?: number;
    minOrderSkips?: number;
    inventoryWaitingSkips?: number;
    conversionTradePct?: number;
    entryTradePct?: number;
    sizingRejectSkipPct?: number;
    feeEdgeSkipPct?: number;
    minOrderSkipPct?: number;
    inventoryWaitingSkipPct?: number;
    realizedPnl: number;
    openExposureCost: number;
  };
  topSkipSummaries: Array<{ summary: string; count: number }>;
  symbols?: Array<{
    symbol: string;
    buys: number;
    sells: number;
    buyNotional: number;
    sellNotional: number;
    netQty: number;
    avgEntry: number;
    openCost: number;
    realizedPnl: number;
    lastTradeTs?: string;
  }>;
};

export type AdaptiveShadowEvent = {
  ts: string;
  environment?: "LIVE" | "PAPER";
  candidateSymbol?: string;
  regime: { label: string; confidence: number };
  strategy: { recommended: string; trend: number; meanReversion: number; grid: number };
  decision: { kind: string; summary: string; reason?: string; symbol?: string; side?: "BUY" | "SELL"; status?: string };
};

export type RunStatsSnapshot = {
  generatedAt: string;
  kpi: BaselineRunStats | null;
  adaptiveShadowTail: AdaptiveShadowEvent[];
  walletPolicy: {
    observedAt: string;
    overCap: boolean;
    unmanagedExposurePct: number;
    unmanagedExposureCapPct: number;
    unmanagedNonHomeValue?: number;
    unmanagedExposureCapHome?: number;
    category?: string;
    sourceAsset?: string;
    reason?: string;
  } | null;
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
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    const timer = setInterval(run, 8000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { loading, stats, error };
}
