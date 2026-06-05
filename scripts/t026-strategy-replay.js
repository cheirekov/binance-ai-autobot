#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_LIMIT = 240;
const DEFAULT_CAPITAL = 1000;
const DEFAULT_FEE_BPS = 10;

const parseArgs = (argv) => {
  const options = {
    symbols: null,
    interval: null,
    limit: DEFAULT_LIMIT,
    capital: DEFAULT_CAPITAL,
    feeBps: DEFAULT_FEE_BPS,
    baseUrl: null,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--symbols" && next) {
      options.symbols = next.split(",").map((value) => value.trim()).filter(Boolean);
      index += 1;
    } else if (arg === "--interval" && next) {
      options.interval = next;
      index += 1;
    } else if (arg === "--limit" && next) {
      options.limit = Number(next);
      index += 1;
    } else if (arg === "--capital" && next) {
      options.capital = Number(next);
      index += 1;
    } else if (arg === "--fee-bps" && next) {
      options.feeBps = Number(next);
      index += 1;
    } else if (arg === "--base-url" && next) {
      options.baseUrl = next;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!Number.isFinite(options.limit) || options.limit < 40 || options.limit > 1000) {
    throw new Error(`--limit must be between 40 and 1000, got ${options.limit}`);
  }
  if (!Number.isFinite(options.capital) || options.capital <= 0) {
    throw new Error(`--capital must be positive, got ${options.capital}`);
  }
  if (!Number.isFinite(options.feeBps) || options.feeBps < 0 || options.feeBps > 100) {
    throw new Error(`--fee-bps must be between 0 and 100, got ${options.feeBps}`);
  }

  return options;
};

const readJson = (relativePath) => {
  const target = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(target)) return null;
  return JSON.parse(fs.readFileSync(target, "utf8"));
};

const resolveBaseUrl = (explicit) => {
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.BINANCE_BASE_URL) return process.env.BINANCE_BASE_URL.replace(/\/+$/, "");

  const config = readJson("data/config.json");
  const override = config?.advanced?.binanceBaseUrlOverride;
  if (typeof override === "string" && override.trim()) {
    return override.trim().replace(/\/+$/, "");
  }
  return "https://api.binance.com";
};

const loadUniverse = () => {
  const universe = readJson("data/universe.json") ?? {};
  const candidates = Array.isArray(universe.candidates) ? universe.candidates : [];
  return {
    interval: typeof universe.interval === "string" ? universe.interval : "1h",
    candidates
  };
};

const selectSymbols = (options, universe) => {
  if (options.symbols?.length) return options.symbols.slice(0, 24);
  return universe.candidates
    .filter((candidate) => typeof candidate.symbol === "string")
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
    .slice(0, 12)
    .map((candidate) => candidate.symbol);
};

const asNumber = (value, fallback = Number.NaN) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const fetchKlines = async ({ baseUrl, symbol, interval, limit }) => {
  const url = new URL("/api/v3/klines", baseUrl);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${symbol} klines failed: HTTP ${response.status} ${body.slice(0, 160)}`);
  }

  const raw = await response.json();
  if (!Array.isArray(raw) || raw.length < 40) {
    throw new Error(`${symbol} returned insufficient kline data`);
  }

  return raw.map((row) => ({
    openTime: Number(row[0]),
    open: asNumber(row[1]),
    high: asNumber(row[2]),
    low: asNumber(row[3]),
    close: asNumber(row[4]),
    volume: asNumber(row[5]),
    closeTime: Number(row[6])
  })).filter((candle) => (
    Number.isFinite(candle.openTime) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close)
  ));
};

const smaAt = (values, index, period) => {
  if (index + 1 < period) return Number.NaN;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i += 1) sum += values[i];
  return sum / period;
};

const stdAt = (values, index, period, mean) => {
  if (!Number.isFinite(mean)) return Number.NaN;
  let variance = 0;
  for (let i = index - period + 1; i <= index; i += 1) {
    variance += (values[i] - mean) ** 2;
  }
  return Math.sqrt(variance / period);
};

const emaSeries = (values, period) => {
  const result = Array(values.length).fill(Number.NaN);
  if (values.length < period) return result;
  const multiplier = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < period; i += 1) ema += values[i];
  ema /= period;
  result[period - 1] = ema;
  for (let i = period; i < values.length; i += 1) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
    result[i] = ema;
  }
  return result;
};

const rsiSeries = (values, period = 14) => {
  const result = Array(values.length).fill(Number.NaN);
  if (values.length <= period) return result;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  gain /= period;
  loss /= period;
  result[period] = loss === 0 ? 100 : 100 - (100 / (1 + gain / loss));

  for (let i = period + 1; i < values.length; i += 1) {
    const delta = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(0, delta)) / period;
    loss = (loss * (period - 1) + Math.max(0, -delta)) / period;
    result[i] = loss === 0 ? 100 : 100 - (100 / (1 + gain / loss));
  }
  return result;
};

const trueRangeSeries = (candles) => candles.map((candle, index) => {
  if (index === 0) return candle.high - candle.low;
  const prevClose = candles[index - 1].close;
  return Math.max(
    candle.high - candle.low,
    Math.abs(candle.high - prevClose),
    Math.abs(candle.low - prevClose)
  );
});

const atrPctSeries = (candles, period = 14) => {
  const trs = trueRangeSeries(candles);
  return candles.map((candle, index) => {
    const atr = smaAt(trs, index, period);
    return Number.isFinite(atr) && candle.close > 0 ? (atr / candle.close) * 100 : Number.NaN;
  });
};

const maxDrawdownPct = (equity) => {
  let peak = equity[0] ?? 0;
  let maxDrawdown = 0;
  for (const value of equity) {
    peak = Math.max(peak, value);
    if (peak > 0) maxDrawdown = Math.max(maxDrawdown, ((peak - value) / peak) * 100);
  }
  return maxDrawdown;
};

const finalizePosition = ({ quote, base, lastClose, feeRate }) => {
  if (base <= 0) return { quote, base: 0, trades: 0 };
  const gross = base * lastClose;
  return { quote: quote + gross * (1 - feeRate), base: 0, trades: 1 };
};

const buildResult = ({ family, capital, quote, base, lastClose, trades, equity }) => {
  const finalEquity = quote + base * lastClose;
  return {
    family,
    finalEquity,
    netPct: ((finalEquity - capital) / capital) * 100,
    maxDrawdownPct: maxDrawdownPct(equity),
    trades
  };
};

const simulateBuyHold = ({ candles, capital, feeRate }) => {
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  const base = (capital / first) * (1 - feeRate);
  const finalEquity = base * last * (1 - feeRate);
  return {
    family: "BUY_HOLD",
    finalEquity,
    netPct: ((finalEquity - capital) / capital) * 100,
    maxDrawdownPct: maxDrawdownPct(candles.map((candle) => base * candle.close)),
    trades: 2
  };
};

const simulateTrend = ({ candles, capital, feeRate }) => {
  const closes = candles.map((candle) => candle.close);
  const emaFast = emaSeries(closes, 12);
  const emaSlow = emaSeries(closes, 26);
  let quote = capital;
  let base = 0;
  let trades = 0;
  const equity = [];

  for (let i = 30; i < candles.length; i += 1) {
    const close = closes[i];
    const recentHigh = Math.max(...closes.slice(Math.max(0, i - 20), i));
    const trendEntry = emaFast[i] > emaSlow[i] && close >= recentHigh * 0.998;
    const trendExit = base > 0 && (emaFast[i] < emaSlow[i] || close < emaSlow[i] * 0.985);

    if (base <= 0 && quote > 0 && trendEntry) {
      base = (quote / close) * (1 - feeRate);
      quote = 0;
      trades += 1;
    } else if (trendExit) {
      quote = base * close * (1 - feeRate);
      base = 0;
      trades += 1;
    }
    equity.push(quote + base * close);
  }

  const final = finalizePosition({ quote, base, lastClose: closes.at(-1), feeRate });
  return buildResult({
    family: "TREND",
    capital,
    quote: final.quote,
    base: final.base,
    lastClose: closes.at(-1),
    trades: trades + final.trades,
    equity
  });
};

const simulateMeanReversion = ({ candles, capital, feeRate }) => {
  const closes = candles.map((candle) => candle.close);
  const rsi = rsiSeries(closes, 14);
  let quote = capital;
  let base = 0;
  let entry = 0;
  let trades = 0;
  const equity = [];

  for (let i = 25; i < candles.length; i += 1) {
    const close = closes[i];
    const mid = smaAt(closes, i, 20);
    const sd = stdAt(closes, i, 20, mid);
    const lower = mid - sd * 2;
    const entrySignal = close <= lower && rsi[i] <= 38;
    const exitSignal = base > 0 && (close >= mid || rsi[i] >= 55 || close <= entry * 0.965);

    if (base <= 0 && quote > 0 && entrySignal) {
      base = (quote / close) * (1 - feeRate);
      quote = 0;
      entry = close;
      trades += 1;
    } else if (exitSignal) {
      quote = base * close * (1 - feeRate);
      base = 0;
      entry = 0;
      trades += 1;
    }
    equity.push(quote + base * close);
  }

  const final = finalizePosition({ quote, base, lastClose: closes.at(-1), feeRate });
  return buildResult({
    family: "MEAN_REVERSION",
    capital,
    quote: final.quote,
    base: final.base,
    lastClose: closes.at(-1),
    trades: trades + final.trades,
    equity
  });
};

const simulateGrid = ({ candles, capital, feeRate }) => {
  const closes = candles.map((candle) => candle.close);
  const atrPct = atrPctSeries(candles, 14);
  let quote = capital;
  let base = 0;
  let lastTradePrice = closes[20] ?? closes[0];
  let trades = 0;
  const tranche = capital / 6;
  const equity = [];

  for (let i = 20; i < candles.length; i += 1) {
    const close = closes[i];
    const spacing = Math.max(0.35, Math.min(2.25, (Number.isFinite(atrPct[i]) ? atrPct[i] : 1) * 0.75)) / 100;
    const baseValue = base * close;

    if (quote >= tranche && close <= lastTradePrice * (1 - spacing)) {
      const spend = Math.min(tranche, quote);
      base += (spend / close) * (1 - feeRate);
      quote -= spend;
      lastTradePrice = close;
      trades += 1;
    } else if (baseValue >= tranche * 0.6 && close >= lastTradePrice * (1 + spacing)) {
      const sellValue = Math.min(tranche, baseValue);
      const sellBase = sellValue / close;
      base -= sellBase;
      quote += sellBase * close * (1 - feeRate);
      lastTradePrice = close;
      trades += 1;
    }
    equity.push(quote + base * close);
  }

  return buildResult({
    family: "GRID",
    capital,
    quote,
    base,
    lastClose: closes.at(-1),
    trades,
    equity
  });
};

const summarizeFamily = (family, results) => {
  const values = results.map((result) => result[family]).filter(Boolean);
  const avg = (key) => values.reduce((sum, value) => sum + value[key], 0) / Math.max(1, values.length);
  return {
    family,
    symbols: values.length,
    avgNetPct: avg("netPct"),
    avgMaxDrawdownPct: avg("maxDrawdownPct"),
    totalTrades: values.reduce((sum, value) => sum + value.trades, 0),
    profitableSymbols: values.filter((value) => value.netPct > 0).length
  };
};

const runReplay = async (options) => {
  const universe = loadUniverse();
  const interval = options.interval ?? universe.interval;
  const symbols = selectSymbols(options, universe);
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const feeRate = options.feeBps / 10_000;
  const symbolResults = [];
  const errors = [];

  for (const symbol of symbols) {
    try {
      const candles = await fetchKlines({ baseUrl, symbol, interval, limit: options.limit });
      const params = { candles, capital: options.capital, feeRate };
      symbolResults.push({
        symbol,
        candles: candles.length,
        firstClose: candles[0].close,
        lastClose: candles.at(-1).close,
        BUY_HOLD: simulateBuyHold(params),
        TREND: simulateTrend(params),
        MEAN_REVERSION: simulateMeanReversion(params),
        GRID: simulateGrid(params)
      });
    } catch (error) {
      errors.push({ symbol, error: error.message || String(error) });
    }
  }

  const families = ["BUY_HOLD", "TREND", "MEAN_REVERSION", "GRID"];
  const familySummary = families
    .map((family) => summarizeFamily(family, symbolResults))
    .sort((a, b) => b.avgNetPct - a.avgNetPct || a.avgMaxDrawdownPct - b.avgMaxDrawdownPct);
  const best = familySummary.find((family) => family.family !== "BUY_HOLD") ?? familySummary[0];
  const buyHold = familySummary.find((family) => family.family === "BUY_HOLD");
  const bestHasEdge =
    best &&
    buyHold &&
    best.avgNetPct > 0 &&
    best.avgNetPct >= buyHold.avgNetPct - 0.25 &&
    best.profitableSymbols >= Math.ceil(best.symbols / 2);

  return {
    verdict: bestHasEdge ? `REPLAY_CANDIDATE_${best.family}` : "NO_REPLAY_EDGE",
    baseUrl,
    interval,
    limit: options.limit,
    capital: options.capital,
    feeBps: options.feeBps,
    symbolsRequested: symbols.length,
    symbolsEvaluated: symbolResults.length,
    errors,
    familySummary,
    symbolResults
  };
};

const formatPct = (value) => Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "n/a";

const printReport = (report) => {
  console.log(`T-026 strategy replay verdict: ${report.verdict}`);
  console.log(`- source=${report.baseUrl}; interval=${report.interval}; limit=${report.limit}; feeBps=${report.feeBps}`);
  console.log(`- symbols=evaluated=${report.symbolsEvaluated}; requested=${report.symbolsRequested}; errors=${report.errors.length}`);
  for (const family of report.familySummary) {
    console.log(
      `- ${family.family}: avgNet=${formatPct(family.avgNetPct)}; avgMaxDD=${formatPct(family.avgMaxDrawdownPct)}; profitable=${family.profitableSymbols}/${family.symbols}; trades=${family.totalTrades}`
    );
  }
  const topSymbols = report.symbolResults.slice(0, 8).map((result) => {
    const best = ["TREND", "MEAN_REVERSION", "GRID"]
      .map((family) => result[family])
      .sort((a, b) => b.netPct - a.netPct)[0];
    return `${result.symbol}:${best.family}:${formatPct(best.netPct)}`;
  });
  console.log(`- topSymbolBest=${topSymbols.join(",") || "none"}`);
  for (const error of report.errors.slice(0, 5)) {
    console.log(`- error ${error.symbol}: ${error.error}`);
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const report = await runReplay(options);
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
  if (report.symbolsEvaluated === 0) {
    process.exitCode = 1;
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
  });
}

module.exports = { runReplay };
