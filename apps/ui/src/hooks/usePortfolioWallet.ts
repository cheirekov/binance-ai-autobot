import { useEffect, useState } from "react";

import { apiGet } from "../api/http";

export type WalletAsset = {
  asset: string;
  free: number;
  locked: number;
  total: number;
  estPriceHome?: number;
  estValueHome?: number;
};

export type WalletSnapshot = {
  fetchedAt: string;
  homeStableCoin: string;
  totalEstimatedHome?: number;
  assets: WalletAsset[];
  errors: string[];
};

export function usePortfolioWallet(): {
  loading: boolean;
  wallet: WalletSnapshot | null;
  error?: string;
} {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletSnapshot | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const next = await apiGet<WalletSnapshot>("/portfolio/wallet");
        if (!cancelled) {
          setWallet(next);
          setError(undefined);
        }
      } catch (e) {
        if (!cancelled) {
          setWallet(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    const t = setInterval(run, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return { loading, wallet, error };
}

