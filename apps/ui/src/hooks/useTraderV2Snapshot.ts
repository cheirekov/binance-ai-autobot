import { useCallback, useEffect, useState } from "react";

import { apiGet } from "../api/http";

export type V2Position = {
  id: number;
  pair: string;
  openedAt: string;
  stake?: number;
  entry?: number;
  current?: number;
  profitQuote?: number;
  profitPct?: number;
  stop?: number;
  pendingOrder: boolean;
};

export type V2Account = {
  reachable: boolean;
  running: boolean;
  error?: string;
  state: string;
  strategy?: string;
  dryRun?: boolean;
  lastProcess?: string;
  wallet: { totalQuote?: number; startingQuote?: number; currency?: string };
  metrics: Record<string, number | undefined>;
  openPositions: V2Position[];
  advisor?: {
    available: boolean;
    calls: number;
    knownCostUsd: number;
    reservedCostUsd: number;
    latestStatus?: string;
    latestAt?: string;
    expiresAt?: string;
    decisions: Array<{
      pair: string;
      allow_entry: boolean;
      stake_multiplier: number;
      exit_position: boolean;
      reason: string;
    }>;
  };
};

export type TraderV2Snapshot = {
  generatedAt: string;
  product: string;
  environment: string;
  marketData: string;
  orders: string;
  accounts: { baseline: V2Account; astra: V2Account; momentum: V2Account };
  comparison: { ready: boolean; limitations: string[] };
  promotion: { realMoneyAllowed: boolean; reason: string };
};

export function useTraderV2Snapshot(pollMs = 5000) {
  const [snapshot, setSnapshot] = useState<TraderV2Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const refresh = useCallback(async () => {
    try {
      setSnapshot(await apiGet<TraderV2Snapshot>("/dashboard/snapshot"));
      setError(undefined);
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);
  return { snapshot, loading, error, refresh };
}
