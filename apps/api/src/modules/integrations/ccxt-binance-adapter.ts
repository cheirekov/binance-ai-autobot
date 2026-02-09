import ccxt from "ccxt";

export type CcxtBinanceEnv = "MAINNET" | "SPOT_TESTNET";

export type CcxtBinanceAdapterOptions = {
  env: CcxtBinanceEnv;
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  timeoutMs?: number;
};

export type CcxtBinanceBalanceSnapshot = {
  asset: string;
  free: number;
  locked: number;
  total: number;
};

export type CcxtBinanceMarketOrderResponse = {
  symbol?: string;
  orderId?: number;
  clientOrderId?: string;
  transactTime?: number;
  price?: string;
  origQty?: string;
  executedQty?: string;
  cummulativeQuoteQty?: string;
  status?: string;
  type?: string;
  side?: string;
  fills?: Array<{
    price?: string;
    qty?: string;
    commission?: string;
    commissionAsset?: string;
  }>;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumberOrString(v: unknown): number | string | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function mapCcxtStatusToBinance(status: unknown, rawStatus: unknown): string | undefined {
  if (typeof rawStatus === "string" && rawStatus.trim()) {
    return rawStatus.trim().toUpperCase();
  }
  if (typeof status !== "string") return undefined;
  const s = status.toLowerCase();
  if (s === "open") return "NEW";
  if (s === "closed") return "FILLED";
  if (s === "canceled") return "CANCELED";
  if (s === "rejected") return "REJECTED";
  return status.toUpperCase();
}

type CcxtExchangeMinimal = {
  loadMarkets: () => Promise<unknown>;
  fetchBalance: () => Promise<unknown>;
  createOrder: (
    symbol: string,
    type: string,
    side: string,
    amount: number,
    price?: number,
    params?: Record<string, unknown>
  ) => Promise<unknown>;
};

type BinanceLikeCcxtExchange = CcxtExchangeMinimal & {
  enableDemoTrading?: (enable: boolean) => void;
  urls?: { api?: Record<string, unknown> };
  markets_by_id?: Record<string, { symbol?: string }>;
  close?: () => Promise<void> | void;
};

export class CcxtBinanceAdapter {
  private readonly exchange: BinanceLikeCcxtExchange;
  private marketsLoaded = false;

  constructor(private readonly options: CcxtBinanceAdapterOptions) {
    const timeout = options.timeoutMs ?? 12_000;

    // ccxt binance supports both mainnet and demo trading mode.
    const BinanceCtor = (ccxt as unknown as { binance: new (opts: Record<string, unknown>) => BinanceLikeCcxtExchange }).binance;
    const ex = new BinanceCtor({
      apiKey: options.apiKey,
      secret: options.apiSecret,
      enableRateLimit: true,
      timeout,
      options: {
        defaultType: "spot",
        adjustForTimeDifference: true
      }
    });

    // For our MVP, SPOT_TESTNET maps to Binance Demo Trading (demo.binance.com / demo-api.binance.com).
    if (options.env === "SPOT_TESTNET") {
      // ccxt throws if sandbox mode is enabled; we do not use sandbox mode.
      ex.enableDemoTrading?.(true);
    }

    // Keep our config as the source of truth for the base URL (Spot endpoints).
    // `baseUrl` is expected WITHOUT `/api/v3`.
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const apiUrls = ex.urls?.api;
    if (apiUrls && typeof apiUrls === "object") {
      (apiUrls as Record<string, unknown>).public = `${baseUrl}/api/v3`;
      (apiUrls as Record<string, unknown>).private = `${baseUrl}/api/v3`;
      (apiUrls as Record<string, unknown>).v1 = `${baseUrl}/api/v1`;
    }

    this.exchange = ex;
  }

  async close(): Promise<void> {
    // ccxt exchanges can hold WS resources in some modes; close defensively.
    await this.exchange.close?.();
  }

  private async ensureMarketsLoaded(): Promise<void> {
    if (this.marketsLoaded) return;
    await this.exchange.loadMarkets();
    this.marketsLoaded = true;
  }

  private async toUnifiedSymbol(symbolId: string): Promise<string> {
    const id = symbolId.trim().toUpperCase();
    if (!id) throw new Error("Missing symbol");
    if (id.includes("/")) return id;

    await this.ensureMarketsLoaded();
    const market = this.exchange.markets_by_id?.[id];
    const symbol = typeof market?.symbol === "string" ? market.symbol : null;
    if (!symbol) {
      throw new Error(`Unknown symbol (ccxt): ${id}`);
    }
    return symbol;
  }

  async getBalances(): Promise<CcxtBinanceBalanceSnapshot[]> {
    const balance = asRecord(await this.exchange.fetchBalance()) ?? {};
    const totals = (asRecord(balance.total) ?? {}) as Record<string, unknown>;
    const free = (asRecord(balance.free) ?? {}) as Record<string, unknown>;
    const used = (asRecord(balance.used) ?? {}) as Record<string, unknown>;

    const out: CcxtBinanceBalanceSnapshot[] = [];
    for (const asset of Object.keys(totals)) {
      const total = asNumber(totals[asset]) ?? 0;
      if (!Number.isFinite(total) || total <= 0) continue;
      const f = asNumber(free[asset]) ?? 0;
      const u = asNumber(used[asset]) ?? 0;
      out.push({ asset, free: f, locked: u, total });
    }
    return out;
  }

  async placeSpotMarketOrder(params: {
    symbolId: string;
    side: "BUY" | "SELL";
    quantity: string;
  }): Promise<CcxtBinanceMarketOrderResponse> {
    const symbol = await this.toUnifiedSymbol(params.symbolId);
    const amount = Number.parseFloat(params.quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid quantity: ${params.quantity}`);
    }

    const side = params.side.toLowerCase();
    const order = asRecord(
      await this.exchange.createOrder(symbol, "market", side, amount, undefined, {
      // Best-effort: Binance supports FULL to return fills; ccxt forwards unknown params.
      newOrderRespType: "FULL"
      })
    );

    const info = asRecord(order?.info) ?? {};
    const rawStatus = info.status;
    const status = mapCcxtStatusToBinance(order?.status, rawStatus);

    const orderIdRaw = asNumberOrString(info.orderId) ?? asNumberOrString(order?.id);
    const orderId =
      typeof orderIdRaw === "number"
        ? orderIdRaw
        : typeof orderIdRaw === "string" && /^\d+$/.test(orderIdRaw)
          ? Number.parseInt(orderIdRaw, 10)
          : undefined;

    const avg = asNumber(order?.average);
    const cost = asNumber(order?.cost);
    const filled = asNumber(order?.filled);
    const amountOrig = asNumber(order?.amount);

    const fillsRaw = info.fills;
    const fills = Array.isArray(fillsRaw) ? (fillsRaw.map((v) => asRecord(v)).filter(Boolean) as Array<Record<string, unknown>>) : [];
    const mappedFills =
      fills.length > 0
        ? fills.map((f) => ({
            price: asString(f.price) ?? undefined,
            qty: asString(f.qty) ?? undefined,
            commission: asString(f.commission) ?? undefined,
            commissionAsset: asString(f.commissionAsset) ?? undefined
          }))
        : undefined;

    return {
      symbol: params.symbolId.trim().toUpperCase(),
      orderId,
      clientOrderId: asString(info.clientOrderId) ?? undefined,
      transactTime: typeof info.transactTime === "number" ? info.transactTime : undefined,
      price: avg !== null ? String(avg) : typeof order?.price === "number" ? String(order.price) : undefined,
      origQty: amountOrig !== null ? String(amountOrig) : undefined,
      executedQty: filled !== null ? String(filled) : undefined,
      cummulativeQuoteQty: cost !== null ? String(cost) : undefined,
      status,
      type: asString(info.type) ?? "MARKET",
      side: asString(info.side) ?? params.side,
      ...(mappedFills ? { fills: mappedFills } : {})
    };
  }
}
