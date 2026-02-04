import { Injectable } from "@nestjs/common";

import { BinanceClient } from "./binance-client";

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
  lotSize?: LotSizeFilter;
  marketLotSize?: LotSizeFilter;
  notional?: NotionalFilter;
};

export type MarketQtyValidation = {
  ok: boolean;
  normalizedQty?: string;
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
  private readonly baseUrl = (process.env.BINANCE_BASE_URL ?? "https://api.binance.com").replace(/\/+$/, "");
  private readonly client = new BinanceClient({ baseUrl: this.baseUrl });

  private readonly rulesCache = new Map<string, { atMs: number; rules: BinanceSymbolRules }>();
  private readonly priceCache = new Map<string, { atMs: number; price: string }>();

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
      return {
        ok: false,
        normalizedQty,
        price,
        minNotional: notional.minNotional,
        notional: notionalHuman,
        reason: `Below minNotional ${notional.minNotional}`
      };
    }

    return { ok: true, normalizedQty, price, notional: notionalHuman, minNotional: notional.minNotional };
  }
}
