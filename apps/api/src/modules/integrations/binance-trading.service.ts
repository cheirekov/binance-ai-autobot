import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import { resolveBinanceBaseUrl } from "./binance-base-url";
import { CcxtBinanceAdapter } from "./ccxt-binance-adapter";

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
  private adapterCache: { key: string; adapter: CcxtBinanceAdapter } | null = null;

  constructor(private readonly configService: ConfigService) {}

  getBaseUrl(): string {
    const cfg = this.configService.load();
    return resolveBinanceBaseUrl(cfg);
  }

  private get adapter(): CcxtBinanceAdapter {
    const config = this.configService.load();
    if (!config) {
      throw new Error("Bot is not initialized.");
    }
    if (!config.basic.binance.apiKey || !config.basic.binance.apiSecret) {
      throw new Error("Missing Binance API credentials.");
    }

    const baseUrl = resolveBinanceBaseUrl(config);
    const key = `${config.advanced.binanceEnvironment}|${baseUrl}|${config.basic.binance.apiKey}`;
    if (this.adapterCache?.key !== key) {
      this.adapterCache = {
        key,
        adapter: new CcxtBinanceAdapter({
          env: config.advanced.binanceEnvironment,
          baseUrl,
          apiKey: config.basic.binance.apiKey,
          apiSecret: config.basic.binance.apiSecret,
          timeoutMs: 12_000
        })
      };
    }
    return this.adapterCache.adapter;
  }

  async getBalances(): Promise<BinanceBalanceSnapshot[]> {
    return await this.adapter.getBalances();
  }

  async placeSpotMarketOrder(params: { symbol: string; side: "BUY" | "SELL"; quantity: string }): Promise<BinanceMarketOrderResponse> {
    return await this.adapter.placeSpotMarketOrder({ symbolId: params.symbol, side: params.side, quantity: params.quantity });
  }
}
