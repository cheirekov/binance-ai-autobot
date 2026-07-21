const test = require("node:test");
const assert = require("node:assert/strict");
const { runWalkForward, summarizeWalkForward } = require("./t026-strategy-replay");

const candles = (count, priceAt) => Array.from({ length: count }, (_, index) => {
  const close = priceAt(index);
  return {
    openTime: index * 60_000,
    open: close,
    high: close * 1.005,
    low: close * 0.995,
    close,
    volume: 1000,
    closeTime: (index + 1) * 60_000 - 1
  };
});

test("selects on the training slice and evaluates on a disjoint validation slice", () => {
  const input = candles(200, (index) => index < 120 ? 100 + index * 0.3 : 136 - (index - 120) * 0.35);
  const result = runWalkForward({ candles: input, capital: 1000, feeRate: 0.001, trainRatio: 0.6 });

  assert.equal(result.splitIndex, 120);
  assert.equal(result.trainCandles, 120);
  assert.equal(result.validationCandles, 80);
  assert.ok(["TREND", "MEAN_REVERSION", "GRID"].includes(result.selectedFamily));
  assert.notStrictEqual(result.trainSelected, result.validationSelected);
});

test("rejects an in-sample winner that does not produce positive out-of-sample edge", () => {
  const result = runWalkForward({
    candles: candles(200, (index) => index < 120 ? 100 + index * 0.4 : 148 - (index - 120) * 0.5),
    capital: 1000,
    feeRate: 0.001,
    trainRatio: 0.6
  });
  const summary = summarizeWalkForward([
    { walkForward: result },
    { walkForward: result },
    { walkForward: result }
  ]);

  assert.ok(summary.trainAvgNetPct >= summary.validationAvgNetPct);
  assert.equal(summary.verdict, "NO_WALK_FORWARD_EDGE");
  assert.equal(summary.checks.positiveAfterFees, false);
});
