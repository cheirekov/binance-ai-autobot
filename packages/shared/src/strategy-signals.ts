export type BollingerSignal = {
  position: number;
  widthPct: number;
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const finiteValues = (values: number[]): number[] => values.filter((value) => Number.isFinite(value));

export function computeDonchianBreakoutPct(highs: number[], lows: number[], closes: number[], period = 20): number | null {
  const cleanHighs = finiteValues(highs);
  const cleanLows = finiteValues(lows);
  const cleanCloses = finiteValues(closes);
  const length = Math.min(cleanHighs.length, cleanLows.length, cleanCloses.length);
  if (length < period + 1) return null;

  const lastClose = cleanCloses[length - 1];
  if (lastClose <= 0) return null;

  const priorHighs = cleanHighs.slice(length - period - 1, length - 1);
  const priorLows = cleanLows.slice(length - period - 1, length - 1);
  const upper = Math.max(...priorHighs);
  const lower = Math.min(...priorLows);
  if (!Number.isFinite(upper) || !Number.isFinite(lower) || upper <= 0 || lower <= 0) return null;

  if (lastClose > upper) return ((lastClose - upper) / lastClose) * 100;
  if (lastClose < lower) return -((lower - lastClose) / lastClose) * 100;
  return 0;
}

export function computeBollingerSignal(closes: number[], period = 20, deviations = 2): BollingerSignal | null {
  const cleanCloses = finiteValues(closes);
  if (cleanCloses.length < period) return null;

  const window = cleanCloses.slice(-period);
  const lastClose = window[window.length - 1];
  if (lastClose <= 0) return null;

  const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
  const variance = window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / window.length;
  const stdDev = Math.sqrt(variance);
  const upper = mean + stdDev * deviations;
  const lower = mean - stdDev * deviations;
  const width = upper - lower;
  if (!Number.isFinite(width) || width <= 0) {
    return { position: 0.5, widthPct: 0 };
  }

  return {
    position: clamp((lastClose - lower) / width, 0, 1),
    widthPct: (width / lastClose) * 100
  };
}

export function computeEmaTrendSpreadPct(closes: number[], fastPeriod = 12, slowPeriod = 26): number | null {
  const cleanCloses = finiteValues(closes);
  if (cleanCloses.length < Math.max(fastPeriod, slowPeriod)) return null;
  const lastClose = cleanCloses[cleanCloses.length - 1];
  if (lastClose <= 0) return null;

  const ema = (period: number): number => {
    const multiplier = 2 / (period + 1);
    let value = cleanCloses.slice(0, period).reduce((sum, close) => sum + close, 0) / period;
    for (let index = period; index < cleanCloses.length; index += 1) {
      value = cleanCloses[index] * multiplier + value * (1 - multiplier);
    }
    return value;
  };

  return ((ema(fastPeriod) - ema(slowPeriod)) / lastClose) * 100;
}

export function computeRangeCycleScore(closes: number[], period = 20): number | null {
  const cleanCloses = finiteValues(closes);
  if (cleanCloses.length < period) return null;

  const window = cleanCloses.slice(-period);
  const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
  let crossings = 0;
  let previousSide = 0;
  for (const close of window) {
    const side = close > mean ? 1 : close < mean ? -1 : previousSide;
    if (side !== 0 && previousSide !== 0 && side !== previousSide) crossings += 1;
    if (side !== 0) previousSide = side;
  }

  return clamp(crossings / Math.max(1, period / 4), 0, 1);
}
