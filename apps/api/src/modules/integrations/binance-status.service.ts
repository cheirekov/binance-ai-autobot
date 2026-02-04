import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import { BinanceClient } from "./binance-client";
import { resolveBinanceBaseUrl } from "./binance-base-url";

export type BinanceStatus = {
  checkedAt: string;
  baseUrl: string;
  configured: boolean;
  reachable: boolean;
  authenticated: boolean;
  error?: string;
};

@Injectable()
export class BinanceStatusService {
  private cached: BinanceStatus | null = null;
  private cachedAtMs = 0;

  constructor(private readonly configService: ConfigService) {}

  async getStatus(): Promise<BinanceStatus> {
    const now = Date.now();
    if (this.cached && now - this.cachedAtMs < 30_000) {
      return this.cached;
    }

    const config = this.configService.load();
    const baseUrl = resolveBinanceBaseUrl(config);

    if (!config) {
      this.cachedAtMs = now;
      this.cached = {
        checkedAt: new Date().toISOString(),
        baseUrl,
        configured: false,
        reachable: false,
        authenticated: false,
        error: "Bot is not initialized."
      };
      return this.cached;
    }

    const configured = Boolean(config.basic.binance.apiKey && config.basic.binance.apiSecret);
    if (!configured) {
      this.cachedAtMs = now;
      this.cached = {
        checkedAt: new Date().toISOString(),
        baseUrl,
        configured: false,
        reachable: false,
        authenticated: false,
        error: "Missing Binance API credentials."
      };
      return this.cached;
    }

    const client = new BinanceClient({
      baseUrl,
      apiKey: config.basic.binance.apiKey,
      apiSecret: config.basic.binance.apiSecret
    });

    const status: BinanceStatus = {
      checkedAt: new Date().toISOString(),
      baseUrl,
      configured: true,
      reachable: false,
      authenticated: false
    };

    try {
      await client.ping();
      await client.time();
      status.reachable = true;
    } catch (err) {
      status.error = err instanceof Error ? err.message : String(err);
      this.cachedAtMs = now;
      this.cached = status;
      return status;
    }

    try {
      await client.account();
      status.authenticated = true;
    } catch (err) {
      status.error = err instanceof Error ? err.message : String(err);
    }

    this.cachedAtMs = now;
    this.cached = status;
    return status;
  }
}
