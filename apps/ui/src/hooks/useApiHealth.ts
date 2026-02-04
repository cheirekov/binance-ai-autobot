import { useEffect, useState } from "react";

import { apiGet } from "../api/http";

type HealthResponse = { ok: true; ts: string };

export function useApiHealth(): { loading: boolean; ok: boolean; error?: string } {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await apiGet<HealthResponse>("/health");
        if (!cancelled) {
          setOk(true);
          setError(undefined);
        }
      } catch (e) {
        if (!cancelled) {
          setOk(false);
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

  return { loading, ok, error };
}

