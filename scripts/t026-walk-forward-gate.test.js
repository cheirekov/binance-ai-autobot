const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGate } = require("./t026-walk-forward-gate");

const report = ({ endTime, selected, benchmark, profitable = 8 }) => ({
  baseUrl: `fixture:${endTime}.json`,
  sourceBundle: `${endTime}.tgz`,
  endTime,
  verdict: "WALK_FORWARD_CANDIDATE_GRID",
  errors: [],
  walkForward: {
    symbols: 12,
    sellReachableSymbols: 12,
    profitableSymbols: profitable,
    validationAvgNetPct: selected,
    validationAvgMaxDrawdownPct: 1,
    buyHoldAvgNetPct: benchmark,
    buyHoldAvgMaxDrawdownPct: 2
  }
});

test("rejects when one preserved cutoff has no positive validation edge", () => {
  const gate = buildGate([
    report({ endTime: 1, selected: 0.5, benchmark: 0.6 }),
    report({ endTime: 2, selected: -0.1, benchmark: 0.4, profitable: 4 })
  ]);

  assert.equal(gate.verdict, "WALK_FORWARD_REJECTED");
  assert.equal(gate.checks.positiveEveryCutoff, false);
  assert.equal(gate.runtime_patch_allowed, false);
});

test("marks an offline promotion candidate without authorizing a runtime patch", () => {
  const gate = buildGate([
    report({ endTime: 1, selected: 0.8, benchmark: 0.9 }),
    report({ endTime: 2, selected: 0.7, benchmark: 0.8 })
  ]);

  assert.equal(gate.verdict, "WALK_FORWARD_PROMOTION_CANDIDATE");
  assert.equal(gate.promotion_candidate, true);
  assert.equal(gate.runtime_patch_allowed, false);
});
