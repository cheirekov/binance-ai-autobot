import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import { BinanceClient } from "../integrations/binance-client";

type BinanceAccountResponse = {
  balances?: Array<{ asset: string; free: string; locked: string }>;
};

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

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

@Injectable()
export class PortfolioService {
  private cached: WalletSnapshot | null = null;
  private cachedAtMs = 0;

  constructor(private readonly configService: ConfigService) {}

  async getWallet(): Promise<WalletSnapshot> {
    const nowMs = Date.now();
    if (this.cached && nowMs - this.cachedAtMs < 20_000) {
      return this.cached;
    }

    const fetchedAt = new Date().toISOString();
    const config = this.configService.load();

    const homeStableCoin = config?.basic.homeStableCoin ?? "USDC";
    const baseUrl = process.env.BINANCE_BASE_URL ?? "https://api.binance.com";

    const errors: string[] = [];

    if (!config) {
      errors.push("Bot is not initialized.");
      const snapshot: WalletSnapshot = { fetchedAt, homeStableCoin, assets: [], errors };
      this.cached = snapshot;
      this.cachedAtMs = nowMs;
      return snapshot;
    }

    if (!config.basic.binance.apiKey || !config.basic.binance.apiSecret) {
      errors.push("Missing Binance API credentials.");
      const snapshot: WalletSnapshot = { fetchedAt, homeStableCoin, assets: [], errors };
      this.cached = snapshot;
      this.cachedAtMs = nowMs;
      return snapshot;
    }

    const client = new BinanceClient({
      baseUrl,
      apiKey: config.basic.binance.apiKey,
      apiSecret: config.basic.binance.apiSecret,
      timeoutMs: 12_000
    });

    let account: BinanceAccountResponse;
    try {
      account = (await client.account()) as BinanceAccountResponse;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
      const snapshot: WalletSnapshot = { fetchedAt, homeStableCoin, assets: [], errors };
      this.cached = snapshot;
      this.cachedAtMs = nowMs;
      return snapshot;
    }

    const balances = account.balances ?? [];
    const assets: WalletAsset[] = balances
      .map((b) => {
        const free = Number.parseFloat(b.free);
        const locked = Number.parseFloat(b.locked);
        const total = (Number.isFinite(free) ? free : 0) + (Number.isFinite(locked) ? locked : 0);
        return {
          asset: b.asset,
          free: Number.isFinite(free) ? free : 0,
          locked: Number.isFinite(locked) ? locked : 0,
          total
        } satisfies WalletAsset;
      })
      .filter((b) => b.total > 0)
      .sort((a, b) => b.total - a.total);

    if (assets.length === 0) {
      const snapshot: WalletSnapshot = { fetchedAt, homeStableCoin, assets: [], errors };
      this.cached = snapshot;
      this.cachedAtMs = nowMs;
      return snapshot;
    }

    let priceBySymbol: Map<string, number> | null = null;
    try {
      const tickers = await client.tickerPrices();
      priceBySymbol = new Map<string, number>();
      for (const t of tickers) {
        const p = Number.parseFloat(t.price);
        if (Number.isFinite(p) && p > 0) {
          priceBySymbol.set(t.symbol, p);
        }
      }
    } catch (err) {
      errors.push(`Price feed unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }

    const bridges = unique([homeStableCoin, "USDT", "BTC", "ETH", "BNB"]);
    const getPairPrice = (base: string, quote: string): number | undefined => {
      if (!priceBySymbol) return undefined;
      if (base === quote) return 1;

      const direct = priceBySymbol.get(`${base}${quote}`);
      if (direct) return direct;

      const inverse = priceBySymbol.get(`${quote}${base}`);
      if (inverse) return 1 / inverse;

      return undefined;
    };

    const priceInHome = (asset: string): number | undefined => {
      const direct = getPairPrice(asset, homeStableCoin);
      if (direct) return direct;

      for (const bridge of bridges) {
        if (bridge === asset || bridge === homeStableCoin) continue;
        const p1 = getPairPrice(asset, bridge);
        if (!p1) continue;
        const p2 = getPairPrice(bridge, homeStableCoin);
        if (!p2) continue;
        return p1 * p2;
      }

      return undefined;
    };

    let totalEstimatedHome = 0;
    const priced = assets.map((a) => {
      const price = priceInHome(a.asset);
      if (!price) return a;

      const estValueHome = a.total * price;
      if (Number.isFinite(estValueHome)) {
        totalEstimatedHome += estValueHome;
      }

      return {
        ...a,
        estPriceHome: price,
        estValueHome: Number.isFinite(estValueHome) ? estValueHome : undefined
      } satisfies WalletAsset;
    });

    const sorted = priced.sort((a, b) => {
      const av = a.estValueHome ?? 0;
      const bv = b.estValueHome ?? 0;
      if (av !== bv) return bv - av;
      return b.total - a.total;
    });

    const snapshot: WalletSnapshot = {
      fetchedAt,
      homeStableCoin,
      totalEstimatedHome: Number.isFinite(totalEstimatedHome) ? totalEstimatedHome : undefined,
      assets: sorted,
      errors
    };

    this.cached = snapshot;
    this.cachedAtMs = nowMs;
    return snapshot;
  }
}
