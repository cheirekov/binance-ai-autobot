import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import type { UniverseCandidate, UniverseSnapshot } from "@autobot/shared";
import { UNIVERSE_VERSION, UniverseSnapshotSchema } from "@autobot/shared";

import { ConfigService } from "../config/config.service";
import { resolveRouteBridgeAssets, resolveUniverseDefaultQuoteAssets, resolveWalletQuoteHintLimit } from "../config/asset-routing";
import { resolveBinanceBaseUrl } from "../integrations/binance-base-url";
import { BinanceClient } from "../integrations/binance-client";
import { BinanceTradingService } from "../integrations/binance-trading.service";
import { getPairPolicyBlockReason } from "../policy/trading-policy";

type ExchangeInfoResponse = {
  symbols?: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    permissions?: string[];
  }>;
};

type KlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

type Ticker24h = {
  symbol: string;
  lastPrice: string;
  quoteVolume: string;
  priceChangePercent: string;
};

function atomicWriteFile(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, data, { encoding: "utf-8" });
  fs.renameSync(tmpPath, filePath);
}

function unique(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of items) {
    const t = v.trim();
    if (!t) continue;
    const u = t.toUpperCase();
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function resolveDirectOrInverseRate(params: {
  from: string;
  to: string;
  tickerBySymbol: Map<string, { lastPrice: number; quoteVolume: number; priceChangePct: number }>;
}): number | null {
  const from = params.from.trim().toUpperCase();
  const to = params.to.trim().toUpperCase();
  if (!from || !to) return null;
  if (from === to) return 1;

  const direct = params.tickerBySymbol.get(`${from}${to}`)?.lastPrice;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const inverse = params.tickerBySymbol.get(`${to}${from}`)?.lastPrice;
  if (typeof inverse === "number" && Number.isFinite(inverse) && inverse > 0) {
    return 1 / inverse;
  }

  return null;
}

function resolveQuoteToHomeRate(params: {
  quoteAsset: string;
  homeAsset: string;
  bridgeAssets: string[];
  tickerBySymbol: Map<string, { lastPrice: number; quoteVolume: number; priceChangePct: number }>;
}): number | null {
  const quoteAsset = params.quoteAsset.trim().toUpperCase();
  const homeAsset = params.homeAsset.trim().toUpperCase();
  if (!quoteAsset || !homeAsset) return null;
  if (quoteAsset === homeAsset) return 1;

  const direct = resolveDirectOrInverseRate({
    from: quoteAsset,
    to: homeAsset,
    tickerBySymbol: params.tickerBySymbol
  });
  if (direct) return direct;

  const bridges = unique([homeAsset, ...params.bridgeAssets, "USDT", "USDC", "EUR", "BTC", "ETH", "BNB", "JPY"]);
  for (const bridge of bridges) {
    if (bridge === quoteAsset || bridge === homeAsset) continue;
    const quoteToBridge = resolveDirectOrInverseRate({
      from: quoteAsset,
      to: bridge,
      tickerBySymbol: params.tickerBySymbol
    });
    if (!quoteToBridge) continue;
    const bridgeToHome = resolveDirectOrInverseRate({
      from: bridge,
      to: homeAsset,
      tickerBySymbol: params.tickerBySymbol
    });
    if (!bridgeToHome) continue;
    return quoteToBridge * bridgeToHome;
  }

  return null;
}

function safeNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function clampNumber(v: number | null, min: number, max: number): number | null {
  if (v === null || !Number.isFinite(v)) return null;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function computeRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;

  for (let i = period + 1; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function computeAtrPct(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let atr: number | null = null;
  for (let i = 1; i < closes.length; i += 1) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    if (i <= period) {
      atr = (atr ?? 0) + tr;
      if (i === period) atr = (atr ?? 0) / period;
      continue;
    }
    atr = ((atr ?? 0) * (period - 1) + tr) / period;
  }
  const lastClose = closes[closes.length - 1];
  if (!atr || lastClose <= 0) return null;
  return (atr / lastClose) * 100;
}

function computeAdx(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period * 2 + 2) return null;
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trArr: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trArr.push(tr);
  }

  const smooth = (values: number[]): number[] => {
    const out: number[] = [];
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) {
      sum += values[i];
      if (i === period - 1) {
        out.push(sum);
        continue;
      }
      if (i >= period) {
        sum = out[out.length - 1] - out[out.length - 1] / period + values[i];
        out.push(sum);
      }
    }
    return out;
  };

  const trSmooth = smooth(trArr);
  const plusSmooth = smooth(plusDM);
  const minusSmooth = smooth(minusDM);
  const len = Math.min(trSmooth.length, plusSmooth.length, minusSmooth.length);
  if (len === 0) return null;

  const dx: number[] = [];
  for (let i = 0; i < len; i += 1) {
    const tr = trSmooth[i];
    if (tr === 0) continue;
    const plusDI = (100 * plusSmooth[i]) / tr;
    const minusDI = (100 * minusSmooth[i]) / tr;
    const denom = plusDI + minusDI;
    if (denom === 0) continue;
    dx.push((100 * Math.abs(plusDI - minusDI)) / denom);
  }
  if (dx.length < period) return null;

  // Wilder smoothing for ADX
  let adx = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dx.length; i += 1) {
    adx = ((adx * (period - 1)) + dx[i]) / period;
  }
  return adx;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

@Injectable()
export class UniverseService {
  private cached: UniverseSnapshot | null = null;
  private cachedAtMs = 0;
  private scanInFlight: Promise<void> | null = null;

  private readonly dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  private readonly snapshotPath = path.join(this.dataDir, "universe.json");

  constructor(
    private readonly configService: ConfigService,
    private readonly trading: BinanceTradingService
  ) {}

  private async getWalletQuoteHints(maxItems: number): Promise<string[]> {
    const limit = Math.max(0, Math.floor(maxItems));
    if (limit === 0) return [];
    try {
      const balances = await this.trading.getBalances();
      const sorted = balances
        .map((b) => ({
          asset: b.asset.trim().toUpperCase(),
          total: Number.isFinite(b.total) ? b.total : 0,
          free: Number.isFinite(b.free) ? b.free : 0
        }))
        .filter((b) => b.asset && (b.total > 0 || b.free > 0))
        .sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          return b.free - a.free;
        });
      return unique(sorted.map((b) => b.asset)).slice(0, limit);
    } catch {
      return [];
    }
  }

  async getLatest(): Promise<UniverseSnapshot> {
    const cacheTtlMs = 5 * 60_000;
    const now = Date.now();
    if (this.cached && now - this.cachedAtMs < cacheTtlMs) {
      return this.cached;
    }

    if (!this.cached && fs.existsSync(this.snapshotPath)) {
      try {
        const raw = fs.readFileSync(this.snapshotPath, "utf-8");
        const parsed = UniverseSnapshotSchema.parse(JSON.parse(raw));
        this.cached = parsed;
        this.cachedAtMs = now;
        const finishedAtMs = Date.parse(parsed.finishedAt);
        if (Number.isFinite(finishedAtMs) && now - finishedAtMs >= cacheTtlMs) {
          void this.triggerScan();
        }
      } catch {
        // ignore
      }
    }

    if (this.cached) {
      void this.triggerScan();
      return this.cached;
    }

    // Kick off a background scan if nothing exists yet.
    void this.triggerScan();
    return UniverseSnapshotSchema.parse({
      version: UNIVERSE_VERSION,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      baseUrl: resolveBinanceBaseUrl(this.configService.load()),
      interval: "1h",
      quoteAssets: [],
      candidates: [],
      errors: [{ error: "Universe scan has not completed yet." }]
    });
  }

  async triggerScan(): Promise<boolean> {
    if (this.scanInFlight) return false;
    this.scanInFlight = this.scanNow().finally(() => {
      this.scanInFlight = null;
    });
    return true;
  }

  async scanAndWait(): Promise<UniverseSnapshot> {
    if (!this.scanInFlight) {
      this.scanInFlight = this.scanNow().finally(() => {
        this.scanInFlight = null;
      });
    }
    await this.scanInFlight;
    return await this.getLatest();
  }

  private async scanNow(): Promise<void> {
    const startedAt = new Date();
    const config = this.configService.load();
    const baseUrl = resolveBinanceBaseUrl(config);
    const client = new BinanceClient({ baseUrl, timeoutMs: 12_000 });

    const interval = "1h";
    const klineLimit = 120;
    const homeQuote = (config?.basic.homeStableCoin ?? "USDC").trim().toUpperCase();
    const traderRegion = config?.basic.traderRegion ?? "NON_EEA";
    const routeBridgeAssets = resolveRouteBridgeAssets(config, homeQuote);
    const defaultQuoteAssets = resolveUniverseDefaultQuoteAssets({
      config,
      homeStableCoin: homeQuote,
      traderRegion
    });
    const walletQuoteHintLimit = resolveWalletQuoteHintLimit(config);
    let quoteAssets = [...defaultQuoteAssets];

    const errors: Array<{ symbol?: string; error: string }> = [];
    const neverTradeSymbols = config?.advanced.neverTradeSymbols ?? [];
    const excludeStableStablePairs = config?.advanced.excludeStableStablePairs ?? true;
    const enforceRegionPolicy = config?.advanced.enforceRegionPolicy ?? true;

    let exchangeInfo: ExchangeInfoResponse;
    try {
      exchangeInfo = (await client.exchangeInfo()) as ExchangeInfoResponse;
    } catch (e) {
      const finishedAt = new Date();
      const snapshot = UniverseSnapshotSchema.parse({
        version: UNIVERSE_VERSION,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        baseUrl,
        interval,
        quoteAssets,
        candidates: [],
        errors: [{ error: e instanceof Error ? e.message : String(e) }]
      });
      this.persist(snapshot);
      return;
    }

    let tickers: Ticker24h[] = [];
    try {
      tickers = await client.ticker24hr();
    } catch (e) {
      errors.push({ error: `Ticker feed unavailable: ${e instanceof Error ? e.message : String(e)}` });
    }

    const tickerBySymbol = new Map<string, { lastPrice: number; quoteVolume: number; priceChangePct: number }>();
    for (const t of tickers) {
      const lastPrice = safeNumber(t.lastPrice);
      const quoteVolume = safeNumber(t.quoteVolume);
      const priceChangePct = safeNumber(t.priceChangePercent);
      if (lastPrice === null || quoteVolume === null || priceChangePct === null) continue;
      tickerBySymbol.set(t.symbol, { lastPrice, quoteVolume, priceChangePct });
    }

    const rawSymbols = exchangeInfo.symbols ?? [];
    const availableQuoteAssets = new Set(rawSymbols.map((s) => s.quoteAsset?.trim().toUpperCase()).filter(Boolean));
    const useConfiguredQuoteSet = (config?.advanced.universeQuoteAssets?.length ?? 0) > 0;
    const walletQuoteHints = useConfiguredQuoteSet ? [] : await this.getWalletQuoteHints(walletQuoteHintLimit);
    const mergedQuoteAssets = unique([...defaultQuoteAssets, ...walletQuoteHints]);
    quoteAssets = mergedQuoteAssets.filter((asset) => availableQuoteAssets.size === 0 || availableQuoteAssets.has(asset));
    if (quoteAssets.length === 0) {
      quoteAssets = defaultQuoteAssets.filter((asset) => availableQuoteAssets.size === 0 || availableQuoteAssets.has(asset));
    }

    const spotSymbols = rawSymbols.filter((s) => {
      if (!s || s.status !== "TRADING") return false;
      if (!quoteAssets.includes(s.quoteAsset)) return false;
      const policyReason = getPairPolicyBlockReason({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        traderRegion,
        neverTradeSymbols,
        excludeStableStablePairs,
        enforceRegionPolicy
      });
      if (policyReason) return false;
      if (Array.isArray(s.permissions) && s.permissions.length > 0) {
        return s.permissions.includes("SPOT");
      }
      return true;
    });

    const withTicker = spotSymbols
      .map((s) => {
        const t = tickerBySymbol.get(s.symbol);
        if (!t) return null;
        const quoteToHome = resolveQuoteToHomeRate({
          quoteAsset: s.quoteAsset,
          homeAsset: homeQuote,
          bridgeAssets: routeBridgeAssets,
          tickerBySymbol
        });
        const quoteVolumeHome24h =
          Number.isFinite(quoteToHome) && (quoteToHome ?? 0) > 0 ? t.quoteVolume * (quoteToHome ?? 0) : null;
        return {
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          lastPrice: t.lastPrice,
          quoteVolume24h: t.quoteVolume,
          quoteVolumeHome24h,
          priceChangePct24h: t.priceChangePct
        };
      })
      .filter(Boolean) as Array<{
      symbol: string;
      baseAsset: string;
      quoteAsset: string;
      lastPrice: number;
      quoteVolume24h: number;
      quoteVolumeHome24h: number | null;
      priceChangePct24h: number;
    }>;

    // Keep scan lightweight and diverse: pick top symbols per quote asset, then compute indicators.
    const perQuoteLimit = 28;
    const grouped = new Map<string, typeof withTicker>();
    for (const s of withTicker) {
      const arr = grouped.get(s.quoteAsset) ?? [];
      arr.push(s);
      grouped.set(s.quoteAsset, arr);
    }

    const liquidityValue = (row: { quoteVolume24h: number; quoteVolumeHome24h: number | null }): number =>
      row.quoteVolumeHome24h && row.quoteVolumeHome24h > 0 ? row.quoteVolumeHome24h : row.quoteVolume24h;

    const preselected = Array.from(grouped.values())
      .flatMap((arr) => arr.sort((a, b) => liquidityValue(b) - liquidityValue(a)).slice(0, perQuoteLimit))
      .sort((a, b) => liquidityValue(b) - liquidityValue(a))
      .slice(0, 140);

    const enriched = await mapWithConcurrency(preselected, 6, async (s): Promise<UniverseCandidate | null> => {
      try {
        const raw = (await client.klines(s.symbol, interval, klineLimit)) as unknown;
        if (!Array.isArray(raw) || raw.length < 30) {
          throw new Error("Not enough kline data");
        }

        const rows = raw as unknown as KlineRow[];
        const highs: number[] = [];
        const lows: number[] = [];
        const closes: number[] = [];
        for (const r of rows) {
          const h = safeNumber(r?.[2]);
          const l = safeNumber(r?.[3]);
          const c = safeNumber(r?.[4]);
          if (h === null || l === null || c === null) continue;
          highs.push(h);
          lows.push(l);
          closes.push(c);
        }

        const rsi14 = clampNumber(computeRsi(closes, 14), 0, 100);
        const adx14 = clampNumber(computeAdx(highs, lows, closes, 14), 0, 100);
        const atrPct14 = clampNumber(computeAtrPct(highs, lows, closes, 14), 0, 1000);

        const normalizedVolume = s.quoteVolumeHome24h && s.quoteVolumeHome24h > 0 ? s.quoteVolumeHome24h : s.quoteVolume24h;
        const volumeScore = Math.log10(Math.max(1, normalizedVolume));
        const trendScore = adx14 ? Math.min(adx14 / 50, 1) : 0;
        const volScore = atrPct14 ? Math.min(atrPct14 / 10, 1) : 0;

        const score = volumeScore * 0.45 + trendScore * 0.35 + volScore * 0.2;

        const strategyHint =
          adx14 && adx14 >= 25 ? "TREND" : rsi14 && (rsi14 >= 70 || rsi14 <= 30) ? "MEAN_REVERSION" : "RANGE";

        const reasons = [
          `Vol ${s.quoteVolume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${s.quoteAsset} (24h)`,
          s.quoteVolumeHome24h
            ? `≈ ${s.quoteVolumeHome24h.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${homeQuote} eq`
            : null,
          `Δ ${s.priceChangePct24h.toFixed(2)}% (24h)`,
          rsi14 === null ? null : `RSI14 ${rsi14.toFixed(1)}`,
          adx14 === null ? null : `ADX14 ${adx14.toFixed(1)}`,
          atrPct14 === null ? null : `ATR14 ${atrPct14.toFixed(2)}%`
        ].filter(Boolean) as string[];

        return UniverseSnapshotSchema.shape.candidates.element.parse({
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          lastPrice: s.lastPrice,
          quoteVolume24h: s.quoteVolume24h,
          priceChangePct24h: s.priceChangePct24h,
          ...(rsi14 === null ? {} : { rsi14 }),
          ...(adx14 === null ? {} : { adx14 }),
          ...(atrPct14 === null ? {} : { atrPct14 }),
          strategyHint,
          score,
          reasons
        });
      } catch (e) {
        errors.push({ symbol: s.symbol, error: e instanceof Error ? e.message : String(e) });
        return null;
      }
    });

    const candidates = enriched.filter(Boolean) as UniverseCandidate[];
    const byQuoteTop = new Map<string, UniverseCandidate[]>();
    for (const c of candidates) {
      const rows = byQuoteTop.get(c.quoteAsset) ?? [];
      rows.push(c);
      byQuoteTop.set(c.quoteAsset, rows);
    }

    const diversified = Array.from(byQuoteTop.values())
      .flatMap((rows) => rows.sort((a, b) => b.score - a.score).slice(0, 12))
      .sort((a, b) => b.score - a.score);
    const top = diversified.slice(0, 60);

    const finishedAt = new Date();
    const snapshot = UniverseSnapshotSchema.parse({
      version: UNIVERSE_VERSION,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      baseUrl,
      interval,
      quoteAssets,
      candidates: top,
      errors
    });

    this.persist(snapshot);
  }

  private persist(snapshot: UniverseSnapshot): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    atomicWriteFile(this.snapshotPath, JSON.stringify(snapshot, null, 2));
    this.cached = snapshot;
    this.cachedAtMs = Date.now();
  }
}
