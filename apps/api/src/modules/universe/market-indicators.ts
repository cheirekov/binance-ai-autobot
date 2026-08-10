export function computeRsi(closes: number[], period = 14): number | null {
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
    const nextGain = diff > 0 ? diff : 0;
    const nextLoss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + nextGain) / period;
    avgLoss = (avgLoss * (period - 1) + nextLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const relativeStrength = avgGain / avgLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export function computeAtrPct(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let atr: number | null = null;
  for (let i = 1; i < closes.length; i += 1) {
    const trueRange = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    if (i <= period) {
      atr = (atr ?? 0) + trueRange;
      if (i === period) atr = (atr ?? 0) / period;
      continue;
    }
    atr = ((atr ?? 0) * (period - 1) + trueRange) / period;
  }
  const lastClose = closes[closes.length - 1];
  if (!atr || lastClose <= 0) return null;
  return (atr / lastClose) * 100;
}

export function computeAdx(highs: number[], lows: number[], closes: number[], period = 14): number | null {
  if (closes.length < period * 2 + 2) return null;
  const plusDirectionalMovement: number[] = [];
  const minusDirectionalMovement: number[] = [];
  const trueRanges: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDirectionalMovement.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDirectionalMovement.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trueRanges.push(
      Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
    );
  }

  const smooth = (values: number[]): number[] => {
    const output: number[] = [];
    let sum = 0;
    for (let i = 0; i < values.length; i += 1) {
      sum += values[i];
      if (i === period - 1) {
        output.push(sum);
      } else if (i >= period) {
        sum = output[output.length - 1] - output[output.length - 1] / period + values[i];
        output.push(sum);
      }
    }
    return output;
  };

  const smoothedRanges = smooth(trueRanges);
  const smoothedPlus = smooth(plusDirectionalMovement);
  const smoothedMinus = smooth(minusDirectionalMovement);
  const length = Math.min(smoothedRanges.length, smoothedPlus.length, smoothedMinus.length);
  if (length === 0) return null;

  const directionalIndexes: number[] = [];
  for (let i = 0; i < length; i += 1) {
    const trueRange = smoothedRanges[i];
    if (trueRange === 0) continue;
    const plusIndex = (100 * smoothedPlus[i]) / trueRange;
    const minusIndex = (100 * smoothedMinus[i]) / trueRange;
    const denominator = plusIndex + minusIndex;
    if (denominator === 0) continue;
    directionalIndexes.push((100 * Math.abs(plusIndex - minusIndex)) / denominator);
  }
  if (directionalIndexes.length < period) return null;

  let adx = directionalIndexes.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let i = period; i < directionalIndexes.length; i += 1) {
    adx = (adx * (period - 1) + directionalIndexes[i]) / period;
  }
  return adx;
}
