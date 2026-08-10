#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const DEFAULT_LIMIT = 240;
const DEFAULT_CAPITAL = 1000;
const DEFAULT_FEE_BPS = 10;
const DEFAULT_TRAIN_RATIO = 0.6;

const parseArgs = (argv) => {
  const options = {
    symbols: null,
    interval: null,
    limit: DEFAULT_LIMIT,
    capital: DEFAULT_CAPITAL,
    feeBps: DEFAULT_FEE_BPS,
    trainRatio: DEFAULT_TRAIN_RATIO,
    baseUrl: null,
    bundle: null,
    candleFixture: null,
    writeCandleFixture: null,
    endTime: null,
    writeReport: null,
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
    } else if (arg === "--train-ratio" && next) {
      options.trainRatio = Number(next);
      index += 1;
    } else if (arg === "--base-url" && next) {
      options.baseUrl = next;
      index += 1;
    } else if (arg === "--bundle" && next) {
      options.bundle = next;
      index += 1;
    } else if (arg === "--candle-fixture" && next) {
      options.candleFixture = next;
      index += 1;
    } else if (arg === "--write-candle-fixture" && next) {
      options.writeCandleFixture = next;
      index += 1;
    } else if (arg === "--end-time" && next) {
      options.endTime = next;
      index += 1;
    } else if (arg === "--write-report" && next) {
      options.writeReport = next;
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
  if (!Number.isFinite(options.trainRatio) || options.trainRatio < 0.5 || options.trainRatio > 0.8) {
    throw new Error(`--train-ratio must be between 0.5 and 0.8, got ${options.trainRatio}`);
  }
  if (options.candleFixture && options.writeCandleFixture) {
    throw new Error("--candle-fixture and --write-candle-fixture cannot be used together");
  }

  return options;
};

const readJson = (relativePath) => {
  const target = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(target)) return null;
  return JSON.parse(fs.readFileSync(target, "utf8"));
};

const resolvePath = (target) => path.isAbsolute(target) ? target : path.resolve(ROOT_DIR, target);

const readBundleJson = (bundlePath, innerPath) => {
  for (const candidate of [`./${innerPath}`, innerPath]) {
    try {
      return JSON.parse(execFileSync("tar", ["-xOf", resolvePath(bundlePath), candidate], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"]
      }));
    } catch {
      // Try alternate archive path spelling.
    }
  }
  throw new Error(`${bundlePath} is missing ${innerPath}`);
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

const normalizeUniverse = (universe = {}) => {
  const candidates = Array.isArray(universe.candidates) ? universe.candidates : [];
  return {
    interval: typeof universe.interval === "string" ? universe.interval : "1h",
    candidates
  };
};

const loadUniverse = (bundlePath) => normalizeUniverse(
  bundlePath ? readBundleJson(bundlePath, "data/universe.json") : readJson("data/universe.json")
);

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

const parseEndTime = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  const parsed = Number.isFinite(numeric) ? numeric : Date.parse(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`invalid end time: ${value}`);
  return parsed;
};

const fetchKlines = async ({ baseUrl, symbol, interval, limit, endTime }) => {
  const url = new URL("/api/v3/klines", baseUrl);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));
  if (endTime) url.searchParams.set("endTime", String(endTime));

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

const adxSeries = (candles, period = 14) => {
  const plusDm = Array(candles.length).fill(0);
  const minusDm = Array(candles.length).fill(0);
  const tr = trueRangeSeries(candles);
  for (let index = 1; index < candles.length; index += 1) {
    const upMove = candles[index].high - candles[index - 1].high;
    const downMove = candles[index - 1].low - candles[index].low;
    plusDm[index] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[index] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  const smooth = (values) => {
    const result = Array(values.length).fill(Number.NaN);
    if (values.length <= period) return result;
    let value = values.slice(1, period + 1).reduce((sum, item) => sum + item, 0);
    result[period] = value;
    for (let index = period + 1; index < values.length; index += 1) {
      value = value - value / period + values[index];
      result[index] = value;
    }
    return result;
  };

  const smoothTr = smooth(tr);
  const smoothPlus = smooth(plusDm);
  const smoothMinus = smooth(minusDm);
  const plusDi = candles.map((_, index) => Number.isFinite(smoothTr[index]) && smoothTr[index] > 0
    ? (smoothPlus[index] / smoothTr[index]) * 100
    : Number.NaN);
  const minusDi = candles.map((_, index) => Number.isFinite(smoothTr[index]) && smoothTr[index] > 0
    ? (smoothMinus[index] / smoothTr[index]) * 100
    : Number.NaN);
  const dx = candles.map((_, index) => {
    const total = plusDi[index] + minusDi[index];
    return Number.isFinite(total) && total > 0 ? (Math.abs(plusDi[index] - minusDi[index]) / total) * 100 : Number.NaN;
  });
  const adx = Array(candles.length).fill(Number.NaN);
  const firstAdxIndex = period * 2;
  const seed = dx.slice(period + 1, firstAdxIndex + 1).filter(Number.isFinite);
  if (seed.length === period) {
    adx[firstAdxIndex] = seed.reduce((sum, value) => sum + value, 0) / period;
    for (let index = firstAdxIndex + 1; index < candles.length; index += 1) {
      adx[index] = ((adx[index - 1] * (period - 1)) + dx[index]) / period;
    }
  }
  return { adx, plusDi, minusDi };
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

  const final = finalizePosition({ quote, base, lastClose: closes.at(-1), feeRate });
  return buildResult({
    family: "GRID",
    capital,
    quote: final.quote,
    base: final.base,
    lastClose: closes.at(-1),
    trades: trades + final.trades,
    equity
  });
};

const simulateRegimeAdaptive = ({ candles, capital, feeRate }) => {
  const closes = candles.map((candle) => candle.close);
  const emaFast = emaSeries(closes, 12);
  const emaSlow = emaSeries(closes, 26);
  const rsi = rsiSeries(closes, 14);
  const tr = trueRangeSeries(candles);
  const { adx, plusDi, minusDi } = adxSeries(candles, 14);
  let quote = capital;
  let base = 0;
  let entry = 0;
  let peak = 0;
  let entryMode = null;
  let trades = 0;
  const equity = [];

  for (let index = 30; index < candles.length; index += 1) {
    const close = closes[index];
    const atr = smaAt(tr, index, 14);
    const mid = smaAt(closes, index, 20);
    const sd = stdAt(closes, index, 20, mid);
    const lower = mid - sd * 1.8;
    const strongTrend = adx[index] >= 24;
    const bullishTrend = strongTrend && plusDi[index] > minusDi[index] && emaFast[index] > emaSlow[index];
    const rangeMarket = adx[index] <= 20;
    const momentumEntry = bullishTrend && rsi[index] >= 50 && rsi[index] <= 72 && close > closes[index - 8];
    const rangeEntry = rangeMarket && close <= lower && rsi[index] <= 36;

    if (base <= 0 && quote > 0 && (momentumEntry || rangeEntry)) {
      base = (quote / close) * (1 - feeRate);
      quote = 0;
      entry = close;
      peak = close;
      entryMode = momentumEntry ? "TREND" : "RANGE";
      trades += 1;
    } else if (base > 0) {
      peak = Math.max(peak, close);
      const atrStop = Number.isFinite(atr) ? Math.max(entry - atr * 2.5, peak - atr * 2.5) : entry * 0.96;
      const trendExit = entryMode === "TREND" && (emaFast[index] < emaSlow[index] || minusDi[index] > plusDi[index]);
      const rangeExit = entryMode === "RANGE" && (close >= mid || rsi[index] >= 55);
      if (close <= atrStop || trendExit || rangeExit) {
        quote = base * close * (1 - feeRate);
        base = 0;
        entry = 0;
        peak = 0;
        entryMode = null;
        trades += 1;
      }
    }
    equity.push(quote + base * close);
  }

  const final = finalizePosition({ quote, base, lastClose: closes.at(-1), feeRate });
  return buildResult({
    family: "REGIME_ADAPTIVE",
    capital,
    quote: final.quote,
    base: final.base,
    lastClose: closes.at(-1),
    trades: trades + final.trades,
    equity
  });
};

const STRATEGY_FAMILIES = ["TREND", "MEAN_REVERSION", "GRID", "REGIME_ADAPTIVE"];

const simulateFamilies = ({ candles, capital, feeRate }) => {
  const params = { candles, capital, feeRate };
  return {
    BUY_HOLD: simulateBuyHold(params),
    TREND: simulateTrend(params),
    MEAN_REVERSION: simulateMeanReversion(params),
    GRID: simulateGrid(params),
    REGIME_ADAPTIVE: simulateRegimeAdaptive(params)
  };
};

const strategyUtility = (result) => result.netPct - result.maxDrawdownPct * 0.5;

const runWalkForward = ({ candles, capital, feeRate, trainRatio = DEFAULT_TRAIN_RATIO }) => {
  const splitIndex = Math.floor(candles.length * trainRatio);
  const trainCandles = candles.slice(0, splitIndex);
  const validationCandles = candles.slice(splitIndex);
  if (trainCandles.length < 40 || validationCandles.length < 40) {
    throw new Error(`walk-forward split needs at least 40 candles per side, got ${trainCandles.length}/${validationCandles.length}`);
  }

  const train = simulateFamilies({ candles: trainCandles, capital, feeRate });
  const validation = simulateFamilies({ candles: validationCandles, capital, feeRate });
  const selectedFamily = STRATEGY_FAMILIES
    .slice()
    .sort((left, right) => strategyUtility(train[right]) - strategyUtility(train[left]) || left.localeCompare(right))[0];

  return {
    splitIndex,
    trainCandles: trainCandles.length,
    validationCandles: validationCandles.length,
    selectedFamily,
    trainSelected: train[selectedFamily],
    validationSelected: validation[selectedFamily],
    validationBuyHold: validation.BUY_HOLD,
    train,
    validation
  };
};

const summarizeWalkForward = (symbolResults) => {
  const values = symbolResults.map((result) => result.walkForward).filter(Boolean);
  const average = (selector) => values.reduce((sum, value) => sum + selector(value), 0) / Math.max(1, values.length);
  const selections = values.reduce((counts, value) => {
    counts[value.selectedFamily] = (counts[value.selectedFamily] ?? 0) + 1;
    return counts;
  }, {});
  const profitableSymbols = values.filter((value) => value.validationSelected.netPct > 0).length;
  const validationAvgNetPct = average((value) => value.validationSelected.netPct);
  const validationAvgMaxDrawdownPct = average((value) => value.validationSelected.maxDrawdownPct);
  const buyHoldAvgNetPct = average((value) => value.validationBuyHold.netPct);
  const buyHoldAvgMaxDrawdownPct = average((value) => value.validationBuyHold.maxDrawdownPct);
  const minimumProfitable = Math.ceil(values.length / 2);
  const checks = {
    enoughSymbols: values.length >= 3,
    positiveAfterFees: validationAvgNetPct > 0,
    majorityProfitable: profitableSymbols >= minimumProfitable,
    drawdownNotWorseThanBuyHold: validationAvgMaxDrawdownPct <= buyHoldAvgMaxDrawdownPct + 1e-9,
    competitiveWithBuyHold: validationAvgNetPct >= buyHoldAvgNetPct - 0.25
  };
  const passed = Object.values(checks).every(Boolean);
  const dominantSelection = Object.entries(selections)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? "NONE";

  return {
    verdict: passed ? `WALK_FORWARD_CANDIDATE_${dominantSelection}` : "NO_WALK_FORWARD_EDGE",
    passed,
    checks,
    symbols: values.length,
    selections,
    profitableSymbols,
    minimumProfitable,
    trainAvgNetPct: average((value) => value.trainSelected.netPct),
    validationAvgNetPct,
    validationAvgMaxDrawdownPct,
    validationTrades: values.reduce((sum, value) => sum + value.validationSelected.trades, 0),
    buyHoldAvgNetPct,
    buyHoldAvgMaxDrawdownPct
  };
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
  const fixture = options.candleFixture
    ? JSON.parse(fs.readFileSync(resolvePath(options.candleFixture), "utf8"))
    : null;
  const bundleContext = options.bundle ? readBundleJson(options.bundle, "meta/run-context.json") : null;
  const universe = fixture
    ? normalizeUniverse({
        interval: fixture.interval,
        candidates: (fixture.symbols ?? []).map((entry) => ({ symbol: entry.symbol, score: entry.score ?? 0 }))
      })
    : loadUniverse(options.bundle);
  const interval = options.interval ?? fixture?.interval ?? universe.interval;
  const symbols = selectSymbols(options, universe);
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const endTime = parseEndTime(
    options.endTime ?? fixture?.endTime ?? bundleContext?.run_ended_at_utc ?? bundleContext?.run_end_utc
  );
  const feeRate = options.feeBps / 10_000;
  const symbolResults = [];
  const errors = [];
  const capturedSymbols = [];
  const fixtureBySymbol = new Map((fixture?.symbols ?? []).map((entry) => [String(entry.symbol).toUpperCase(), entry]));

  for (const symbol of symbols) {
    try {
      const fixtureEntry = fixtureBySymbol.get(String(symbol).toUpperCase());
      const candles = fixtureEntry?.candles ?? await fetchKlines({ baseUrl, symbol, interval, limit: options.limit, endTime });
      capturedSymbols.push({ symbol, score: fixtureEntry?.score ?? 0, candles });
      const results = simulateFamilies({ candles, capital: options.capital, feeRate });
      symbolResults.push({
        symbol,
        candles: candles.length,
        firstClose: candles[0].close,
        lastClose: candles.at(-1).close,
        ...results,
        walkForward: runWalkForward({
          candles,
          capital: options.capital,
          feeRate,
          trainRatio: options.trainRatio
        })
      });
    } catch (error) {
      errors.push({ symbol, error: error.message || String(error) });
    }
  }

  const families = ["BUY_HOLD", "TREND", "MEAN_REVERSION", "GRID", "REGIME_ADAPTIVE"];
  const familySummary = families
    .map((family) => summarizeFamily(family, symbolResults))
    .sort((a, b) => b.avgNetPct - a.avgNetPct || a.avgMaxDrawdownPct - b.avgMaxDrawdownPct);
  const walkForward = summarizeWalkForward(symbolResults);

  if (options.writeCandleFixture) {
    const target = resolvePath(options.writeCandleFixture);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify({
      schema_version: 1,
      source_bundle: options.bundle ? path.basename(options.bundle) : null,
      source: baseUrl,
      interval,
      limit: options.limit,
      endTime,
      symbols: capturedSymbols
    }, null, 2)}\n`);
  }

  return {
    verdict: walkForward.verdict,
    baseUrl: fixture ? `fixture:${path.basename(options.candleFixture)}` : baseUrl,
    sourceBundle: options.bundle ? path.basename(options.bundle) : fixture?.source_bundle ?? null,
    endTime,
    interval,
    limit: options.limit,
    capital: options.capital,
    feeBps: options.feeBps,
    trainRatio: options.trainRatio,
    symbolsRequested: symbols.length,
    symbolsEvaluated: symbolResults.length,
    errors,
    familySummary,
    walkForward,
    symbolResults
  };
};

const formatPct = (value) => Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "n/a";

const printReport = (report) => {
  console.log(`T-026 strategy replay verdict: ${report.verdict}`);
  console.log(`- source=${report.baseUrl}; bundle=${report.sourceBundle ?? "none"}; endTime=${report.endTime ?? "latest"}; interval=${report.interval}; limit=${report.limit}; feeBps=${report.feeBps}; trainRatio=${report.trainRatio}`);
  console.log(`- symbols=evaluated=${report.symbolsEvaluated}; requested=${report.symbolsRequested}; errors=${report.errors.length}`);
  for (const family of report.familySummary) {
    console.log(
      `- ${family.family}: avgNet=${formatPct(family.avgNetPct)}; avgMaxDD=${formatPct(family.avgMaxDrawdownPct)}; profitable=${family.profitableSymbols}/${family.symbols}; trades=${family.totalTrades}`
    );
  }
  console.log(
    `- walkForward=trainAvg=${formatPct(report.walkForward.trainAvgNetPct)}; validationAvg=${formatPct(report.walkForward.validationAvgNetPct)}; validationMaxDD=${formatPct(report.walkForward.validationAvgMaxDrawdownPct)}; profitable=${report.walkForward.profitableSymbols}/${report.walkForward.symbols}; trades=${report.walkForward.validationTrades}`
  );
  console.log(
    `- validationBuyHold=avgNet=${formatPct(report.walkForward.buyHoldAvgNetPct)}; avgMaxDD=${formatPct(report.walkForward.buyHoldAvgMaxDrawdownPct)}; selections=${JSON.stringify(report.walkForward.selections)}; checks=${JSON.stringify(report.walkForward.checks)}`
  );
  const topSymbols = report.symbolResults.slice(0, 8).map((result) => {
    const best = STRATEGY_FAMILIES
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
  if (options.writeReport) {
    const target = path.isAbsolute(options.writeReport)
      ? options.writeReport
      : path.resolve(ROOT_DIR, options.writeReport);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
    if (!options.json) console.log(`Wrote report: ${target}`);
  }
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

module.exports = { parseEndTime, runReplay, runWalkForward, summarizeWalkForward };
