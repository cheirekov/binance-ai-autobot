import { useEffect, useState } from "react";

import { apiGet } from "../api/http";

export type IntegrationsStatus = {
  binance: {
    configured: boolean;
    reachable: boolean;
    authenticated: boolean;
    checkedAt: string;
    baseUrl: string;
    error?: string;
  };
  openai: {
    enabled: boolean;
    configured: boolean;
  };
};

export function useIntegrationsStatus(): {
  loading: boolean;
  status: IntegrationsStatus | null;
  error?: string;
} {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const next = await apiGet<IntegrationsStatus>("/integrations/status");
        if (!cancelled) {
          setStatus(next);
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
    const t = setInterval(run, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { loading, status, error };
}
