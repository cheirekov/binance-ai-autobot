import { useEffect, useState } from "react";

import { apiGet } from "../api/http";

type SetupStatus = {
  initialized: boolean;
};

export function useSetupStatus(): { loading: boolean; initialized: boolean | null; error?: string } {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const status = await apiGet<SetupStatus>("/setup/status");
        if (!cancelled) {
          setInitialized(status.initialized);
          setError(undefined);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to verify setup status. Retrying…");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    const timer = setInterval(() => {
      void run();
    }, 5_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Avoid false onboarding redirects if the API is temporarily unreachable.
  return { loading: loading && initialized === null && !error, initialized, error };
}
