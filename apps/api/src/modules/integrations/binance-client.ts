import crypto from "node:crypto";

export type BinanceClientOptions = {
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
  timeoutMs?: number;
};

export type BinanceHttpMethod = "GET" | "POST" | "DELETE";

export class BinanceClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly timeoutMs: number;

  constructor(options: BinanceClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.timeoutMs = options.timeoutMs ?? 7000;
  }

  async ping(): Promise<void> {
    await this.request("/api/v3/ping");
  }

  async time(): Promise<{ serverTime: number }> {
    return await this.request("/api/v3/time");
  }

  async account(): Promise<unknown> {
    return await this.request("/api/v3/account", { signed: true });
  }

  async tickerPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    return await this.request("/api/v3/ticker/price", { query: { symbol } });
  }

  async tickerPrices(): Promise<Array<{ symbol: string; price: string }>> {
    return await this.request("/api/v3/ticker/price");
  }

  async ticker24hr(): Promise<
    Array<{
      symbol: string;
      lastPrice: string;
      quoteVolume: string;
      priceChangePercent: string;
    }>
  > {
    return await this.request("/api/v3/ticker/24hr");
  }

  async exchangeInfo(symbol?: string): Promise<unknown> {
    return await this.request("/api/v3/exchangeInfo", symbol ? { query: { symbol } } : undefined);
  }

  async klines(symbol: string, interval: string, limit: number): Promise<unknown> {
    return await this.request("/api/v3/klines", { query: { symbol, interval, limit } });
  }

  async createOrder(params: {
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT";
    quantity?: string;
    quoteOrderQty?: string;
    price?: string;
    timeInForce?: "GTC" | "IOC" | "FOK";
    newClientOrderId?: string;
    newOrderRespType?: "ACK" | "RESULT" | "FULL";
  }): Promise<unknown> {
    return await this.request("/api/v3/order", { method: "POST", signed: true, query: params });
  }

  async cancelOrder(params: {
    symbol: string;
    orderId?: string | number;
    origClientOrderId?: string;
    newClientOrderId?: string;
  }): Promise<unknown> {
    return await this.request("/api/v3/order", { method: "DELETE", signed: true, query: params });
  }

  async getOrder(params: { symbol: string; orderId?: string | number; origClientOrderId?: string }): Promise<unknown> {
    return await this.request("/api/v3/order", { signed: true, query: params });
  }

  async openOrders(symbol?: string): Promise<unknown> {
    return await this.request("/api/v3/openOrders", { signed: true, query: symbol ? { symbol } : undefined });
  }

  private sign(queryString: string): string {
    if (!this.apiSecret) {
      throw new Error("Missing Binance apiSecret for signed request");
    }
    return crypto.createHmac("sha256", this.apiSecret).update(queryString).digest("hex");
  }

  private async request<T>(
    path: string,
    options?: {
      method?: BinanceHttpMethod;
      signed?: boolean;
      query?: Record<string, string | number | boolean | undefined>;
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(options?.query ?? {})) {
      if (value === undefined) continue;
      query.set(key, String(value));
    }

    if (options?.signed) {
      query.set("timestamp", String(Date.now()));
      query.set("recvWindow", "5000");
      const sig = this.sign(query.toString());
      query.set("signature", sig);
    }

    if (query.size > 0) {
      url.search = query.toString();
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const method: BinanceHttpMethod = options?.method ?? "GET";
      const res = await fetch(url, {
        method,
        headers: {
          ...(this.apiKey ? { "X-MBX-APIKEY": this.apiKey } : {})
        },
        signal: controller.signal
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Binance HTTP ${res.status}: ${text.slice(0, 250)}`);
      }

      if (res.status === 204) {
        return undefined as T;
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(t);
    }
  }
}
