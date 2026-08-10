import fs from "node:fs";
import path from "node:path";

import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Database from "better-sqlite3";

import { ConfigService } from "../config/config.service";

export type MarketCandle = {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number | null;
  trades?: number | null;
};

export type StoredMarketCandle = MarketCandle & {
  symbol: string;
  interval: string;
  source: string;
};

export type MarketHistoryStats = {
  databasePath: string;
  candles: number;
  symbols: number;
  intervals: number;
  earliestOpenTime: number | null;
  latestCloseTime: number | null;
  databaseBytes: number;
};

@Injectable()
export class MarketHistoryService implements OnModuleDestroy {
  private database: Database.Database | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get databasePath(): string {
    return process.env.MARKET_HISTORY_DB ?? path.join(this.configService.dataDir, "market-history.sqlite");
  }

  private get db(): Database.Database {
    if (this.database) return this.database;
    fs.mkdirSync(path.dirname(this.databasePath), { recursive: true });
    const database = new Database(this.databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("synchronous = NORMAL");
    database.pragma("busy_timeout = 5000");
    database.exec(`
      CREATE TABLE IF NOT EXISTS market_candles (
        symbol TEXT NOT NULL,
        interval TEXT NOT NULL,
        open_time INTEGER NOT NULL,
        close_time INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume REAL NOT NULL,
        quote_volume REAL,
        trades INTEGER,
        source TEXT NOT NULL,
        observed_at INTEGER NOT NULL,
        PRIMARY KEY (symbol, interval, open_time)
      );
      CREATE INDEX IF NOT EXISTS market_candles_close_time_idx
        ON market_candles (close_time);
    `);
    this.database = database;
    return database;
  }

  upsertCandles(params: { symbol: string; interval: string; source: string; candles: MarketCandle[] }): number {
    const symbol = params.symbol.trim().toUpperCase();
    const interval = params.interval.trim();
    if (!symbol || !interval || params.candles.length === 0) return 0;

    const statement = this.db.prepare(`
      INSERT INTO market_candles (
        symbol, interval, open_time, close_time, open, high, low, close,
        volume, quote_volume, trades, source, observed_at
      ) VALUES (
        @symbol, @interval, @openTime, @closeTime, @open, @high, @low, @close,
        @volume, @quoteVolume, @trades, @source, @observedAt
      )
      ON CONFLICT(symbol, interval, open_time) DO UPDATE SET
        close_time = excluded.close_time,
        open = excluded.open,
        high = excluded.high,
        low = excluded.low,
        close = excluded.close,
        volume = excluded.volume,
        quote_volume = excluded.quote_volume,
        trades = excluded.trades,
        source = excluded.source,
        observed_at = excluded.observed_at
    `);
    const observedAt = Date.now();
    const write = this.db.transaction((candles: MarketCandle[]) => {
      for (const candle of candles) {
        if (!this.isValidCandle(candle)) continue;
        statement.run({
          symbol,
          interval,
          ...candle,
          quoteVolume: candle.quoteVolume ?? null,
          trades: candle.trades ?? null,
          source: params.source,
          observedAt
        });
      }
    });
    write(params.candles);
    return params.candles.filter((candle) => this.isValidCandle(candle)).length;
  }

  getCandles(params: { symbol: string; interval: string; fromTime?: number; toTime?: number; limit?: number }): StoredMarketCandle[] {
    const limit = Math.max(1, Math.min(10_000, Math.floor(params.limit ?? 1000)));
    const rows = this.db.prepare(`
      SELECT
        symbol,
        interval,
        open_time AS openTime,
        close_time AS closeTime,
        open,
        high,
        low,
        close,
        volume,
        quote_volume AS quoteVolume,
        trades,
        source
      FROM market_candles
      WHERE symbol = @symbol
        AND interval = @interval
        AND open_time >= @fromTime
        AND open_time <= @toTime
      ORDER BY open_time DESC
      LIMIT @limit
    `).all({
      symbol: params.symbol.trim().toUpperCase(),
      interval: params.interval.trim(),
      fromTime: params.fromTime ?? 0,
      toTime: params.toTime ?? Number.MAX_SAFE_INTEGER,
      limit
    }) as StoredMarketCandle[];
    return rows.reverse();
  }

  getStats(): MarketHistoryStats {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) AS candles,
        COUNT(DISTINCT symbol) AS symbols,
        COUNT(DISTINCT interval) AS intervals,
        MIN(open_time) AS earliestOpenTime,
        MAX(close_time) AS latestCloseTime
      FROM market_candles
    `).get() as {
      candles: number;
      symbols: number;
      intervals: number;
      earliestOpenTime: number | null;
      latestCloseTime: number | null;
    };
    return {
      databasePath: this.databasePath,
      ...row,
      databaseBytes: fs.existsSync(this.databasePath) ? fs.statSync(this.databasePath).size : 0
    };
  }

  onModuleDestroy(): void {
    this.database?.close();
    this.database = null;
  }

  private isValidCandle(candle: MarketCandle): boolean {
    return Number.isFinite(candle.openTime) &&
      Number.isFinite(candle.closeTime) &&
      candle.closeTime >= candle.openTime &&
      [candle.open, candle.high, candle.low, candle.close, candle.volume].every((value) => Number.isFinite(value) && value >= 0) &&
      candle.high >= candle.low;
  }
}
