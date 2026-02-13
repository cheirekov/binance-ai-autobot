import { useCallback, useEffect, useState } from "react";

import type { BotState } from "@autobot/shared";

import { apiGet } from "../api/http";
import type { IntegrationsStatus } from "./useIntegrationsStatus";
import type { WalletSnapshot } from "./usePortfolioWallet";
import type { PublicConfig } from "./usePublicConfig";
import type { RunStatsSnapshot } from "./useRunStats";
import type { UniverseSnapshot } from "./useUniverseSnapshot";

export type DashboardSnapshot = {
  generatedAt: string;
  config: PublicConfig;
  integrations: IntegrationsStatus;
  wallet: WalletSnapshot;
  universe: UniverseSnapshot;
  bot: BotState;
  runStats: RunStatsSnapshot;
};

export function useDashboardSnapshot(options?: {
  pollMs?: number;
}): {
  loading: boolean;
  snapshot: DashboardSnapshot | null;
  error?: string;
  refresh: () => Promise<void>;
} {
  const pollMs = options?.pollMs ?? 5000;
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const next = await apiGet<DashboardSnapshot>("/dashboard/snapshot");
      setSnapshot(next);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh().catch(() => undefined);
    const t = setInterval(() => {
      if (cancelled) return;
      void refresh().catch(() => undefined);
    }, pollMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pollMs, refresh]);

  return { loading, snapshot, error, refresh };
}

