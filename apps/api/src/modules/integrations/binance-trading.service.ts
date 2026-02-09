import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import { resolveBinanceBaseUrl } from "./binance-base-url";
import { BinanceClient } from "./binance-client";

type BinanceAccountResponse = {
  balances?: Array<{ asset: string; free: string; locked: string }>;
};

export type BinanceBalanceSnapshot = {
  asset: string;
  free: number;
  locked: number;
  total: number;
};

export type BinanceMarketOrderResponse = {
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

export function isBinanceTestnetBaseUrl(baseUrl: string): boolean {
  return /demo-api\.binance\.com|testnet\.binance\.vision|sandbox/i.test(baseUrl);
}

@Injectable()
export class BinanceTradingService {
  constructor(private readonly configService: ConfigService) {}

  getBaseUrl(): string {
    const cfg = this.configService.load();
    return resolveBinanceBaseUrl(cfg);
  }

  private get client(): BinanceClient {
    const config = this.configService.load();
    if (!config) {
      throw new Error("Bot is not initialized.");
    }
    if (!config.basic.binance.apiKey || !config.basic.binance.apiSecret) {
      throw new Error("Missing Binance API credentials.");
    }

    const baseUrl = resolveBinanceBaseUrl(config);
    return new BinanceClient({
      baseUrl,
      apiKey: config.basic.binance.apiKey,
      apiSecret: config.basic.binance.apiSecret,
      timeoutMs: 12_000
    });
  }

  async getBalances(): Promise<BinanceBalanceSnapshot[]> {
    const account = (await this.client.account()) as BinanceAccountResponse;
    const balances = account.balances ?? [];

    const out: BinanceBalanceSnapshot[] = [];
    for (const b of balances) {
      const free = Number.parseFloat(b.free);
      const locked = Number.parseFloat(b.locked);
      const total = (Number.isFinite(free) ? free : 0) + (Number.isFinite(locked) ? locked : 0);
      if (total <= 0) continue;
      out.push({
        asset: b.asset,
        free: Number.isFinite(free) ? free : 0,
        locked: Number.isFinite(locked) ? locked : 0,
        total
      });
    }
    return out;
  }

  async placeSpotMarketOrder(params: { symbol: string; side: "BUY" | "SELL"; quantity: string }): Promise<BinanceMarketOrderResponse> {
    const res = (await this.client.createOrder({
      symbol: params.symbol,
      side: params.side,
      type: "MARKET",
      quantity: params.quantity,
      newOrderRespType: "FULL"
    })) as BinanceMarketOrderResponse;
    return res;
  }
}

