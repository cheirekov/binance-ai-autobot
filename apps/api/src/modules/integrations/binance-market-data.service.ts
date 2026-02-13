import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import { BinanceClient } from "./binance-client";
import { resolveBinanceBaseUrl } from "./binance-base-url";

type ExchangeInfoResponse = {
  symbols?: ExchangeInfoSymbol[];
};

type ExchangeInfoSymbol = {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  filters: Array<Record<string, unknown>>;
};

type LotSizeFilter = {
  filterType: "LOT_SIZE" | "MARKET_LOT_SIZE";
  minQty: string;
  maxQty: string;
  stepSize: string;
};

type PriceFilter = {
  filterType: "PRICE_FILTER";
  minPrice: string;
  maxPrice: string;
  tickSize: string;
};

type NotionalFilter =
  | {
      filterType: "NOTIONAL";
      minNotional: string;
      applyMinToMarket: boolean;
      maxNotional?: string;
      applyMaxToMarket?: boolean;
      avgPriceMins?: number;
    }
  | {
      filterType: "MIN_NOTIONAL";
      minNotional: string;
      applyToMarket: boolean;
      avgPriceMins?: number;
    };

export type BinanceSymbolRules = {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  priceFilter?: PriceFilter;
  lotSize?: LotSizeFilter;
  marketLotSize?: LotSizeFilter;
  notional?: NotionalFilter;
};

export type MarketQtyValidation = {
  ok: boolean;
  normalizedQty?: string;
  requiredQty?: string;
  price?: string;
  notional?: string;
  minNotional?: string;
  reason?: string;
};

function pow10(exp: number): bigint {
  let n = 1n;
  for (let i = 0; i < exp; i += 1) n *= 10n;
  return n;
}

function ceilDiv(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new Error("Division by zero");
  if (n <= 0n) return 0n;
  return (n + d - 1n) / d;
}

function decimalsFromStep(stepSize: string): number {
  const [, frac] = stepSize.split(".");
  if (!frac) return 0;
  const trimmed = frac.replace(/0+$/, "");
  return trimmed.length;
}

function decimalsFromNumberString(value: string): number {
  const [, frac] = value.split(".");
  if (!frac) return 0;
  const trimmed = frac.replace(/0+$/, "");
  return trimmed.length;
}

function toScaledInt(value: string, decimals: number): bigint {
  const negative = value.trim().startsWith("-");
  const v = negative ? value.trim().slice(1) : value.trim();
  const [wholeRaw, fracRaw = ""] = v.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  const frac = fracRaw.replace(/[^0-9]/g, "");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const digits = `${whole}${fracPadded}`.replace(/^0+(?=\d)/, "") || "0";
  const int = BigInt(digits);
  return negative ? -int : int;
}

function scaledIntToString(int: bigint, decimals: number): string {
  const negative = int < 0n;
  const abs = negative ? -int : int;
  const s = abs.toString();
  if (decimals === 0) return negative ? `-${s}` : s;

  const padded = s.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  const out = frac.length ? `${whole}.${frac}` : whole;
  return negative ? `-${out}` : out;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function findFilter<T extends { filterType: string }>(filters: Array<Record<string, unknown>>, type: string): T | undefined {
  for (const f of filters) {
    const ft = f.filterType;
    if (typeof ft === "string" && ft === type) {
      return f as unknown as T;
    }
  }
  return undefined;
}

function parseLotSizeFilter(filters: Array<Record<string, unknown>>, type: "LOT_SIZE" | "MARKET_LOT_SIZE"): LotSizeFilter | undefined {
  const f = asRecord(findFilter(filters, type));
  if (!f) return undefined;
  const minQty = f.minQty;
  const maxQty = f.maxQty;
  const stepSize = f.stepSize;
  if (typeof minQty !== "string" || typeof maxQty !== "string" || typeof stepSize !== "string") return undefined;
  return { filterType: type, minQty, maxQty, stepSize };
}

function parsePriceFilter(filters: Array<Record<string, unknown>>): PriceFilter | undefined {
  const f = asRecord(findFilter(filters, "PRICE_FILTER"));
  if (!f) return undefined;
  const minPrice = f.minPrice;
  const maxPrice = f.maxPrice;
  const tickSize = f.tickSize;
  if (typeof minPrice !== "string" || typeof maxPrice !== "string" || typeof tickSize !== "string") return undefined;
  return { filterType: "PRICE_FILTER", minPrice, maxPrice, tickSize };
}

function parseNotionalFilter(filters: Array<Record<string, unknown>>): NotionalFilter | undefined {
  const notional = asRecord(findFilter(filters, "NOTIONAL"));
  if (notional) {
    const minNotional = notional.minNotional;
    const applyMinToMarket = notional.applyMinToMarket;
    if (typeof minNotional === "string" && typeof applyMinToMarket === "boolean") {
      return {
        filterType: "NOTIONAL",
        minNotional,
        applyMinToMarket,
        maxNotional: typeof notional.maxNotional === "string" ? notional.maxNotional : undefined,
        applyMaxToMarket: typeof notional.applyMaxToMarket === "boolean" ? notional.applyMaxToMarket : undefined,
        avgPriceMins: typeof notional.avgPriceMins === "number" ? notional.avgPriceMins : undefined
      };
    }
  }

  const minNotional = asRecord(findFilter(filters, "MIN_NOTIONAL"));
  if (minNotional) {
    const min = minNotional.minNotional;
    const applyToMarket = minNotional.applyToMarket;
    if (typeof min === "string" && typeof applyToMarket === "boolean") {
      return {
        filterType: "MIN_NOTIONAL",
        minNotional: min,
        applyToMarket,
        avgPriceMins: typeof minNotional.avgPriceMins === "number" ? minNotional.avgPriceMins : undefined
      };
    }
  }

  return undefined;
}

@Injectable()
export class BinanceMarketDataService {
  private clientCache: { baseUrl: string; client: BinanceClient } | null = null;

  private readonly rulesCache = new Map<string, { atMs: number; rules: BinanceSymbolRules }>();
  private readonly priceCache = new Map<string, { atMs: number; price: string }>();

  constructor(private readonly configService: ConfigService) {}

  private get client(): BinanceClient {
    const config = this.configService.load();
    const baseUrl = resolveBinanceBaseUrl(config);

    if (this.clientCache?.baseUrl !== baseUrl) {
      this.clientCache = { baseUrl, client: new BinanceClient({ baseUrl }) };
      this.rulesCache.clear();
      this.priceCache.clear();
    }

    return this.clientCache.client;
  }

  async getSymbolRules(symbol: string): Promise<BinanceSymbolRules> {
    const sym = symbol.trim().toUpperCase();
    const now = Date.now();
    const cached = this.rulesCache.get(sym);
    if (cached && now - cached.atMs < 60 * 60_000) {
      return cached.rules;
    }

    const exchangeInfo = (await this.client.exchangeInfo(sym)) as ExchangeInfoResponse;
    const info = exchangeInfo.symbols?.[0];
    if (!info) {
      throw new Error(`Binance exchangeInfo returned no symbol info for ${sym}`);
    }

    const filters = (info.filters ?? []).map((f) => asRecord(f) ?? {}).filter((f) => Object.keys(f).length > 0);

    const rules: BinanceSymbolRules = {
      symbol: info.symbol,
      status: info.status,
      baseAsset: info.baseAsset,
      quoteAsset: info.quoteAsset,
      priceFilter: parsePriceFilter(filters),
      lotSize: parseLotSizeFilter(filters, "LOT_SIZE"),
      marketLotSize: parseLotSizeFilter(filters, "MARKET_LOT_SIZE"),
      notional: parseNotionalFilter(filters)
    };

    this.rulesCache.set(sym, { atMs: now, rules });
    return rules;
  }

  async getTickerPrice(symbol: string): Promise<string> {
    const sym = symbol.trim().toUpperCase();
    const now = Date.now();
    const cached = this.priceCache.get(sym);
    if (cached && now - cached.atMs < 4_000) {
      return cached.price;
    }

    const tick = await this.client.tickerPrice(sym);
    if (!tick?.price) {
      throw new Error(`Binance ticker price missing for ${sym}`);
    }

    this.priceCache.set(sym, { atMs: now, price: tick.price });
    return tick.price;
  }

  async normalizeLimitPrice(
    symbol: string,
    desiredPrice: number,
    side: "BUY" | "SELL"
  ): Promise<{ ok: true; normalizedPrice: string } | { ok: false; reason: string; minPrice?: string; maxPrice?: string; tickSize?: string }> {
    if (!Number.isFinite(desiredPrice) || desiredPrice <= 0) {
      return { ok: false, reason: "Invalid desiredPrice" };
    }

    const rules = await this.getSymbolRules(symbol);
    if (rules.status !== "TRADING") {
      return { ok: false, reason: `Symbol not tradable: ${rules.status}` };
    }

    const filter = rules.priceFilter;
    if (!filter) {
      // If we can't normalize to tick-size, return a conservative fixed string.
      return { ok: true, normalizedPrice: desiredPrice.toFixed(8) };
    }

    const decimals = decimalsFromStep(filter.tickSize);
    const tickInt = toScaledInt(filter.tickSize, decimals);
    if (tickInt <= 0n) {
      return { ok: false, reason: "Invalid tickSize", minPrice: filter.minPrice, maxPrice: filter.maxPrice, tickSize: filter.tickSize };
    }

    // Use a high-precision fixed representation; toScaledInt truncates to `decimals`.
    let priceInt = toScaledInt(desiredPrice.toFixed(decimals + 8), decimals);
    if (priceInt <= 0n) {
      return { ok: false, reason: "Price rounds to zero", minPrice: filter.minPrice, maxPrice: filter.maxPrice, tickSize: filter.tickSize };
    }

    const remainder = priceInt % tickInt;
    if (remainder !== 0n) {
      priceInt = side === "BUY" ? priceInt - remainder : priceInt + (tickInt - remainder);
    }

    const minInt = toScaledInt(filter.minPrice, decimals);
    const maxInt = toScaledInt(filter.maxPrice, decimals);
    if (priceInt < minInt) {
      return { ok: false, reason: `Below minPrice ${filter.minPrice}`, minPrice: filter.minPrice, maxPrice: filter.maxPrice, tickSize: filter.tickSize };
    }
    if (maxInt > 0n && priceInt > maxInt) {
      return { ok: false, reason: `Above maxPrice ${filter.maxPrice}`, minPrice: filter.minPrice, maxPrice: filter.maxPrice, tickSize: filter.tickSize };
    }

    return { ok: true, normalizedPrice: scaledIntToString(priceInt, decimals) };
  }

  async validateLimitOrderQty(symbol: string, desiredQty: number, limitPrice: string): Promise<MarketQtyValidation> {
    if (!Number.isFinite(desiredQty) || desiredQty <= 0) {
      return { ok: false, reason: "Invalid desiredQty" };
    }

    const priceNum = Number.parseFloat(limitPrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return { ok: false, reason: "Invalid limitPrice" };
    }

    const rules = await this.getSymbolRules(symbol);
    if (rules.status !== "TRADING") {
      return { ok: false, reason: `Symbol not tradable: ${rules.status}` };
    }

    const lot = rules.lotSize;
    if (!lot) {
      return { ok: false, reason: "Missing LOT_SIZE filter" };
    }

    const decimals = decimalsFromStep(lot.stepSize);
    const stepInt = toScaledInt(lot.stepSize, decimals);
    const minQtyInt = toScaledInt(lot.minQty, decimals);

    let qtyInt = toScaledInt(desiredQty.toFixed(decimals + 8), decimals);
    if (qtyInt < minQtyInt) {
      return { ok: false, normalizedQty: scaledIntToString(qtyInt, decimals), reason: `Below minQty ${lot.minQty}` };
    }

    if (stepInt > 0n) {
      const remainder = qtyInt % stepInt;
      if (remainder !== 0n) {
        qtyInt = qtyInt - remainder;
        if (qtyInt < minQtyInt) {
          return {
            ok: false,
            normalizedQty: scaledIntToString(qtyInt, decimals),
            reason: `Qty rounds below minQty ${lot.minQty} (step ${lot.stepSize})`
          };
        }
      }
    }

    const normalizedQty = scaledIntToString(qtyInt, decimals);

    const notional = rules.notional;
    if (!notional) {
      return { ok: true, normalizedQty };
    }

    // For LIMIT orders, minNotional always applies (even when applyToMarket/applyMinToMarket is false).
    const priceDecimals = decimalsFromNumberString(limitPrice);
    const qtyScale = pow10(decimals);
    const priceScale = pow10(priceDecimals);

    const priceInt = toScaledInt(limitPrice, priceDecimals);
    if (priceInt <= 0n) {
      return { ok: false, normalizedQty, reason: "Limit price rounds to zero" };
    }

    const minNotionalDecimals = decimalsFromNumberString(notional.minNotional);
    const minNotionalInt = toScaledInt(notional.minNotional, minNotionalDecimals);

    // Compare: (qtyInt/qtyScale)*(priceInt/priceScale) >= (minNotionalInt/minNotionalScale)
    const left = qtyInt * priceInt * pow10(minNotionalDecimals);
    const right = minNotionalInt * qtyScale * priceScale;

    // Readable notional string (limited precision).
    const notionalDecimals = Math.min(8, priceDecimals);
    const notionalScale = pow10(decimals + priceDecimals);
    const notionalInt = qtyInt * priceInt;
    const notionalHuman = scaledIntToString((notionalInt * pow10(notionalDecimals)) / notionalScale, notionalDecimals);

    if (left < right) {
      let requiredQtyInt = ceilDiv(right, priceInt * pow10(minNotionalDecimals));
      if (requiredQtyInt < minQtyInt) requiredQtyInt = minQtyInt;

      const maxQtyInt = toScaledInt(lot.maxQty, decimals);
      if (stepInt > 0n) {
        const remainder = requiredQtyInt % stepInt;
        if (remainder !== 0n) {
          requiredQtyInt = requiredQtyInt + (stepInt - remainder);
        }
      }

      const requiredQty = requiredQtyInt <= maxQtyInt ? scaledIntToString(requiredQtyInt, decimals) : undefined;
      return {
        ok: false,
        normalizedQty,
        requiredQty,
        price: limitPrice,
        minNotional: notional.minNotional,
        notional: notionalHuman,
        reason:
          requiredQty && requiredQty !== normalizedQty
            ? `Below minNotional ${notional.minNotional} at LIMIT price (need qty ≥ ${requiredQty})`
            : `Below minNotional ${notional.minNotional} at LIMIT price`
      };
    }

    return { ok: true, normalizedQty, price: limitPrice, notional: notionalHuman, minNotional: notional.minNotional };
  }

  async validateMarketOrderQty(symbol: string, desiredQty: number): Promise<MarketQtyValidation> {
    if (!Number.isFinite(desiredQty) || desiredQty <= 0) {
      return { ok: false, reason: "Invalid desiredQty" };
    }

    const rules = await this.getSymbolRules(symbol);
    if (rules.status !== "TRADING") {
      return { ok: false, reason: `Symbol not tradable: ${rules.status}` };
    }

    const lot = (() => {
      const market = rules.marketLotSize;
      const step = market?.stepSize ? Number.parseFloat(market.stepSize) : 0;
      const min = market?.minQty ? Number.parseFloat(market.minQty) : 0;
      if (market && step > 0 && min > 0) return market;
      return rules.lotSize;
    })();

    if (!lot) {
      return { ok: false, reason: "Missing LOT_SIZE filter" };
    }

    const decimals = decimalsFromStep(lot.stepSize);
    const stepInt = toScaledInt(lot.stepSize, decimals);
    const minQtyInt = toScaledInt(lot.minQty, decimals);

    const desiredQtyFixed = desiredQty.toFixed(decimals);
    let qtyInt = toScaledInt(desiredQtyFixed, decimals);

    if (qtyInt < minQtyInt) {
      return { ok: false, normalizedQty: scaledIntToString(qtyInt, decimals), reason: `Below minQty ${lot.minQty}` };
    }

    if (stepInt > 0n) {
      const remainder = qtyInt % stepInt;
      if (remainder !== 0n) {
        qtyInt = qtyInt - remainder;
        if (qtyInt < minQtyInt) {
          return {
            ok: false,
            normalizedQty: scaledIntToString(qtyInt, decimals),
            reason: `Qty rounds below minQty ${lot.minQty} (step ${lot.stepSize})`
          };
        }
      }
    }

    const normalizedQty = scaledIntToString(qtyInt, decimals);

    const notional = rules.notional;
    const applyMinToMarket = (() => {
      if (!notional) return false;
      if (notional.filterType === "NOTIONAL") return Boolean(notional.applyMinToMarket);
      return Boolean(notional.applyToMarket);
    })();

    if (!notional || !applyMinToMarket) {
      return { ok: true, normalizedQty };
    }

    const price = await this.getTickerPrice(symbol);
    const priceDecimals = decimalsFromNumberString(price);
    const qtyScale = pow10(decimals);
    const priceScale = pow10(priceDecimals);

    const priceInt = toScaledInt(price, priceDecimals);
    const minNotionalDecimals = decimalsFromNumberString(notional.minNotional);
    const minNotionalInt = toScaledInt(notional.minNotional, minNotionalDecimals);

    // Compare: (qtyInt/qtyScale)*(priceInt/priceScale) >= (minNotionalInt/minNotionalScale)
    const left = qtyInt * priceInt * pow10(minNotionalDecimals);
    const right = minNotionalInt * qtyScale * priceScale;

    // Compute a readable notional string (limited precision)
    const notionalDecimals = Math.min(8, priceDecimals);
    const notionalScale = pow10(decimals + priceDecimals);
    const notionalInt = qtyInt * priceInt;
    const notionalHuman = scaledIntToString((notionalInt * pow10(notionalDecimals)) / notionalScale, notionalDecimals);

    if (left < right) {
      let requiredQtyInt = ceilDiv(right, priceInt * pow10(minNotionalDecimals));
      if (requiredQtyInt < minQtyInt) requiredQtyInt = minQtyInt;

      const maxQtyInt = toScaledInt(lot.maxQty, decimals);
      if (stepInt > 0n) {
        const remainder = requiredQtyInt % stepInt;
        if (remainder !== 0n) {
          requiredQtyInt = requiredQtyInt + (stepInt - remainder);
        }
      }

      const requiredQty = requiredQtyInt <= maxQtyInt ? scaledIntToString(requiredQtyInt, decimals) : undefined;
      return {
        ok: false,
        normalizedQty,
        requiredQty,
        price,
        minNotional: notional.minNotional,
        notional: notionalHuman,
        reason:
          requiredQty && requiredQty !== normalizedQty
            ? `Below minNotional ${notional.minNotional} (need qty ≥ ${requiredQty})`
            : `Below minNotional ${notional.minNotional}`
      };
    }

    return { ok: true, normalizedQty, price, notional: notionalHuman, minNotional: notional.minNotional };
  }
}
