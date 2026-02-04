import { useEffect, useState } from "react";

import { apiGet } from "../api/http";

type SetupStatus = {
  initialized: boolean;
};

export function useSetupStatus(): { loading: boolean; initialized: boolean } {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const status = await apiGet<SetupStatus>("/setup/status");
        if (!cancelled) setInitialized(status.initialized);
      } catch {
        if (!cancelled) setInitialized(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, initialized };
}
